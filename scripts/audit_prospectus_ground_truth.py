#!/usr/bin/env python3
"""Audit every prospectus PDF and its section-level ground-truth conversion.

The report is deliberately strict about problems that invalidate RCA baselines:
missing documents, announcement files masquerading as prospectuses, truncation,
unmapped/core-missing sections, empty substantive sections, broken ordering,
and unverified non-terminal boundaries.  Image-only cover/back pages and a small
number of blank separator pages are reported but do not fail the corpus.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF

# When this file is executed directly, Python places ``scripts/`` rather than
# the repository root on sys.path.  Add the root explicitly so the same command
# works both as a script and as an imported module.
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.prospectus_kg.toc_sectioner import (
    _candidate_offsets,
    _fuzzy_heading_offset,
    extract_pdf_pages,
)


REQUIRED_RCA_SECTIONS = {
    "Summary",
    "Risk_Factors",
    "Business",
    "Financial_Information",
    "Underwriting",
    "Structure_of_the_Global_Offering",
    "How_to_Apply_for_Hong_Kong_Offer_Shares",
    "Appendices",
}
EMPTY_TEXT_ALLOWED = {"Cover", "Back_Cover"}
TRUNCATION_MARKERS = (
    "[... truncated ...]",
    "[… truncated …]",
    "[truncated]",
)
ANNOUNCEMENT_MARKERS = (
    "this announcement is not a prospectus",
    "this announcement is for information purposes only",
)


def _load_json(path: Path) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def _pdf_metrics(path: Path) -> dict[str, Any]:
    pages, repair_stats = extract_pdf_pages(path)
    document = fitz.open(path)
    try:
        page_texts = [pages[index + 1] for index in range(len(document))]
        first_text = "\n".join(page_texts[: min(12, len(page_texts))]).casefold()
        return {
            "pages": len(document),
            "text_characters": sum(len(text) for text in page_texts),
            "empty_pages": [
                index + 1 for index, text in enumerate(page_texts) if not text.strip()
            ],
            "toc_entries": len(document.get_toc()),
            "announcement_markers": [
                marker for marker in ANNOUNCEMENT_MARKERS if marker in first_text
            ],
            **repair_stats,
        }
    finally:
        document.close()


def _section_metrics(data: dict[str, Any]) -> dict[str, Any]:
    sections = data.get("sections")
    if not isinstance(sections, list):
        sections = []
    texts = [str(section.get("text") or "") for section in sections]
    canonicals = [section.get("canonical_section") for section in sections]
    mapped = {value for value in canonicals if isinstance(value, str) and value}
    missing_core = sorted(REQUIRED_RCA_SECTIONS - mapped)
    unmapped = [
        str(section.get("raw_title") or "")
        for section in sections
        if not section.get("canonical_section")
    ]
    empty_substantive = [
        str(section.get("raw_title") or section.get("canonical_section") or "")
        for section, text in zip(sections, texts, strict=True)
        if not text.strip()
        and section.get("canonical_section") not in EMPTY_TEXT_ALLOWED
    ]
    truncated = [
        str(section.get("raw_title") or section.get("canonical_section") or "")
        for section, text in zip(sections, texts, strict=True)
        if any(marker in text for marker in TRUNCATION_MARKERS)
    ]
    invalid_order: list[str] = []
    previous = (0, -1)
    for section in sections:
        current = (
            int(section.get("page_start") or 0),
            int(section.get("boundary_char_offset") or 0),
        )
        if current < previous:
            invalid_order.append(str(section.get("raw_title") or current))
        previous = current

    fallback_core: list[str] = []
    fuzzy_boundaries: list[str] = []
    terminal_fallbacks: list[str] = []
    misaligned_headings: list[str] = []
    for index, (section, text) in enumerate(zip(sections, texts, strict=True)):
        method = str(section.get("boundary_method") or "")
        canonical = section.get("canonical_section")
        title = str(section.get("raw_title") or canonical or "")
        if method.endswith("heading_fuzzy"):
            fuzzy_boundaries.append(title)
        if "bookmark_page_start" in method:
            if canonical in EMPTY_TEXT_ALLOWED:
                terminal_fallbacks.append(title)
            else:
                fallback_core.append(title)
        if index > 0 and method == "heading_exact":
            if 0 not in _candidate_offsets(text[:4000], title):
                misaligned_headings.append(title)
        elif index > 0 and method == "heading_fuzzy":
            fuzzy = _fuzzy_heading_offset(text[:4000], title)
            if fuzzy is None or fuzzy[0] != 0:
                misaligned_headings.append(title)

    section_characters = sum(len(text) for text in texts)
    replacement_characters = sum(text.count("\ufffd") for text in texts)
    control_characters = sum(
        len(re.findall(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", text)) for text in texts
    )
    duplicate_canonicals = {
        canonical: count
        for canonical, count in Counter(canonicals).items()
        if canonical and count > 1 and canonical != "Appendices"
    }
    return {
        "section_count": len(sections),
        "section_characters": section_characters,
        "mapped_section_count": sum(value is not None for value in canonicals),
        "missing_required_rca_sections": missing_core,
        "unmapped_sections": unmapped,
        "empty_substantive_sections": empty_substantive,
        "truncated_sections": truncated,
        "invalid_boundary_order": invalid_order,
        "fallback_core_boundaries": fallback_core,
        "fuzzy_boundaries": fuzzy_boundaries,
        "terminal_fallback_boundaries": terminal_fallbacks,
        "misaligned_heading_boundaries": misaligned_headings,
        "duplicate_canonical_sections": duplicate_canonicals,
        "replacement_characters": replacement_characters,
        "control_characters": control_characters,
    }


def _audit_document(pdf_path: Path, sections_path: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    try:
        pdf = _pdf_metrics(pdf_path)
    except Exception as exc:  # noqa: BLE001
        return {
            "document_id": pdf_path.stem,
            "status": "fail",
            "errors": [f"pdf_unreadable: {exc}"],
            "warnings": [],
        }

    data = _load_json(sections_path)
    if data is None:
        return {
            "document_id": pdf_path.stem,
            "status": "fail",
            "pdf": pdf,
            "errors": ["missing_or_invalid_section_json"],
            "warnings": [],
        }
    section = _section_metrics(data)
    metadata = data.get("metadata") if isinstance(data.get("metadata"), dict) else {}

    if pdf["pages"] < 50:
        errors.append(f"source_too_short_for_prospectus:{pdf['pages']}_pages")
    if pdf["text_characters"] < 100_000:
        errors.append(
            f"source_text_extraction_too_small:{pdf['text_characters']}_characters"
        )
    if pdf["announcement_markers"]:
        errors.append("source_is_offering_announcement")
    if section["section_count"] < 20:
        errors.append(f"too_few_sections:{section['section_count']}")
    if int(metadata.get("total_pages") or 0) != pdf["pages"]:
        errors.append(
            f"page_count_mismatch:pdf={pdf['pages']},json={metadata.get('total_pages')}"
        )
    if section["truncated_sections"]:
        errors.append("truncated_sections")
    if section["empty_substantive_sections"]:
        errors.append("empty_substantive_sections")
    if section["unmapped_sections"]:
        errors.append("unmapped_sections")
    if section["missing_required_rca_sections"]:
        errors.append("missing_required_rca_sections")
    if section["invalid_boundary_order"]:
        errors.append("invalid_boundary_order")
    if section["fallback_core_boundaries"]:
        errors.append("unverified_core_boundaries")
    if section["misaligned_heading_boundaries"]:
        errors.append("misaligned_heading_boundaries")
    if section["replacement_characters"]:
        errors.append("unicode_replacement_characters")
    if section["control_characters"]:
        errors.append("control_characters")

    source_characters = int(pdf["text_characters"] or 0)
    retention_ratio = (
        section["section_characters"] / source_characters if source_characters else 0.0
    )
    # Page separators added between slices can make the serialized total slightly
    # larger than raw PDF text.  Anything outside 98%-102% indicates loss/overlap.
    if not 0.98 <= retention_ratio <= 1.02:
        errors.append(f"text_retention_out_of_range:{retention_ratio:.6f}")

    if pdf["empty_pages"]:
        warnings.append(f"image_or_blank_pages:{len(pdf['empty_pages'])}")
    if section["fuzzy_boundaries"]:
        warnings.append(f"fuzzy_boundaries:{len(section['fuzzy_boundaries'])}")
    if section["terminal_fallback_boundaries"]:
        warnings.append(
            f"image_terminal_boundaries:{len(section['terminal_fallback_boundaries'])}"
        )
    if section["duplicate_canonical_sections"]:
        warnings.append("duplicate_canonical_sections_grouped_by_dataset_builder")

    return {
        "document_id": pdf_path.stem,
        "status": "fail" if errors else "pass",
        "pdf": pdf,
        "section_conversion": section,
        "retention_ratio": round(retention_ratio, 6),
        "splitter": metadata.get("splitter"),
        "toc_section_level": metadata.get("toc_section_level"),
        "errors": errors,
        "warnings": warnings,
    }


def _markdown_report(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# Prospectus ground-truth audit",
        "",
        f"Generated: `{report['generated_at']}`",
        "",
        "| Metric | Result |",
        "|---|---:|",
        f"| PDFs audited | {summary['documents_audited']} |",
        f"| Passed | {summary['passed']} |",
        f"| Failed | {summary['failed']} |",
        f"| Sections audited | {summary['sections_audited']} |",
        f"| Source characters | {summary['source_characters']} |",
        f"| Ground-truth characters | {summary['section_characters']} |",
        f"| Truncated sections | {summary['truncated_sections']} |",
        f"| Unmapped sections | {summary['unmapped_sections']} |",
        f"| Unverified core boundaries | {summary['fallback_core_boundaries']} |",
        f"| Misaligned heading boundaries | {summary['misaligned_heading_boundaries']} |",
        f"| Missing required RCA sections | {summary['missing_required_rca_sections']} |",
        f"| Invalid text glyphs | {summary['invalid_text_glyphs']} |",
        "",
    ]
    failed = [document for document in report["documents"] if document["status"] == "fail"]
    if failed:
        lines.extend(["## Failures", ""])
        for document in failed:
            lines.append(
                f"- `{document['document_id']}`: {', '.join(document['errors'])}"
            )
    else:
        lines.extend(
            [
                "All documents passed the RCA ground-truth validity gates.",
                "",
            ]
        )
    return "\n".join(lines) + "\n"


def run(pdf_dir: Path, sections_dir: Path, output_path: Path) -> dict[str, Any]:
    pdf_files = sorted(pdf_dir.glob("*.pdf"))
    documents = [
        _audit_document(pdf_path, sections_dir / f"{pdf_path.stem}.json")
        for pdf_path in pdf_files
    ]
    section_rows = [
        document.get("section_conversion", {})
        for document in documents
        if isinstance(document.get("section_conversion"), dict)
    ]
    summary = {
        "documents_audited": len(documents),
        "passed": sum(document["status"] == "pass" for document in documents),
        "failed": sum(document["status"] == "fail" for document in documents),
        "sections_audited": sum(row.get("section_count", 0) for row in section_rows),
        "source_characters": sum(
            document.get("pdf", {}).get("text_characters", 0) for document in documents
        ),
        "section_characters": sum(
            row.get("section_characters", 0) for row in section_rows
        ),
        "truncated_sections": sum(
            len(row.get("truncated_sections", [])) for row in section_rows
        ),
        "unmapped_sections": sum(
            len(row.get("unmapped_sections", [])) for row in section_rows
        ),
        "fallback_core_boundaries": sum(
            len(row.get("fallback_core_boundaries", [])) for row in section_rows
        ),
        "misaligned_heading_boundaries": sum(
            len(row.get("misaligned_heading_boundaries", [])) for row in section_rows
        ),
        "missing_required_rca_sections": sum(
            len(row.get("missing_required_rca_sections", [])) for row in section_rows
        ),
        "invalid_text_glyphs": sum(
            row.get("replacement_characters", 0) + row.get("control_characters", 0)
            for row in section_rows
        ),
        "fuzzy_boundaries": sum(
            len(row.get("fuzzy_boundaries", [])) for row in section_rows
        ),
        "empty_substantive_sections": sum(
            len(row.get("empty_substantive_sections", [])) for row in section_rows
        ),
    }
    report = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "summary": summary,
        "documents": documents,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    output_path.with_suffix(".md").write_text(
        _markdown_report(report), encoding="utf-8"
    )
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Audit complete prospectus ground truth.")
    parser.add_argument("--pdf-dir", type=Path, default=Path("prospectus_corpus"))
    parser.add_argument(
        "--sections-dir",
        type=Path,
        default=Path("prospectus_kg_output/sections_toc"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("prospectus_kg_output/ground_truth_audit.json"),
    )
    parser.add_argument("--fail-on-error", action="store_true")
    args = parser.parse_args()
    audit = run(args.pdf_dir, args.sections_dir, args.output)
    print(json.dumps(audit["summary"], ensure_ascii=False, indent=2))
    if args.fail_on_error and audit["summary"]["failed"]:
        sys.exit(1)

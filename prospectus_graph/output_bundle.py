"""
Split Agent2 outputs into four artifacts:
  - draft_clean.md
  - validation_report.md
  - evidence_register.jsonl
  - coverage_matrix.md
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from prospectus_graph.ai_tag_schema import parse_ai_tags
from prospectus_graph.blocker_gate import run_document_blockers
from prospectus_graph.config import SECTIONS
from prospectus_graph.issuer_metadata import METADATA_FIELDS, load_issuer_metadata

VERIFICATION_NOTES_RE = re.compile(
    r"\n### Verification Notes\b.*",
    re.DOTALL | re.IGNORECASE,
)


def strip_verification_notes(markdown: str) -> str:
    return VERIFICATION_NOTES_RE.sub("", markdown or "").rstrip() + "\n"


def build_evidence_register_jsonl(draft_text: str) -> list[dict[str, Any]]:
    """
    Atomic evidence registry: one JSON object per [[AI:CITE|...]] and explicit DATA_MISSING lines.
    """
    rows: list[dict[str, Any]] = []
    for rec in parse_ai_tags(draft_text):
        if rec.get("kind") != "CITE":
            continue
        row = {
            "type": "cite_tag",
            "value": rec.get("source") or "",
            "unit": rec.get("metric") or "",
            "period": rec.get("period") or "",
            "source_doc": rec.get("doc") or rec.get("source") or "",
            "page_or_section": rec.get("page") or rec.get("section") or "",
            "scope": rec.get("scope") or "",
            "metric": rec.get("metric") or "",
            "confidence": rec.get("confidence") or "",
            "raw_tag": rec.get("raw", ""),
        }
        rows.append(row)

    # Lines explicitly marked as missing
    for i, line in enumerate((draft_text or "").splitlines()):
        u = line.upper()
        if "DATA_MISSING" in u or "COUNSEL_INPUT_REQUIRED" in u:
            rows.append(
                {
                    "type": "gap",
                    "line_hint": i + 1,
                    "value": "",
                    "unit": "",
                    "period": "",
                    "source_doc": "",
                    "page_or_section": "",
                    "scope": "",
                    "metric": "",
                    "confidence": "n/a",
                    "raw_tag": line.strip()[:500],
                }
            )
    return rows


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def build_validation_report(
    *,
    blocker_issues: list[dict[str, Any]],
    high_issues: list[dict[str, Any]],
    medium_issues: list[dict[str, Any]],
    low_issues: list[dict[str, Any]],
) -> str:
    lines = [
        "# Validation report",
        "",
        "Severity legend: **blocker** = ship-stop for automated gate; **high/medium/low** = prioritised counsel follow-up.",
        "",
        "## Blocker",
    ]
    if not blocker_issues:
        lines.append("- (none)")
    else:
        for i in blocker_issues:
            lines.append(f"- [{i.get('code', 'issue')}] {i.get('message', '')}")
    lines.extend(["", "## High"])
    if not high_issues:
        lines.append("- (none)")
    else:
        for i in high_issues:
            lines.append(f"- [{i.get('code', 'issue')}] {i.get('message', '')}")
    lines.extend(["", "## Medium"])
    if not medium_issues:
        lines.append("- (none)")
    else:
        for i in medium_issues:
            lines.append(f"- [{i.get('code', 'issue')}] {i.get('message', '')}")
    lines.extend(["", "## Low"])
    if not low_issues:
        lines.append("- (none)")
    else:
        for i in low_issues:
            lines.append(f"- [{i.get('code', 'issue')}] {i.get('message', '')}")
    return "\n".join(lines) + "\n"


def build_coverage_matrix(
    meta: dict[str, bool],
    *,
    section_status: dict[str, str] | None = None,
) -> str:
    """Docx-style requirements vs status vs gaps."""
    section_status = section_status or {}
    lines = [
        "# Coverage matrix",
        "",
        "| Section | Required (HKEX working draft) | Status | Gaps |",
        "|---------|----------------------------------|--------|------|",
    ]
    for sid, name in SECTIONS:
        st = section_status.get(sid, "generated" if sid != "Contents" else "auto")
        gaps = "See validation_report / evidence_register"
        lines.append(f"| {name} | per agent2_section_requirements | {st} | {gaps} |")
    lines.append("")
    lines.append("## Issuer metadata flags")
    for k in METADATA_FIELDS:
        lines.append(f"- **{k}**: {meta.get(k, False)}")
    lines.append("")
    return "\n".join(lines) + "\n"


def write_output_bundle(
    output_dir: str | Path,
    *,
    combined_markdown: str,
    issuer_metadata_path: Path | None = None,
    extra_blockers: list[dict[str, Any]] | None = None,
    extra_high: list[dict[str, Any]] | None = None,
    extra_medium: list[dict[str, Any]] | None = None,
    extra_low: list[dict[str, Any]] | None = None,
) -> dict[str, str]:
    """
    Write draft_clean.md, validation_report.md, evidence_register.jsonl, coverage_matrix.md.
    Returns paths keyed by logical name.
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    clean = strip_verification_notes(combined_markdown)
    draft_clean_path = out / "draft_clean.md"
    draft_clean_path.write_text(clean, encoding="utf-8")

    evidence_rows = build_evidence_register_jsonl(combined_markdown)
    evidence_path = out / "evidence_register.jsonl"
    write_jsonl(evidence_path, evidence_rows)

    meta = load_issuer_metadata(issuer_metadata_path)
    coverage_path = out / "coverage_matrix.md"
    coverage_path.write_text(build_coverage_matrix(meta), encoding="utf-8")

    doc_issues = run_document_blockers(combined_markdown, issuer_metadata_path=issuer_metadata_path)
    blockers = [i for i in doc_issues if i.get("severity") == "blocker"]
    highs = [i for i in doc_issues if i.get("severity") == "high"]
    mediums = [i for i in doc_issues if i.get("severity") == "medium"]
    lows = [i for i in doc_issues if i.get("severity") == "low"]

    if extra_blockers:
        blockers.extend(extra_blockers)
    if extra_high:
        highs.extend(extra_high)
    if extra_medium:
        mediums.extend(extra_medium)
    if extra_low:
        lows.extend(extra_low)

    report_path = out / "validation_report.md"
    report_path.write_text(
        build_validation_report(
            blocker_issues=blockers,
            high_issues=highs,
            medium_issues=mediums,
            low_issues=lows,
        ),
        encoding="utf-8",
    )

    return {
        "draft_clean": str(draft_clean_path),
        "validation_report": str(report_path),
        "evidence_register": str(evidence_path),
        "coverage_matrix": str(coverage_path),
    }

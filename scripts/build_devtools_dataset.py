#!/usr/bin/env python3
"""Build the password-protected developer-tools dataset shipped with the web app.

The source corpus is intentionally git-ignored and far too large to ship directly.
This script produces one gzip-compressed JSON payload per issuer so the deployed
API can load companies lazily while preserving every extracted section and the
prepared section inputs used by the generation pipeline.
"""

from __future__ import annotations

import gzip
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.prospectus_kg.reference_text import (  # noqa: E402
    fragmented_line_runs,
    non_whitespace_text,
    reflow_reference_text,
)


TOC_DIR = ROOT / "prospectus_kg_output" / "sections_toc"
INPUT_DIR = ROOT / "prospectus_kg_output" / "inputs" / "input_records"
RECORD_DIR = ROOT / "prospectus_kg_output" / "inputs" / "records"
NATIVE_DIR = ROOT / "prospectus_kg_output" / "native_docs"
CORPUS_DIR = ROOT / "prospectus_corpus"
PROMPT_REQUIREMENTS = ROOT / "ai-module" / "prompts" / "sections" / "requirements.json"
WRITER_TEMPLATE = ROOT / "ai-module" / "prompts" / "agents" / "writer.txt"
EXCHANGE_RULES = ROOT / "ai-module" / "prompts" / "core" / "exchange_drafting.md"
AI_TAGS = ROOT / "ai-module" / "prompts" / "core" / "ai_tags.md"
OUT_DIR = ROOT / "frontend" / "web" / "devtools-data"
AUDIT_REPORT = ROOT / "prospectus_kg_output" / "ground_truth_audit.json"

AUDIT_ZERO_METRICS = (
    "failed",
    "truncated_sections",
    "unmapped_sections",
    "fallback_core_boundaries",
    "misaligned_heading_boundaries",
    "missing_required_rca_sections",
    "invalid_text_glyphs",
    "empty_substantive_sections",
)


def load_json(path: Path, default: Any = None) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def scalar_value(value: Any) -> str | None:
    if isinstance(value, dict):
        raw = value.get("value")
        if isinstance(raw, (str, int, float)) and str(raw).strip():
            return str(raw).strip()
    if isinstance(value, (str, int, float)) and str(value).strip():
        return str(value).strip()
    return None


LEGAL_NAME_ENDING = re.compile(
    r"(?:"
    r"Joint\s+Stock\s+Limited\s+Company|"
    r"Company\s+Limited|"
    r"Co\.,?\s*Ltd\.?|"
    r"Holdings?\s+Limited|"
    r"Group\s+Limited|"
    r"Technology\s+Limited|"
    r"Technologies\s+Limited|"
    r"Corporation|"
    r"Inc\.?|"
    r"Limited|"
    r"Ltd\.?|"
    r"Group"
    r")",
    re.IGNORECASE,
)

DEFINITION_TITLE = re.compile(r"definitions?", re.IGNORECASE)
COMPANY_DEFINITION = re.compile(
    r"[\"“'](?:our\s+)?Company,?[\"”']", re.IGNORECASE
)

INCORPORATION_LINE = re.compile(
    r"(?:incorporated|joint\s+stock\s+(?:limited\s+)?company|"
    r"company\s+controlled\s+through\s+weighted\s+voting\s+rights)",
    re.IGNORECASE,
)

NON_ISSUER_LINE = re.compile(
    r"^(?:important|if\s+you|global\s+offering|hong\s+kong\s+public|"
    r"international\s+placing|joint\s+|sole\s+|stock\s+code|number\s+of|"
    r"maximum\s+offer|nominal\s+value|the\s+stock\s+exchange)",
    re.IGNORECASE,
)


def clean_company_name(value: str) -> str:
    """Normalize a legal name without changing its source capitalization."""

    value = re.sub(r"\s+", " ", value).strip(" \t\n\r,*")
    return value.replace("ﬁ", "fi").replace("ﬂ", "fl")


def legal_name_candidate(value: str) -> str | None:
    """Return a full-line legal-name candidate from prospectus front matter."""

    value = clean_company_name(value)
    if NON_ISSUER_LINE.search(value) or not re.search(r"[A-Za-z]", value):
        return None
    match = re.fullmatch(
        rf"[A-Za-z0-9][A-Za-z0-9&'’.,()\-/ ]{{2,180}}?{LEGAL_NAME_ENDING.pattern}",
        value,
        re.IGNORECASE,
    )
    if not match or len(value.split()) < 2:
        return None
    return value


def name_from_front_matter(toc: dict[str, Any]) -> str | None:
    """Extract the displayed issuer name immediately above incorporation text."""

    for section in toc.get("sections", [])[:3]:
        title = str(
            section.get("canonical_section") or section.get("raw_title") or ""
        )
        if not re.search(r"cover|important", title, re.IGNORECASE):
            continue
        lines = [
            re.sub(r"\s+", " ", line).strip()
            for line in str(section.get("text") or "").splitlines()
            if line.strip()
        ]
        for index, line in enumerate(lines[:250]):
            if not INCORPORATION_LINE.search(line):
                continue
            # The legal English name is normally one of the last few lines above
            # the incorporation statement, with an optional Chinese name between.
            for candidate_line in reversed(lines[max(0, index - 7) : index]):
                candidate = legal_name_candidate(candidate_line)
                if candidate:
                    return candidate
    return None


def name_from_definition(toc: dict[str, Any]) -> str | None:
    """Read the issuer's legal name from the prospectus Definitions section.

    Covers sometimes render the issuer name as a logo, so PDF text extraction can
    omit it entirely.  The Definitions section is the authoritative text fallback:
    it normally defines ``Company``/``our Company`` followed by the full legal
    English name.
    """

    for section in toc.get("sections", []):
        title = str(
            section.get("canonical_section") or section.get("raw_title") or ""
        )
        if not DEFINITION_TITLE.search(title):
            continue
        lines = [
            re.sub(r"\s+", " ", line).strip()
            for line in str(section.get("text") or "").splitlines()
            if line.strip()
        ]
        for index, line in enumerate(lines):
            if not COMPANY_DEFINITION.search(line) or re.search(
                r"Company\s+(?:Law|Ordinance)", line, re.IGNORECASE
            ):
                continue

            # A glossary key can wrap across several quoted lines, e.g.
            # “Company”, “our Company”, / “Group”, “our Group”, “we” or / “us”.
            start = index + 1
            while start < min(len(lines), index + 6) and re.search(
                r"[“”\"]", lines[start]
            ):
                start += 1
            window = " ".join(lines[start : start + 12])
            match = re.match(
                rf"(?P<name>[A-Za-z0-9][A-Za-z0-9&'’.,()\-/ ]{{2,180}}?"
                rf"{LEGAL_NAME_ENDING.pattern})"
                r"(?=\s*(?:[（(,，*]|$))",
                window,
                re.IGNORECASE,
            )
            if not match:
                continue
            name = clean_company_name(match.group("name"))
            if len(name.split()) >= 2:
                return name
    return None


def company_name(record: dict[str, Any], toc: dict[str, Any], document_id: str) -> str:
    cover = record.get("record", {}).get("section_Cover", {})
    for key in (
        "Cover.issuer_name_en",
        "Cover.company_name",
        "Cover.issuer_name_ch",
        "issuer_name_en",
        "company_name",
    ):
        value = scalar_value(cover.get(key))
        if value and not re.fullmatch(r"Issuer\s+\d+", value, re.IGNORECASE):
            return clean_company_name(value)

    extracted = name_from_front_matter(toc) or name_from_definition(toc)
    if extracted:
        return extracted
    raise RuntimeError(
        f"Could not determine the legal company name for {document_id}; "
        "refusing to publish an Issuer XXXXX placeholder"
    )


def file_entry(path: Path, category: str, root: Path = ROOT, **extra: Any) -> dict[str, Any]:
    try:
        display_path = str(path.relative_to(root))
        size = path.stat().st_size
    except (ValueError, OSError):
        display_path = str(path)
        size = 0
    return {
        "name": path.name,
        "path": display_path,
        "category": category,
        "size": size,
        **extra,
    }


def section_payload(document_id: str, toc: dict[str, Any]) -> list[dict[str, Any]]:
    prepared_dir = INPUT_DIR / document_id
    grouped: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for raw in toc.get("sections", []):
        section_id = raw.get("canonical_section") or "Unmapped"
        if section_id not in grouped:
            order.append(section_id)
            grouped[section_id] = {
                "id": section_id,
                "title": (raw.get("raw_title") or section_id).replace("_", " "),
                "pageStart": raw.get("page_start"),
                "pageEnd": raw.get("page_end"),
                "referenceParts": [],
                "subsections": [],
                "confidence": raw.get("confidence"),
            }
        item = grouped[section_id]
        text = str(raw.get("text") or "").strip()
        if text:
            if item["referenceParts"]:
                item["referenceParts"].append(f"\n\n--- {raw.get('raw_title') or section_id} ---\n\n")
            item["referenceParts"].append(text)
        end = raw.get("page_end")
        if isinstance(end, int):
            current = item.get("pageEnd")
            item["pageEnd"] = max(current, end) if isinstance(current, int) else end
        if isinstance(raw.get("subsections"), list):
            item["subsections"].extend(raw["subsections"])

    sections: list[dict[str, Any]] = []
    for section_id in order:
        item = grouped[section_id]
        raw_reference_text = "".join(item.pop("referenceParts"))
        reference_text = reflow_reference_text(raw_reference_text, section_id)
        if non_whitespace_text(reference_text) != non_whitespace_text(
            raw_reference_text
        ):
            raise RuntimeError(
                f"Reference-text reflow changed content tokens for "
                f"{document_id}/{section_id}"
            )
        fragments_before = fragmented_line_runs(raw_reference_text)
        fragments_after = fragmented_line_runs(reference_text)
        if fragments_after:
            raise RuntimeError(
                f"Reference-text layout audit failed for {document_id}/{section_id}: "
                f"{fragments_after} fragmented line run(s) remain"
            )
        prepared_path = prepared_dir / f"{section_id}.json"
        prepared = load_json(prepared_path, {})
        has_reference = bool(non_whitespace_text(reference_text))
        if has_reference and (not isinstance(prepared, dict) or not prepared):
            raise RuntimeError(
                f"Prepared RCA data is missing or empty for {document_id}/{section_id}. "
                "Run scripts/prospectus_kg/enrich_input_records_from_sections.py "
                "before building the Developer Tools dataset."
            )
        item["referenceText"] = reference_text
        item["preparedData"] = prepared
        item["preparedDataCharacters"] = len(
            json.dumps(prepared, ensure_ascii=False, indent=2)
        )
        item["referenceCharacters"] = len(item["referenceText"])
        item["rcaReady"] = has_reference and bool(prepared)
        item["rawReferenceCharacters"] = len(raw_reference_text)
        item["fragmentedLineRunsBefore"] = fragments_before
        item["fragmentedLineRunsAfter"] = fragments_after
        item["referenceFormatting"] = "lossless_reflow_v1"
        sections.append(item)
    return sections


def company_files(document_id: str, toc: dict[str, Any]) -> list[dict[str, Any]]:
    files: list[dict[str, Any]] = []
    source_pdf = CORPUS_DIR / str(toc.get("source_file") or f"{document_id}.pdf")
    if source_pdf.exists():
        files.append(
            file_entry(
                source_pdf,
                "真实招股说明书",
                sourceMethod="source_prospectus",
                pageStart=1,
                pageEnd=toc.get("metadata", {}).get("total_pages"),
            )
        )

    manifest_path = NATIVE_DIR / document_id / "manifest.json"
    manifest = load_json(manifest_path, {})
    for entry in manifest.get("files", []):
        rel = str(entry.get("path") or "")
        path = NATIVE_DIR / document_id / rel
        files.append(
            file_entry(
                path,
                "历史整理文件",
                sourceMethod=entry.get("source_method"),
                sectionHint=entry.get("section_hint"),
                pageStart=entry.get("page_start"),
                pageEnd=entry.get("page_end"),
                missingFields=entry.get("missing_fields", []),
            )
        )

    prepared_dir = INPUT_DIR / document_id
    if prepared_dir.exists():
        for path in sorted(prepared_dir.glob("*.json")):
            files.append(
                file_entry(
                    path,
                    "Section 结构化数据",
                    sourceMethod="reverse_extracted_record",
                    sectionHint=path.stem,
                )
            )

    for path, category in (
        (RECORD_DIR / f"{document_id}.json", "公司合并数据"),
        (TOC_DIR / f"{document_id}.json", "真实 Section 切分"),
        (manifest_path, "文件清单"),
    ):
        if path.exists():
            files.append(file_entry(path, category, sourceMethod="pipeline_artifact"))
    return files


def safe_prompt(text: str) -> str:
    return re.sub(r"\n{4,}", "\n\n\n", text).strip()


def build_prompts() -> list[dict[str, Any]]:
    requirements = load_json(PROMPT_REQUIREMENTS, {})
    template = WRITER_TEMPLATE.read_text(encoding="utf-8")
    template = template.replace("{{exchange_drafting}}", EXCHANGE_RULES.read_text(encoding="utf-8").strip())
    template = template.replace("{{ai_tags}}", AI_TAGS.read_text(encoding="utf-8").strip())
    template = template.replace("{{planner_block}}", "")
    template = template.replace("{{mod_note}}", "")
    prompts: list[dict[str, Any]] = []
    for prompt_id, item in requirements.items():
        section_id = item.get("kg_section_id") or prompt_id
        current = template.replace("{{section_name}}", item.get("name") or prompt_id)
        current = current.replace("{{requirements}}", item.get("requirements") or "")
        current = current.replace("{{context}}", "{{PREPARED_COMPANY_DATA}}")
        prompts.append(
            {
                "id": prompt_id,
                "sectionId": section_id,
                "name": item.get("name") or section_id.replace("_", " "),
                "requirements": item.get("requirements") or "",
                "prompt": safe_prompt(current),
            }
        )
    return prompts


def require_valid_ground_truth() -> dict[str, Any]:
    """Refuse to publish Developer Tools data from an unaudited corpus."""

    report = load_json(AUDIT_REPORT, {})
    summary = report.get("summary") if isinstance(report, dict) else None
    if not isinstance(summary, dict):
        raise RuntimeError(
            "Missing ground-truth audit. Run scripts/audit_prospectus_ground_truth.py first."
        )
    document_count = len(
        [path for path in TOC_DIR.glob("*.json") if not path.name.startswith("_")]
    )
    problems = [
        f"{name}={summary.get(name)!r}"
        for name in AUDIT_ZERO_METRICS
        if summary.get(name) != 0
    ]
    if summary.get("documents_audited") != document_count:
        problems.append(
            "document_count="
            f"{summary.get('documents_audited')!r} audited vs {document_count} converted"
        )
    if summary.get("passed") != document_count:
        problems.append(
            f"passed={summary.get('passed')!r} vs {document_count} converted"
        )
    if problems:
        raise RuntimeError("Ground-truth audit did not pass: " + ", ".join(problems))
    return summary


def main() -> None:
    audit_summary = require_valid_ground_truth()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.json.gz"):
        old.unlink()

    prompts = build_prompts()
    prompt_by_section = {item["sectionId"]: item["id"] for item in prompts}
    companies: list[dict[str, Any]] = []
    layout_sections_checked = 0
    fragmented_runs_before = 0
    fragmented_runs_after = 0

    for toc_path in sorted(TOC_DIR.glob("*.json")):
        if toc_path.name.startswith("_"):
            continue
        document_id = toc_path.stem
        toc = load_json(toc_path, {})
        record = load_json(RECORD_DIR / f"{document_id}.json", {})
        sections = section_payload(document_id, toc)
        layout_sections_checked += len(sections)
        fragmented_runs_before += sum(
            section["fragmentedLineRunsBefore"] for section in sections
        )
        fragmented_runs_after += sum(
            section["fragmentedLineRunsAfter"] for section in sections
        )
        payload = {
            "id": document_id,
            "name": company_name(record, toc, document_id),
            "sourceFile": toc.get("source_file") or f"{document_id}.pdf",
            "totalPages": toc.get("metadata", {}).get("total_pages"),
            "files": company_files(document_id, toc),
            "sections": sections,
        }
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        with gzip.open(OUT_DIR / f"{document_id}.json.gz", "wb", compresslevel=9) as handle:
            handle.write(encoded)
        companies.append(
            {
                "id": document_id,
                "name": payload["name"],
                "sourceFile": payload["sourceFile"],
                "totalPages": payload["totalPages"],
                "fileCount": len(payload["files"]),
                "sectionCount": len(sections),
                "sections": [
                    {
                        "id": section["id"],
                        "title": section["title"],
                        "pageStart": section["pageStart"],
                        "pageEnd": section["pageEnd"],
                        "referenceCharacters": section["referenceCharacters"],
                        "preparedDataCharacters": section["preparedDataCharacters"],
                        "rcaReady": section["rcaReady"],
                        "promptId": prompt_by_section.get(section["id"]),
                    }
                    for section in sections
                ],
            }
        )

    index = {
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "companyCount": len(companies),
        "promptCount": len(prompts),
        "groundTruthAudit": audit_summary,
        "referenceLayoutAudit": {
            "format": "lossless_reflow_v1",
            "sectionsChecked": layout_sections_checked,
            "fragmentedLineRunsBefore": fragmented_runs_before,
            "fragmentedLineRunsAfter": fragmented_runs_after,
        },
        "companies": companies,
    }
    (OUT_DIR / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    (OUT_DIR / "prompts.json").write_text(
        json.dumps({"prompts": prompts}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    (OUT_DIR / "prompt-requirements.json").write_text(
        json.dumps(
            load_json(PROMPT_REQUIREMENTS, {}),
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    print(
        f"Built {len(companies)} companies, {sum(c['sectionCount'] for c in companies)} company sections, "
        f"and {len(prompts)} prompts in {OUT_DIR}"
    )


if __name__ == "__main__":
    main()

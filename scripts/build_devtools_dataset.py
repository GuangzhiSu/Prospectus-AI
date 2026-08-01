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
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
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


def company_name(record: dict[str, Any], document_id: str) -> str:
    cover = record.get("record", {}).get("section_Cover", {})
    for key in (
        "Cover.issuer_name_en",
        "Cover.company_name",
        "Cover.issuer_name_ch",
        "issuer_name_en",
        "company_name",
    ):
        value = scalar_value(cover.get(key))
        if value:
            return value
    return f"Issuer {document_id.split('_', 1)[0]}"


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
        prepared = load_json(prepared_dir / f"{section_id}.json", {})
        item["referenceText"] = "".join(item.pop("referenceParts"))
        item["preparedData"] = prepared
        item["referenceCharacters"] = len(item["referenceText"])
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

    for toc_path in sorted(TOC_DIR.glob("*.json")):
        if toc_path.name.startswith("_"):
            continue
        document_id = toc_path.stem
        toc = load_json(toc_path, {})
        record = load_json(RECORD_DIR / f"{document_id}.json", {})
        sections = section_payload(document_id, toc)
        payload = {
            "id": document_id,
            "name": company_name(record, document_id),
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

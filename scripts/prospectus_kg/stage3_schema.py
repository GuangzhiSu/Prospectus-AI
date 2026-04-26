"""
Stage 3a: build an *input schema* for generating a prospectus by parsing the reference
document ``docs/IPO_Input_Report_CN.pdf`` (Chinese IPO input checklist).

Output
------
``prospectus_kg_output/inputs/input_schema.json`` — JSON Schema describing the data fields
an issuer must supply before the drafting agent can produce a prospectus.

If the reference PDF is not present yet, this stage writes a ``_pending.json`` marker
describing the blocker and exits gracefully.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

import structlog

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
sys.path.insert(0, str(_REPO_ROOT / "ipo_prospectus_pipeline" / "src"))

log = structlog.get_logger()


INPUT_SCHEMA_EXTRACTION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["categories"],
    "properties": {
        "language": {"type": "string"},
        "source_document": {"type": "string"},
        "categories": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["category_id", "category_name", "fields"],
                "properties": {
                    "category_id": {"type": "string"},
                    "category_name": {"type": "string"},
                    "description": {"type": "string"},
                    "maps_to_sections": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Canonical section ids this category supports.",
                    },
                    "fields": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["field_id", "field_name", "type", "description"],
                            "properties": {
                                "field_id": {"type": "string"},
                                "field_name": {"type": "string"},
                                "type": {
                                    "type": "string",
                                    "enum": [
                                        "string", "text", "number", "date",
                                        "boolean", "list", "table", "object",
                                    ],
                                },
                                "description": {"type": "string"},
                                "required": {"type": "boolean"},
                                "example": {"type": "string"},
                                "evidence_source": {"type": "string"},
                            },
                        },
                    },
                },
            },
        },
    },
}


def _parse_schema_content(content: str) -> dict[str, Any] | None:
    """Best-effort parse of Qwen's JSON output with tolerance for truncation / fences.

    Tries strict json, then json_repair on the fenced/unfenced content.
    """
    if not content:
        return None
    text = content.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)(?:```|\Z)", text, re.IGNORECASE)
    inner = match.group(1).strip() if match else text
    try:
        obj = json.loads(inner)
        if isinstance(obj, dict):
            return obj
    except json.JSONDecodeError:
        pass
    try:
        import json_repair  # type: ignore

        obj = json_repair.loads(inner)
        if isinstance(obj, dict) and obj:
            return obj
        obj = json_repair.loads(text)
        if isinstance(obj, dict) and obj:
            return obj
    except Exception:  # noqa: BLE001
        pass
    return None


def _infer_field_type(example: Any) -> str:
    if isinstance(example, bool):
        return "boolean"
    if isinstance(example, (int, float)):
        return "number"
    if isinstance(example, list):
        return "list"
    if isinstance(example, dict):
        return "object"
    return "string"


def _build_section_schema(section_cards_dir: Path) -> dict[str, Any]:
    """Aggregate ``required_input_fields`` from every Stage 2 section card.

    Each section becomes one category. Field_id is prefixed with the section id to avoid
    cross-section collisions (e.g. ``Business.mission_statement``).
    """
    categories: list[dict[str, Any]] = []
    if not section_cards_dir.exists():
        return {"categories": categories}
    for f in sorted(section_cards_dir.glob("*.json")):
        try:
            card = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        sid = card.get("section_id") or f.stem
        raw_fields = card.get("required_input_fields") or []
        if not raw_fields:
            continue
        fields: list[dict[str, Any]] = []
        seen: set[str] = set()
        for fld in raw_fields:
            if not isinstance(fld, dict):
                continue
            name = fld.get("field") or fld.get("field_id")
            if not name or name in seen:
                continue
            seen.add(name)
            example = fld.get("example")
            fields.append({
                "field_id": f"{sid}.{name}",
                "field_name": name,
                "type": _infer_field_type(example),
                "description": (fld.get("description") or "")[:160],
                **({"example": example} if example is not None else {}),
            })
        if not fields:
            continue
        categories.append({
            "category_id": f"section_{sid}",
            "category_name": sid,
            "maps_to_sections": [sid],
            "function": card.get("function", ""),
            "fields": fields,
        })
    return {
        "source": "prospectus_kg_output/writing/section_cards",
        "description": "Per-section input schema derived from Stage 2 writing KG required_input_fields.",
        "categories": categories,
    }


def _extract_pdf_text(pdf_path: Path) -> str:
    try:
        import fitz
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("PyMuPDF required for Stage 3a") from exc
    doc = fitz.open(pdf_path)
    chunks = [doc[i].get_text("text") for i in range(len(doc))]
    doc.close()
    return "\n\n".join(chunks)


def run(pdf_path: Path, out_dir: Path) -> dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    if not pdf_path.exists():
        marker = {
            "stage": "stage3a_schema",
            "status": "pending_input_pdf",
            "missing_file": str(pdf_path),
            "message": (
                "Upload IPO_Input_Report_CN.docx.pdf to the expected path "
                "(default: docs/IPO_Input_Report_CN.pdf) and re-run stage s3a."
            ),
        }
        (out_dir / "_pending.json").write_text(
            json.dumps(marker, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        log.warning("stage3a_pending", missing=str(pdf_path))
        return marker

    from qwen_local_client import QwenLocalClient  # noqa: E402

    t0 = time.time()
    # Option: if a cached qwen_raw/input_schema.json exists, parse it directly
    # (skipping a fresh 5+ minute inference). Set STAGE3A_FORCE=1 to force re-infer.
    cached_raw = out_dir / "qwen_raw" / "input_schema.json"
    parsed: dict[str, Any] | None = None
    if cached_raw.exists() and os.environ.get("STAGE3A_FORCE") != "1":
        try:
            raw = json.loads(cached_raw.read_text(encoding="utf-8"))
            content = raw.get("content") or ""
            if content:
                log.info("stage3a_using_cached_raw", chars=len(content))
                parsed = _parse_schema_content(content)
        except Exception as exc:  # noqa: BLE001
            log.warning("stage3a_cached_raw_unreadable", error=str(exc))

    if parsed is None:
        text = _extract_pdf_text(pdf_path)
        log.info("stage3a_pdf_loaded", chars=len(text), file=str(pdf_path))

        # Truncate very long input to keep prompt manageable.
        max_text = 28_000
        if len(text) > max_text:
            half = max_text // 2
            text = text[:half] + "\n\n...[truncated middle]...\n\n" + text[-half:]

        system = (
            "You are an HKEX IPO documentation analyst. Parse the provided Chinese input-report "
            "and output a single JSON object describing the structured-input schema an issuer must "
            "provide before a prospectus can be drafted. Group fields by category. Each field must "
            "have a stable snake_case field_id, a short English field_name, a type from the allowed "
            "enum, and a ONE-SENTENCE English description. Fill example and evidence_source ONLY "
            "when the source text supplies a distinct, concrete value — otherwise OMIT those keys. "
            "Never repeat field_name as description/example. Do not restate the source text verbatim. "
            "Stay concise: emit at most ~12 fields per category."
        )
        user = (
            "Below is the reference document. Convert its checklist into a compact structured JSON "
            "schema. Include every distinct input category (发行人材料, 专业方交付物, 格式与流转, "
            "信息流路径, 门控文件 per section) but keep each field tight. Retain original category "
            "names in both Chinese and English where natural.\n\n"
            "--- BEGIN DOCUMENT ---\n"
            f"{text}\n"
            "--- END DOCUMENT ---\n"
        )
        client = QwenLocalClient(
            max_tokens=int(os.environ.get("STAGE3A_MAX_TOKENS", "8192")),
            temperature=0.0,
            save_raw_dir=out_dir / "qwen_raw",
        )
        resp = client.create_response(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"schema": INPUT_SCHEMA_EXTRACTION_SCHEMA},
            raw_save_id="input_schema",
        )
        parsed = resp.get("parsed")
        if not isinstance(parsed, dict):
            # Last-ditch: repair raw content directly.
            parsed = _parse_schema_content(resp.get("content") or "")

        if not isinstance(parsed, dict) or not parsed.get("categories"):
            log.error(
                "stage3a_parse_failed",
                preview=(resp.get("content") or "")[:400] if isinstance(resp, dict) else "",
            )
            parsed = {
                "categories": [],
                "parse_error": resp.get("parse_error", "") if isinstance(resp, dict) else "",
            }

    parsed["source_document"] = str(pdf_path)
    parsed.setdefault("language", "zh")

    # Also build a per-section schema by aggregating Stage 2's section_cards. This is the
    # content-grounded schema we actually use in Stage 3b to reverse-engineer input
    # records from each prospectus.
    section_cards_dir = _REPO_ROOT / "prospectus_kg_output" / "writing" / "section_cards"
    sections_schema_path = out_dir / "input_schema_sections.json"
    section_schema = _build_section_schema(section_cards_dir)
    if section_schema.get("categories"):
        sections_schema_path.write_text(
            json.dumps(section_schema, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        log.info(
            "stage3a_section_schema_written",
            path=str(sections_schema_path),
            categories=len(section_schema["categories"]),
            fields=sum(len(c.get("fields") or []) for c in section_schema["categories"]),
        )

    schema_path = out_dir / "input_schema.json"
    schema_path.write_text(
        json.dumps(parsed, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    summary = {
        "stage": "stage3a_schema",
        "status": "ok" if parsed.get("categories") else "partial",
        "schema_path": str(schema_path),
        "num_categories": len(parsed.get("categories") or []),
        "num_fields": sum(
            len(c.get("fields") or []) for c in parsed.get("categories") or []
        ),
        "elapsed_seconds": round(time.time() - t0, 2),
    }
    (out_dir / "_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return summary


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="Stage 3a: input schema extraction.")
    ap.add_argument(
        "--pdf-path", type=Path, default=Path("docs/IPO_Input_Report_CN.pdf")
    )
    ap.add_argument("--out-dir", type=Path, default=Path("prospectus_kg_output/inputs"))
    args = ap.parse_args()
    summary = run(args.pdf_path, args.out_dir)
    print(json.dumps(summary, indent=2, ensure_ascii=False))

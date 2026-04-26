"""
Stage 3b: for each HKEX prospectus, reverse-engineer the structured input record that
would have been required to author it, using the Stage 3a schema.

One LLM pass per document. The prompt concatenates:
  - the schema (categories + field ids),
  - a compact overview of each section (title + opening text + first 1k body chars),
and asks Qwen to fill a record matching the schema, leaving fields null if absent.

Emits:
  - ``prospectus_kg_output/inputs/records/<doc_id>.json``  -- per-doc filled record
  - ``prospectus_kg_output/inputs/input_dataset.jsonl``    -- aggregated dataset
"""

from __future__ import annotations

import json
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


def _load_schema(schema_path: Path) -> dict[str, Any]:
    if not schema_path.exists():
        raise FileNotFoundError(
            f"Input schema not found at {schema_path}. Run stage s3a first."
        )
    return json.loads(schema_path.read_text(encoding="utf-8"))


def _section_overview(doc: dict[str, Any], per_section_chars: int = 600) -> str:
    parts = []
    for sec in doc.get("sections", []):
        title = sec.get("canonical_section") or sec.get("raw_title")
        text = (sec.get("text") or "")[:per_section_chars]
        # Strip whitespace/newlines aggressively to keep token count down.
        text = " ".join(text.split())
        if not text:
            continue
        parts.append(f"### {title}\n{text}")
    return "\n\n".join(parts)


def _build_record_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """Minimal response envelope — detailed field shape is enforced in the prompt body.

    Using a tiny envelope keeps the schema-in-prompt instruction short enough to fit in
    the 4096-token context the Turing-class GPUs can handle for Qwen2.5-7B.
    """
    _ = schema  # kept for backwards-compat signature
    return {
        "type": "object",
        "required": ["document_id", "record"],
        "properties": {
            "document_id": {"type": "string"},
            "record": {
                "type": "object",
                "description": "Keys are the category_ids listed in the user message; each value is an object of field_id → value|null.",
            },
            "coverage_notes": {"type": "string"},
        },
    }


def _compact_schema_prompt(schema: dict[str, Any]) -> str:
    """Render the schema as a tight ``category -> field_id: short-desc`` list."""
    lines: list[str] = []
    for cat in schema.get("categories", []) or []:
        cat_id = cat.get("category_id", "")
        cat_name = cat.get("category_name", "")
        lines.append(f"## {cat_id} ({cat_name})")
        for fld in cat.get("fields", []) or []:
            fid = fld.get("field_id")
            if not fid:
                continue
            desc = (fld.get("description") or "").replace("\n", " ").strip()
            if len(desc) > 80:
                desc = desc[:80] + "…"
            lines.append(f"- {fid}: {desc}")
    return "\n".join(lines)


def _build_messages(
    doc: dict[str, Any],
    schema: dict[str, Any],
    record_schema: dict[str, Any],
) -> list[dict[str, Any]]:
    system = (
        "You are an HKEX IPO analyst. Given the fixed set of input fields below and a "
        "prospectus split into canonical sections, reverse-engineer the issuer-input record "
        "that would have been required to draft this prospectus. Only use facts that appear in "
        "the text; use null for absent fields. Keep names in their original language and quote "
        "numbers verbatim. Output one JSON object only."
    )

    schema_lines = _compact_schema_prompt(schema)
    # Cap compact schema to ~3000 chars - we need the model to see all field ids, but the
    # descriptions can be heavily trimmed.
    if len(schema_lines) > 3000:
        schema_lines = schema_lines[:3000] + "\n…"

    # Very compact overview - we only need a fingerprint of each section so the model can
    # recognise which categories are covered, not reproduce the content.
    overview = _section_overview(doc, per_section_chars=320)
    if len(overview) > 7500:
        overview = overview[:7500] + "\n...[sections truncated]..."

    category_ids = [c.get("category_id") for c in (schema.get("categories") or []) if c.get("category_id")]
    user = (
        f"Document id: {doc.get('document_id')}\n"
        "Return a JSON object of shape: {\"document_id\": str, \"record\": {<category_id>: "
        "{<field_id>: value|null}}, \"coverage_notes\": str}. Use EXACTLY these category ids: "
        f"{category_ids}.\n\n"
        "=== FIELD CATALOGUE ===\n"
        f"{schema_lines}\n\n"
        "=== PROSPECTUS SECTION FINGERPRINTS ===\n"
        f"{overview}\n\n"
        "Fill each field_id under its category with a concrete value inferred from the text, "
        "or null when not disclosed. Do not invent unknown field_ids."
    )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def run(
    sections_dir: Path,
    schema_path: Path,
    out_dir: Path,
    *,
    resume: bool = True,
    only_doc: str | None = None,
    max_tokens: int = 3072,
) -> dict[str, Any]:
    from qwen_local_client import QwenLocalClient  # noqa: E402

    schema = _load_schema(schema_path)
    records_dir = out_dir / "records"
    records_dir.mkdir(parents=True, exist_ok=True)
    raw_dir = out_dir / "qwen_raw_extract"
    raw_dir.mkdir(parents=True, exist_ok=True)

    record_schema = _build_record_schema(schema)
    files = sorted([p for p in sections_dir.glob("*.json") if not p.name.startswith("_")])
    if only_doc:
        files = [f for f in files if f.stem == only_doc]

    client = QwenLocalClient(
        max_tokens=max_tokens,
        temperature=0.0,
        save_raw_dir=raw_dir,
    )

    t0 = time.time()
    ok = cached = errors = 0
    dataset_path = out_dir / "input_dataset.jsonl"
    existing_dataset: dict[str, dict[str, Any]] = {}
    if resume and dataset_path.exists():
        for line in dataset_path.read_text(encoding="utf-8").splitlines():
            try:
                obj = json.loads(line)
                existing_dataset[obj.get("document_id")] = obj
            except json.JSONDecodeError:
                continue

    records: dict[str, dict[str, Any]] = dict(existing_dataset)
    for i, f in enumerate(files, 1):
        doc_id = f.stem
        rec_path = records_dir / f"{doc_id}.json"
        if resume and rec_path.exists() and rec_path.stat().st_size > 0:
            try:
                records[doc_id] = json.loads(rec_path.read_text(encoding="utf-8"))
                cached += 1
                log.info("record_cached", doc=doc_id, idx=i, total=len(files))
                continue
            except json.JSONDecodeError:
                pass

        doc = json.loads(f.read_text(encoding="utf-8"))
        messages = _build_messages(doc, schema, record_schema)
        t_doc = time.time()
        try:
            resp = client.create_response(
                messages=messages,
                response_format={"schema": record_schema},
                raw_save_id=doc_id,
            )
        except Exception as exc:  # noqa: BLE001
            log.exception("extract_failed", doc=doc_id, error=str(exc))
            errors += 1
            continue
        parsed = resp.get("parsed") or {}
        if not isinstance(parsed, dict):
            parsed = {"document_id": doc_id, "record": {}, "coverage_notes": "parse_failed"}
        parsed["document_id"] = doc_id
        rec_path.write_text(
            json.dumps(parsed, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        records[doc_id] = parsed
        ok += 1
        log.info("record_built", doc=doc_id, idx=i, total=len(files), seconds=round(time.time() - t_doc, 2))

    with dataset_path.open("w", encoding="utf-8") as f:
        for doc_id in sorted(records):
            f.write(json.dumps(records[doc_id], ensure_ascii=False) + "\n")

    summary = {
        "stage": "stage3b_extract",
        "documents_processed": len(records),
        "ok": ok,
        "cached": cached,
        "errors": errors,
        "dataset_path": str(dataset_path),
        "elapsed_seconds": round(time.time() - t0, 2),
    }
    (out_dir / "_extract_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return summary


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="Stage 3b: per-doc input record extraction.")
    ap.add_argument(
        "--sections-dir", type=Path, default=Path("prospectus_kg_output/sections_toc")
    )
    ap.add_argument(
        "--schema-path", type=Path,
        default=Path("prospectus_kg_output/inputs/input_schema.json"),
    )
    ap.add_argument("--out-dir", type=Path, default=Path("prospectus_kg_output/inputs"))
    ap.add_argument("--no-resume", action="store_true")
    ap.add_argument("--only-doc", type=str, default=None)
    ap.add_argument("--max-tokens", type=int, default=3072)
    args = ap.parse_args()

    summary = run(
        args.sections_dir,
        args.schema_path,
        args.out_dir,
        resume=not args.no_resume,
        only_doc=args.only_doc,
        max_tokens=args.max_tokens,
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False))

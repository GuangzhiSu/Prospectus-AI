"""
Migrate legacy ``prospectus_kg_output/inputs/records/*.json`` entries to the
new evidence-pointer shape without re-invoking the LLM.

Legacy shape:
    record["section_<sid>"]["<field_id>"] = <scalar | null>

New shape:
    record["section_<sid>"]["<field_id>"] = {
        "value": <scalar | null>,
        "source_file": "...",
        "page_start": int,
        "page_end": int,
        "span_preview": "",
    } | None

The migration looks up ``sections_toc/<doc>.json`` to find the section header
for each canonical section and borrows its ``source_file`` / ``page_start`` /
``page_end``. ``span_preview`` is left empty — only a real LLM rerun can fill
quoted snippets accurately.

Usage::

    python -m scripts.prospectus_kg.migrate_records_shape \
        --records-dir prospectus_kg_output/inputs/records \
        --sections-dir prospectus_kg_output/sections_toc
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
from pathlib import Path
from typing import Any

import structlog

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

log = structlog.get_logger()


def _already_migrated(value: Any) -> bool:
    return isinstance(value, dict) and "value" in value and "source_file" in value


def _lookup_section_meta(sections_json: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Return {canonical_section: {source_file, page_start, page_end}}."""
    out: dict[str, dict[str, Any]] = {}
    source_file = sections_json.get("source_file") or ""
    for sec in sections_json.get("sections", []) or []:
        sid = sec.get("canonical_section")
        if not sid or sid in out:
            continue
        out[sid] = {
            "source_file": sec.get("source_file") or source_file,
            "page_start": sec.get("page_start"),
            "page_end": sec.get("page_end"),
        }
    return out


def _wrap(value: Any, meta: dict[str, Any]) -> Any:
    if value is None:
        return None
    return {
        "value": value,
        "source_file": meta.get("source_file") or "",
        "page_start": meta.get("page_start"),
        "page_end": meta.get("page_end"),
        "span_preview": "",
    }


def migrate_one(record_path: Path, sections_dir: Path) -> dict[str, int]:
    rec = json.loads(record_path.read_text(encoding="utf-8"))
    doc_id = rec.get("document_id") or record_path.stem
    sections_path = sections_dir / f"{doc_id}.json"
    if not sections_path.exists():
        log.warning("migrate_missing_sections_toc", doc=doc_id)
        return {"missing_toc": 1}

    meta_by_sid = _lookup_section_meta(json.loads(sections_path.read_text(encoding="utf-8")))
    counters = {"wrapped": 0, "already_new": 0, "null": 0, "sections": 0}
    record = rec.get("record") or {}
    for sect_key, fields in record.items():
        sid = sect_key.removeprefix("section_")
        meta = meta_by_sid.get(sid) or {}
        if not isinstance(fields, dict):
            continue
        counters["sections"] += 1
        for fid, val in list(fields.items()):
            if val is None:
                counters["null"] += 1
                continue
            if _already_migrated(val):
                counters["already_new"] += 1
                continue
            fields[fid] = _wrap(val, meta)
            counters["wrapped"] += 1

    record_path.write_text(
        json.dumps(rec, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return counters


def run(records_dir: Path, sections_dir: Path) -> dict[str, Any]:
    if not records_dir.exists():
        raise FileNotFoundError(records_dir)

    ts = int(time.time())
    backup_dir = records_dir.parent / f"{records_dir.name}.bak_migrate_{ts}"
    shutil.copytree(records_dir, backup_dir)
    log.info("migrate_backup_created", backup=str(backup_dir))

    totals = {"files": 0, "wrapped": 0, "already_new": 0, "null": 0, "missing_toc": 0}
    for p in sorted(records_dir.glob("*.json")):
        totals["files"] += 1
        counters = migrate_one(p, sections_dir)
        for k in ("wrapped", "already_new", "null", "missing_toc"):
            totals[k] += counters.get(k, 0)

    summary = {
        "stage": "migrate_records_shape",
        "records_dir": str(records_dir),
        "sections_dir": str(sections_dir),
        "backup_dir": str(backup_dir),
        **totals,
    }
    log.info("migrate_complete", **summary)
    return summary


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--records-dir", type=Path, default=Path("prospectus_kg_output/inputs/records"))
    ap.add_argument("--sections-dir", type=Path, default=Path("prospectus_kg_output/sections_toc"))
    args = ap.parse_args()
    summary = run(args.records_dir, args.sections_dir)
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

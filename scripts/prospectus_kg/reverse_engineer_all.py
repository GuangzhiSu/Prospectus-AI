#!/usr/bin/env python3
"""End-to-end driver: slice + template-fill + manifest per document.

For each historical prospectus, produces:

    prospectus_kg_output/native_docs/<doc_id>/
        sliced/*.pdf         (via reverse_engineer_slice.slice_document)
        templated/*.{docx,xlsx}  (via reverse_engineer_templates.fill_document)
        manifest.json        (aggregate of both)

Usage:
    python scripts/prospectus_kg/reverse_engineer_all.py --only 00020_global_offering_2
    python scripts/prospectus_kg/reverse_engineer_all.py --limit 10
    python scripts/prospectus_kg/reverse_engineer_all.py --docs '0002*'
"""

from __future__ import annotations

import argparse
import datetime as _dt
import fnmatch
import json
from pathlib import Path

from reverse_engineer_slice import slice_document
from reverse_engineer_templates import fill_document


# gating-doc fields explicitly deferred in phase 1 (no records-side support)
OUT_OF_SCOPE_FIELDS: list[str] = [
    "issuer.corp.ma_agreements",
    "issuer.corp.board_resolutions",
    "prof.property_valuer.property_valuation_report",
    "prof.accountants.audit_report",
    "prof.accountants.working_papers_raw",
    "prof.legal.hk_legal_opinion_signed",
    "prof.sponsor.dd_checklist",
]


def _doc_ids(
    records_dir: Path,
    *,
    only: str | None,
    limit: int | None,
    pattern: str | None,
) -> list[str]:
    if only:
        return [only]
    ids = sorted(p.stem for p in records_dir.glob("*.json"))
    if pattern:
        ids = [d for d in ids if fnmatch.fnmatch(d, pattern)]
    if limit:
        ids = ids[:limit]
    return ids


def run_one(
    doc_id: str,
    *,
    pdf_dir: Path,
    toc_dir: Path,
    records_dir: Path,
    out_root: Path,
) -> dict:
    doc_out = out_root / doc_id
    doc_out.mkdir(parents=True, exist_ok=True)

    slices = slice_document(
        doc_id, pdf_dir=pdf_dir, toc_dir=toc_dir, out_root=out_root
    )
    fills = fill_document(doc_id, records_dir=records_dir, out_root=out_root)

    files: list[dict] = []
    for s in slices:
        files.append(
            {
                "path": s.relative_path,
                "source_method": "slice",
                "schema_a_field_id": s.schema_a_field_id,
                "section_hint": s.section_hint,
                "page_start": s.page_start,
                "page_end": s.page_end,
                "source_canonical_sections": s.source_canonical,
            }
        )
    for f in fills:
        files.append(
            {
                "path": f.relative_path,
                "source_method": "template_fill",
                "schema_a_field_id": f.schema_a_field_id,
                "section_hint": f.section_hint,
                "source_records": f.source_record_paths,
                "missing_fields": f.missing_fields,
            }
        )

    manifest = {
        "document_id": doc_id,
        "generated_at": _dt.datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "source_pdf": f"{doc_id}.pdf",
        "files": files,
        "out_of_scope_fields": OUT_OF_SCOPE_FIELDS,
        "counts": {
            "sliced": len(slices),
            "templated": len(fills),
            "total": len(files),
            "total_missing_fields": sum(len(f.missing_fields) for f in fills),
        },
    }
    (doc_out / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reverse-engineer 125 prospectuses into synthetic DD data rooms."
    )
    parser.add_argument("--pdf-dir", default="hkex_prospectus")
    parser.add_argument("--toc-dir", default="prospectus_kg_output/sections_toc")
    parser.add_argument(
        "--records-dir", default="prospectus_kg_output/inputs/records"
    )
    parser.add_argument(
        "--out-root", default="prospectus_kg_output/native_docs"
    )
    parser.add_argument("--only", default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument(
        "--docs",
        default=None,
        help="fnmatch pattern on doc_id, e.g. '0002*'",
    )
    args = parser.parse_args()

    pdf_dir = Path(args.pdf_dir)
    toc_dir = Path(args.toc_dir)
    records_dir = Path(args.records_dir)
    out_root = Path(args.out_root)
    out_root.mkdir(parents=True, exist_ok=True)

    ids = _doc_ids(records_dir, only=args.only, limit=args.limit, pattern=args.docs)
    if not ids:
        print("No matching doc_ids.")
        return

    totals = {"docs": 0, "sliced": 0, "templated": 0, "missing": 0}
    for doc_id in ids:
        m = run_one(
            doc_id,
            pdf_dir=pdf_dir,
            toc_dir=toc_dir,
            records_dir=records_dir,
            out_root=out_root,
        )
        totals["docs"] += 1
        totals["sliced"] += m["counts"]["sliced"]
        totals["templated"] += m["counts"]["templated"]
        totals["missing"] += m["counts"]["total_missing_fields"]
        print(
            f"[run] {doc_id}: sliced={m['counts']['sliced']}, "
            f"templated={m['counts']['templated']}, "
            f"missing={m['counts']['total_missing_fields']}"
        )

    print(
        f"\nDone: {totals['docs']} doc(s), "
        f"{totals['sliced']} slice(s) + {totals['templated']} template(s); "
        f"{totals['missing']} total DATA_MISSING fields."
    )


if __name__ == "__main__":
    main()

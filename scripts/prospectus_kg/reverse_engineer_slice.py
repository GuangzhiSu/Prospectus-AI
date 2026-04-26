#!/usr/bin/env python3
"""Reverse-engineer analytical DD deliverables via PDF slicing.

For each historical prospectus in ``hkex_prospectus/``, read its section TOC from
``prospectus_kg_output/sections_toc/<doc_id>.json`` and export sub-PDFs that
stand in for Schema A gating documents whose content is *derived from* the
prospectus (industry research report, regulatory opinion, sponsor DD memo...).

Outputs land under:

    prospectus_kg_output/native_docs/<doc_id>/sliced/<slug>.pdf

The companion driver ``reverse_engineer_all.py`` aggregates slice + template
results into ``manifest.json`` per doc. This script can also be run standalone
for a single doc via ``--only <doc_id>``.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


# canonical_section -> (output slug, Schema A field_id, Agent2 section_hint)
SLICE_MAP: dict[str, tuple[str, str, str]] = {
    "Industry_Overview": (
        "industry_overview",
        "prof.industry_consultant.research_report",
        "Industry_Overview",
    ),
    "Regulatory_Overview": (
        "regulatory_overview",
        "prof.legal.regulatory_opinion",
        "Regulatory_Overview",
    ),
    "Financial_Information": (
        "financial_information_mdna",
        "prof.accountants.mdna_commentary",
        "Financial_Information",
    ),
    "Contractual_Arrangements_VIE": (
        "vie_opinion",
        "prof.legal.vie_opinion",
        "Contractual_Arrangements_VIE",
    ),
    "Connected_Transactions": (
        "connected_transactions_memo",
        "prof.legal.connected_transactions_memo",
        "Connected_Transactions",
    ),
}

# Special composite slice: concat of multiple canonical sections into one
# synthetic deliverable.
SPONSOR_DD_SECTIONS = ("Summary", "Risk_Factors")
SPONSOR_DD_SPEC = (
    "sponsor_dd_memorandum",
    "prof.sponsor.dd_memorandum",
    "Summary",  # primary section_hint
)


@dataclass
class SliceResult:
    path: Path                  # absolute path to sliced PDF
    relative_path: str          # e.g. "sliced/industry_overview.pdf"
    schema_a_field_id: str
    section_hint: str           # Agent2 canonical section name
    page_start: int             # 1-indexed, inclusive
    page_end: int               # 1-indexed, inclusive
    source_canonical: list[str]


def _iter_sections(toc: dict) -> list[dict]:
    return [s for s in (toc.get("sections") or []) if s.get("canonical_section")]


def _merge_pages(ranges: list[tuple[int, int]]) -> list[tuple[int, int]]:
    """Merge overlapping/adjacent 1-indexed [start,end] page ranges."""
    if not ranges:
        return []
    ranges = sorted(ranges)
    out: list[tuple[int, int]] = [ranges[0]]
    for s, e in ranges[1:]:
        ps, pe = out[-1]
        if s <= pe + 1:
            out[-1] = (ps, max(pe, e))
        else:
            out.append((s, e))
    return out


def _slice_pdf(
    src_pdf: Path,
    page_ranges: list[tuple[int, int]],
    out_path: Path,
) -> None:
    """Write a new PDF containing the given 1-indexed page ranges."""
    import fitz  # PyMuPDF

    out_path.parent.mkdir(parents=True, exist_ok=True)
    src = fitz.open(str(src_pdf))
    dst = fitz.open()
    try:
        total = src.page_count
        for s, e in page_ranges:
            # PyMuPDF insert_pdf takes 0-indexed inclusive bounds.
            start0 = max(0, s - 1)
            end0 = min(total - 1, e - 1)
            if end0 < start0:
                continue
            dst.insert_pdf(src, from_page=start0, to_page=end0)
        dst.save(str(out_path))
    finally:
        dst.close()
        src.close()


def slice_document(
    doc_id: str,
    *,
    pdf_dir: Path,
    toc_dir: Path,
    out_root: Path,
) -> list[SliceResult]:
    """Produce all sliced PDFs for one prospectus. Returns empty list if TOC
    or source PDF is missing."""
    toc_path = toc_dir / f"{doc_id}.json"
    pdf_path = pdf_dir / f"{doc_id}.pdf"
    if not toc_path.exists() or not pdf_path.exists():
        return []

    toc = json.loads(toc_path.read_text(encoding="utf-8"))
    sections = _iter_sections(toc)
    # Group canonical_section -> page ranges
    by_canonical: dict[str, list[tuple[int, int]]] = {}
    for sec in sections:
        key = sec.get("canonical_section") or ""
        ps, pe = sec.get("page_start"), sec.get("page_end")
        if key and isinstance(ps, int) and isinstance(pe, int) and pe >= ps:
            by_canonical.setdefault(key, []).append((ps, pe))

    out_dir = out_root / doc_id / "sliced"
    results: list[SliceResult] = []

    for canonical, (slug, field_id, hint) in SLICE_MAP.items():
        ranges = _merge_pages(by_canonical.get(canonical, []))
        if not ranges:
            continue
        out_path = out_dir / f"{slug}.pdf"
        _slice_pdf(pdf_path, ranges, out_path)
        results.append(
            SliceResult(
                path=out_path,
                relative_path=f"sliced/{slug}.pdf",
                schema_a_field_id=field_id,
                section_hint=hint,
                page_start=ranges[0][0],
                page_end=ranges[-1][1],
                source_canonical=[canonical],
            )
        )

    # Composite sponsor-DD memo: Summary + Risk_Factors concatenated.
    composite: list[tuple[int, int]] = []
    for key in SPONSOR_DD_SECTIONS:
        composite.extend(by_canonical.get(key, []))
    composite = _merge_pages(composite)
    if composite:
        slug, field_id, hint = SPONSOR_DD_SPEC
        out_path = out_dir / f"{slug}.pdf"
        _slice_pdf(pdf_path, composite, out_path)
        results.append(
            SliceResult(
                path=out_path,
                relative_path=f"sliced/{slug}.pdf",
                schema_a_field_id=field_id,
                section_hint=hint,
                page_start=composite[0][0],
                page_end=composite[-1][1],
                source_canonical=list(SPONSOR_DD_SECTIONS),
            )
        )

    return results


def _doc_ids(
    toc_dir: Path,
    *,
    only: str | None,
    limit: int | None,
) -> Iterable[str]:
    if only:
        yield only
        return
    ids = sorted(p.stem for p in toc_dir.glob("*.json"))
    if limit:
        ids = ids[:limit]
    yield from ids


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Slice historical prospectus PDFs into analytical DD deliverables."
    )
    parser.add_argument("--pdf-dir", default="hkex_prospectus")
    parser.add_argument("--toc-dir", default="prospectus_kg_output/sections_toc")
    parser.add_argument(
        "--out-root", default="prospectus_kg_output/native_docs"
    )
    parser.add_argument("--only", default=None, help="Slice only this doc_id")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    pdf_dir = Path(args.pdf_dir)
    toc_dir = Path(args.toc_dir)
    out_root = Path(args.out_root)
    out_root.mkdir(parents=True, exist_ok=True)

    total_docs = 0
    total_slices = 0
    for doc_id in _doc_ids(toc_dir, only=args.only, limit=args.limit):
        results = slice_document(
            doc_id, pdf_dir=pdf_dir, toc_dir=toc_dir, out_root=out_root
        )
        total_docs += 1
        total_slices += len(results)
        print(
            f"[slice] {doc_id}: {len(results)} slice(s) "
            + ", ".join(r.relative_path for r in results)
        )

    print(f"\nDone: {total_slices} slice(s) across {total_docs} doc(s).")


if __name__ == "__main__":
    main()

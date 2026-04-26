"""
Stage 0: split every HKEX prospectus PDF into ``ParsedDocument``-shaped sections.

Strategy
--------
1. Use PyMuPDF ``fitz.get_toc()`` to read the embedded bookmarks (level-1 entries).
   HKEX prospectuses reliably carry clean TOC entries (cover, summary, risk factors,
   etc.), so we get deterministic, noise-free section boundaries for free.
2. Resolve each raw TOC title to a canonical section id via
   ``prospectus_docgraph.normalizer.TitleNormalizer``.
3. Read back the associated page text from the already-extracted JSON in
   ``ipo_prospectus_pipeline/outputs_hkex_qwen/extracted/<doc_id>.json`` if available,
   otherwise re-extract on the fly (fallback path).
4. Materialize subsections from level-2 TOC entries when present.
5. Emit one JSON per document that mirrors ``prospectus_docgraph.parser.structure.ParsedDocument``
   semantics so it can be loaded directly in Stage 1.

This pass is *purely deterministic* (no LLM calls) and completes in seconds for 125 PDFs.
"""

from __future__ import annotations

import json
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF
import structlog

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from prospectus_docgraph.normalizer.title_normalizer import TitleNormalizer  # noqa: E402

log = structlog.get_logger()


@dataclass
class _Subsec:
    raw_title: str
    page_start: int
    page_end: int
    canonical: str | None
    confidence: float
    match_method: str


@dataclass
class _Sec:
    raw_title: str
    page_start: int
    page_end: int
    canonical: str | None
    confidence: float
    match_method: str
    subsections: list[_Subsec] = field(default_factory=list)


def _resolve(norm: TitleNormalizer, raw: str) -> tuple[str | None, float, str]:
    r = norm.match_section(raw)
    return r.canonical_name, float(r.confidence), r.match_method or "none"


def _build_sections(toc: list[list[Any]], total_pages: int, norm: TitleNormalizer) -> list[_Sec]:
    """
    Convert ``[(level, title, page), ...]`` into a list of level-1 ``_Sec``s with
    level-2 subsections nested under each. Page ranges are closed on both ends.
    """
    level1: list[_Sec] = []
    current_sec: _Sec | None = None

    flat: list[tuple[int, str, int]] = []
    for entry in toc:
        if len(entry) < 3:
            continue
        lvl, title, page = entry[0], (entry[1] or "").strip(), int(entry[2])
        if not title or page < 1 or page > total_pages:
            continue
        flat.append((int(lvl), title, page))

    for idx, (lvl, title, page) in enumerate(flat):
        if lvl == 1:
            canon, conf, method = _resolve(norm, title)
            current_sec = _Sec(
                raw_title=title,
                page_start=page,
                page_end=total_pages,
                canonical=canon,
                confidence=conf,
                match_method=method,
            )
            level1.append(current_sec)
        elif lvl == 2 and current_sec is not None:
            sub = _Subsec(
                raw_title=title,
                page_start=page,
                page_end=total_pages,
                canonical=None,
                confidence=0.0,
                match_method="none",
            )
            current_sec.subsections.append(sub)

    # Pass 2: fix page_end by reading the next-sibling's start, handling nested subs.
    for i, sec in enumerate(level1):
        if i + 1 < len(level1):
            sec.page_end = max(sec.page_start, level1[i + 1].page_start - 1)
        for j, sub in enumerate(sec.subsections):
            if j + 1 < len(sec.subsections):
                sub.page_end = max(sub.page_start, sec.subsections[j + 1].page_start - 1)
            else:
                sub.page_end = sec.page_end

    return level1


def _load_pages_from_extracted(extracted_json: Path) -> dict[int, str] | None:
    """Load page_number -> text from an already-extracted PyMuPDF JSON."""
    try:
        data = json.loads(extracted_json.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    pages = {}
    for p in data.get("pages", []):
        pn = p.get("page_number")
        if pn is not None:
            pages[int(pn)] = p.get("text") or ""
    return pages or None


def _load_pages_from_pdf(pdf_path: Path) -> dict[int, str]:
    d = fitz.open(pdf_path)
    pages = {i + 1: d[i].get_text("text") or "" for i in range(len(d))}
    d.close()
    return pages


def _join_pages(pages: dict[int, str], start: int, end: int, max_chars: int) -> str:
    parts: list[str] = []
    running = 0
    for pn in range(start, end + 1):
        t = pages.get(pn, "")
        if not t:
            continue
        if running + len(t) > max_chars:
            remaining = max_chars - running
            if remaining > 0:
                parts.append(t[:remaining])
            parts.append("\n\n[... truncated ...]")
            break
        parts.append(t)
        running += len(t)
    return "\n\n".join(parts)


def split_document(
    pdf_path: Path,
    *,
    extracted_json: Path | None,
    normalizer: TitleNormalizer,
    max_chars_per_section: int = 60_000,
    max_chars_per_subsection: int = 20_000,
) -> dict[str, Any]:
    """Return a ParsedDocument-shaped dict for one PDF."""
    d = fitz.open(pdf_path)
    total_pages = len(d)
    toc = d.get_toc()
    d.close()

    sections = _build_sections(toc, total_pages, normalizer)

    pages = _load_pages_from_extracted(extracted_json) if extracted_json else None
    if pages is None:
        pages = _load_pages_from_pdf(pdf_path)

    out_sections: list[dict[str, Any]] = []
    for order, sec in enumerate(sections):
        sec_text = _join_pages(pages, sec.page_start, sec.page_end, max_chars_per_section)
        sub_out: list[dict[str, Any]] = []
        for sidx, sub in enumerate(sec.subsections):
            sub_text = _join_pages(pages, sub.page_start, sub.page_end, max_chars_per_subsection)
            sub_out.append(
                {
                    "document_id": pdf_path.stem,
                    "source_file": pdf_path.name,
                    "raw_title": sub.raw_title,
                    "normalized_title": normalizer.normalize_text(sub.raw_title),
                    "canonical_section": None,
                    "canonical_subsection": None,
                    "level": 2,
                    "page_start": sub.page_start,
                    "page_end": sub.page_end,
                    "order_index": sidx,
                    "text": sub_text,
                    "parent_title": sec.raw_title,
                    "confidence": sub.confidence,
                    "subsections": [],
                }
            )
        out_sections.append(
            {
                "document_id": pdf_path.stem,
                "source_file": pdf_path.name,
                "raw_title": sec.raw_title,
                "normalized_title": normalizer.normalize_text(sec.raw_title),
                "canonical_section": sec.canonical,
                "canonical_subsection": None,
                "level": 1,
                "page_start": sec.page_start,
                "page_end": sec.page_end,
                "order_index": order,
                "text": sec_text,
                "parent_title": None,
                "confidence": sec.confidence,
                "match_method": sec.match_method,
                "subsections": sub_out,
            }
        )

    return {
        "document_id": pdf_path.stem,
        "source_file": pdf_path.name,
        "sections": out_sections,
        "chunks": [],
        "metadata": {
            "total_pages": total_pages,
            "toc_entries_level1": sum(1 for e in toc if e and e[0] == 1),
            "toc_entries_level2": sum(1 for e in toc if e and e[0] == 2),
            "splitter": "toc_v1",
        },
    }


def run(
    pdf_dir: Path,
    extracted_dir: Path | None,
    out_dir: Path,
    *,
    limit: int | None = None,
    resume: bool = True,
) -> dict[str, Any]:
    """Split every PDF in ``pdf_dir`` and write JSON files to ``out_dir``."""
    out_dir.mkdir(parents=True, exist_ok=True)
    pdf_files = sorted([p for p in pdf_dir.glob("*.pdf")])
    if limit:
        pdf_files = pdf_files[:limit]
    norm = TitleNormalizer(fuzzy_cutoff=0.78)

    written: list[str] = []
    skipped: list[str] = []
    failures: list[dict[str, Any]] = []

    t0 = time.time()
    for i, pdf in enumerate(pdf_files, 1):
        out_path = out_dir / f"{pdf.stem}.json"
        if resume and out_path.exists() and out_path.stat().st_size > 0:
            skipped.append(pdf.stem)
            continue
        extracted_json = (
            extracted_dir / f"{pdf.stem}.json" if extracted_dir else None
        )
        try:
            doc = split_document(pdf, extracted_json=extracted_json, normalizer=norm)
            out_path.write_text(
                json.dumps(doc, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            written.append(pdf.stem)
            log.info("toc_sectioned", doc=pdf.stem, sections=len(doc["sections"]),
                     idx=i, total=len(pdf_files))
        except Exception as exc:  # noqa: BLE001
            log.exception("toc_section_failed", doc=pdf.stem, error=str(exc))
            failures.append({"doc": pdf.stem, "error": str(exc)})

    summary = {
        "stage": "stage0_toc_sectioning",
        "pdf_dir": str(pdf_dir),
        "out_dir": str(out_dir),
        "written": len(written),
        "skipped": len(skipped),
        "failures": failures,
        "elapsed_seconds": round(time.time() - t0, 2),
    }
    (out_dir / "_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return summary


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="TOC-based prospectus sectioner (Stage 0).")
    ap.add_argument("--pdf-dir", type=Path, default=Path("hkex_prospectus"))
    ap.add_argument(
        "--extracted-dir",
        type=Path,
        default=Path("ipo_prospectus_pipeline/outputs_hkex_qwen/extracted"),
    )
    ap.add_argument("--out-dir", type=Path, default=Path("prospectus_kg_output/sections_toc"))
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--no-resume", action="store_true")
    args = ap.parse_args()

    summary = run(
        args.pdf_dir,
        args.extracted_dir if args.extracted_dir.exists() else None,
        args.out_dir,
        limit=args.limit,
        resume=not args.no_resume,
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False))

#!/usr/bin/env python3
"""Deterministically back-fill sparse ``section_Financial_Information`` fields in
``prospectus_kg_output/inputs/records/*.json`` from the source prospectus PDF.

Why: Stage-3 LLM extraction often misses numeric table rows (PyMuPDF layout),
so ``revenue`` / balance-sheet lines may be null even when the Summary and
Financial Information sections contain explicit RMB figures in narrative or
tabular text.

This script does **not** invent numbers: it only copies spans that match
conservative regexes against extracted PDF text. Filled values use the standard
evidence-pointer shape:

    { "value", "source_file", "page_start", "page_end", "span_preview" }

Optionally re-runs ``reverse_engineer_templates.fill_document`` so
``native_docs/<id>/templated/*`` reflects the richer records.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

_SCRIPT_DIR = Path(__file__).resolve().parent

try:
    import fitz  # PyMuPDF
except ImportError as exc:
    raise SystemExit("Install pymupdf: pip install pymupdf") from exc

SEC_FIN = "section_Financial_Information"
SEC_COVER = "section_Cover"

FIELD_REVENUE = "Financial_Information.revenue"
FIELD_NET = "Financial_Information.net_income"
FIELD_ASSETS = "Financial_Information.assets"
FIELD_LIAB = "Financial_Information.liabilities"
FIELD_CF = "Financial_Information.cash_flows"
FIELD_RATIOS = "Financial_Information.key_ratios"
FIELD_YEARS = "Financial_Information.financial_years"
FIELD_ISSUER = "Financial_Information.issuer_name"


def _field_empty(raw: Any) -> bool:
    if raw is None:
        return True
    if isinstance(raw, dict):
        v = raw.get("value")
        if v is None:
            return True
        if isinstance(v, str) and not v.strip():
            return True
        return False
    if isinstance(raw, str):
        return not raw.strip()
    return False


def _ensure_section(rec: dict[str, Any], sec: str) -> dict[str, Any]:
    rec.setdefault(sec, {})
    return rec[sec]


def _set_pointer(
    rec: dict[str, Any],
    sec: str,
    dotted: str,
    value: str,
    *,
    pdf_name: str,
    page: int,
    preview: str,
) -> None:
    _ensure_section(rec, sec)[dotted] = {
        "value": value.strip(),
        "source_file": pdf_name,
        "page_start": page,
        "page_end": page,
        "span_preview": preview[:500],
    }


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def _toc_pages(toc: dict, *canonicals: str) -> list[int]:
    pages: set[int] = set()
    for sec in toc.get("sections") or []:
        if sec.get("canonical_section") in canonicals:
            ps, pe = sec.get("page_start"), sec.get("page_end")
            if isinstance(ps, int) and isinstance(pe, int) and pe >= ps:
                pages.update(range(ps, pe + 1))
    return sorted(pages)


def _page_texts(
    doc: fitz.Document, page_nums: list[int]
) -> list[tuple[int, str]]:
    out: list[tuple[int, str]] = []
    for p in page_nums:
        if 1 <= p <= doc.page_count:
            out.append((p, doc[p - 1].get_text("text") or ""))
    return out


def _first_match_pages(
    page_texts: list[tuple[int, str]],
    predicate: Callable[[str], re.Match[str] | None],
) -> tuple[re.Match[str], int] | None:
    for pno, raw in page_texts:
        m = predicate(_norm(raw))
        if m:
            return m, pno
    return None


def _extract_revenue(page_texts: list[tuple[int, str]]) -> tuple[str, int, str] | None:
    patterns = [
        re.compile(
            r"Our revenues? grew from RMB([\d,]+(?:\.\d+)?) million in (\d{4}) to "
            r"RMB([\d,]+(?:\.\d+)?) million in (\d{4})(?: and further to "
            r"RMB([\d,]+(?:\.\d+)?) million in (\d{4}))?",
            re.I,
        ),
        re.compile(
            r"Our revenue grew from RMB([\d,]+(?:\.\d+)?) million in (\d{4}) to "
            r"RMB([\d,]+(?:\.\d+)?) million in (\d{4})",
            re.I,
        ),
    ]
    for pat in patterns:
        hit = _first_match_pages(page_texts, lambda n: pat.search(n))
        if hit:
            m, pno = hit
            desc = m.group(0)
            if len(m.groups()) >= 6 and m.group(5):
                val = (
                    f"Revenue grew from RMB{m.group(1)}m ({m.group(2)}) to "
                    f"RMB{m.group(3)}m ({m.group(4)}) to RMB{m.group(5)}m ({m.group(6)})"
                )
            elif len(m.groups()) >= 4:
                val = (
                    f"Revenue grew from RMB{m.group(1)}m ({m.group(2)}) to "
                    f"RMB{m.group(3)}m ({m.group(4)})"
                )
            else:
                val = desc
            return val, pno, desc[:400]
    return None


def _extract_net_losses(page_texts: list[tuple[int, str]]) -> tuple[str, int, str] | None:
    pat = re.compile(
        r"Our net losses? in ([^\.]+?) were "
        r"RMB([\d,]+(?:\.\d+)?) million,\s*"
        r"RMB([\d,]+(?:\.\d+)?) million,\s*"
        r"RMB([\d,]+(?:\.\d+)?) million (?:and|,) "
        r"RMB([\d,]+(?:\.\d+)?) million",
        re.I,
    )
    hit = _first_match_pages(page_texts, lambda n: pat.search(n))
    if hit:
        m, pno = hit
        periods = m.group(1).strip()
        val = (
            f"Net loss ({periods}): RMB{m.group(2)}m, RMB{m.group(3)}m, "
            f"RMB{m.group(4)}m, RMB{m.group(5)}m"
        )
        return val, pno, m.group(0)[:400]
    pat2 = re.compile(
        r"net loss(?:es)? (?:for|in) (?:the )?(?:year|period)[^.]{0,80}?RMB([\d,]+(?:\.\d+)?) million",
        re.I,
    )
    hit2 = _first_match_pages(page_texts, lambda n: pat2.search(n))
    if hit2:
        m, pno = hit2
        return (
            f"Net loss reference: RMB{m.group(1)} million ({m.group(0)[:80]}…)",
            pno,
            m.group(0)[:400],
        )
    return None


def _extract_balance_sheet_line(
    page_texts: list[tuple[int, str]], label: str
) -> tuple[str, int, str] | None:
    """Match ``Total assets`` / ``Total liabilities`` followed by 4 RMB'million'
    style numbers (common Summary layout)."""
    esc = re.escape(label)
    # Prospectus tables use long dot leaders between the label and figures.
    pat = re.compile(
        rf"{esc}[^0-9]{{0,260}}([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)\s+"
        rf"([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)",
        re.I,
    )

    def _pred(n: str) -> re.Match[str] | None:
        m = pat.search(n)
        if not m:
            return None
        # Reject if first capture looks like a year
        if re.fullmatch(r"\d{4}", m.group(1)):
            return None
        return m

    hit = _first_match_pages(page_texts, _pred)
    if hit:
        m, pno = hit
        val = (
            f"{label}: (columns) {m.group(1)} | {m.group(2)} | {m.group(3)} | "
            f"{m.group(4)} RMB'million (per Summary table)"
        )
        return val, pno, m.group(0)[:400]
    return None


def _extract_cashflow(page_texts: list[tuple[int, str]]) -> tuple[str, int, str] | None:
    pat = re.compile(
        r"net cash (used in|generated from) operating activities[^.]{0,40}"
        r"RMB([\d,]+(?:\.\d+)?) million[^.]{0,40}(\d{4})",
        re.I,
    )
    hit = _first_match_pages(page_texts, lambda n: pat.search(n))
    if hit:
        m, pno = hit
        val = (
            f"Operating cash flow ({m.group(1)}): RMB{m.group(2)}m ({m.group(3)})"
        )
        return val, pno, m.group(0)[:400]
    pat2 = re.compile(
        r"net cash used in operating activities decreased by[^.]+?RMB([\d,]+(?:\.\d+)?) million in (\d{4}) to RMB([\d,]+(?:\.\d+)?) million in (\d{4})",
        re.I,
    )
    hit2 = _first_match_pages(page_texts, lambda n: pat2.search(n))
    if hit2:
        m, pno = hit2
        val = (
            f"Operating cash: RMB{m.group(1)}m ({m.group(2)}) → RMB{m.group(3)}m ({m.group(4)})"
        )
        return val, pno, m.group(0)[:400]
    return None


def _extract_gross_margin(page_texts: list[tuple[int, str]]) -> tuple[str, int, str] | None:
    pat = re.compile(
        r"[Gg]ross margin[^.]{0,120}?(\d{1,2}(?:\.\d+)?)\s*%",
        re.I,
    )
    hit = _first_match_pages(page_texts, lambda n: pat.search(n))
    if hit:
        m, pno = hit
        return f"Gross margin (excerpt): {m.group(1)}%", pno, m.group(0)[:400]
    return None


def _extract_financial_years(page_texts: list[tuple[int, str]]) -> tuple[str, int, str] | None:
    pat = re.compile(
        r"(\d{4}),\s*(\d{4})\s+and\s+(\d{4})\s+refer to our financial years ended December 31",
        re.I,
    )
    hit = _first_match_pages(page_texts, lambda n: pat.search(n))
    if hit:
        m, pno = hit
        val = f"{m.group(1)}, {m.group(2)}, {m.group(3)} (years ended December 31)"
        return val, pno, m.group(0)[:200]
    return None


def _issuer_from_cover(rec: dict[str, Any]) -> str | None:
    cov = rec.get(SEC_COVER) or {}
    for k in ("Cover.issuer_name_en", "Cover.issuer_name_ch"):
        v = cov.get(k)
        if isinstance(v, dict) and v.get("value"):
            return str(v["value"]).strip()
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


def enrich_one(
    doc_id: str,
    *,
    pdf_path: Path,
    toc_path: Path,
    rec: dict[str, Any],
    pdf_basename: str,
) -> list[str]:
    """Mutates ``rec`` (the inner ``record`` dict). Returns list of dotted keys filled."""
    filled: list[str] = []
    if not pdf_path.exists():
        return filled

    toc: dict = {}
    if toc_path.exists():
        toc = json.loads(toc_path.read_text(encoding="utf-8"))

    summary_pages = _toc_pages(toc, "Summary")
    fin_pages = _toc_pages(toc, "Financial_Information")
    if not summary_pages and not fin_pages:
        summary_pages = list(range(1, min(45, 200)))

    scan_pages = sorted(set(summary_pages + fin_pages))
    # Cap very wide sections to keep runtime bounded
    if len(scan_pages) > 140:
        scan_pages = scan_pages[:140]

    doc = fitz.open(str(pdf_path))
    try:
        pts = _page_texts(doc, scan_pages)
    finally:
        doc.close()

    fin = _ensure_section(rec, SEC_FIN)

    if _field_empty(fin.get(FIELD_ISSUER)):
        name = _issuer_from_cover(rec)
        if name:
            _set_pointer(
                rec,
                SEC_FIN,
                FIELD_ISSUER,
                name,
                pdf_name=pdf_basename,
                page=summary_pages[0] if summary_pages else 1,
                preview=name,
            )
            filled.append(FIELD_ISSUER)

    if _field_empty(fin.get(FIELD_YEARS)):
        y = _extract_financial_years(pts)
        if y:
            val, pno, prev = y
            _set_pointer(
                rec, SEC_FIN, FIELD_YEARS, val,
                pdf_name=pdf_basename, page=pno, preview=prev,
            )
            filled.append(FIELD_YEARS)

    if _field_empty(fin.get(FIELD_REVENUE)):
        r = _extract_revenue(pts)
        if r:
            val, pno, prev = r
            _set_pointer(
                rec, SEC_FIN, FIELD_REVENUE, val,
                pdf_name=pdf_basename, page=pno, preview=prev,
            )
            filled.append(FIELD_REVENUE)

    if _field_empty(fin.get(FIELD_NET)):
        n = _extract_net_losses(pts)
        if n:
            val, pno, prev = n
            _set_pointer(
                rec, SEC_FIN, FIELD_NET, val,
                pdf_name=pdf_basename, page=pno, preview=prev,
            )
            filled.append(FIELD_NET)

    if _field_empty(fin.get(FIELD_ASSETS)):
        a = _extract_balance_sheet_line(pts, "Total assets")
        if a:
            val, pno, prev = a
            _set_pointer(
                rec, SEC_FIN, FIELD_ASSETS, val,
                pdf_name=pdf_basename, page=pno, preview=prev,
            )
            filled.append(FIELD_ASSETS)

    if _field_empty(fin.get(FIELD_LIAB)):
        l = _extract_balance_sheet_line(pts, "Total liabilities")
        if l:
            val, pno, prev = l
            _set_pointer(
                rec, SEC_FIN, FIELD_LIAB, val,
                pdf_name=pdf_basename, page=pno, preview=prev,
            )
            filled.append(FIELD_LIAB)

    if _field_empty(fin.get(FIELD_CF)):
        c = _extract_cashflow(pts)
        if c:
            val, pno, prev = c
            _set_pointer(
                rec, SEC_FIN, FIELD_CF, val,
                pdf_name=pdf_basename, page=pno, preview=prev,
            )
            filled.append(FIELD_CF)

    if _field_empty(fin.get(FIELD_RATIOS)):
        g = _extract_gross_margin(pts)
        if g:
            val, pno, prev = g
            _set_pointer(
                rec, SEC_FIN, FIELD_RATIOS, val,
                pdf_name=pdf_basename, page=pno, preview=prev,
            )
            filled.append(FIELD_RATIOS)

    return filled


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--records-dir", default="prospectus_kg_output/inputs/records")
    ap.add_argument("--pdf-dir", default="hkex_prospectus")
    ap.add_argument("--toc-dir", default="prospectus_kg_output/sections_toc")
    ap.add_argument("--only", default=None, help="Single document_id stem")
    ap.add_argument("--regen-templated", action="store_true")
    ap.add_argument(
        "--native-out",
        default="prospectus_kg_output/native_docs",
        help="Root for native_docs when --regen-templated",
    )
    args = ap.parse_args()

    records_dir = Path(args.records_dir)
    pdf_dir = Path(args.pdf_dir)
    toc_dir = Path(args.toc_dir)
    native_out = Path(args.native_out)

    paths = sorted(records_dir.glob("*.json"))
    if args.only:
        paths = [records_dir / f"{args.only}.json"]

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    total_fills = 0
    docs_touched = 0

    for rec_path in paths:
        if not rec_path.exists():
            continue
        doc_id = rec_path.stem
        data = json.loads(rec_path.read_text(encoding="utf-8"))
        inner = data.setdefault("record", {})
        pdf_path = pdf_dir / f"{doc_id}.pdf"
        toc_path = toc_dir / f"{doc_id}.json"

        filled = enrich_one(
            doc_id,
            pdf_path=pdf_path,
            toc_path=toc_path,
            rec=inner,
            pdf_basename=f"{doc_id}.pdf",
        )
        if filled:
            docs_touched += 1
            total_fills += len(filled)
            meta = data.setdefault("enrichment", {})
            meta["financial_from_pdf"] = {
                "enriched_at": ts,
                "fields_filled": filled,
            }
            rec_path.write_text(
                json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            print(f"[enrich] {doc_id}: {len(filled)} field(s) -> {', '.join(filled)}")
            if args.regen_templated:
                import sys

                if str(_SCRIPT_DIR) not in sys.path:
                    sys.path.insert(0, str(_SCRIPT_DIR))
                from reverse_engineer_templates import fill_document

                fill_document(doc_id, records_dir=records_dir, out_root=native_out)

    print(
        f"\nDone. Updated {docs_touched} record file(s); {total_fills} field fill(s)."
    )


if __name__ == "__main__":
    main()

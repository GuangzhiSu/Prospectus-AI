#!/usr/bin/env python3
"""Add dense section-source materials to reverse-engineered input records.

The per-section reverse extraction schema is intentionally narrow: it contains
only the fields required by the current writing cards. Long prospectus sections
therefore often collapse into a few values, even when the source section has
dozens of market figures, regulatory citations, financial movements, or product
facts. This deterministic enrichment pass keeps the schema values intact and
adds a parallel ``extracted_source_materials`` block mined from the already
segmented prospectus text.

No model/API is used. The output is designed to be consumed by source packages,
Agent1 JSON ingestion, and manual inspection.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any


NUMERIC_RE = re.compile(
    r"(?i)(?:HK\$|RMB|US\$|USD|HKD|million|billion|trillion|%|CAGR|year ended|"
    r"years ended|for the year|from 20\d{2}|to 20\d{2}|\b20\d{2}\b|\d[\d,]*(?:\.\d+)?)"
)
TERM_RE = re.compile(r"[\"“]([^\"”]{1,90})[\"”]\s+(.+?)(?=\s+[\"“][^\"”]{1,90}[\"”]\s+|$)")
WORD_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_\-./%]*")


SECTION_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Summary": (
        "overview", "competitive", "financial", "risk", "strategy", "offering",
        "market", "business model", "customer", "revenue",
    ),
    "Business": (
        "overview", "business model", "products", "services", "platform",
        "customer", "supplier", "sales", "marketing", "technology", "research",
        "development", "competitive", "strategy", "strengths", "operation",
    ),
    "Industry_Overview": (
        "market", "market size", "CAGR", "growth", "trend", "driver",
        "competitive", "ranking", "share", "penetration", "industry",
        "forecast", "Frost", "Sullivan",
    ),
    "Financial_Information": (
        "revenue", "gross profit", "margin", "profit", "loss", "cash",
        "assets", "liabilities", "working capital", "indebtedness", "liquidity",
        "capital expenditure", "year ended", "period",
    ),
    "Risk_Factors": (
        "risk", "may", "could", "adverse", "uncertain", "failure",
        "competition", "regulatory", "compliance", "depend", "material",
    ),
    "Regulatory_Overview": (
        "law", "regulation", "measures", "rules", "authority", "license",
        "permit", "approval", "compliance", "foreign investment", "cybersecurity",
        "data", "personal information", "MIIT", "MOFCOM", "SAMR", "CSRC",
    ),
    "Contractual_Arrangements_VIE": (
        "contractual arrangements", "exclusive", "option", "equity pledge",
        "power of attorney", "registered shareholders", "WFOE", "VIE",
        "control", "economic benefit",
    ),
    "Future_Plans_and_Use_of_Proceeds": (
        "net proceeds", "approximately", "HK$", "use", "upgrade", "enhance",
        "research", "development", "investment", "acquisition", "working capital",
    ),
    "Underwriting": (
        "underwriting", "underwriters", "commission", "lock-up", "stabilization",
        "over-allotment", "agreement", "termination", "indemnity",
    ),
    "Structure_of_the_Global_Offering": (
        "Hong Kong Public Offering", "International Offering", "reallocation",
        "offer shares", "over-allotment", "basis of allocation", "clawback",
    ),
    "How_to_Apply_for_Hong_Kong_Offer_Shares": (
        "apply", "application", "White Form", "Yellow Form", "eIPO",
        "CCASS", "payment", "refund", "deadline", "minimum",
    ),
    "Directors_and_Senior_Management": (
        "director", "executive", "independent", "senior management", "age",
        "experience", "appointed", "responsible", "degree", "qualification",
    ),
    "Substantial_Shareholders": (
        "shareholder", "interest", "shares", "voting rights", "percentage",
        "Class A", "Class B", "SFO", "deemed",
    ),
    "Connected_Transactions": (
        "connected transaction", "continuing", "annual cap", "waiver",
        "Listing Rules", "associate", "connected person", "agreement",
    ),
    "History_Reorganization_Corporate_Structure": (
        "incorporated", "established", "reorganization", "subsidiary",
        "acquisition", "transfer", "shareholding", "corporate structure",
    ),
    "Appendices": (
        "accountants", "report", "financial information", "note", "pro forma",
        "property valuation", "statutory", "documents", "available for inspection",
    ),
}


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _normalize_ws(text: str) -> str:
    text = re.sub(r"\s+[–-]\s*\d+\s*[–-]\s+", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()


def _sentence_split(text: str) -> list[str]:
    normalized = _normalize_ws(text)
    if not normalized:
        return []
    parts = re.split(r"(?<=[.!?])\s+(?=(?:[A-Z0-9\"“'‘]|\())", normalized)
    out: list[str] = []
    for part in parts:
        part = part.strip()
        if len(part) < 35:
            continue
        if len(part) > 900:
            for sub in re.split(r"\s*[;•]\s*", part):
                sub = sub.strip()
                if 35 <= len(sub) <= 900:
                    out.append(sub)
        else:
            out.append(part)
    return out


def _dedupe_keep_order(items: list[str], limit: int) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = re.sub(r"\W+", " ", item.lower()).strip()[:180]
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(item)
        if len(out) >= limit:
            break
    return out


def _score_sentence(section_id: str, sentence: str, position: int) -> float:
    lower = sentence.lower()
    keywords = SECTION_KEYWORDS.get(section_id, ())
    score = 0.0
    if NUMERIC_RE.search(sentence):
        score += 4.0
    score += sum(1.4 for kw in keywords if kw.lower() in lower)
    if "according to" in lower or "we are" in lower or "we believe" in lower:
        score += 0.8
    if len(sentence) > 220:
        score -= 0.4
    score -= position / 10000.0
    return score


def _fact_items(
    *,
    section_id: str,
    sentences: list[str],
    meta: dict[str, Any],
    kind: str,
    limit: int,
) -> list[dict[str, Any]]:
    rows: list[tuple[float, int, str]] = []
    for i, sentence in enumerate(sentences):
        has_number = bool(NUMERIC_RE.search(sentence))
        if kind == "numeric_fact" and not has_number:
            continue
        if kind == "narrative_point" and has_number:
            continue
        score = _score_sentence(section_id, sentence, i)
        if kind == "narrative_point" and score < 1.4:
            continue
        if kind == "numeric_fact" and score < 3.5:
            continue
        rows.append((score, i, sentence))

    ranked = sorted(rows, key=lambda x: (-x[0], x[1]))[: limit * 2]
    selected = sorted(ranked[:limit], key=lambda x: x[1])
    out: list[dict[str, Any]] = []
    for _, idx, sentence in selected:
        out.append(
            {
                "kind": kind,
                "text": sentence,
                "source_file": meta.get("source_file"),
                "page_start": meta.get("page_start"),
                "page_end": meta.get("page_end"),
                "section_sentence_index": idx,
                "evidence_status": "section_traceable",
            }
        )
    return out


def _extract_outline(text: str, limit: int = 36) -> list[str]:
    candidates: list[str] = []
    for raw in (text or "").splitlines():
        line = _normalize_ws(raw).strip(" .:-")
        if not (3 <= len(line) <= 120):
            continue
        letters = [c for c in line if c.isalpha()]
        if not letters:
            continue
        if re.fullmatch(r"(?i)(?:20\d{2}E?|HK\$[\d,.]+|RMB[\d,.]+|[\d.,%x ]+)", line):
            continue
        upper_ratio = sum(1 for c in letters if c.isupper()) / max(len(letters), 1)
        word_count = len(line.split())
        if upper_ratio >= 0.65 and word_count <= 12:
            candidates.append(line)
        elif (
            word_count <= 9
            and any(token in line.lower() for token in ("overview", "our ", "risk", "regulation", "financial", "market"))
            and not line.endswith(".")
        ):
            candidates.append(line)
    return _dedupe_keep_order(candidates, limit)


def _excerpt_blocks(
    *,
    section_id: str,
    text: str,
    meta: dict[str, Any],
    outline: list[str],
    limit: int = 4,
) -> list[dict[str, Any]]:
    normalized = _normalize_ws(text)
    if not normalized:
        return []
    anchors = ["opening"]
    anchors.extend(outline[: max(0, limit - 1)])
    blocks: list[dict[str, Any]] = []
    seen_ranges: set[tuple[int, int]] = set()
    for anchor in anchors:
        if anchor == "opening":
            start = 0
        else:
            idx = normalized.lower().find(anchor.lower())
            if idx < 0:
                continue
            start = max(0, idx - 120)
        end = min(len(normalized), start + 850)
        span = (start, end)
        if any(abs(start - old_start) < 200 for old_start, _ in seen_ranges):
            continue
        seen_ranges.add(span)
        blocks.append(
            {
                "label": anchor,
                "text": normalized[start:end].strip(),
                "source_file": meta.get("source_file"),
                "page_start": meta.get("page_start"),
                "page_end": meta.get("page_end"),
                "section_id": section_id,
                "evidence_status": "section_traceable",
            }
        )
        if len(blocks) >= limit:
            break
    return blocks


def _term_definitions(text: str, meta: dict[str, Any], limit: int = 80) -> list[dict[str, Any]]:
    normalized = _normalize_ws(text)
    rows: list[dict[str, Any]] = []
    for match in TERM_RE.finditer(normalized):
        term = _normalize_ws(match.group(1))
        definition = _normalize_ws(match.group(2)).strip(" ;")
        if not term or not definition or len(definition) < 8:
            continue
        if len(definition) > 700:
            definition = definition[:697].rstrip() + "..."
        rows.append(
            {
                "term": term,
                "definition": definition,
                "source_file": meta.get("source_file"),
                "page_start": meta.get("page_start"),
                "page_end": meta.get("page_end"),
                "evidence_status": "section_traceable",
            }
        )
        if len(rows) >= limit:
            break
    return rows


def _build_materials(section: dict[str, Any]) -> dict[str, Any]:
    section_id = str(section.get("canonical_section") or "")
    text = section.get("text") or ""
    meta = {
        "source_file": section.get("source_file"),
        "page_start": section.get("page_start"),
        "page_end": section.get("page_end"),
    }
    sentences = _sentence_split(text)
    outline = _extract_outline(text)
    materials: dict[str, Any] = {
        "schema_version": "section-source-materials/1.0",
        "extraction_method": "deterministic_text_mining_v1",
        "section_id": section_id,
        "source_file": section.get("source_file"),
        "page_start": section.get("page_start"),
        "page_end": section.get("page_end"),
        "char_count": len(text),
        "word_count": len(WORD_RE.findall(text)),
        "subsection_outline": outline,
        "key_numeric_facts": _fact_items(
            section_id=section_id,
            sentences=sentences,
            meta=meta,
            kind="numeric_fact",
            limit=18,
        ),
        "key_narrative_points": _fact_items(
            section_id=section_id,
            sentences=sentences,
            meta=meta,
            kind="narrative_point",
            limit=12,
        ),
        "source_excerpt_blocks": _excerpt_blocks(
            section_id=section_id,
            text=text,
            meta=meta,
            outline=outline,
            limit=4,
        ),
    }
    if section_id in {"Glossary_of_Technical_Terms", "Definitions"}:
        materials["term_definitions"] = _term_definitions(text, meta)

    materials["counts"] = {
        "sentences_seen": len(sentences),
        "outline_items": len(materials["subsection_outline"]),
        "numeric_facts": len(materials["key_numeric_facts"]),
        "narrative_points": len(materials["key_narrative_points"]),
        "excerpt_blocks": len(materials["source_excerpt_blocks"]),
        "term_definitions": len(materials.get("term_definitions") or []),
    }
    return materials


def _toc_index(sections_dir: Path, doc_id: str) -> dict[str, dict[str, Any]]:
    data = _load_json(sections_dir / f"{doc_id}.json")
    out: dict[str, dict[str, Any]] = {}
    for section in data.get("sections", []) or []:
        sid = section.get("canonical_section")
        if sid and sid not in out:
            out[str(sid)] = section
    return out


def enrich_all(
    *,
    input_records_dir: Path,
    sections_dir: Path,
    only_doc: str | None = None,
    only_section: str | None = None,
    dry_run: bool = False,
) -> dict[str, Any]:
    doc_dirs = sorted(p for p in input_records_dir.iterdir() if p.is_dir())
    if only_doc:
        doc_dirs = [input_records_dir / only_doc]

    totals = Counter()
    sample_low_density: list[dict[str, Any]] = []
    for doc_dir in doc_dirs:
        if not doc_dir.exists():
            continue
        doc_id = doc_dir.name
        toc = _toc_index(sections_dir, doc_id)
        for path in sorted(doc_dir.glob("*.json")):
            section_id = path.stem
            if only_section and section_id != only_section:
                continue
            record = _load_json(path)
            section = toc.get(section_id)
            totals["files_seen"] += 1
            if not section or not section.get("text"):
                totals["missing_section_text"] += 1
                continue
            materials = _build_materials(section)
            values = record.get("values") if isinstance(record.get("values"), dict) else {}
            filled = sum(1 for v in values.values() if v not in (None, "", [], {}))
            if materials["word_count"] >= 1500 and filled <= 5:
                sample_low_density.append(
                    {
                        "document_id": doc_id,
                        "section_id": section_id,
                        "filled_values": filled,
                        "word_count": materials["word_count"],
                        "numeric_facts": materials["counts"]["numeric_facts"],
                        "narrative_points": materials["counts"]["narrative_points"],
                    }
                )

            if record.get("extracted_source_materials") != materials:
                record["extracted_source_materials"] = materials
                totals["files_enriched"] += 1
                totals["numeric_facts"] += materials["counts"]["numeric_facts"]
                totals["narrative_points"] += materials["counts"]["narrative_points"]
                totals["excerpt_blocks"] += materials["counts"]["excerpt_blocks"]
                totals["term_definitions"] += materials["counts"]["term_definitions"]
                if not dry_run:
                    path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            else:
                totals["unchanged"] += 1

    return {
        "input_records_dir": str(input_records_dir),
        "sections_dir": str(sections_dir),
        "counts": dict(totals),
        "sample_low_density_sections": sample_low_density[:50],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich input records with dense section source materials.")
    parser.add_argument("--input-records-dir", type=Path, default=Path("prospectus_kg_output/inputs/input_records"))
    parser.add_argument("--sections-dir", type=Path, default=Path("prospectus_kg_output/sections_toc"))
    parser.add_argument("--only-doc")
    parser.add_argument("--only-section")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    report = enrich_all(
        input_records_dir=args.input_records_dir,
        sections_dir=args.sections_dir,
        only_doc=args.only_doc,
        only_section=args.only_section,
        dry_run=args.dry_run,
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Agent1: Process Excel and JSON files → dual retrieval stores.

Output:
  agent1_output/
    text_chunks.jsonl   - Narrative content (Excel, industry descriptions, long text)
    fact_store.jsonl    - Structured facts (metrics, periods, values)
    manifest.json

Text store: chunk_size 500–700, overlap 100. For RAG over narrative.
Fact store: flattened field.period.metric → value, unit, metadata.
"""

from __future__ import annotations

import argparse
import json
import hashlib
import re
from pathlib import Path
from typing import Any

DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct"

# Text store chunk params (narrative generation)
TEXT_CHUNK_SIZE = 600  # 500–700 range
TEXT_CHUNK_OVERLAP = 100

SECTIONS = [
    ("A", "Business & Strategy"),
    ("B", "Industry & Market"),
    ("C", "Risk Factors"),
    ("D", "Financial Performance & Condition"),
    ("E", "Use of Proceeds & Capital Structure"),
    ("F", "Management, Governance & Incentives"),
    ("G", "Legal, Regulatory & Compliance"),
    ("H", "Offering Mechanics & Share Structure"),
]

FILE_TO_SECTION: dict[str, str] = {
    "company-introduction": "A", "business-data": "A", "market-performance-comparison": "B",
    "comprehensive-comparison": "B", "balance-sheet": "D", "financial-ratios-comparison": "D",
    "financial-data-comparison": "D", "cash-flow": "D", "growth-capability": "D",
    "operating-capability": "D", "profit-forecast-comparison": "D",
    "share-capital-structure": "E", "holdings-or-equity": "E", "mainland-fund-holdings": "E",
    "board-and-executives": "F",
}

JSON_CATEGORY_TO_SECTION: dict[str, str] = {
    "company_profile": "A", "corporate_structure": "A", "business": "A",
    "products_and_technology": "A", "customers": "A", "market": "B", "competition": "B",
    "financials": "D", "operating_metrics": "D", "risk_related_data": "C",
    "management": "F", "shareholders": "E", "ipo_offering": "H",
    # legacy keys
    "company_information": "A", "business_operations": "A", "offering_information": "H",
}


def _infer_unit(key: str) -> str | None:
    key_lower = key.lower()
    if "_rmb" in key_lower or "rmb" in key_lower: return "RMB"
    if "_hkd" in key_lower or "hkd" in key_lower: return "HKD"
    if "_usd" in key_lower or "usd" in key_lower: return "USD"
    if "_pct" in key_lower or "_ratio" in key_lower or "pct" in key_lower: return "%"
    if "margin" in key_lower and "gross" in key_lower or "net_margin" in key_lower: return "%"
    return None


def _extract_facts(
    prefix: str,
    value: Any,
    facts: list[dict[str, Any]],
    source_file: str,
) -> None:
    """Recursively extract structured facts from JSON value."""
    if value is None:
        return
    if isinstance(value, (str, int, float, bool)):
        unit = _infer_unit(prefix.split(".")[-1]) if "." in prefix else None
        facts.append({
            "field": prefix,
            "period": None,
            "metric": prefix.split(".")[-1] if "." in prefix else prefix,
            "value": value,
            "unit": unit,
            "metadata": {"source_file": source_file},
        })
        return
    if isinstance(value, list):
        for i, item in enumerate(value):
            if isinstance(item, dict):
                period = item.get("period") or item.get("date")
                for k, v in item.items():
                    if k in ("period", "date", "period_reference"):
                        continue
                    if isinstance(v, (str, int, float, bool)) and v is not None:
                        unit = _infer_unit(k)
                        fact: dict[str, Any] = {
                            "field": prefix,
                            "period": period,
                            "metric": k,
                            "value": v,
                            "unit": unit,
                            "metadata": {"source_file": source_file},
                        }
                        facts.append(fact)
                    elif isinstance(v, (dict, list)):
                        _extract_facts(f"{prefix}.{k}", v, facts, source_file)
            elif isinstance(item, (str, int, float, bool)):
                facts.append({
                    "field": prefix,
                    "period": None,
                    "metric": "item",
                    "value": item,
                    "unit": None,
                    "metadata": {"source_file": source_file, "index": i},
                })
        return
    if isinstance(value, dict):
        # Check for range-style (low, high, currency)
        if "low" in value and "high" in value:
            facts.append({
                "field": prefix,
                "period": None,
                "metric": "price_range",
                "value": value.get("low"),
                "unit": value.get("currency", "HKD"),
                "metadata": {"high": value.get("high"), "source_file": source_file},
            })
            if value.get("high") != value.get("low"):
                facts.append({
                    "field": prefix,
                    "period": None,
                    "metric": "price_range_high",
                    "value": value.get("high"),
                    "unit": value.get("currency", "HKD"),
                    "metadata": {"source_file": source_file},
                })
            return
        for k, v in value.items():
            if isinstance(v, (str, int, float, bool)):
                unit = _infer_unit(k)
                facts.append({
                    "field": f"{prefix}.{k}",
                    "period": None,
                    "metric": k,
                    "value": v,
                    "unit": unit,
                    "metadata": {"source_file": source_file},
                })
            else:
                _extract_facts(f"{prefix}.{k}", v, facts, source_file)


def extract_facts_from_json(path: Path) -> list[dict[str, Any]]:
    """Extract fact entries from structured IPO JSON."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        return []
    facts: list[dict[str, Any]] = []
    source = path.name
    for category, fields in data.items():
        if not isinstance(fields, dict):
            continue
        section = JSON_CATEGORY_TO_SECTION.get(category, "A")
        for field_name, value in fields.items():
            if value is None:
                continue
            full_field = f"{category}.{field_name}"
            start_len = len(facts)
            _extract_facts(full_field, value, facts, source)
            for f in facts[start_len:]:
                f.setdefault("metadata", {})["section_hint"] = section
    return facts


def _is_narrative_field(category: str, field_name: str, value: Any) -> bool:
    """Fields suitable for text store: arrays of strings, long text."""
    if isinstance(value, str) and len(value) > 200:
        return True
    if isinstance(value, list) and value and isinstance(value[0], str):
        # industry_trends, competitive_advantages, etc.
        return True
    return False


def _narrative_to_text(prefix: str, value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list) and value and isinstance(value[0], str):
        return "\n".join(f"- {v}" for v in value)
    return ""


def extract_text_from_json(path: Path) -> list[dict[str, Any]]:
    """Extract narrative text chunks from JSON (industry descriptions, long text)."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        return []
    texts: list[dict[str, Any]] = []
    source = path.name
    for category, fields in data.items():
        if not isinstance(fields, dict):
            continue
        section = JSON_CATEGORY_TO_SECTION.get(category, "A")
        for field_name, value in fields.items():
            if not _is_narrative_field(category, field_name, value):
                continue
            text = _narrative_to_text(f"{category}.{field_name}", value)
            if not text.strip():
                continue
            texts.append({
                "text": text,
                "source_file": source,
                "section_hint": section,
                "topic": f"{category}.{field_name}",
                "importance": "medium",
            })
    return texts


def chunk_text(text: str, max_chars: int = 600, overlap: int = 100) -> list[str]:
    cleaned = re.sub(r"\r", "\n", text).strip()
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    if not cleaned:
        return []
    chunks: list[str] = []
    i = 0
    while i < len(cleaned):
        end = min(i + max_chars, len(cleaned))
        slice_ = cleaned[i:end].strip()
        if slice_:
            chunks.append(slice_)
        i = end - overlap
        if i < 0:
            i = 0
        if end >= len(cleaned):
            break
    return chunks


def summarize_table_with_qwen(
    text_sample: str,
    filename: str,
    sheet_name: str,
    model_name: str = DEFAULT_MODEL,
) -> str:
    try:
        from llm_qwen import run_qwen_text
        out = run_qwen_text(
            f"Summarize this Excel table in 2-4 sentences for HKEX prospectus drafting. Be factual.\n\nFile: {filename}\nSheet: {sheet_name}\n\nExcerpt:\n{text_sample[:2500]}\n\nSUMMARY:",
            model_name=model_name, max_new_tokens=256
        )
        return out.strip() or f"Table: {filename} / {sheet_name}"
    except Exception:
        return f"Table: {filename} / {sheet_name}"


def classify_file(filename: str) -> str:
    stem = Path(filename).stem.lower()
    for key, section_id in FILE_TO_SECTION.items():
        if key in stem:
            return section_id
    return "D"


def extract_per_sheet(path: Path) -> list[tuple[str, str]]:
    try:
        import pandas as pd
    except ImportError:
        raise ImportError("agent1 requires pandas and openpyxl")
    xl = pd.ExcelFile(path, engine="openpyxl")
    result: list[tuple[str, str]] = []
    for sheet in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name=sheet, header=None, dtype=str)
        text = df.to_string(index=False, header=False, na_rep="")
        if text.strip():
            result.append((sheet, f"[Sheet: {sheet}]\n{text}"))
    return result


def run_agent1(
    data_dir: str | Path = "data",
    output_dir: str | Path = "agent1_output",
    text_chunk_size: int = TEXT_CHUNK_SIZE,
    text_chunk_overlap: int = TEXT_CHUNK_OVERLAP,
    model_name: str = DEFAULT_MODEL,
) -> None:
    data_path = Path(data_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    (output_path / "by_section").mkdir(exist_ok=True)

    excel_files = sorted(data_path.glob("*.xlsx"))
    json_files = sorted(data_path.glob("*.json"))
    if not excel_files and not json_files:
        raise FileNotFoundError(
            f"No .xlsx or .json files in {data_path}. Put files there first."
        )

    text_chunks: list[dict[str, Any]] = []
    fact_store: list[dict[str, Any]] = []
    sheet_summaries: dict[tuple[str, str], str] = {}
    by_section: dict[str, list[dict[str, Any]]] = {s[0]: [] for s in SECTIONS}

    # --- Excel → text store ---
    for f in excel_files:
        sheets = extract_per_sheet(f)
        if not sheets:
            continue
        section_id = classify_file(f.name)
        section_name = next((n for sid, n in SECTIONS if sid == section_id), "Unknown")
        for sheet_name, sheet_text in sheets:
            print(f"  [Qwen] {f.name} / {sheet_name} -> summarising...")
            summary = summarize_table_with_qwen(sheet_text, f.name, sheet_name, model_name=model_name)
            sheet_summaries[(f.name, sheet_name)] = summary
            chunks = chunk_text(sheet_text, max_chars=text_chunk_size, overlap=text_chunk_overlap)
            for i, chunk in enumerate(chunks):
                chunk_id = hashlib.md5(f"{f.name}:{sheet_name}:{i}:{chunk[:50]}".encode()).hexdigest()[:12]
                rec = {
                    "text": f"{summary}\n\n[Data]\n{chunk}",
                    "source_file": f.name,
                    "section_hint": section_id,
                    "topic": sheet_name,
                    "importance": "high",
                    "chunk_id": chunk_id,
                    "source_type": "excel_sheet",
                    "sheet_name": sheet_name,
                }
                text_chunks.append(rec)
                by_section[section_id].append(rec)
        print(f"  [Qwen] {f.name} -> Section {section_id} ({len(sheets)} sheets)")

    # --- JSON → fact store + narrative text ---
    for f in json_files:
        print(f"  [JSON] {f.name} -> extracting...")
        facts = extract_facts_from_json(f)
        for i, fact in enumerate(facts):
            fact["fact_id"] = hashlib.md5(
                f"{f.name}:{fact.get('field','')}:{i}:{str(fact.get('value',''))}".encode()
            ).hexdigest()[:12]
            fact_store.append(fact)
        narrative = extract_text_from_json(f)
        for item in narrative:
            chunk_list = chunk_text(
                item["text"],
                max_chars=text_chunk_size,
                overlap=text_chunk_overlap,
            )
            for j, chunk in enumerate(chunk_list):
                chunk_id = hashlib.md5(f"{f.name}:{item['topic']}:{j}".encode()).hexdigest()[:12]
                rec = {
                    "text": chunk,
                    "source_file": item["source_file"],
                    "section_hint": item["section_hint"],
                    "topic": item["topic"],
                    "importance": item["importance"],
                    "chunk_id": chunk_id,
                    "source_type": "json_narrative",
                }
                text_chunks.append(rec)
                by_section[item["section_hint"]].append(rec)
        print(f"  [JSON] {f.name} -> {len(facts)} facts, {len(narrative)} narrative blocks")

    # --- Write text_chunks.jsonl ---
    text_path = output_path / "text_chunks.jsonl"
    with open(text_path, "w", encoding="utf-8") as out:
        for rec in text_chunks:
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"Wrote {len(text_chunks)} text chunks to {text_path}")

    # --- Write fact_store.jsonl ---
    fact_path = output_path / "fact_store.jsonl"
    with open(fact_path, "w", encoding="utf-8") as out:
        for rec in fact_store:
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"Wrote {len(fact_store)} facts to {fact_path}")

    # --- Backward compatibility: rag_chunks.jsonl (merged view for old retriever) ---
    rag_chunks: list[dict[str, Any]] = []
    for i, rec in enumerate(text_chunks):
        rag_chunks.append({
            "chunk_id": rec.get("chunk_id", str(i)),
            "section_id": rec.get("section_hint", "A"),
            "section": next((n for sid, n in SECTIONS if sid == rec.get("section_hint", "A")), "Unknown"),
            "source_file": rec.get("source_file", ""),
            "sheet_name": rec.get("topic", rec.get("sheet_name", "")),
            "chunk_index": i,
            "text": rec["text"],
            "sheet_summary": rec.get("topic", "")[:100],
            "source_type": rec.get("source_type", "text_chunk"),
        })
    # Append fact summaries as text-like chunks for context (so section writer sees facts)
    facts_by_section: dict[str, list[dict]] = {}
    for fact in fact_store:
        sh = fact.get("metadata", {}).get("section_hint", "A")
        facts_by_section.setdefault(sh, []).append(fact)
    for section_id, facts in facts_by_section.items():
        block = "\n".join(
            f"{f['field']}: {f['metric']}={f['value']}" + (f" ({f['period']})" if f.get("period") else "")
            for f in facts[:50]  # limit to avoid huge context
        )
        if block:
            rag_chunks.append({
                "chunk_id": hashlib.md5(f"facts_{section_id}".encode()).hexdigest()[:12],
                "section_id": section_id,
                "section": next((n for sid, n in SECTIONS if sid == section_id), "Unknown"),
                "source_file": "fact_store",
                "sheet_name": f"facts_{section_id}",
                "chunk_index": len(rag_chunks),
                "text": f"[Structured Facts - {section_id}]\n{block}",
                "sheet_summary": f"Facts for section {section_id}",
                "source_type": "fact_store",
            })
    main_path = output_path / "rag_chunks.jsonl"
    with open(main_path, "w", encoding="utf-8") as out:
        for rec in rag_chunks:
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"Wrote {len(rag_chunks)} combined chunks (backward compat) to {main_path}")

    # --- Write by_section (for section preview API) ---
    for section_id, section_name in SECTIONS:
        recs = by_section[section_id]
        if recs:
            spath = output_path / "by_section" / f"section_{section_id}.jsonl"
            with open(spath, "w", encoding="utf-8") as out:
                for r in recs:
                    # API expects source_file, sheet_name, sheet_summary
                    api_rec = {
                        "source_file": r.get("source_file", ""),
                        "sheet_name": r.get("sheet_name", r.get("topic", "")),
                        "sheet_summary": r.get("topic", r.get("sheet_name", ""))[:150],
                        "text": r.get("text", "")[:500],
                    }
                    out.write(json.dumps(api_rec, ensure_ascii=False) + "\n")
            print(f"  Section {section_id}: {len(recs)} items -> {spath}")

    # --- Write manifest ---
    manifest = {
        "text_chunk_count": len(text_chunks),
        "fact_count": len(fact_store),
        "total_chunks": len(rag_chunks),  # backward compat for frontend
        "sections": [
            {
                "id": s[0],
                "name": s[1],
                "chunk_count": len(by_section[s[0]]),
                "fact_count": len(facts_by_section.get(s[0], [])),
            }
            for s in SECTIONS
        ],
        "source_files": list({c.get("source_file", "") for c in text_chunks}),
        "sheet_summaries": {f"{k[0]}:{k[1]}": v for k, v in sheet_summaries.items()},
    }
    with open(output_path / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"Wrote manifest to {output_path / 'manifest.json'}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Agent1: Excel + JSON → text_chunks + fact_store")
    parser.add_argument("--data-dir", default="data")
    parser.add_argument("--output-dir", default="agent1_output")
    parser.add_argument("--text-chunk-size", type=int, default=TEXT_CHUNK_SIZE)
    parser.add_argument("--text-chunk-overlap", type=int, default=TEXT_CHUNK_OVERLAP)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    args = parser.parse_args()
    run_agent1(
        data_dir=args.data_dir,
        output_dir=args.output_dir,
        text_chunk_size=args.text_chunk_size,
        text_chunk_overlap=args.text_chunk_overlap,
        model_name=args.model,
    )


if __name__ == "__main__":
    main()

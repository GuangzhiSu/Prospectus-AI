#!/usr/bin/env python3
"""
Agent1: Process Excel files in data/ → RAG-ready materials by prospectus section.

Assumes upstream provides complete tables and data. Agent1 only:
- Extracts content from each Excel sheet
- Generates a content summary per table (for RAG retrieval)
- Classifies by filename heuristic (A–H)
- Outputs rag_chunks.jsonl for agent2 RAG

Input:  All Excel files in data/
Output: agent1_output/rag_chunks.jsonl (and by_section/*.jsonl) for agent2 RAG.

Usage:
  python agent1.py
  python agent1.py --model Qwen/Qwen2.5-3B-Instruct
"""

from __future__ import annotations

import argparse
import json
import hashlib
import re
from pathlib import Path
from typing import Any

# Qwen model (Hugging Face)
DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct"

# -----------------------------------------------------------------------------
# Section taxonomy (prospectus structure for agent2)
# -----------------------------------------------------------------------------
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

# File-to-section mapping (heuristic based on filename)
FILE_TO_SECTION: dict[str, str] = {
    "company-introduction": "A",
    "business-data": "A",
    "market-performance-comparison": "B",
    "comprehensive-comparison": "B",
    "balance-sheet": "D",
    "financial-ratios-comparison": "D",
    "financial-data-comparison": "D",
    "cash-flow": "D",
    "growth-capability": "D",
    "operating-capability": "D",
    "profit-forecast-comparison": "D",
    "share-capital-structure": "E",
    "holdings-or-equity": "E",
    "mainland-fund-holdings": "E",
    "board-and-executives": "F",
}


def normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def chunk_text(text: str, max_chars: int = 1200, overlap: int = 200) -> list[str]:
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
    """Use Qwen to produce a short content summary of the table (for RAG)."""
    prompt = f"""Summarize this table/sheet in 2–4 sentences (English). Capture key metrics, structure, and data scope. Be factual and concise.

File: {filename}
Sheet: {sheet_name}

Table excerpt (first 2500 chars):
---
{text_sample[:2500]}
---

SUMMARY:"""
    try:
        from llm_qwen import run_qwen_text
        out = run_qwen_text(prompt, model_name=model_name, max_new_tokens=256)
        return out.strip() or f"Table: {filename} / {sheet_name}"
    except Exception:
        return f"Table: {filename} / {sheet_name}"


def classify_file(filename: str) -> str:
    """Map filename to section ID (A–H)."""
    stem = Path(filename).stem.lower()
    for key, section_id in FILE_TO_SECTION.items():
        if key in stem:
            return section_id
    return "D"  # default: financial


def extract_text_from_excel(path: Path) -> str:
    """Extract text from Excel (all sheets). Preserves table layout via to_string()."""
    try:
        import pandas as pd
    except ImportError:
        raise ImportError("agent1 requires pandas and openpyxl: pip install pandas openpyxl")

    parts: list[str] = []
    xl = pd.ExcelFile(path, engine="openpyxl")
    for sheet in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name=sheet, header=None, dtype=str)
        text = df.to_string(index=False, header=False, na_rep="")
        if text.strip():
            parts.append(f"[Sheet: {sheet}]\n{text}")
    return "\n\n".join(parts)


def extract_per_sheet(path: Path) -> list[tuple[str, str]]:
    """Extract text per sheet. Returns [(sheet_name, text), ...]."""
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
    max_chars: int = 1200,
    overlap: int = 200,
    model_name: str = DEFAULT_MODEL,
) -> None:
    """Run agent1: per-table summarization, output RAG chunks for agent2."""
    data_path = Path(data_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    (output_path / "by_section").mkdir(exist_ok=True)

    files = sorted(data_path.glob("*.xlsx"))
    if not files:
        raise FileNotFoundError(f"No .xlsx files in {data_path}")

    all_chunks: list[dict[str, Any]] = []
    by_section: dict[str, list[dict[str, Any]]] = {s[0]: [] for s in SECTIONS}
    sheet_summaries: dict[tuple[str, str], str] = {}  # (filename, sheet_name) -> summary

    for f in files:
        sheets = extract_per_sheet(f)
        if not sheets:
            continue
        section_id = classify_file(f.name)
        section_name = next((n for sid, n in SECTIONS if sid == section_id), "Unknown")

        for sheet_name, sheet_text in sheets:
            print(f"  [Qwen] {f.name} / {sheet_name} -> summarising...")
            summary = summarize_table_with_qwen(
                sheet_text, f.name, sheet_name, model_name=model_name
            )
            sheet_summaries[(f.name, sheet_name)] = summary

            chunks = chunk_text(sheet_text, max_chars=max_chars, overlap=overlap)
            for i, chunk in enumerate(chunks):
                chunk_id = hashlib.md5(
                    f"{f.name}:{sheet_name}:{i}:{chunk[:50]}".encode()
                ).hexdigest()[:12]
                rec = {
                    "chunk_id": chunk_id,
                    "section_id": section_id,
                    "section": section_name,
                    "source_file": f.name,
                    "sheet_name": sheet_name,
                    "chunk_index": i,
                    "text": f"{summary}\n\n[Data]\n{chunk}",
                    "sheet_summary": summary,
                }
                all_chunks.append(rec)
                by_section[section_id].append(rec)
        print(f"  [Qwen] {f.name} -> Section {section_id} ({len(sheets)} sheets)")

    # Write main JSONL
    main_path = output_path / "rag_chunks.jsonl"
    with open(main_path, "w", encoding="utf-8") as out:
        for rec in all_chunks:
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"Wrote {len(all_chunks)} chunks to {main_path}")

    # Write per-section JSONL
    for section_id, section_name in SECTIONS:
        recs = by_section[section_id]
        if recs:
            path = output_path / "by_section" / f"section_{section_id}.jsonl"
            with open(path, "w", encoding="utf-8") as out:
                for rec in recs:
                    out.write(json.dumps(rec, ensure_ascii=False) + "\n")
            print(f"  Section {section_id} ({section_name}): {len(recs)} chunks -> {path}")

    # Write manifest for agent2
    manifest = {
        "sections": [{"id": s[0], "name": s[1], "chunk_count": len(by_section[s[0]])} for s in SECTIONS],
        "total_chunks": len(all_chunks),
        "source_files": list({c["source_file"] for c in all_chunks}),
        "sheet_summaries": {
            f"{k[0]}:{k[1]}": v for k, v in sheet_summaries.items()
        },
    }
    with open(output_path / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"Wrote manifest to {output_path / 'manifest.json'}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Agent1: Excel → RAG-ready chunks by prospectus section"
    )
    parser.add_argument(
        "--data-dir",
        default="data",
        help="Directory containing .xlsx files"
    )
    parser.add_argument(
        "--output-dir",
        default="agent1_output",
        help="Output directory for RAG chunks"
    )
    parser.add_argument(
        "--max-chars",
        type=int,
        default=1200,
        help="Max chars per chunk"
    )
    parser.add_argument(
        "--overlap",
        type=int,
        default=200,
        help="Overlap between chunks"
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help="Qwen model (default: Qwen/Qwen2.5-7B-Instruct). Use Qwen/Qwen2.5-3B-Instruct for smaller/faster."
    )
    args = parser.parse_args()

    run_agent1(
        data_dir=args.data_dir,
        output_dir=args.output_dir,
        max_chars=args.max_chars,
        overlap=args.overlap,
        model_name=args.model,
    )


if __name__ == "__main__":
    main()

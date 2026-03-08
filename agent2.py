#!/usr/bin/env python3
"""
Agent2: Use agent1 RAG output to generate prospectus sections one by one.

Input:  agent1_output/rag_chunks.jsonl (or by_section/*.jsonl)
Output: Generated section text per call (or agent2_output/all_sections.md)

Usage:
  python agent2.py --section A          # Generate section A only
  python agent2.py --section all         # Generate all sections (A–H)
  python agent2.py --section A B D      # Generate sections A, B, D
  python agent2.py --model Qwen/Qwen2.5-3B-Instruct  # Smaller/faster model

Both agents use Qwen (Hugging Face): Qwen2.5 for text, Qwen2-VL for multimodal.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

# -----------------------------------------------------------------------------
# Section taxonomy (prospectus structure; agent1 chunks A–H are mapped to these)
# 1) Front matter  2) Risk & compliance  3) Parties & corporate  4) Industry & business
# 5) Governance & related parties  6) Capital & financials  7) Offering mechanics
# -----------------------------------------------------------------------------
SECTIONS = [
    # 1) Front matter
    ("ExpectedTimetable", "Expected Timetable"),
    ("Contents", "Contents"),
    ("Summary", "Summary"),
    ("Definitions", "Definitions"),
    ("Glossary", "Glossary of Technical Terms"),
    ("ForwardLooking", "Forward-Looking Statements"),
    # 2) Risk & compliance
    ("RiskFactors", "Risk Factors"),
    ("Waivers", "Waivers from Strict Compliance with Listing Rules (Waivers and Exemptions)"),
    ("InfoProspectus", "Information about this Prospectus and the Global Offering"),
    # 3) Parties & corporate info
    ("DirectorsParties", "Directors and Parties Involved in the Global Offering"),
    ("CorporateInfo", "Corporate Information"),
    # 4) Industry & business
    ("Regulation", "Regulation (Regulatory Overview)"),
    ("IndustryOverview", "Industry Overview"),
    ("HistoryReorg", "History, Reorganization, and Corporate Structure"),
    ("Business", "Business"),
    ("ContractualArrangements", "Contractual Arrangements (Variable Interest Entities)"),
    # 5) Governance & related parties
    ("ControllingShareholders", "Relationship with Our Controlling Shareholders"),
    ("ConnectedTransactions", "Connected Transactions"),
    ("DirectorsSeniorMgmt", "Directors and Senior Management"),
    ("SubstantialShareholders", "Substantial Shareholders"),
    # 6) Capital & financials
    ("ShareCapital", "Share Capital"),
    ("FinancialInfo", "Financial Information"),
    # 7) Offering mechanics
    ("UseOfProceeds", "Future Plans and Use of Proceeds"),
    ("Underwriting", "Underwriting"),
    ("GlobalOfferingStructure", "Structure of the Global Offering"),
]

# Map agent2 section_id -> agent1 section_ids (A=Business, B=Industry, C=Risk, D=Financial, E=Capital, F=Management, G=Legal, H=Offering)
SECTION_TO_AGENT1_IDS: dict[str, list[str]] = {
    "ExpectedTimetable": ["H", "E"],
    "Contents": ["A", "B", "C", "D", "E", "F", "G", "H"],
    "Summary": ["A", "B", "D", "E", "F"],
    "Definitions": ["A", "B", "C", "D", "E", "F", "G", "H"],
    "Glossary": ["A", "B"],
    "ForwardLooking": ["A", "B", "C", "D"],
    "RiskFactors": ["C"],
    "Waivers": ["G"],
    "InfoProspectus": ["H", "E"],
    "DirectorsParties": ["F", "H"],
    "CorporateInfo": ["A", "F", "G"],
    "Regulation": ["B", "G"],
    "IndustryOverview": ["B"],
    "HistoryReorg": ["A", "F"],
    "Business": ["A", "B"],
    "ContractualArrangements": ["A", "G"],
    "ControllingShareholders": ["F"],
    "ConnectedTransactions": ["F", "G"],
    "DirectorsSeniorMgmt": ["F"],
    "SubstantialShareholders": ["F", "E"],
    "ShareCapital": ["E"],
    "FinancialInfo": ["D"],
    "UseOfProceeds": ["E"],
    "Underwriting": ["H"],
    "GlobalOfferingStructure": ["H", "E"],
}

DEFAULT_MAX_CONTEXT_CHARS = 15000
# Qwen models via Hugging Face: Qwen2.5 (text) or Qwen2-VL (multimodal)
DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct"


def load_rag_chunks(rag_dir: Path) -> list[dict[str, Any]]:
    """Load all chunks from agent1 output."""
    main_path = rag_dir / "rag_chunks.jsonl"
    if not main_path.exists():
        raise FileNotFoundError(f"Run agent1 first. Expected: {main_path}")

    chunks = []
    with open(main_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))
    return chunks


def get_chunks_for_section(
    chunks: list[dict[str, Any]] | None,
    section_id: str,
    max_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
) -> list[dict[str, Any]]:
    """Get chunks relevant to this agent2 section (mapped from agent1 section_ids)."""
    if not chunks:
        return []
    agent1_ids = SECTION_TO_AGENT1_IDS.get(section_id, ["A", "B", "C", "D", "E", "F", "G", "H"])
    filtered = [c for c in chunks if c.get("section_id") in agent1_ids]
    # Truncate context if too long
    total = 0
    result = []
    for c in filtered:
        text = c.get("text", "")
        if total + len(text) > max_chars:
            break
        result.append(c)
        total += len(text)
    return result


def build_context(chunks: list[dict[str, Any]]) -> str:
    """Build RAG context string from chunks."""
    parts = []
    for i, c in enumerate(chunks):
        src = c.get("source_file", "unknown")
        text = c.get("text", "")
        parts.append(f"[{i + 1}] (Source: {src})\n{text}")
    return "\n\n".join(parts)


def load_section_requirements(requirements_path: Path) -> dict[str, dict]:
    """Load section requirements from JSON."""
    if not requirements_path.exists():
        return {}
    with open(requirements_path, "r", encoding="utf-8") as f:
        return json.load(f)


HKEX_FORMAT_INSTRUCTION = """
CRITICAL FORMAT REQUIREMENTS (HKEX sponsor-counsel working draft mode):
- Output in ENGLISH ONLY. No Chinese or other languages.
- Draft in sponsor-counsel working draft mode for an HKEX listing document. This is not a fully complete clean final filing copy.
- Follow HKEX prospectus structure and tone, but preserve section scaffolding where the available source materials are incomplete.
- Use formal, factual, balanced, non-promotional language suitable for a prospectus.
- You may use the section requirements and standard HKEX chapter structure as scaffolding for headings, placeholders, and note blocks.
- All company-specific facts, figures, dates, rankings, waivers, legal conclusions, and status statements must come only from the provided context.
- For any required point not supported by the context, keep the relevant heading and state [Information not provided in the documents].
- You may use only these annotation tags when helpful: [[AI:VERIFY|...]], [[AI:CITE|source=...; scope=...; date=...; metric=...]], [[AI:XREF|to=...]], [[AI:LPD|refresh=...]].
- Avoid promotional, absolute, or unqualified forward-looking language.
- Do not invent facts, dates, approvals, rankings, profitability timelines, or regulatory conclusions.
"""


def build_prompt(
    section_id: str,
    section_name: str,
    requirements: str,
    context: str,
    modification_instructions: str | None = None,
) -> str:
    """Build LLM prompt for section generation."""
    mod_note = ""
    if modification_instructions and modification_instructions.strip():
        mod_note = f"\n\nUser modification request (incorporate these changes):\n{modification_instructions.strip()}\n"
    return f"""You are drafting a prospectus section for a Hong Kong Stock Exchange (HKEX) listing in sponsor-counsel working draft mode. Your task is to produce a conservative, verification-aware working draft that includes prospectus-ready prose where supported and structured placeholders or AI tags where support is missing.
{HKEX_FORMAT_INSTRUCTION}

CRITICAL: Use ONLY data from the provided context for company-specific facts. Do NOT invent, fabricate, or hallucinate any facts, figures, names, dates, rankings, approvals, waivers, legal conclusions, or management intentions. If information is not in the context, state "[Information not provided in the documents]" - never make it up.

Section: {section_name}

Requirements:
{requirements}

Context from user-uploaded company documents (ONLY source of data):
---
{context}
---
{mod_note}
Instructions:
1. Use the section requirements and HKEX conventions to build the section structure and sub-headings.
2. Use ONLY the provided context for company-specific facts, figures, names, dates, and status statements.
3. If a required item is unsupported, keep the relevant heading, write "[Information not provided in the documents]", and add the most useful AI tag(s) if appropriate.
4. Write ENTIRELY in English. Use formal, factual, balanced prose. Tables or lists are allowed where appropriate.
5. You may include short working-draft note blocks or end-notes when needed, but only within the section itself and only using neutral drafting language plus the allowed AI tags.
6. For rankings, market data, share, CAGR, or third-party study statements, include [[AI:CITE|source=...; scope=...; date=...; metric=...]] unless the required source metadata already appears in the context.
7. Do not use promotional, absolute, or unqualified forward-looking language. Do not create explicit or implicit profit forecasts, margin forecasts, valuation conclusions, or certainty of commercial success.
8. Do not output chatty assistant commentary. Output only the section working draft, placeholders, and allowed AI tags.

Section content (English only):"""


def generate_with_llm(
    prompt: str,
    model_name: str = DEFAULT_MODEL,
    model: Any = None,
    tokenizer: Any = None,
) -> str:
    """Call Qwen via Hugging Face (llm_qwen) to generate section text.
    If model and tokenizer are provided, reuse them (no reload)."""
    from llm_qwen import run_qwen_text, _load_qwen_model, run_qwen_with_model
    if model is not None and tokenizer is not None:
        return run_qwen_with_model(model, tokenizer, prompt, max_new_tokens=2048)
    return run_qwen_text(prompt, model_name=model_name, max_new_tokens=2048)


def generate_section(
    section_id: str,
    chunks: list[dict[str, Any]],
    requirements_map: dict[str, dict],
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
    model_name: str = DEFAULT_MODEL,
    modification_instructions: str | None = None,
    model: Any = None,
    tokenizer: Any = None,
) -> str:
    """Generate one section. Returns a sponsor-counsel working draft."""
    section_name = next((n for sid, n in SECTIONS if sid == section_id), section_id)
    reqs = requirements_map.get(section_id, {})
    requirements = reqs.get("requirements", f"Write the {section_name} section.")

    section_chunks = get_chunks_for_section(chunks, section_id, max_context_chars)
    context = (
        build_context(section_chunks)
        if section_chunks
        else "[No section-specific source material was routed to this section. Produce only a structured working draft skeleton, placeholders, and AI verification notes based on the section requirements.]"
    )
    prompt = build_prompt(
        section_id, section_name, requirements, context, modification_instructions
    )
    return generate_with_llm(
        prompt, model_name=model_name, model=model, tokenizer=tokenizer
    )


def run_agent2_single(
    section_id: str,
    rag_dir: str | Path = "agent1_output",
    output_dir: str | Path = "agent2_output",
    modification_instructions: str | None = None,
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
    model_name: str = DEFAULT_MODEL,
) -> str:
    """Generate a single section. Returns the text. Writes to output_dir."""
    rag_path = Path(rag_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    chunks = load_rag_chunks(rag_path)
    requirements_path = Path(__file__).parent / "agent2_section_requirements.json"
    requirements_map = load_section_requirements(requirements_path)

    text = generate_section(
        section_id,
        chunks,
        requirements_map,
        max_context_chars=max_context_chars,
        model_name=model_name,
        modification_instructions=modification_instructions,
    )
    section_name = next((n for sid, n in SECTIONS if sid == section_id), section_id)
    safe_name = section_name.replace(" ", "_").replace("&", "and")
    out_file = out_path / f"section_{section_id}_{safe_name}.md"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(f"# Section {section_id}: {section_name}\n\n")
        f.write(text)
    print(f"Saved: {out_file}")
    # When modifying, include all existing sections; when generating in order, only up to this one
    only_up_to = None if modification_instructions else section_id
    _append_to_all_sections(
        out_path, section_id, section_name, text, only_sections_up_to=only_up_to
    )
    return text


def _append_to_all_sections(
    out_path: Path,
    section_id: str,
    section_name: str,
    text: str,
    *,
    only_sections_up_to: str | None = None,
) -> None:
    """Update all_sections.md with this section (merge with other section files).
    When only_sections_up_to is set (single-section mode), only include sections
    from the start up to that section, so we don't merge old content from previous runs.
    """
    combined_path = out_path / "all_sections.md"
    section_ids_ordered = [s[0] for s in SECTIONS]
    max_index = len(section_ids_ordered)
    if only_sections_up_to and only_sections_up_to in section_ids_ordered:
        max_index = section_ids_ordered.index(only_sections_up_to) + 1
    allowed_ids = set(section_ids_ordered[:max_index])

    existing: dict[str, str] = {}
    for f in out_path.glob("section_*.md"):
        name = f.stem
        for sid, sname in SECTIONS:
            if sid not in allowed_ids:
                continue
            safe = sname.replace(" ", "_").replace("&", "and")
            if f"section_{sid}_{safe}" in name or name.startswith(f"section_{sid}_"):
                existing[sid] = f.read_text(encoding="utf-8").split("\n\n", 1)[-1].strip()
                break
    existing[section_id] = text
    with open(combined_path, "w", encoding="utf-8") as f:
        f.write("# Prospectus Draft (Generated by Agent2)\n\n")
        for sid, sname in SECTIONS:
            if sid in existing and sid in allowed_ids:
                f.write(f"## {sname}\n\n")
                f.write(existing[sid])
                f.write("\n\n")
    print(f"Updated: {combined_path}")


def _rebuild_all_sections(out_path: Path) -> None:
    """Rebuild all_sections.md from all section_*.md files in SECTIONS order."""
    combined_path = out_path / "all_sections.md"
    existing: dict[str, str] = {}
    for f in out_path.glob("section_*.md"):
        name = f.stem
        for sid, sname in SECTIONS:
            safe = sname.replace(" ", "_").replace("&", "and")
            if f"section_{sid}_{safe}" in name or name.startswith(f"section_{sid}_"):
                content = f.read_text(encoding="utf-8")
                # Strip header line
                parts = content.split("\n\n", 1)
                existing[sid] = parts[-1].strip() if len(parts) > 1 else content.strip()
                break
    with open(combined_path, "w", encoding="utf-8") as f:
        f.write("# Prospectus Draft (Generated by Agent2)\n\n")
        for sid, sname in SECTIONS:
            if sid in existing:
                f.write(f"## Section {sid}: {sname}\n\n")
                f.write(existing[sid])
                f.write("\n\n")
    print(f"Updated: {combined_path}")


def run_agent2(
    rag_dir: str | Path = "agent1_output",
    output_dir: str | Path = "agent2_output",
    sections: list[str] | None = None,
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
    model_name: str = DEFAULT_MODEL,
) -> dict[str, str]:
    """
    Run agent2: generate prospectus sections.

    Args:
        rag_dir: Directory containing agent1 output (rag_chunks.jsonl).
        output_dir: Output directory for generated sections.
        sections: List of section IDs (e.g. ["A","B","D"]) or None for all.
        max_context_chars: Max chars of RAG context per section.
        model_name: Hugging Face model name.

    Returns:
        Dict mapping section_id -> generated text.
    """
    rag_path = Path(rag_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    chunks = load_rag_chunks(rag_path)
    requirements_path = Path(__file__).parent / "agent2_section_requirements.json"
    requirements_map = load_section_requirements(requirements_path)

    if sections is None:
        sections = [s[0] for s in SECTIONS]

    valid_sections = [sid for sid in sections if sid in [s[0] for s in SECTIONS]]
    use_cached_model = len(valid_sections) > 1

    model, tokenizer = None, None
    if use_cached_model:
        from llm_qwen import _load_qwen_model
        model, tokenizer = _load_qwen_model(model_name)
        print("Model loaded once; reusing for all sections.")

    results: dict[str, str] = {}
    for section_id in valid_sections:
        text = generate_section(
            section_id,
            chunks,
            requirements_map,
            max_context_chars=max_context_chars,
            model_name=model_name,
            model=model,
            tokenizer=tokenizer,
        )
        results[section_id] = text

        # Write per-section file
        section_name = next((n for sid, n in SECTIONS if sid == section_id), section_id)
        safe_name = section_name.replace(" ", "_").replace("&", "and")
        out_file = out_path / f"section_{section_id}_{safe_name}.md"
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(f"# Section {section_id}: {section_name}\n\n")
            f.write(text)
        print(f"Saved: {out_file}")

    # Rebuild all_sections.md from all section_*.md files (merge with existing)
    _rebuild_all_sections(out_path)

    return results


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Agent2: Generate prospectus sections from agent1 RAG output"
    )
    parser.add_argument(
        "--section",
        nargs="+",
        default=["all"],
        help="Section ID(s): ExpectedTimetable Contents Summary Definitions Glossary ForwardLooking RiskFactors Waivers InfoProspectus DirectorsParties CorporateInfo Regulation IndustryOverview HistoryReorg Business ContractualArrangements ControllingShareholders ConnectedTransactions DirectorsSeniorMgmt SubstantialShareholders ShareCapital FinancialInfo UseOfProceeds Underwriting GlobalOfferingStructure, or 'all' for all"
    )
    parser.add_argument(
        "--rag-dir",
        default="agent1_output",
        help="Directory containing agent1 output"
    )
    parser.add_argument(
        "--output-dir",
        default="agent2_output",
        help="Output directory for generated sections"
    )
    parser.add_argument(
        "--max-context",
        type=int,
        default=DEFAULT_MAX_CONTEXT_CHARS,
        help="Max chars of RAG context per section"
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help="Hugging Face model name"
    )
    parser.add_argument(
        "--modification-file",
        default="",
        help="Path to file containing modification instructions (for single-section regenerate)"
    )
    args = parser.parse_args()

    sections = args.section
    if sections == ["all"]:
        sections = None

    modification = None
    if args.modification_file:
        mod_path = Path(args.modification_file)
        if mod_path.exists():
            modification = mod_path.read_text(encoding="utf-8").strip()

    if sections and len(sections) == 1 and modification is not None:
        text = run_agent2_single(
            sections[0],
            rag_dir=args.rag_dir,
            output_dir=args.output_dir,
            modification_instructions=modification,
            max_context_chars=args.max_context,
            model_name=args.model,
        )
        print(text[:200] + "..." if len(text) > 200 else text)
    elif sections and len(sections) == 1:
        text = run_agent2_single(
            sections[0],
            rag_dir=args.rag_dir,
            output_dir=args.output_dir,
            modification_instructions=None,
            max_context_chars=args.max_context,
            model_name=args.model,
        )
        print(text[:200] + "..." if len(text) > 200 else text)
    else:
        run_agent2(
            rag_dir=args.rag_dir,
            output_dir=args.output_dir,
            sections=sections,
            max_context_chars=args.max_context,
            model_name=args.model,
        )


if __name__ == "__main__":
    main()

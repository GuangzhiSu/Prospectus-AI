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
# Section taxonomy (must match agent1)
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
    """Filter chunks by section_id (from agent1)."""
    if not chunks:
        return []
    filtered = [c for c in chunks if c.get("section_id") == section_id]
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


def build_prompt(
    section_id: str,
    section_name: str,
    requirements: str,
    context: str,
) -> str:
    """Build LLM prompt for section generation."""
    return f"""You are drafting a prospectus section. Use ONLY the provided context. Do not invent data.

Section: {section_name} (Section {section_id})

Requirements:
{requirements}

Context from company documents:
---
{context}
---

Instructions:
1. Write the section content in a formal, factual tone.
2. Use only information from the context above.
3. If the context is insufficient, state what is missing and provide a brief placeholder.
4. Output in prose/paragraphs; use tables or lists if the data suits it.
5. Do not include meta-commentary like "Based on the context..." or "The following is...". Write the section content directly.

Section content:"""


def generate_with_llm(prompt: str, model_name: str = DEFAULT_MODEL) -> str:
    """Call Qwen via Hugging Face (llm_qwen) to generate section text."""
    from llm_qwen import run_qwen_text
    return run_qwen_text(prompt, model_name=model_name, max_new_tokens=2048)


def generate_section(
    section_id: str,
    chunks: list[dict[str, Any]],
    requirements_map: dict[str, dict],
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
    model_name: str = DEFAULT_MODEL,
) -> str:
    """Generate one section. Returns section text or placeholder if no chunks."""
    section_name = next((n for sid, n in SECTIONS if sid == section_id), section_id)
    reqs = requirements_map.get(section_id, {})
    requirements = reqs.get("requirements", f"Write the {section_name} section.")

    section_chunks = get_chunks_for_section(chunks, section_id, max_context_chars)

    if not section_chunks:
        return f"[Section {section_id}: {section_name}]\n\nNo RAG chunks available for this section. Manual draft required."

    context = build_context(section_chunks)
    prompt = build_prompt(section_id, section_name, requirements, context)
    return generate_with_llm(prompt, model_name=model_name)


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

    results: dict[str, str] = {}
    for section_id in sections:
        if section_id not in [s[0] for s in SECTIONS]:
            continue
        text = generate_section(
            section_id,
            chunks,
            requirements_map,
            max_context_chars=max_context_chars,
            model_name=model_name,
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

    # Write combined file
    combined_path = out_path / "all_sections.md"
    with open(combined_path, "w", encoding="utf-8") as f:
        f.write("# Prospectus Draft (Generated by Agent2)\n\n")
        for section_id, section_name in SECTIONS:
            if section_id in results:
                f.write(f"## Section {section_id}: {section_name}\n\n")
                f.write(results[section_id])
                f.write("\n\n")
    print(f"Saved: {combined_path}")

    return results


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Agent2: Generate prospectus sections from agent1 RAG output"
    )
    parser.add_argument(
        "--section",
        nargs="+",
        default=["all"],
        help="Section ID(s): A B C D E F G H, or 'all' for all"
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
    args = parser.parse_args()

    sections = args.section
    if sections == ["all"]:
        sections = None

    run_agent2(
        rag_dir=args.rag_dir,
        output_dir=args.output_dir,
        sections=sections,
        max_context_chars=args.max_context,
        model_name=args.model,
    )


if __name__ == "__main__":
    main()

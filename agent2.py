#!/usr/bin/env python3
"""
Agent2: Generate prospectus sections from Agent1 output through a fixed
LangGraph pipeline:

    Retriever -> Section Writer -> Verifier -> Assembler

Planner is intentionally omitted because section requirements are already
encoded in `agent2_section_requirements.json`.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from prospectus_graph.config import (
    DEFAULT_MAX_CONTEXT_CHARS,
    DEFAULT_MODEL,
    SECTIONS,
    load_section_requirements,
)
from prospectus_graph.graph import build_section_graph
from prospectus_graph.retrievers import (
    Agent1JsonlKnowledgeBase,
    SectionAwareRAGRetriever,
)
from prospectus_graph.state import SectionDraftState
from prospectus_graph.verifier import append_verification_notes, verify_section_draft


def _lookup_section_name(section_id: str) -> str:
    return next((name for sid, name in SECTIONS if sid == section_id), section_id)


HKEX_FORMAT_INSTRUCTION = """
CRITICAL FORMAT REQUIREMENTS (HKEX sponsor-counsel working draft mode):

Primary objective: Optimise for (1) compliance language, (2) disclosure defensibility, (3) verifiability under sponsor due-diligence standards. Preserve defensibility over elegance when they conflict. Do not convert possibility into certainty; do not smooth away legal or factual caveats.

- Output in ENGLISH ONLY. No Chinese or other languages.
- Draft in sponsor-counsel working draft mode for an HKEX listing document. This is not a fully complete clean final filing copy.
- Use formal, factual, balanced, non-promotional language. Treat uncontrolled language as a major defect.
- All company-specific facts, figures, dates, rankings, waivers, legal conclusions, and status statements must come only from the provided context. Do not invent sources, thresholds, definitions, or evidence.
- For any required point not supported by the context, keep the relevant heading and state [Information not provided in the documents].
- Use only these annotation tags when helpful: [[AI:LOCKED|...]] (text that must not be changed without counsel sign-off), [[AI:VERIFY|...]], [[AI:CITE|source=...; scope=...; date=...; metric=...]], [[AI:XREF|to=...]], [[AI:LPD|refresh=...]].
- Avoid promotional, absolute, or unqualified forward-looking language. Avoid explicit or implicit profit forecasts unless a formal profit-forecast workflow applies. Require cross-reference discipline and evidence hooks for claims needing verification.
- Regime-sensitive: If the issuer has WVR, Chapter 18C / Specialist Technology, Pre-Commercial status, internet information services or personal data processing, or VIE/contractual arrangements, follow the section requirements for tailored disclosure logic.
"""


def build_prompt(
    section_id: str,
    section_name: str,
    requirements: str,
    context: str,
    modification_instructions: str | None = None,
) -> str:
    """Build the section-writer prompt."""
    mod_note = ""
    if modification_instructions and modification_instructions.strip():
        mod_note = (
            "\n\nUser modification request (incorporate these changes):\n"
            f"{modification_instructions.strip()}\n"
        )
    return f"""Role: You are drafting one prospectus section for a Hong Kong Stock Exchange (HKEX) listing in sponsor-counsel working draft mode.

Objective: Produce a conservative, verification-aware working draft: prospectus-ready prose where evidence exists, structured placeholders and AI tags where support is missing. Headings, contents entries, and cross-references must match exactly across the document.

{HKEX_FORMAT_INSTRUCTION}

CRITICAL: Use ONLY data from the provided context for company-specific facts. Do NOT invent, fabricate, or hallucinate any facts, figures, names, dates, rankings, approvals, waivers, legal conclusions, or management intentions. If information is not in the context, state "[Information not provided in the documents]" and add [[AI:VERIFY|...]] where human review is needed.

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
8. Do not output chatty assistant commentary. Output only the section working draft, placeholders, and allowed AI tags. Any materiality or legal sufficiency judgment must be escalated to sponsor-counsel review.

Section content (English only):"""


def generate_with_llm(
    prompt: str,
    model_name: str = DEFAULT_MODEL,
    model: Any = None,
    tokenizer: Any = None,
) -> str:
    """Call Qwen via Hugging Face (llm_qwen) to generate section text."""
    from llm_qwen import run_qwen_text, run_qwen_with_model

    if model is not None and tokenizer is not None:
        return run_qwen_with_model(model, tokenizer, prompt, max_new_tokens=2048)
    return run_qwen_text(prompt, model_name=model_name, max_new_tokens=2048)


class RetrieverNode:
    def __init__(self, retriever: SectionAwareRAGRetriever):
        self.retriever = retriever

    def __call__(self, state: SectionDraftState) -> dict:
        result = self.retriever.retrieve(
            section_id=state["section_id"],
            section_name=state["section_name"],
            requirements=state["requirements"],
            max_context_chars=state["max_context_chars"],
        )
        context = result.context or (
            "[No supporting evidence was retrieved for this section. "
            "Produce a structured working draft skeleton with placeholders and AI verification notes only.]"
        )
        return {
            "retrieved_chunks": result.chunks,
            "retrieval_context": context,
            "retrieval_notes": result.notes,
        }


class SectionWriterNode:
    def __init__(
        self,
        *,
        model_name: str,
        model: Any = None,
        tokenizer: Any = None,
    ):
        self.model_name = model_name
        self.model = model
        self.tokenizer = tokenizer

    def __call__(self, state: SectionDraftState) -> dict:
        prompt = build_prompt(
            state["section_id"],
            state["section_name"],
            state["requirements"],
            state["retrieval_context"],
            state.get("modification_instructions"),
        )
        draft_text = generate_with_llm(
            prompt,
            model_name=self.model_name,
            model=self.model,
            tokenizer=self.tokenizer,
        )
        return {"draft_text": draft_text}


class VerifierNode:
    def __call__(self, state: SectionDraftState) -> dict:
        issues, passed = verify_section_draft(
            section_id=state["section_id"],
            draft_text=state.get("draft_text", ""),
            retrieval_context=state.get("retrieval_context", ""),
        )
        verified_text = append_verification_notes(
            state.get("draft_text", ""),
            issues,
            passed=passed,
        )
        return {
            "verification_issues": issues,
            "verifier_passed": passed,
            "verified_text": verified_text,
        }


class AssemblerNode:
    def __init__(
        self,
        *,
        output_dir: str | Path,
        combine_immediately: bool,
        only_sections_up_to: str | None = None,
    ):
        self.output_dir = Path(output_dir)
        self.combine_immediately = combine_immediately
        self.only_sections_up_to = only_sections_up_to

    def __call__(self, state: SectionDraftState) -> dict:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        section_id = state["section_id"]
        section_name = state["section_name"]
        text = state.get("verified_text") or state.get("draft_text", "")
        safe_name = section_name.replace(" ", "_").replace("&", "and")
        out_file = self.output_dir / f"section_{section_id}_{safe_name}.md"

        with open(out_file, "w", encoding="utf-8") as f:
            f.write(f"# Section {section_id}: {section_name}\n\n")
            f.write(text)
        print(f"Saved: {out_file}")

        result = {"output_file": str(out_file)}
        if self.combine_immediately:
            _append_to_all_sections(
                self.output_dir,
                section_id,
                section_name,
                text,
                only_sections_up_to=self.only_sections_up_to,
            )
            result["combined_output_file"] = str(
                self.output_dir / "all_sections.md"
            )
        return result


def _append_to_all_sections(
    out_path: Path,
    section_id: str,
    section_name: str,
    text: str,
    *,
    only_sections_up_to: str | None = None,
) -> None:
    """Update all_sections.md with this section (merge with other section files)."""
    combined_path = out_path / "all_sections.md"
    section_ids_ordered = [sid for sid, _ in SECTIONS]
    max_index = len(section_ids_ordered)
    if only_sections_up_to and only_sections_up_to in section_ids_ordered:
        max_index = section_ids_ordered.index(only_sections_up_to) + 1
    allowed_ids = set(section_ids_ordered[:max_index])

    existing: dict[str, str] = {}
    for path in out_path.glob("section_*.md"):
        name = path.stem
        for sid, sname in SECTIONS:
            if sid not in allowed_ids:
                continue
            safe = sname.replace(" ", "_").replace("&", "and")
            if f"section_{sid}_{safe}" in name or name.startswith(f"section_{sid}_"):
                existing[sid] = path.read_text(encoding="utf-8").split("\n\n", 1)[-1].strip()
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
    for path in out_path.glob("section_*.md"):
        name = path.stem
        for sid, sname in SECTIONS:
            safe = sname.replace(" ", "_").replace("&", "and")
            if f"section_{sid}_{safe}" in name or name.startswith(f"section_{sid}_"):
                content = path.read_text(encoding="utf-8")
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


def _build_requirements_map() -> dict[str, dict]:
    requirements_path = Path(__file__).parent / "agent2_section_requirements.json"
    return load_section_requirements(requirements_path)


def _build_section_state(
    *,
    section_id: str,
    requirements_map: dict[str, dict],
    rag_dir: str | Path,
    output_dir: str | Path,
    max_context_chars: int,
    model_name: str,
    modification_instructions: str | None = None,
) -> SectionDraftState:
    section_name = _lookup_section_name(section_id)
    reqs = requirements_map.get(section_id, {})
    requirements = reqs.get("requirements", f"Write the {section_name} section.")
    return {
        "section_id": section_id,
        "section_name": section_name,
        "requirements": requirements,
        "rag_dir": str(rag_dir),
        "output_dir": str(output_dir),
        "model_name": model_name,
        "max_context_chars": max_context_chars,
        "modification_instructions": modification_instructions,
    }


def _run_section_graph(
    *,
    section_state: SectionDraftState,
    retriever: SectionAwareRAGRetriever,
    output_dir: str | Path,
    model_name: str,
    modification_instructions: str | None = None,
    combine_immediately: bool,
    only_sections_up_to: str | None,
    model: Any = None,
    tokenizer: Any = None,
) -> SectionDraftState:
    graph = build_section_graph(
        retriever_node=RetrieverNode(retriever),
        section_writer_node=SectionWriterNode(
            model_name=model_name,
            model=model,
            tokenizer=tokenizer,
        ),
        verifier_node=VerifierNode(),
        assembler_node=AssemblerNode(
            output_dir=output_dir,
            combine_immediately=combine_immediately,
            only_sections_up_to=only_sections_up_to,
        ),
    )
    return graph.invoke(section_state)


def run_agent2_single(
    section_id: str,
    rag_dir: str | Path = "agent1_output",
    output_dir: str | Path = "agent2_output",
    modification_instructions: str | None = None,
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
    model_name: str = DEFAULT_MODEL,
) -> str:
    """Generate a single section through the LangGraph pipeline."""
    rag_path = Path(rag_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    kb = Agent1JsonlKnowledgeBase(rag_path)
    retriever = SectionAwareRAGRetriever([kb])
    requirements_map = _build_requirements_map()

    state = _build_section_state(
        section_id=section_id,
        requirements_map=requirements_map,
        rag_dir=rag_path,
        output_dir=out_path,
        max_context_chars=max_context_chars,
        model_name=model_name,
        modification_instructions=modification_instructions,
    )

    result = _run_section_graph(
        section_state=state,
        retriever=retriever,
        output_dir=out_path,
        model_name=model_name,
        modification_instructions=modification_instructions,
        combine_immediately=True,
        only_sections_up_to=None if modification_instructions else section_id,
    )
    return result.get("verified_text") or result.get("draft_text", "")


def run_agent2(
    rag_dir: str | Path = "agent1_output",
    output_dir: str | Path = "agent2_output",
    sections: list[str] | None = None,
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
    model_name: str = DEFAULT_MODEL,
) -> dict[str, str]:
    """
    Run agent2: generate prospectus sections through the LangGraph pipeline.
    """
    rag_path = Path(rag_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    requirements_map = _build_requirements_map()

    if sections is None:
        sections = [sid for sid, _ in SECTIONS]

    valid_sections = [sid for sid in sections if sid in [s[0] for s in SECTIONS]]
    use_cached_model = len(valid_sections) > 1

    model, tokenizer = None, None
    if use_cached_model:
        from llm_qwen import _load_qwen_model

        model, tokenizer = _load_qwen_model(model_name)
        print("Model loaded once; reusing for all sections.")

    kb = Agent1JsonlKnowledgeBase(rag_path)
    retriever = SectionAwareRAGRetriever([kb])

    results: dict[str, str] = {}
    for section_id in valid_sections:
        state = _build_section_state(
            section_id=section_id,
            requirements_map=requirements_map,
            rag_dir=rag_path,
            output_dir=out_path,
            max_context_chars=max_context_chars,
            model_name=model_name,
        )
        result = _run_section_graph(
            section_state=state,
            retriever=retriever,
            output_dir=out_path,
            model_name=model_name,
            combine_immediately=False,
            only_sections_up_to=None,
            model=model,
            tokenizer=tokenizer,
        )
        results[section_id] = result.get("verified_text") or result.get("draft_text", "")

    _rebuild_all_sections(out_path)
    return results


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Agent2: Generate prospectus sections from Agent1 output through a LangGraph pipeline"
    )
    parser.add_argument(
        "--section",
        nargs="+",
        default=["all"],
        help="Section ID(s): ExpectedTimetable Contents Summary Definitions Glossary ForwardLooking RiskFactors Waivers InfoProspectus DirectorsParties CorporateInfo Regulation IndustryOverview HistoryReorg Business ContractualArrangements ControllingShareholders ConnectedTransactions DirectorsSeniorMgmt SubstantialShareholders ShareCapital FinancialInfo UseOfProceeds Underwriting GlobalOfferingStructure, or 'all' for all",
    )
    parser.add_argument(
        "--rag-dir",
        default="agent1_output",
        help="Directory containing Agent1 output",
    )
    parser.add_argument(
        "--output-dir",
        default="agent2_output",
        help="Output directory for generated sections",
    )
    parser.add_argument(
        "--max-context",
        type=int,
        default=DEFAULT_MAX_CONTEXT_CHARS,
        help="Max chars of retrieved evidence per section",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help="Hugging Face model name",
    )
    parser.add_argument(
        "--modification-file",
        default="",
        help="Path to file containing modification instructions (for single-section regenerate)",
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

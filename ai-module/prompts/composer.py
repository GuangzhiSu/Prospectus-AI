"""Compose runtime prompts from layered templates."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .loader import load_core, load_template
from .sections.augment import augment_requirements


def _exchange_drafting_block() -> str:
    return load_core("exchange_drafting.md").strip()


def _ai_tags_block() -> str:
    return load_core("ai_tags.md").strip()


def _format_issue_list_for_prompt(items: list[str] | list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for item in items:
        if isinstance(item, str):
            if item.strip():
                lines.append(f"- {item.strip()}")
            continue
        if isinstance(item, dict):
            severity = str(item.get("severity", "medium")).strip()
            code = str(item.get("code", "issue")).strip()
            message = str(item.get("message", "")).strip()
            lines.append(f"- [{severity}] {code}: {message}")
    return "\n".join(lines) if lines else "- None."


def add_fact_ids_to_formatted(facts_block: str) -> str:
    if not facts_block or not facts_block.strip():
        return "[No structured facts available]"
    lines: list[str] = []
    idx = 0
    for line in facts_block.split("\n"):
        s = line.strip()
        if not s:
            lines.append(line)
            continue
        if s.endswith("FACTS"):
            lines.append(line)
            continue
        idx += 1
        lines.append(f"fact_{idx}: {line}")
    return "\n".join(lines)


def compose_agent1_table_summary(
    *,
    text_sample: str,
    filename: str,
    sheet_name: str,
) -> str:
    return load_template(
        "agent1_table_summary",
        filename=filename,
        sheet_name=sheet_name,
        text_sample=text_sample[:2500],
    )


def compose_planner_prompt(
    *,
    section_name: str,
    requirements: str,
    formatted_facts: str,
    text_summary: str,
    kg_typical_structure: list[dict] | None = None,
    kg_structure_mode: str = "narrative",
) -> str:
    numbered_facts = add_fact_ids_to_formatted(formatted_facts)
    required_outline_block = ""
    required_outline_rule = ""
    narrative_mode = (kg_structure_mode or "narrative").strip().lower() == "narrative"
    if kg_typical_structure and narrative_mode:
        lines: list[str] = [
            "Required outline (copy these names VERBATIM, in this order, as your numbered outline):",
        ]
        for idx, item in enumerate(kg_typical_structure, start=1):
            sub = (item.get("subsection") or "").strip()
            if not sub:
                continue
            lines.append(f"  {idx}. {sub}")
        required_outline_block = "\n".join(lines) + "\n\n"
        required_outline_rule = (
            "\n- Required outline is present above: your `outline` MUST reproduce those "
            "titles VERBATIM and in that order (you may prefix them \"1 \", \"2 \", ...). "
            "Do not rename, merge, split, reorder, or omit them. You MAY append at most "
            "one extra trailing subsection for evidence-driven section-specific content. "
            "Keys in `fact_mapping` MUST exactly match the outline titles (after the number)."
        )
    elif not narrative_mode:
        required_outline_rule = (
            "\n- This section is in dictionary mode: do NOT invent narrative subsection scaffolding. "
            "Use a minimal structure optimized for glossary/definition entries (alphabetical table/list). "
            "If you include headings, keep them minimal and functional."
        )
    summary = text_summary[:2000] if text_summary else "[No narrative summary]"
    return load_template(
        "planner",
        section_name=section_name,
        requirements=requirements,
        numbered_facts=numbered_facts,
        text_summary=summary,
        required_outline_block=required_outline_block,
        required_outline_rule=required_outline_rule,
    )


def compose_writer_prompt(
    *,
    section_id: str,
    section_name: str,
    requirements: str,
    context: str,
    modification_instructions: str | None = None,
    planner_outline: str | None = None,
) -> str:
    del section_id  # reserved for future section-specific writer overrides
    mod_note = ""
    if modification_instructions and modification_instructions.strip():
        mod_note = (
            "\n\nUser modification request (incorporate these changes):\n"
            f"{modification_instructions.strip()}\n"
        )
    planner_block = ""
    if planner_outline and planner_outline.strip():
        planner_block = (
            "\n\nPlanned structure (follow this outline):\n---\n"
            f"{planner_outline.strip()}\n---\n"
        )
    return load_template(
        "writer",
        exchange_drafting=_exchange_drafting_block(),
        ai_tags=_ai_tags_block(),
        section_name=section_name,
        requirements=requirements,
        planner_block=planner_block,
        context=context,
        mod_note=mod_note,
    )


def compose_verifier_prompt(
    *,
    section_name: str,
    requirements: str,
    retrieval_context: str,
    draft_text: str,
    mechanical_issues: list[dict[str, Any]],
    revision_count: int,
) -> str:
    return load_template(
        "verifier",
        section_name=section_name,
        revision_count=str(revision_count),
        requirements=requirements,
        retrieval_context=retrieval_context,
        draft_text=draft_text,
        mechanical_block=_format_issue_list_for_prompt(mechanical_issues),
    )


def compose_revision_prompt(
    *,
    section_name: str,
    requirements: str,
    retrieval_context: str,
    current_draft: str,
    verifier_summary: str,
    verification_issues: list[dict[str, Any]],
    revision_instructions: list[str],
    modification_instructions: str | None = None,
) -> str:
    mod_note = ""
    if modification_instructions and modification_instructions.strip():
        mod_note = (
            "\nAdditional user modification request to preserve while revising:\n"
            f"- {modification_instructions.strip()}\n"
        )
    return load_template(
        "revision",
        section_name=section_name,
        requirements=requirements,
        retrieval_context=retrieval_context,
        current_draft=current_draft,
        verifier_summary=verifier_summary or "[No verifier summary provided.]",
        issues_block=_format_issue_list_for_prompt(verification_issues),
        revision_block=_format_issue_list_for_prompt(revision_instructions),
        mod_note=mod_note,
    )


def compose_legacy_writer(
    *,
    section: str,
    requirements: str,
    context: str,
) -> str:
    return load_template(
        "legacy_writer",
        exchange_drafting=_exchange_drafting_block(),
        ai_tags=_ai_tags_block(),
        section=section,
        requirements=requirements,
        context=context,
    )


def compose_legacy_writer_system() -> str:
    """System prompt for legacy web RAG (core blocks only)."""
    return (
        _exchange_drafting_block()
        + "\n\n"
        + _ai_tags_block()
        + "\n\nYou are drafting a prospectus section for a Hong Kong Stock Exchange listing "
        "in sponsor-counsel working draft mode. Follow the requirements exactly. "
        "Use only the provided context. "
        "Wrap the output between <<<SECTION_START>>> and <<<SECTION_END>>>. "
        "If the context is insufficient, state so explicitly and keep placeholders concise."
    )


def compose_kg_section_card_messages(
    *,
    section_id: str,
    canonical_name: str,
    sample_blocks: str,
) -> tuple[str, str]:
    system = load_template("kg_section_card_system").strip()
    user = load_template(
        "kg_section_card_user",
        section_id=section_id,
        canonical_name=canonical_name,
        sample_blocks=sample_blocks,
    )
    return system, user


def build_prompt(
    section_id: str,
    section_name: str,
    requirements: str,
    context: str,
    modification_instructions: str | None = None,
    planner_outline: str | None = None,
) -> str:
    """Backward-compatible positional wrapper for the section writer."""
    return compose_writer_prompt(
        section_id=section_id,
        section_name=section_name,
        requirements=requirements,
        context=context,
        modification_instructions=modification_instructions,
        planner_outline=planner_outline,
    )


# Backward-compatible aliases
build_planner_prompt = compose_planner_prompt
build_verifier_prompt = compose_verifier_prompt
build_revision_prompt = compose_revision_prompt

__all__ = [
    "augment_requirements",
    "compose_agent1_table_summary",
    "compose_legacy_writer",
    "compose_legacy_writer_system",
    "compose_kg_section_card_messages",
    "compose_planner_prompt",
    "compose_revision_prompt",
    "compose_verifier_prompt",
    "compose_writer_prompt",
    "build_planner_prompt",
    "build_prompt",
    "build_verifier_prompt",
    "build_revision_prompt",
    "add_fact_ids_to_formatted",
]

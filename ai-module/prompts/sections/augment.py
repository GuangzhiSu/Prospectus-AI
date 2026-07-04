"""Section requirements augmentation (issuer metadata, KG, gating docs, generation rules)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..paths import resolve_generation_rules_path

# Behavioural constraints per generation mode (spec §39.6).
GENERATION_MODE_RULES: dict[str, str] = {
    "controlled_template_fill": (
        "GENERATION MODE: controlled_template_fill.\n"
        "- The model may NOT create new facts. Mainly fill fixed slots from verified inputs.\n"
        "- Output should be table/list/template-heavy, not free narrative.\n"
        "- Every slot without verified input must be [●] plus a missing-input flag."
    ),
    "evidence_based_drafting": (
        "GENERATION MODE: evidence_based_drafting.\n"
        "- Narrative drafting is allowed, but every material claim must carry an evidence tag "
        "or source pointer traceable to the provided context.\n"
        "- Claims without support must be [●] / **DATA_MISSING** with an [[AI:VERIFY|...]] pointer."
    ),
    "legal_checklist_drafting": (
        "GENERATION MODE: legal_checklist_drafting.\n"
        "- Follow the checklist order exactly.\n"
        "- Include rule references (Listing Rules / ordinance provisions) and issuer relevance "
        "for each checklist item.\n"
        "- Do not skip items; unsupported items get [●] placeholders and missing-input flags."
    ),
    "professional_source_assembly_only": (
        "GENERATION MODE: professional_source_assembly_only.\n"
        "- Assemble ONLY from verified professional source documents (signed reports, legal "
        "opinions, constitutional documents, financial models).\n"
        "- The model must NOT invent professional opinions or legal/accounting conclusions.\n"
        "- If the source document is unavailable, generate a skeleton only and flag the section "
        "as a blocker-level missing input."
    ),
}


def format_kg_guidance(reqs: dict) -> str:
    """Render KG-derived fields into a prompt-ready block."""
    kg_keys = [
        "kg_function",
        "kg_purpose",
        "kg_typical_structure",
        "kg_writing_rules",
        "kg_required_input_fields",
        "kg_evidence_types",
        "kg_common_pitfalls",
    ]
    if not any(reqs.get(k) for k in kg_keys):
        return ""

    lines: list[str] = [
        "KNOWLEDGE-GRAPH SECTION GUIDANCE (derived from 125 Exchange prospectuses):"
    ]
    if reqs.get("kg_function"):
        lines.append(f"Function: {reqs['kg_function']}")
    if reqs.get("kg_purpose"):
        lines.append(f"Purpose: {reqs['kg_purpose']}")

    struct = reqs.get("kg_typical_structure") or []
    structure_mode = str(reqs.get("kg_structure_mode") or "narrative").strip().lower()
    if struct:
        lines.append("Typical structure:")
        for item in struct:
            sub = item.get("subsection") or ""
            desc = item.get("description") or ""
            lines.append(f"  - {sub}: {desc}")
        if structure_mode == "narrative":
            lines.append("")
            lines.append(
                "HEADING LOCK: Use the subsection names listed under \"Typical structure\" above "
                "VERBATIM as your H2/H3 headings, in that order. You may prefix them with "
                "sequential numbers (\"1 <name>\", \"2 <name>\", ...). You MUST NOT rename, "
                "merge, split, reorder, or omit them. If a subsection has no supporting "
                "evidence, still include the heading with body \"**DATA_MISSING**\" plus an "
                "[[AI:VERIFY|evidence=...]] pointer. You MAY add at most one extra trailing "
                "subsection for genuinely section-specific content if the evidence requires it."
            )
        else:
            lines.append("")
            lines.append(
                "FORMAT LOCK (dictionary mode): do NOT force subsection headings from Typical structure. "
                "Prefer a table or alphabetical list of entries, with concise row/term definitions. "
                "Avoid adding narrative-only blocks unless the section requirements explicitly demand them."
            )

    rules = reqs.get("kg_writing_rules") or []
    if rules:
        lines.append("Writing rules:")
        for r in rules:
            lines.append(f"  - {r}")

    fields = reqs.get("kg_required_input_fields") or []
    if fields:
        lines.append("Required input fields (fill from context or mark DATA_MISSING):")
        for f in fields:
            name = f.get("field") or f.get("field_id") or ""
            desc = f.get("description") or ""
            lines.append(f"  - {name}: {desc}")

    evidence = reqs.get("kg_evidence_types") or []
    if evidence:
        lines.append("Evidence types: " + ", ".join(str(e) for e in evidence))

    pitfalls = reqs.get("kg_common_pitfalls") or []
    if pitfalls:
        lines.append("Common pitfalls to avoid:")
        for p in pitfalls:
            lines.append(f"  - {p}")
    return "\n".join(lines)


def format_gating_docs_block(section_id: str) -> str:
    try:
        from prospectus_graph.crosswalk import format_gating_block
    except Exception:  # noqa: BLE001
        return ""
    try:
        return format_gating_block(section_id)
    except Exception:  # noqa: BLE001
        return ""


def _load_generation_rules() -> dict[str, list[str]]:
    path = resolve_generation_rules_path()
    if not path.is_file():
        return {}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return {k: list(v) for k, v in data.items() if isinstance(v, list)}


def format_generation_rules_block(section_id: str) -> str:
    rules_map = _load_generation_rules()
    rules = rules_map.get(section_id) or []
    if not rules:
        return ""
    lines = ["SECTION GENERATION RULES (apply before drafting narrative):"]
    for rule in rules:
        lines.append(f"- {rule}")
    return "\n".join(lines)


def _condition_applies(condition: str, meta: dict[str, Any]) -> bool | None:
    """Evaluate a conditional-rule trigger against issuer metadata.

    Supported forms: ``"flag"``, ``"not flag"``, ``"issuer_type=VALUE"``.
    Returns None when the condition cannot be evaluated (unknown key),
    in which case the rule is kept as conditional text for the model.
    """
    cond = (condition or "").strip()
    if not cond:
        return None
    negate = False
    if cond.startswith("not "):
        negate = True
        cond = cond[4:].strip()
    if "=" in cond:
        key, _, value = cond.partition("=")
        key, value = key.strip(), value.strip()
        actual = meta.get(key)
        if actual is None or str(actual).strip() == "":
            return None
        result = str(actual).strip().lower() == value.lower()
        return not result if negate else result
    if cond in meta:
        result = bool(meta[cond])
        return not result if negate else result
    return None


def _render_lines(title: str, items: list[Any]) -> str:
    lines = [title]
    for item in items:
        text = str(item).strip()
        if text:
            lines.append(f"- {text}")
    return "\n".join(lines) if len(lines) > 1 else ""


def _render_conditional_rules(
    title: str,
    rules: list[Any],
    meta: dict[str, Any],
) -> str:
    """Render conditional rules, filtering by issuer metadata where possible."""
    active: list[str] = []
    unresolved: list[str] = []
    for entry in rules:
        if isinstance(entry, str):
            if entry.strip():
                unresolved.append(entry.strip())
            continue
        if not isinstance(entry, dict):
            continue
        condition = str(entry.get("when", "")).strip()
        entry_rules = [str(r).strip() for r in entry.get("rules", []) if str(r).strip()]
        if not entry_rules:
            continue
        applies = _condition_applies(condition, meta)
        if applies is True:
            active.extend(entry_rules)
        elif applies is None:
            unresolved.append(f"If {condition}: " + " ".join(entry_rules))
        # applies is False -> rule set intentionally dropped
    lines: list[str] = []
    if active:
        lines.append(title + " (APPLICABLE to this issuer per metadata):")
        lines.extend(f"- {r}" for r in active)
    if unresolved:
        if not lines:
            lines.append(title + ":")
        lines.extend(f"- {r}" for r in unresolved)
    return "\n".join(lines)


def format_structured_requirements(
    section_id: str,
    reqs: dict,
    meta: dict[str, Any],
) -> str:
    """Compile structured section spec fields into a prompt block (spec §39.4 order)."""
    del section_id  # reserved for section-specific compilation overrides
    parts: list[str] = []

    function = str(reqs.get("section_function", "")).strip()
    if function:
        parts.append(f"SECTION FUNCTION:\n{function}")

    mode = str(reqs.get("generation_mode", "")).strip()
    if mode:
        parts.append(GENERATION_MODE_RULES.get(mode, f"GENERATION MODE: {mode}."))
    if reqs.get("requires_verified_source"):
        parts.append(
            "SOURCE GATING: this section requires verified source input. Company-specific "
            "facts without verified support must be [●] plus a missing-input flag."
        )

    block = _render_lines(
        "MANDATORY SUBSECTIONS (keep this order; unsupported items get [●] placeholders):",
        reqs.get("mandatory_subsections") or [],
    )
    if block:
        parts.append(block)

    block = _render_lines(
        "REQUIRED INPUT FIELDS (fill from context or mark as missing input):",
        reqs.get("required_input_fields") or [],
    )
    if block:
        parts.append(block)

    block = _render_conditional_rules(
        "ISSUER-TYPE CONDITIONAL RULES",
        reqs.get("issuer_type_conditional_rules") or [],
        meta,
    )
    if block:
        parts.append(block)

    block = _render_conditional_rules(
        "TRANSACTION CONDITIONAL RULES",
        reqs.get("transaction_conditional_rules") or [],
        meta,
    )
    if block:
        parts.append(block)

    block = _render_lines("TABLE REQUIREMENTS:", reqs.get("table_requirements") or [])
    if block:
        parts.append(block)

    block = _render_lines("DRAFTING SEQUENCE:", reqs.get("drafting_sequence") or [])
    if block:
        parts.append(block)

    block = _render_lines("EVIDENCE REQUIREMENTS:", reqs.get("evidence_requirements") or [])
    if block:
        parts.append(block)

    block = _render_lines("CROSS-REFERENCE RULES:", reqs.get("cross_reference_rules") or [])
    if block:
        parts.append(block)

    block = _render_lines(
        "NEGATIVE RULES (hard prohibitions):", reqs.get("negative_rules") or []
    )
    if block:
        parts.append(block)

    block = _render_lines(
        "VALIDATION CHECKLIST (the verifier will enforce these):",
        reqs.get("validation_checklist") or [],
    )
    if block:
        parts.append(block)

    sources = reqs.get("source_registry") or []
    if sources:
        parts.append(
            _render_lines(
                "ALLOWED SOURCES (draft this section only from these inputs):", sources
            )
        )

    fallback = str(reqs.get("fallback_if_missing_data", "")).strip()
    if fallback:
        parts.append(f"MISSING-DATA FALLBACK:\n{fallback}")

    return "\n\n".join(p for p in parts if p)


def augment_requirements(
    section_id: str,
    base_requirements: str,
    issuer_metadata_path: Path | None,
    reqs: dict | None = None,
) -> str:
    from prospectus_graph.issuer_metadata import (
        conditional_section_emphasis,
        format_metadata_for_prompt,
        load_issuer_metadata,
    )
    from prospectus_graph.locked_snippets import format_locked_snippets_for_section

    meta = load_issuer_metadata(issuer_metadata_path)
    parts: list[str] = [
        format_metadata_for_prompt(meta),
        conditional_section_emphasis(meta),
    ]
    locked = format_locked_snippets_for_section(section_id, meta)
    if locked:
        parts.append(locked)
    gen_rules = format_generation_rules_block(section_id)
    if gen_rules:
        parts.append(gen_rules)
    parts.append("---\nSECTION-SPECIFIC REQUIREMENTS:\n" + base_requirements)
    if reqs is not None:
        structured = format_structured_requirements(section_id, reqs, meta)
        if structured:
            parts.append(
                "---\nSECTION DRAFTING SPECIFICATION (structured; follow exactly):\n"
                + structured
            )
    gating_block = format_gating_docs_block(section_id)
    if gating_block:
        parts.append(gating_block)
    if reqs is not None:
        kg_block = format_kg_guidance(reqs)
        if kg_block:
            parts.append(kg_block)
    return "\n\n".join(p for p in parts if p.strip())

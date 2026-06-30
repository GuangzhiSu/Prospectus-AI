"""Section requirements augmentation (issuer metadata, KG, gating docs, generation rules)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..paths import resolve_generation_rules_path


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
    gating_block = format_gating_docs_block(section_id)
    if gating_block:
        parts.append(gating_block)
    if reqs is not None:
        kg_block = format_kg_guidance(reqs)
        if kg_block:
            parts.append(kg_block)
    return "\n\n".join(p for p in parts if p.strip())

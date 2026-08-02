"""Compile the runtime SectionSpec used by Agent2.

The KG, corpus style guides and legacy generation rules remain useful authoring
assets, but they are intentionally not concatenated into every model request.
Runtime prompts receive one compact, section-specific contract instead.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# Positive drafting recipes and output contracts per generation mode.
GENERATION_MODE_RULES: dict[str, str] = {
    "controlled_template_fill": (
        "GENERATION MODE: controlled_template_fill.\n"
        "OUTPUT CONTRACT: Use the section's natural filing format: cover block, registry, "
        "definition list, timetable or table. Do not add narrative headings or two-sentence "
        "paragraphs merely for length.\n"
        "DRAFTING PATTERN: For each required slot, write exact label -> verified value -> "
        "qualifier/note -> citation. Preserve the slot when missing, for example "
        "`Stock code | [● stock code]`. Use short prose only for a required warning or "
        "mechanics explanation. Do not infer one slot from another."
    ),
    "evidence_based_drafting": (
        "GENERATION MODE: evidence_based_drafting.\n"
        "OUTPUT CONTRACT: Use `##` for genuine prospectus subsections and developed paragraphs "
        "where evidence exists; use tables for comparable numeric series. A missing subsection "
        "may contain only the standard missing-input block.\n"
        "DRAFTING PATTERN: Each paragraph should perform one disclosure job: (1) narrow topic "
        "sentence, (2) issuer-specific facts and period/scale, (3) supported explanation of why "
        "the facts matter, and (4) cross-reference where another section carries detail. Place "
        "citations immediately after the facts they support. Do not manufacture a causal "
        "explanation from numbers alone."
    ),
    "legal_checklist_drafting": (
        "GENERATION MODE: legal_checklist_drafting.\n"
        "OUTPUT CONTRACT: Follow the checklist order exactly. Use one heading per legal topic "
        "or transaction category and a table where the SectionSpec prescribes fields.\n"
        "DRAFTING PATTERN: For each item state (1) rule/document and authority, if supported, "
        "(2) requirement or contractual term, (3) facts making it relevant to the issuer, "
        "(4) compliance/grant/approval status supported by professional evidence, and (5) "
        "residual issue and cross-reference. Never convert silence into a legal conclusion."
    ),
    "risk_narrative_drafting": (
        "GENERATION MODE: risk_narrative_drafting.\n"
        "OUTPUT CONTRACT: Use grouped risk headings followed by long-form prospectus paragraphs; "
        "do not use a risk table, memo labels or checklist prose.\n"
        "DRAFTING PATTERN: Each risk heading must express trigger plus consequence. Paragraph 1 "
        "states the issuer-specific exposure and supporting facts. Paragraph 2 explains the "
        "credible failure mechanism and operational/financial/legal effect. End with the "
        "investor consequence or controlled material-adverse-effect formulation. Mention controls "
        "only to explain residual risk; do not neutralize the risk."
    ),
    "professional_source_assembly_only": (
        "GENERATION MODE: professional_source_assembly_only.\n"
        "OUTPUT CONTRACT: Preserve the professional document's headings, tables, qualifications "
        "and opinion boundaries. If the document is unavailable, output only the required "
        "skeleton and a blocker-level missing-input block.\n"
        "DRAFTING PATTERN: Map each supplied professional-source paragraph/table to the matching "
        "required slot, retain its scope and caveats, and cite the source. Assemble and normalize "
        "formatting only; do not draft, summarize or strengthen an accountant/legal opinion."
    ),
}


def _condition_applies(
    condition: str,
    meta: dict[str, Any],
    known_keys: set[str] | None = None,
) -> bool | None:
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
        if known_keys is not None and key not in known_keys:
            return None if negate else False
        actual = meta.get(key)
        if actual is None or str(actual).strip() == "":
            return None
        result = str(actual).strip().lower() == value.lower()
        return not result if negate else result
    if cond in meta:
        if known_keys is not None and cond not in known_keys:
            # An omitted positive flag does not activate a module. An omitted
            # negated flag remains unresolved rather than being treated as false.
            return None if negate else False
        result = bool(meta[cond])
        return not result if negate else result
    return None


def _render_lines(title: str, items: list[Any]) -> str:
    lines = [title]
    seen: set[str] = set()
    for item in items:
        text = str(item).strip()
        key = " ".join(text.lower().split())
        if text and key not in seen:
            lines.append(f"- {text}")
            seen.add(key)
    return "\n".join(lines) if len(lines) > 1 else ""


def _fallback_outline(reqs: dict[str, Any]) -> list[str]:
    """Use KG headings only when the maintained SectionSpec has no outline."""
    if reqs.get("mandatory_subsections"):
        return [
            str(item).strip()
            for item in reqs["mandatory_subsections"]
            if str(item).strip()
        ]
    outline: list[str] = []
    for item in reqs.get("kg_typical_structure") or []:
        if isinstance(item, dict):
            name = str(item.get("subsection") or "").strip()
        else:
            name = str(item).strip()
        if name:
            outline.append(name)
    return outline


def _required_inputs(reqs: dict[str, Any]) -> list[str]:
    """Return compact input names, falling back to KG field names only."""
    configured = reqs.get("required_input_fields") or []
    if configured:
        return [str(item).strip() for item in configured if str(item).strip()]
    fields: list[str] = []
    for item in reqs.get("kg_required_input_fields") or []:
        if isinstance(item, dict):
            name = str(item.get("field") or item.get("field_id") or "").strip()
        else:
            name = str(item).strip()
        if name:
            fields.append(name)
    return fields


def _format_active_metadata(meta: dict[str, Any]) -> str:
    """Expose only metadata that can affect this draft, not every false flag."""
    issuer_type = str(meta.get("issuer_type") or "other")
    active = sorted(
        key
        for key, value in meta.items()
        if key != "issuer_type" and value is True
    )
    lines = [f"- issuer_type: {issuer_type}"]
    lines.append("- active_flags: " + (", ".join(active) if active else "none"))
    return "ISSUER CONDITIONS:\n" + "\n".join(lines)


def _render_conditional_rules(
    title: str,
    rules: list[Any],
    meta: dict[str, Any],
    known_keys: set[str] | None = None,
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
        applies = _condition_applies(condition, meta, known_keys)
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
        lines.append(
            title
            + " (UNRESOLVED — do not apply until metadata is confirmed; request verification):"
        )
        lines.extend(f"- {r}" for r in unresolved)
    return "\n".join(lines)


def format_structured_requirements(
    section_id: str,
    reqs: dict,
    meta: dict[str, Any],
    known_metadata_keys: set[str] | None = None,
) -> str:
    """Compile one de-duplicated runtime SectionSpec."""
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
            "SOURCE REQUIREMENT: verified issuer evidence is required; apply the global "
            "Missing-Input Policy when it is absent."
        )

    block = _render_lines(
        "MANDATORY STRUCTURE (keep this order; apply the Missing-Input Policy when unsupported):",
        _fallback_outline(reqs),
    )
    if block:
        parts.append(block)

    block = _render_lines(
        "REQUIRED INPUT FIELDS (fill from EvidencePacket; use [● field name] only for missing slot values):",
        _required_inputs(reqs),
    )
    if block:
        parts.append(block)

    block = _render_conditional_rules(
        "ISSUER-TYPE CONDITIONAL RULES",
        reqs.get("issuer_type_conditional_rules") or [],
        meta,
        known_metadata_keys,
    )
    if block:
        parts.append(block)

    block = _render_conditional_rules(
        "TRANSACTION CONDITIONAL RULES",
        reqs.get("transaction_conditional_rules") or [],
        meta,
        known_metadata_keys,
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
        "WRITER SELF-CHECK (high-risk Reviewer and final validators also apply where available):",
        reqs.get("validation_checklist") or [],
    )
    if block:
        parts.append(block)

    sources = reqs.get("source_registry") or []
    if sources:
        parts.append(
            _render_lines(
                "SOURCE PRIORITY / RECONCILIATION TARGETS:", sources
            )
        )

    return "\n\n".join(p for p in parts if p)


def augment_requirements(
    section_id: str,
    base_requirements: str,
    issuer_metadata_path: Path | None,
    reqs: dict | None = None,
) -> str:
    from prospectus_graph.issuer_metadata import load_issuer_metadata
    from prospectus_graph.locked_snippets import format_locked_snippets_for_section

    meta = load_issuer_metadata(issuer_metadata_path)
    known_metadata_keys: set[str] = {"issuer_type"}
    if issuer_metadata_path is not None and issuer_metadata_path.is_file():
        try:
            raw_meta = json.loads(issuer_metadata_path.read_text(encoding="utf-8"))
            if isinstance(raw_meta, dict):
                known_metadata_keys.update(str(key) for key in raw_meta)
        except (OSError, json.JSONDecodeError):
            pass
    parts: list[str] = [_format_active_metadata(meta)]
    locked = format_locked_snippets_for_section(section_id, meta)
    if locked:
        parts.append(locked)
    if reqs is not None:
        structured = format_structured_requirements(
            section_id, reqs, meta, known_metadata_keys
        )
        if structured:
            parts.append("---\nSECTION SPEC (single runtime contract):\n" + structured)
    else:
        # Compatibility for callers that still supply only the legacy prose.
        parts.append("---\nSECTION SPEC:\n" + base_requirements)
    return "\n\n".join(p for p in parts if p.strip())

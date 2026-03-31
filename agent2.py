#!/usr/bin/env python3
"""
Agent2: Generate prospectus sections from Agent1 output through a LangGraph pipeline.

Legacy (rag_chunks only):
    Retriever -> Section Writer -> Verifier -> Revision -> Assembler

Hybrid (text_chunks + fact_store):
    Retriever (semantic + fact filtering) -> Section Planner -> Section Writer -> Verifier -> Revision -> Assembler

Issuer metadata: edit issuer_metadata.json (or pass --issuer-metadata). Conditional warnings and
locked regulatory snippets are injected from prospectus_graph/locked_snippets.json.

After a run, the output bundle writes draft_clean.md, validation_report.md, evidence_register.jsonl,
and coverage_matrix.md under --output-dir (unless --no-output-bundle).
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
from prospectus_graph.timetable_template import render_timetable_template
from prospectus_graph.retrievers import (
    HybridRetriever,
    SectionAwareRAGRetriever,
)
from prospectus_graph.state import SectionDraftState
from prospectus_graph.verifier import (
    append_verification_notes,
    merge_verification_issues,
    parse_verifier_agent_output,
    should_request_revision,
    verify_section_draft,
)


def _issuer_metadata_default_path() -> Path:
    return Path(__file__).resolve().parent / "issuer_metadata.json"


def _read_section_generation_rules_excerpt() -> str:
    p = Path(__file__).resolve().parent / "prospectus_graph" / "section_generation_rules.md"
    if not p.exists():
        return ""
    return p.read_text(encoding="utf-8")[:8000]


def _augment_requirements(
    section_id: str,
    base_requirements: str,
    issuer_metadata_path: Path | None,
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
    ex = _read_section_generation_rules_excerpt()
    if ex.strip():
        parts.append("SECTION GENERATION RULES (apply before drafting narrative):\n" + ex)
    parts.append("---\nSECTION-SPECIFIC REQUIREMENTS:\n" + base_requirements)
    return "\n\n".join(parts)


def _lookup_section_name(section_id: str) -> str:
    return next((name for sid, name in SECTIONS if sid == section_id), section_id)


HKEX_FORMAT_INSTRUCTION = """
CRITICAL FORMAT REQUIREMENTS (HKEX sponsor-counsel working draft mode):

Primary objective: Optimise for (1) compliance language, (2) disclosure defensibility, (3) verifiability under sponsor due-diligence standards. Preserve defensibility over elegance when they conflict. Do not convert possibility into certainty; do not smooth away legal or factual caveats.

- Output in ENGLISH ONLY. No Chinese or other languages.
- Draft in sponsor-counsel working draft mode for an HKEX listing document. This is not a fully complete clean final filing copy.
- Use formal, factual, balanced, non-promotional language. Treat uncontrolled language as a major defect.
- All company-specific facts, figures, dates, rankings, waivers, legal conclusions, and status statements must come only from the provided context. Do not invent sources, thresholds, definitions, or evidence.
- EVIDENCE REGISTRY / ATOMIC CLAIMS: Every numeric or material factual claim should be traceable. Prefer structured placeholders over fluent invented narrative when support is missing.
- If a claim has NO support in context, output exactly **DATA_MISSING** or **COUNSEL_INPUT_REQUIRED** (as appropriate) for that element — do NOT write a polished paragraph that implies facts exist.
- Mandatory regulatory / disclaimer text (Rule 11.20-style responsibility, WVR, 18C, Pre-Commercial, reliance-only, website-not-part, territorial restrictions) must appear inside [[AI:LOCKED|reason=mandatory_rule_text|...]] using counsel-approved placeholder blocks where provided; do NOT paraphrase locked snippets.

UNIFIED MACHINE-PARSEABLE AI TAGS (use exactly this syntax; one tag per pair of brackets):
  [[AI:CITE|source=...; doc=...; page=...; section=...; scope=...; metric=...; period=...; confidence=...]]
  [[AI:XREF|to=exact_section_id]]
  [[AI:VERIFY|evidence=...]]
  [[AI:LPD|timestamp=ISO8601]]
  [[AI:LOCKED|reason=mandatory_rule_text|...]]

- Avoid promotional, absolute, or unqualified forward-looking language. Avoid explicit or implicit profit forecasts unless a formal profit-forecast workflow applies. Require cross-reference discipline and evidence hooks for claims needing verification.
- Regime-sensitive flags in ISSUER METADATA control which conditional warnings and cross-references are mandatory; do not contradict issuer metadata.
"""


def _add_fact_ids_to_formatted(facts_block: str) -> str:
    """Prepend fact_1, fact_2, ... to each non-header line for planner mapping."""
    if not facts_block or not facts_block.strip():
        return "[No structured facts available]"
    lines = []
    idx = 0
    for line in facts_block.split("\n"):
        s = line.strip()
        if not s:
            lines.append(line)
            continue
        if s.endswith("FACTS"):  # header line
            lines.append(line)
            continue
        idx += 1
        lines.append(f"fact_{idx}: {line}")
    return "\n".join(lines)


def build_planner_prompt(
    *,
    section_name: str,
    requirements: str,
    formatted_facts: str,
    text_summary: str,
) -> str:
    """Build prompt for Section Planner: structured outline + fact-to-subsection mapping."""
    numbered_facts = _add_fact_ids_to_formatted(formatted_facts)
    return f"""Role: You are the Section Planner for an HKEX prospectus drafting workflow.

Objective: Produce a structured outline for the "{section_name}" section and assign available facts to the most appropriate subsections.

Section requirements:
{requirements}

Available structured facts (reference by fact_N in fact_mapping):
---
{numbered_facts}
---

Brief summary of narrative evidence (for structure guidance):
---
{text_summary[:2000] if text_summary else "[No narrative summary]"}
---

Output JSON only, with this exact schema:
{{
  "outline": "1 FirstSubsection\\n2 SecondSubsection\\n3 ThirdSubsection\\n...",
  "fact_mapping": {{
    "FirstSubsection": ["fact_1", "fact_2"],
    "SecondSubsection": [],
    ...
  }}
}}

Rules:
- outline: Numbered list of subsection titles, one per line. Match HKEX and section requirements.
- fact_mapping: For each subsection, list fact IDs (e.g. fact_1, fact_2) that belong there.
- If a fact fits multiple subsections, assign it to the single best fit.
- Subsection names in fact_mapping must exactly match the outline titles (after the number).
"""


def build_prompt(
    section_id: str,
    section_name: str,
    requirements: str,
    context: str,
    modification_instructions: str | None = None,
    planner_outline: str | None = None,
) -> str:
    """Build the section-writer prompt."""
    mod_note = ""
    if modification_instructions and modification_instructions.strip():
        mod_note = (
            "\n\nUser modification request (incorporate these changes):\n"
            f"{modification_instructions.strip()}\n"
        )
    planner_block = ""
    if planner_outline and planner_outline.strip():
        planner_block = f"""

Planned structure (follow this outline):
---
{planner_outline.strip()}
---
"""
    return f"""Role: You are drafting one prospectus section for a Hong Kong Stock Exchange (HKEX) listing in sponsor-counsel working draft mode.

Objective: Produce a conservative, verification-aware working draft: prospectus-ready prose where evidence exists, structured placeholders and AI tags where support is missing. Headings, contents entries, and cross-references must match exactly across the document.

{HKEX_FORMAT_INSTRUCTION}

CRITICAL: Use ONLY data from the provided context for company-specific facts. Do NOT invent, fabricate, or hallucinate any facts, figures, names, dates, rankings, approvals, waivers, legal conclusions, or management intentions. If information is not in the context, state "[Information not provided in the documents]" and add [[AI:VERIFY|...]] where human review is needed.

Section: {section_name}

Requirements:
{requirements}
{planner_block}

Context from user-uploaded company documents (ONLY source of data):
---
{context}
---
{mod_note}
Instructions:
1. Use the section requirements and HKEX conventions to build the section structure and sub-headings.
2. Use ONLY the provided context for company-specific facts, figures, names, dates, and status statements.
3. If a required item is unsupported, keep the relevant heading; use **DATA_MISSING** or **COUNSEL_INPUT_REQUIRED** (or legacy "[Information not provided in the documents]") and add [[AI:VERIFY|...]] where appropriate — do not fabricate narrative.
4. Write ENTIRELY in English. Use formal, factual, balanced prose. Tables or lists are allowed where appropriate.
5. You may include short working-draft note blocks or end-notes when needed, but only within the section itself and only using neutral drafting language plus the allowed AI tags.
6. For rankings, market data, share, CAGR, or third-party study statements, include [[AI:CITE|source=...; scope=...; date=...; metric=...]] unless the required source metadata already appears in the context.
7. Do not use promotional, absolute, or unqualified forward-looking language. Do not create explicit or implicit profit forecasts, margin forecasts, valuation conclusions, or certainty of commercial success.
8. Do not output chatty assistant commentary. Output only the section working draft, placeholders, and allowed AI tags. Any materiality or legal sufficiency judgment must be escalated to sponsor-counsel review.
9. LIST CONTROL: If a product list, item catalog, or enumerated list contains more than 10 items, SUMMARIZE by category instead of enumerating every item. Example: "The company's product portfolio includes education robots (e.g. Yanshee, Alpha Mini), logistics robots (AGVs, AMRs), and consumer products such as AiRROBO robotic appliances." Do NOT repeat the same product or item name multiple times. Do NOT loop or enumerate endlessly.

Section content (English only):"""


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


def build_verifier_prompt(
    *,
    section_name: str,
    requirements: str,
    retrieval_context: str,
    draft_text: str,
    mechanical_issues: list[dict[str, Any]],
    revision_count: int,
) -> str:
    mechanical_block = _format_issue_list_for_prompt(mechanical_issues)
    return f"""Role: You are the Verifier Agent in a sponsor-counsel drafting workflow for an HKEX prospectus.

Objective: Review the current section draft against (1) the retrieved evidence, (2) the section requirements, and (3) sponsor-counsel controls. You are not the writer. Do not rewrite the section. Decide whether revision is required.

Section: {section_name}
Current revision pass: {revision_count}

Section requirements:
{requirements}

Retrieved evidence:
---
{retrieval_context}
---

Current section draft:
---
{draft_text}
---

Mechanical checks already detected:
{mechanical_block}

Review focus:
1. Unsupported facts, figures, rankings, legal conclusions, approvals, waivers, or dates.
2. Missing required section structure or missing sub-headings.
3. Promotional or uncontrolled language.
4. Unqualified forward-looking wording outside the proper cautionary context.
5. Explicit or implicit profit-forecast wording.
6. Missing [[AI:CITE|...]], [[AI:VERIFY|...]], or [[AI:XREF|...]] where needed.
7. Any material mismatch between the evidence and the draft.

Return JSON only, with this exact schema:
{{
  "pass": true,
  "summary": "short reviewer summary",
  "issues": [
    {{"severity": "blocker|high|medium|low", "code": "short_code", "message": "specific issue", "category": "DATA_MISSING|WRITING_ERROR"}}
  ],
  "revision_instructions": [
    "specific action for the revision agent (only for WRITING_ERROR issues)"
  ]
}}

CRITICAL - Issue categories (use exactly):
- DATA_MISSING: The required information is NOT in the source documents. The Writer correctly used [Information not provided] or a placeholder. The Writer cannot fix this; do NOT request revision.
- WRITING_ERROR: The Writer made an error (invented facts, wrong structure, promotional language, unsupported claims, missing AI tags where evidence exists but was not cited). Revision can fix this.

Examples of DATA_MISSING: missing application dates (timetable not in data), missing CCASS details (not in documents), missing allotment info (not provided).
Examples of WRITING_ERROR: invented numbers, promotional tone, unsupported market claim without [[AI:CITE]], wrong heading structure.

Rules:
- If there are blocker or high-severity WRITING_ERROR issues, set "pass" to false.
- DATA_MISSING issues must NOT trigger revision - they are documented gaps, not Writer faults.
- If the draft is broadly acceptable but still needs sponsor follow-up notes, you may set "pass" to true and use low or medium issues.
- Do not invent evidence. Do not output prose outside the JSON object.
"""


def build_revision_prompt(
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
    issues_block = _format_issue_list_for_prompt(verification_issues)
    revision_block = _format_issue_list_for_prompt(revision_instructions)
    mod_note = ""
    if modification_instructions and modification_instructions.strip():
        mod_note = (
            "\nAdditional user modification request to preserve while revising:\n"
            f"- {modification_instructions.strip()}\n"
        )
    return f"""Role: You are the Revision Agent in a sponsor-counsel drafting workflow for an HKEX prospectus.

Objective: Revise the section draft in response to reviewer feedback, while relying only on the retrieved evidence and preserving the working-draft style.

Section: {section_name}

Section requirements:
{requirements}

Retrieved evidence:
---
{retrieval_context}
---

Current section draft:
---
{current_draft}
---

Verifier summary:
{verifier_summary or "[No verifier summary provided.]"}

Verifier issues:
{issues_block}

Required revision actions:
{revision_block}
{mod_note}
Instructions:
1. Fix the reviewer issues where the evidence allows.
2. Preserve valid supported content; do not rewrite the section from scratch unless necessary.
3. Keep required headings and sub-headings. If support is missing, retain the heading and use [Information not provided in the documents].
4. Add or preserve [[AI:VERIFY|...]], [[AI:CITE|...]], [[AI:XREF|...]], and [[AI:LPD|...]] when appropriate.
5. Do not invent new facts, dates, rankings, approvals, waivers, or legal conclusions.
6. Do not add chatty commentary. Output only the revised section draft.

Revised section (English only):"""


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


def _supports_hybrid_retrieval(rag_dir: str | Path) -> bool:
    """True if text_chunks.jsonl or fact_store.jsonl exist."""
    path = Path(rag_dir)
    return (path / "text_chunks.jsonl").exists() or (path / "fact_store.jsonl").exists()


def _create_retriever(rag_dir: str | Path):
    """Create HybridRetriever if supported, else SectionAwareRAGRetriever."""
    if _supports_hybrid_retrieval(rag_dir):
        return HybridRetriever(rag_dir)
    kb = Agent1JsonlKnowledgeBase(rag_dir)
    return SectionAwareRAGRetriever([kb])


class RetrieverNode:
    """Unified node: uses HybridRetriever or SectionAwareRAGRetriever based on retriever type."""

    def __init__(self, retriever: SectionAwareRAGRetriever | HybridRetriever):
        self.retriever = retriever

    def __call__(self, state: SectionDraftState) -> dict:
        from prospectus_graph.retrievers import HybridRetrievalResult, build_context

        result = self.retriever.retrieve(
            section_id=state["section_id"],
            section_name=state["section_name"],
            requirements=state["requirements"],
            max_context_chars=state["max_context_chars"],
        )
        if isinstance(result, HybridRetrievalResult):
            context = result.retrieval_context or (
                "[No supporting evidence was retrieved for this section. "
                "Produce a structured working draft skeleton with placeholders and AI verification notes only.]"
            )
            return {
                "retrieved_chunks": result.text_evidence,
                "text_evidence": result.text_evidence,
                "retrieved_facts": result.facts,
                "formatted_facts": result.formatted_facts,
                "retrieval_context": context,
                "retrieval_notes": result.notes,
            }
        context = result.context or (
            "[No supporting evidence was retrieved for this section. "
            "Produce a structured working draft skeleton with placeholders and AI verification notes only.]"
        )
        return {
            "retrieved_chunks": result.chunks,
            "retrieval_context": context,
            "retrieval_notes": result.notes,
        }


def _parse_planner_output(raw: str) -> tuple[str, dict[str, list[str]]]:
    """Extract outline and fact_mapping from planner JSON. Returns ("", {}) on parse failure."""
    import json
    import re
    raw = (raw or "").strip()
    # Try to extract JSON block
    m = re.search(r"\{[\s\S]*\}", raw)
    if m:
        raw = m.group(0)
    try:
        data = json.loads(raw)
        outline = str(data.get("outline", "")).strip()
        mapping = data.get("fact_mapping")
        if isinstance(mapping, dict):
            return outline, {k: [str(x) for x in v] if isinstance(v, list) else [] for k, v in mapping.items()}
        return outline, {}
    except json.JSONDecodeError:
        return "", {}


class SectionPlannerAgent:
    """Produces structured outline and fact-to-subsection mapping."""

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
        text_summary = ""
        if state.get("text_evidence"):
            parts = [ch.get("text", "")[:400] for ch in state["text_evidence"][:5]]
            text_summary = "\n".join(parts)
        elif state.get("retrieval_context"):
            text_summary = state["retrieval_context"][:3000]
        prompt = build_planner_prompt(
            section_name=state["section_name"],
            requirements=state["requirements"],
            formatted_facts=state.get("formatted_facts", ""),
            text_summary=text_summary,
        )
        raw = generate_with_llm(
            prompt,
            model_name=self.model_name,
            model=self.model,
            tokenizer=self.tokenizer,
        )
        outline, fact_mapping = _parse_planner_output(raw)
        return {
            "planner_outline": outline,
            "planner_fact_mapping": fact_mapping,
        }


class SectionWriterAgent:
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
            state.get("planner_outline"),
        )
        draft_text = generate_with_llm(
            prompt,
            model_name=self.model_name,
            model=self.model,
            tokenizer=self.tokenizer,
        )
        return {
            "draft_text": draft_text,
            "initial_draft_text": state.get("initial_draft_text") or draft_text,
        }


class VerifierAgent:
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
        mechanical_issues, _ = verify_section_draft(
            section_id=state["section_id"],
            draft_text=state.get("draft_text", ""),
            retrieval_context=state.get("retrieval_context", ""),
        )

        verifier_prompt = build_verifier_prompt(
            section_name=state["section_name"],
            requirements=state["requirements"],
            retrieval_context=state.get("retrieval_context", ""),
            draft_text=state.get("draft_text", ""),
            mechanical_issues=mechanical_issues,
            revision_count=state.get("revision_count", 0),
        )
        verifier_raw_output = generate_with_llm(
            verifier_prompt,
            model_name=self.model_name,
            model=self.model,
            tokenizer=self.tokenizer,
        )
        agent_pass, verifier_summary, agent_issues, revision_instructions = (
            parse_verifier_agent_output(verifier_raw_output)
        )
        issues = merge_verification_issues(mechanical_issues, agent_issues)
        only_parse_failure = (
            not mechanical_issues
            and len(agent_issues) == 1
            and agent_issues[0]["code"] == "verifier_output_unparseable"
        )
        should_revise = should_request_revision(
            issues=issues,
            agent_pass=agent_pass,
            revision_count=state.get("revision_count", 0),
            max_revision_loops=state.get("max_revision_loops", 0),
        )
        if only_parse_failure:
            should_revise = False
        passed = (
            not any(issue["severity"] in {"blocker", "high"} for issue in issues)
            and agent_pass is not False
            and not should_revise
        )

        if should_revise and not revision_instructions:
            revision_instructions = [
                issue["message"]
                for issue in issues
                if issue.get("category", "WRITING_ERROR") == "WRITING_ERROR"
                and issue["severity"] in {"blocker", "high", "medium"}
            ][:8]

        verified_text = append_verification_notes(
            state.get("draft_text", ""),
            issues,
            passed=passed,
            summary=verifier_summary,
            revision_instructions=revision_instructions,
        )
        return {
            "mechanical_verification_issues": mechanical_issues,
            "verification_issues": issues,
            "verifier_passed": passed,
            "verifier_summary": verifier_summary,
            "verifier_raw_output": verifier_raw_output,
            "revision_instructions": revision_instructions,
            "should_revise": should_revise,
            "verified_text": verified_text,
        }


class RevisionAgent:
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
        # Only pass WRITING_ERROR issues to Revision Agent; DATA_MISSING cannot be fixed
        all_issues = state.get("verification_issues", [])
        revision_issues = [
            i for i in all_issues
            if i.get("category", "WRITING_ERROR") == "WRITING_ERROR"
        ]
        prompt = build_revision_prompt(
            section_name=state["section_name"],
            requirements=state["requirements"],
            retrieval_context=state.get("retrieval_context", ""),
            current_draft=state.get("draft_text", ""),
            verifier_summary=state.get("verifier_summary", ""),
            verification_issues=revision_issues,
            revision_instructions=state.get("revision_instructions", []),
            modification_instructions=state.get("modification_instructions"),
        )
        revised_text = generate_with_llm(
            prompt,
            model_name=self.model_name,
            model=self.model,
            tokenizer=self.tokenizer,
        )
        return {
            "draft_text": revised_text,
            "revision_count": state.get("revision_count", 0) + 1,
            "should_revise": False,
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


def _load_existing_sections(out_path: Path) -> dict[str, str]:
    """Load section_id -> body from section_*.md files."""
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
    return existing


def _generate_contents_body(existing: dict[str, str]) -> str:
    """
    Auto-generate Contents section from actual chapters. No LLM.
    Lists sections in SECTIONS order that exist in the document (including Contents itself).
    """
    sections_in_doc = set(existing.keys()) | {"Contents"}
    lines = []
    for sid, sname in SECTIONS:
        if sid in sections_in_doc:
            lines.append(f"{len(lines) + 1}. {sname}")
    return "\n".join(lines) if lines else "[No sections generated yet.]"


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
            if sid not in allowed_ids:
                continue
            if sid == "Contents":
                f.write(f"## {sname}\n\n")
                f.write(_generate_contents_body(existing))
            elif sid in existing:
                f.write(f"## {sname}\n\n")
                f.write(existing[sid])
            else:
                continue
            f.write("\n\n")
    print(f"Updated: {combined_path}")


def _rebuild_all_sections(out_path: Path) -> None:
    """Rebuild all_sections.md from all section_*.md files in SECTIONS order. Contents auto-generated."""
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
            if sid == "Contents":
                f.write(f"## Section {sid}: {sname}\n\n")
                f.write(_generate_contents_body(existing))
            elif sid in existing:
                f.write(f"## Section {sid}: {sname}\n\n")
                f.write(existing[sid])
            else:
                continue
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
    max_revision_loops: int,
    modification_instructions: str | None = None,
    issuer_metadata_path: Path | None = None,
) -> SectionDraftState:
    section_name = _lookup_section_name(section_id)
    reqs = requirements_map.get(section_id, {})
    base_req = reqs.get("requirements", f"Write the {section_name} section.")
    requirements = _augment_requirements(
        section_id, base_req, issuer_metadata_path
    )
    return {
        "section_id": section_id,
        "section_name": section_name,
        "requirements": requirements,
        "rag_dir": str(rag_dir),
        "output_dir": str(output_dir),
        "model_name": model_name,
        "max_context_chars": max_context_chars,
        "revision_count": 0,
        "max_revision_loops": max_revision_loops,
        "should_revise": False,
        "revision_instructions": [],
        "modification_instructions": modification_instructions,
    }


def _render_expected_timetable(
    rag_dir: str | Path,
    output_dir: str | Path,
    *,
    data_dir: str | Path | None = None,
) -> str:
    """
    Expected Timetable: template render only. No LLM.
    Returns section body text.
    """
    rag_path = Path(rag_dir)
    out_path = Path(output_dir)
    if data_dir is None:
        data_dir = rag_path.parent / "data"
    text = render_timetable_template(rag_path, data_dir=data_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    safe_name = "Expected_Timetable"
    out_file = out_path / f"section_ExpectedTimetable_{safe_name}.md"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("# Section ExpectedTimetable: Expected Timetable\n\n")
        f.write(text)
    print(f"Saved (template): {out_file}")
    return text


def _run_section_graph(
    *,
    section_state: SectionDraftState,
    retriever: SectionAwareRAGRetriever | HybridRetriever,
    output_dir: str | Path,
    model_name: str,
    combine_immediately: bool,
    only_sections_up_to: str | None,
    model: Any = None,
    tokenizer: Any = None,
) -> SectionDraftState:
    use_planner = _supports_hybrid_retrieval(section_state.get("rag_dir", ""))
    graph = build_section_graph(
        retriever_node=RetrieverNode(retriever),
        section_writer_agent=SectionWriterAgent(
            model_name=model_name,
            model=model,
            tokenizer=tokenizer,
        ),
        verifier_agent=VerifierAgent(
            model_name=model_name,
            model=model,
            tokenizer=tokenizer,
        ),
        revision_agent=RevisionAgent(
            model_name=model_name,
            model=model,
            tokenizer=tokenizer,
        ),
        assembler_node=AssemblerNode(
            output_dir=output_dir,
            combine_immediately=combine_immediately,
            only_sections_up_to=only_sections_up_to,
        ),
        planner_node=SectionPlannerAgent(
            model_name=model_name,
            model=model,
            tokenizer=tokenizer,
        ) if use_planner else None,
    )
    return graph.invoke(section_state)


def _resolve_issuer_metadata_path(explicit: Path | None) -> Path | None:
    if explicit is not None:
        return explicit if explicit.exists() else None
    default = _issuer_metadata_default_path()
    return default if default.exists() else None


def _finalize_output_bundle(
    output_dir: Path,
    issuer_metadata_path: Path | None,
) -> dict[str, str] | None:
    combined = output_dir / "all_sections.md"
    if not combined.exists():
        return None
    from prospectus_graph.output_bundle import write_output_bundle

    text = combined.read_text(encoding="utf-8")
    paths = write_output_bundle(
        output_dir,
        combined_markdown=text,
        issuer_metadata_path=issuer_metadata_path,
    )
    print(
        "Output bundle:",
        ", ".join(f"{k}={v}" for k, v in paths.items()),
    )
    return paths


def run_agent2_single(
    section_id: str,
    rag_dir: str | Path = "agent1_output",
    output_dir: str | Path = "agent2_output",
    modification_instructions: str | None = None,
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
    max_revision_loops: int = 1,
    model_name: str = DEFAULT_MODEL,
    issuer_metadata_path: Path | None = None,
    finalize_bundle: bool = True,
) -> str:
    """Generate a single section. ExpectedTimetable uses template; others use LLM pipeline."""
    rag_path = Path(rag_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    meta_path = _resolve_issuer_metadata_path(issuer_metadata_path)

    if section_id == "ExpectedTimetable":
        text = _render_expected_timetable(rag_path, out_path)
        _append_to_all_sections(
            out_path,
            "ExpectedTimetable",
            "Expected Timetable",
            text,
            only_sections_up_to=None if modification_instructions else section_id,
        )
        if finalize_bundle:
            _rebuild_all_sections(out_path)
            _finalize_output_bundle(out_path, meta_path)
        return text

    if section_id == "Contents":
        existing = _load_existing_sections(out_path)
        _rebuild_all_sections(out_path)
        body = _generate_contents_body(existing)
        if finalize_bundle:
            _finalize_output_bundle(out_path, meta_path)
        return body

    retriever = _create_retriever(rag_path)
    requirements_map = _build_requirements_map()

    state = _build_section_state(
        section_id=section_id,
        requirements_map=requirements_map,
        rag_dir=rag_path,
        output_dir=out_path,
        max_context_chars=max_context_chars,
        model_name=model_name,
        max_revision_loops=max_revision_loops,
        modification_instructions=modification_instructions,
        issuer_metadata_path=meta_path,
    )

    result = _run_section_graph(
        section_state=state,
        retriever=retriever,
        output_dir=out_path,
        model_name=model_name,
        combine_immediately=True,
        only_sections_up_to=None if modification_instructions else section_id,
    )
    out_text = result.get("verified_text") or result.get("draft_text", "")
    if finalize_bundle:
        _rebuild_all_sections(out_path)
        _finalize_output_bundle(out_path, meta_path)
    return out_text


def run_agent2(
    rag_dir: str | Path = "agent1_output",
    output_dir: str | Path = "agent2_output",
    sections: list[str] | None = None,
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
    max_revision_loops: int = 1,
    model_name: str = DEFAULT_MODEL,
    issuer_metadata_path: Path | None = None,
    finalize_bundle: bool = True,
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

    retriever = _create_retriever(rag_path)
    meta_path = _resolve_issuer_metadata_path(issuer_metadata_path)

    results: dict[str, str] = {}
    for section_id in valid_sections:
        if section_id == "ExpectedTimetable":
            text = _render_expected_timetable(rag_path, out_path)
            results[section_id] = text
        elif section_id == "Contents":
            _rebuild_all_sections(out_path)
            results[section_id] = _generate_contents_body(_load_existing_sections(out_path))
        else:
            state = _build_section_state(
                section_id=section_id,
                requirements_map=requirements_map,
                rag_dir=rag_path,
                output_dir=out_path,
                max_context_chars=max_context_chars,
                model_name=model_name,
                max_revision_loops=max_revision_loops,
                issuer_metadata_path=meta_path,
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
        # Rebuild all_sections.md after each section so UI can show incremental progress
        _rebuild_all_sections(out_path)

    if finalize_bundle:
        _finalize_output_bundle(out_path, meta_path)

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
        "--max-revisions",
        type=int,
        default=1,
        help="Maximum number of revision-agent passes per section",
    )
    parser.add_argument(
        "--modification-file",
        default="",
        help="Path to file containing modification instructions (for single-section regenerate)",
    )
    parser.add_argument(
        "--issuer-metadata",
        default="",
        help="Path to issuer_metadata.json (default: ./issuer_metadata.json if present)",
    )
    parser.add_argument(
        "--no-output-bundle",
        action="store_true",
        help="Do not write draft_clean.md, validation_report.md, evidence_register.jsonl, coverage_matrix.md",
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

    im_path = Path(args.issuer_metadata) if args.issuer_metadata else None
    fin_bundle = not args.no_output_bundle

    if sections and len(sections) == 1 and modification is not None:
        text = run_agent2_single(
            sections[0],
            rag_dir=args.rag_dir,
            output_dir=args.output_dir,
            modification_instructions=modification,
            max_context_chars=args.max_context,
            max_revision_loops=args.max_revisions,
            model_name=args.model,
            issuer_metadata_path=im_path,
            finalize_bundle=fin_bundle,
        )
        print(text[:200] + "..." if len(text) > 200 else text)
    elif sections and len(sections) == 1:
        text = run_agent2_single(
            sections[0],
            rag_dir=args.rag_dir,
            output_dir=args.output_dir,
            modification_instructions=None,
            max_context_chars=args.max_context,
            max_revision_loops=args.max_revisions,
            model_name=args.model,
            issuer_metadata_path=im_path,
            finalize_bundle=fin_bundle,
        )
        print(text[:200] + "..." if len(text) > 200 else text)
    else:
        run_agent2(
            rag_dir=args.rag_dir,
            output_dir=args.output_dir,
            sections=sections,
            max_context_chars=args.max_context,
            max_revision_loops=args.max_revisions,
            model_name=args.model,
            issuer_metadata_path=im_path,
            finalize_bundle=fin_bundle,
        )


if __name__ == "__main__":
    main()

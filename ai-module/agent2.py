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
import json
import os
from pathlib import Path
from typing import Any

from prospectus_graph.config import (
    DEFAULT_MAX_CONTEXT_CHARS,
    DEFAULT_MODEL,
    SECTIONS,
    load_section_requirements,
)
from prompts.composer import (
    augment_requirements,
    build_planner_prompt,
    build_prompt,
    build_revision_prompt,
    build_verifier_prompt,
)
from prompts.paths import resolve_requirements_path
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


def _workspace_default(name: str) -> str:
    workspace_root = os.environ.get("WORKSPACE_ROOT", "").strip()
    if not workspace_root:
        return name
    return str(Path(workspace_root) / name)


def _issuer_metadata_default_path() -> Path:
    here = Path(__file__).resolve().parent
    for candidate in [
        here / "issuer_metadata.json",
        here.parent / "issuer_metadata.json",
        Path.cwd() / "issuer_metadata.json",
    ]:
        if candidate.exists():
            return candidate
    return here / "issuer_metadata.json"


def _lookup_section_name(section_id: str) -> str:
    return next((name for sid, name in SECTIONS if sid == section_id), section_id)


def _resolve_max_new_tokens(role: str, override: int | None) -> int:
    """Pick max_new_tokens per node role. Writer/Revision need long-form prose;
    Planner/Verifier only need short structured JSON.

    Env overrides:
      AGENT2_MAX_NEW_TOKENS_WRITER / _REVISION / _PLANNER / _VERIFIER
      AGENT2_MAX_NEW_TOKENS (global default)
    """
    if override is not None:
        return int(override)
    per_role_env = {
        "writer": ("AGENT2_MAX_NEW_TOKENS_WRITER", 4096),
        "revision": ("AGENT2_MAX_NEW_TOKENS_REVISION", 4096),
        "planner": ("AGENT2_MAX_NEW_TOKENS_PLANNER", 1024),
        "verifier": ("AGENT2_MAX_NEW_TOKENS_VERIFIER", 1536),
    }
    env_name, default_tokens = per_role_env.get(role, ("AGENT2_MAX_NEW_TOKENS", 4096))
    env_val = os.environ.get(env_name) or os.environ.get("AGENT2_MAX_NEW_TOKENS")
    if env_val:
        try:
            return int(env_val)
        except ValueError:
            pass
    return default_tokens


def _llm_provider() -> str:
    from llm_providers import llm_provider

    return llm_provider()


def _uses_local_qwen() -> bool:
    from llm_providers import is_local_qwen

    return is_local_qwen()


def generate_with_llm(
    prompt: str,
    model_name: str = DEFAULT_MODEL,
    model: Any = None,
    tokenizer: Any = None,
    *,
    role: str = "writer",
    max_new_tokens: int | None = None,
    section_id: str | None = None,
    section_name: str | None = None,
    stream_phase: str | None = None,
    revision_pass: int = 0,
) -> str:
    """Route to local Qwen or a cloud API per ``LLM_PROVIDER`` (see ``llm_providers``).

    The ``role`` picks a length budget tuned for that node:
      - writer/revision: long-form prose (default 4096 new tokens)
      - planner: short JSON outline (default 1024)
      - verifier: short JSON review (default 1536)

    When ``AGENT2_STREAM=1``, phase events are emitted by graph nodes (not token streams).
    """
    from llm_providers import run_chat
    from llm_sanitize import still_contains_thinking, strip_model_reasoning

    tokens = _resolve_max_new_tokens(role, max_new_tokens)
    raw = run_chat(
        prompt,
        model_name=model_name,
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=tokens,
    )
    cleaned = strip_model_reasoning(raw)
    if role in ("writer", "revision") and (
        not cleaned.strip() or still_contains_thinking(cleaned)
    ):
        retry_note = (
            "\n\nCRITICAL: Your previous answer included chain-of-thought or "
            '"Thinking Process". Output ONLY the final section draft in English. '
            "The first line must be the section heading. Do not include analysis."
        )
        print(
            f"WARNING: {role} output empty or still contains thinking; retrying once."
        )
        cleaned = strip_model_reasoning(
            run_chat(
                prompt + retry_note,
                model_name=model_name,
                model=model,
                tokenizer=tokenizer,
                max_new_tokens=tokens,
            )
        )
    return cleaned


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

        section_id = state["section_id"]
        _emit_phase_start(section_id, "retriever")

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
            _emit_phase_end(section_id, "retriever")
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
        _emit_phase_end(section_id, "retriever")
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
        section_id = state["section_id"]
        _emit_phase_start(section_id, "planner")

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
            kg_typical_structure=state.get("kg_typical_structure") or [],
            kg_structure_mode=state.get("kg_structure_mode", "narrative"),
        )
        raw = generate_with_llm(
            prompt,
            model_name=self.model_name,
            model=self.model,
            tokenizer=self.tokenizer,
            role="planner",
        )
        outline, fact_mapping = _parse_planner_output(raw)
        _emit_phase_end(
            section_id,
            "planner",
            summary=outline[:300] if outline else "Outline prepared.",
        )
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
        section_id = state["section_id"]
        _emit_phase_start(section_id, "writer", revision_pass=0)

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
            role="writer",
            section_id=state["section_id"],
            section_name=state["section_name"],
            stream_phase="writer",
            revision_pass=0,
        )
        _emit_phase_end(section_id, "writer", revision_pass=0)
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
        section_id = state["section_id"]
        revision_pass = int(state.get("revision_count", 0))
        _emit_phase_start(section_id, "verifier", revision_pass=revision_pass)

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
            role="verifier",
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
        _emit_phase_end(
            section_id,
            "verifier",
            revision_pass=revision_pass,
            summary=verifier_summary or ("Passed" if passed else "Revision requested"),
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
        section_id = state["section_id"]
        revision_pass = int(state.get("revision_count", 0)) + 1
        _emit_phase_start(section_id, "revision", revision_pass=revision_pass)

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
            role="revision",
            section_id=state["section_id"],
            section_name=state["section_name"],
            stream_phase="revision",
            revision_pass=revision_pass,
        )
        _emit_phase_end(section_id, "revision", revision_pass=revision_pass)
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
        from llm_sanitize import strip_model_reasoning
        from section_quality import analyze_section_quality, quality_score

        section_id = state["section_id"]
        _emit_phase_start(section_id, "assembler")

        self.output_dir.mkdir(parents=True, exist_ok=True)
        section_name = state["section_name"]
        text = strip_model_reasoning(
            state.get("verified_text") or state.get("draft_text", "")
        )
        from prospectus_graph.output_bundle import strip_verification_notes

        text = strip_verification_notes(text)
        text = _normalize_section_markdown(text, section_name)
        safe_name = section_name.replace(" ", "_").replace("&", "and")
        out_file = self.output_dir / f"section_{section_id}_{safe_name}.md"

        manifest_path = Path(state.get("rag_dir", "")) / "manifest.json"
        mp = manifest_path if manifest_path.is_file() else None
        new_report = analyze_section_quality(text, section_id, manifest_path=mp)

        if out_file.is_file() and not new_report.ok:
            existing_body = _section_body_from_file(
                out_file.read_text(encoding="utf-8")
            )
            old_report = analyze_section_quality(
                existing_body, section_id, manifest_path=mp
            )
            if quality_score(old_report) >= quality_score(new_report):
                print(
                    f"WARNING: {section_id} new draft failed quality checks "
                    f"({', '.join(new_report.fail_reasons)}); keeping existing file."
                )
                _emit_phase_end(section_id, "assembler")
                return {"output_file": str(out_file)}

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
        _emit_phase_end(section_id, "assembler")
        return result


def _section_body_from_file(content: str) -> str:
    """Extract section body from a section_*.md file and strip model reasoning."""
    from llm_sanitize import strip_model_reasoning
    from prospectus_graph.output_bundle import strip_verification_notes

    parts = content.split("\n\n", 1)
    body = parts[-1].strip() if len(parts) > 1 else content.strip()
    return strip_verification_notes(strip_model_reasoning(body))


def _normalize_section_markdown(text: str, section_name: str) -> str:
    """Normalize common LLM formatting slips before persistence."""
    import re

    cleaned = (text or "").strip()
    if not cleaned:
        return ""

    # Convert legacy/single-bracket AI tags to the canonical double-bracket form.
    cleaned = re.sub(
        r"(?<!\[)\[AI:([A-Z_]+)\|([^\]\n]+)\](?!\])",
        r"[[AI:\1|\2]]",
        cleaned,
    )
    cleaned = re.sub(r"\bData Missing\b", "DATA_MISSING", cleaned, flags=re.I)
    cleaned = re.sub(r"\bCounsel Input Required\b", "COUNSEL_INPUT_REQUIRED", cleaned, flags=re.I)

    lines = cleaned.splitlines()
    normalized_section = re.sub(r"[^a-z0-9]+", "", section_name.lower())
    while lines:
        first = lines[0].strip()
        heading = re.sub(r"^#{1,6}\s*", "", first).strip()
        heading_norm = re.sub(r"[^a-z0-9]+", "", heading.lower())
        is_duplicate_title = first.startswith("#") and (
            heading_norm == normalized_section
            or heading_norm.startswith("section") and normalized_section in heading_norm
        )
        is_ai_tag_heading = re.match(r"^#{1,6}\s*\[\[AI:", first, re.I)
        if is_duplicate_title or is_ai_tag_heading:
            lines.pop(0)
            while lines and not lines[0].strip():
                lines.pop(0)
            continue
        break

    return "\n".join(lines).strip() + "\n"


def _load_existing_sections(out_path: Path) -> dict[str, str]:
    """Load section_id -> body from section_*.md files."""
    existing: dict[str, str] = {}
    for path in out_path.glob("section_*.md"):
        name = path.stem
        for sid, sname in SECTIONS:
            safe = sname.replace(" ", "_").replace("&", "and")
            if f"section_{sid}_{safe}" in name or name.startswith(f"section_{sid}_"):
                content = path.read_text(encoding="utf-8")
                existing[sid] = _section_body_from_file(content)
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


def _load_fact_store_rows(rag_path: Path) -> list[dict[str, Any]]:
    fact_path = rag_path / "fact_store.jsonl"
    if not fact_path.exists():
        return []
    rows: list[dict[str, Any]] = []
    with open(fact_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def _fmt_money(value: Any, unit: str | None = None) -> str:
    try:
        num = float(value)
    except (TypeError, ValueError):
        return str(value or "[●]")
    currency = "HK$" if (unit or "").upper() == "HKD" else (unit or "")
    if abs(num) >= 1_000_000:
        return f"{currency}{num / 1_000_000:,.1f} million".strip()
    if abs(num) < 1_000 and num != int(num):
        return f"{currency}{num:,.2f}".strip()
    return f"{currency}{num:,.0f}".strip()


def _fmt_pct(value: Any) -> str:
    try:
        return f"{float(value):g}%"
    except (TypeError, ValueError):
        return str(value or "[●]")


def _cite_for_fact(fact: dict[str, Any], section_id: str) -> str:
    meta = fact.get("metadata") or {}
    source = meta.get("source_file") or "fact_store"
    field = fact.get("field") or ""
    metric = fact.get("metric") or ""
    fact_id = fact.get("fact_id") or ""
    return (
        "[[AI:CITE|"
        f"source={source}; section={section_id}; field={field}; metric={metric}; "
        f"fact_id={fact_id}; confidence=prepared_fact"
        "]]"
    )


def _group_indexed_facts(
    facts: list[dict[str, Any]],
    prefix: str,
) -> dict[int, dict[str, dict[str, Any]]]:
    import re

    pattern = re.compile(rf"^{re.escape(prefix)}\[(\d+)\]$")
    grouped: dict[int, dict[str, dict[str, Any]]] = {}
    for fact in facts:
        field = str(fact.get("field") or "")
        m = pattern.match(field)
        if not m:
            continue
        idx = int(m.group(1))
        metric = str(fact.get("metric") or "")
        if metric:
            grouped.setdefault(idx, {})[metric] = fact
    return grouped


def _render_use_of_proceeds_template(rag_path: Path) -> str | None:
    """Deterministic renderer for the table-heavy Future Plans and Use of Proceeds section."""
    facts = _load_fact_store_rows(rag_path)
    if not facts:
        return None
    allocation_prefix = "offering_use_of_proceeds.use_of_proceeds.allocation"
    rows = _group_indexed_facts(facts, allocation_prefix)
    if not rows:
        return None

    def first_fact(field: str, metric: str | None = None) -> dict[str, Any] | None:
        for fact in facts:
            if fact.get("field") != field:
                continue
            if metric is None or fact.get("metric") == metric:
                return fact
        return None

    basis = first_fact("offering_use_of_proceeds.use_of_proceeds.basis")
    price_low = first_fact("offering_use_of_proceeds.offer.offer_price", "price_range")
    price_high = first_fact("offering_use_of_proceeds.offer.offer_price", "price_range_high")
    total_offer = first_fact("offering_use_of_proceeds.offer.total_offer_shares")
    over_allotment = first_fact("offering_use_of_proceeds.offer.over_allotment_shares")
    sensitivity = first_fact(
        "offering_use_of_proceeds.use_of_proceeds.net_proceeds_sensitivity_hkd.note"
    )

    total_amount = 0.0
    total_pct = 0.0
    table_lines = [
        "| Purpose | Approximate % of net proceeds | Approximate amount | Expected timing |",
        "| :--- | ---: | ---: | :--- |",
    ]
    detailed_lines: list[str] = []
    for idx in sorted(rows):
        row = rows[idx]
        purpose = str(row.get("purpose", {}).get("value") or "[●]")
        pct_fact = row.get("pct")
        amount_fact = row.get("amount_hkd_approx")
        timeline = str(row.get("timeline", {}).get("value") or "[●]")
        pct = _fmt_pct(pct_fact.get("value")) if pct_fact else "[●]"
        amount = (
            _fmt_money(amount_fact.get("value"), amount_fact.get("unit"))
            if amount_fact
            else "[●]"
        )
        if pct_fact:
            try:
                total_pct += float(pct_fact.get("value"))
            except (TypeError, ValueError):
                pass
        if amount_fact:
            try:
                total_amount += float(amount_fact.get("value"))
            except (TypeError, ValueError):
                pass
        cites = " ".join(
            _cite_for_fact(f, "UseOfProceeds")
            for f in [row.get("purpose"), pct_fact, amount_fact, row.get("timeline")]
            if f
        )
        table_lines.append(f"| {purpose} | {pct} | {amount} | {timeline} {cites} |")

        sub_prefix = f"{allocation_prefix}[{idx}].sub_allocation"
        sub_rows = _group_indexed_facts(facts, sub_prefix)
        if sub_rows:
            detailed_lines.append(f"**{purpose}.**")
            for sub_idx in sorted(sub_rows):
                sub = sub_rows[sub_idx]
                sub_purpose = str(sub.get("purpose", {}).get("value") or "[●]")
                sub_pct = _fmt_pct(sub.get("pct", {}).get("value")) if sub.get("pct") else "[●]"
                sub_amount = (
                    _fmt_money(sub["amount_hkd_approx"].get("value"), sub["amount_hkd_approx"].get("unit"))
                    if sub.get("amount_hkd_approx")
                    else "[●]"
                )
                sub_cites = " ".join(
                    _cite_for_fact(f, "UseOfProceeds")
                    for f in [sub.get("purpose"), sub.get("pct"), sub.get("amount_hkd_approx")]
                    if f
                )
                detailed_lines.append(f"- {sub_purpose}: {sub_pct}, approximately {sub_amount}. {sub_cites}")
            detailed_lines.append("")
    if rows:
        table_lines.append(f"| **Total** | **{total_pct:g}%** | **{_fmt_money(total_amount, 'HKD')}** |  |")

    lines = ["## Future Plans and Use of Proceeds", ""]
    if basis:
        lines.append(
            "Based on the stated assumptions "
            f"({basis.get('value')}), we estimate that the net proceeds from the Global Offering "
            f"will be approximately {_fmt_money(total_amount, 'HKD')}. "
            f"{_cite_for_fact(basis, 'UseOfProceeds')}"
        )
    if price_low or price_high or total_offer:
        parts = []
        if price_low and price_high:
            parts.append(
                f"an Offer Price range of {_fmt_money(price_low.get('value'), price_low.get('unit'))} "
                f"to {_fmt_money(price_high.get('value'), price_high.get('unit'))}"
            )
        if total_offer:
            parts.append(f"{int(float(total_offer.get('value'))):,} Offer Shares")
        if parts:
            cites = " ".join(
                _cite_for_fact(f, "UseOfProceeds")
                for f in [price_low, price_high, total_offer]
                if f
            )
            lines.append("The Global Offering assumptions include " + " and ".join(parts) + f". {cites}")
    lines.extend([
        "",
        "We intend to use the net proceeds from the Global Offering for the following purposes:",
        "",
        *table_lines,
        "",
    ])
    if detailed_lines:
        lines.extend(["### Implementation Plan", "", *detailed_lines])
    if sensitivity:
        lines.extend([
            "### Offer Price Sensitivity",
            "",
            f"The allocation may be adjusted if final net proceeds differ from the assumed basis. {sensitivity.get('value')} {_cite_for_fact(sensitivity, 'UseOfProceeds')}",
            "",
        ])
    if over_allotment:
        lines.extend([
            "### Over-allotment Option",
            "",
            "If the Over-allotment Option is exercised, the Company may receive additional proceeds from "
            f"{int(float(over_allotment.get('value'))):,} additional Offer Shares. "
            f"{_cite_for_fact(over_allotment, 'UseOfProceeds')}",
            "",
        ])
    lines.extend([
        "[[AI:XREF|to=Business]]",
        "[[AI:XREF|to=FinancialInfo]]",
        "[[AI:VERIFY|evidence=Confirm board-approved use-of-proceeds schedule, net proceeds computation and any temporary deposit/treasury treatment before filing.]]",
    ])
    return "\n".join(lines).strip() + "\n"


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
                existing[sid] = _section_body_from_file(path.read_text(encoding="utf-8"))
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
                existing[sid] = _section_body_from_file(content)
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
    requirements_path = resolve_requirements_path()
    loaded = load_section_requirements(requirements_path)
    if not loaded and not requirements_path.is_file():
        import logging

        logging.getLogger(__name__).error(
            "Section requirements not found at %s — Agent2 will use generic fallbacks.",
            requirements_path,
        )
    return loaded


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
    reqs = dict(requirements_map.get(section_id, {}))
    try:
        from prompts.sections.augment import get_corpus_style_guide

        guide = get_corpus_style_guide(section_id)
        if guide.get("preferred_outline"):
            reqs["kg_typical_structure"] = guide["preferred_outline"]
            reqs["kg_heading_lock"] = bool(guide.get("heading_lock"))
    except Exception:  # noqa: BLE001
        pass
    base_req = reqs.get("requirements", f"Write the {section_name} section.")
    requirements = augment_requirements(
        section_id, base_req, issuer_metadata_path, reqs=reqs
    )
    return {
        "section_id": section_id,
        "section_name": section_name,
        "requirements": requirements,
        "kg_typical_structure": reqs.get("kg_typical_structure") or [],
        "kg_structure_mode": str(reqs.get("kg_structure_mode") or "narrative"),
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


def _emit_phase_start(
    section_id: str,
    phase: str,
    *,
    revision_pass: int = 0,
) -> None:
    from agent2_stream import emit, stream_enabled

    if not stream_enabled():
        return
    emit(
        {
            "type": "phase_start",
            "section_id": section_id,
            "phase": phase,
            "revision_pass": revision_pass,
        }
    )


def _emit_phase_end(
    section_id: str,
    phase: str,
    *,
    revision_pass: int = 0,
    summary: str = "",
) -> None:
    from agent2_stream import emit, stream_enabled

    if not stream_enabled():
        return
    payload: dict[str, Any] = {
        "type": "phase_end",
        "section_id": section_id,
        "phase": phase,
        "revision_pass": revision_pass,
    }
    if summary.strip():
        payload["summary"] = summary.strip()[:500]
    emit(payload)


def _emit_section_done(section_id: str) -> None:
    from agent2_stream import emit, stream_enabled

    if not stream_enabled():
        return
    emit(
        {
            "type": "section_done",
            "section_id": section_id,
            "section_name": _lookup_section_name(section_id),
        }
    )


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
        _emit_phase_start(section_id, "template")
        text = _render_expected_timetable(rag_path, out_path)
        _append_to_all_sections(
            out_path,
            "ExpectedTimetable",
            "Expected Timetable",
            text,
            only_sections_up_to=None if modification_instructions else section_id,
        )
        _emit_phase_end(section_id, "template")
        _emit_section_done(section_id)
        if finalize_bundle:
            _rebuild_all_sections(out_path)
            _finalize_output_bundle(out_path, meta_path)
        return text

    if section_id == "Contents":
        existing = _load_existing_sections(out_path)
        _rebuild_all_sections(out_path)
        body = _generate_contents_body(existing)
        _emit_section_done(section_id)
        if finalize_bundle:
            _finalize_output_bundle(out_path, meta_path)
        return body

    if section_id == "UseOfProceeds":
        _emit_phase_start(section_id, "template")
        text = _render_use_of_proceeds_template(rag_path)
        if text:
            section_name = _lookup_section_name(section_id)
            safe_name = section_name.replace(" ", "_").replace("&", "and")
            out_file = out_path / f"section_{section_id}_{safe_name}.md"
            out_file.write_text(f"# Section {section_id}: {section_name}\n\n{text}", encoding="utf-8")
            print(f"Saved: {out_file}")
            _append_to_all_sections(
                out_path,
                section_id,
                section_name,
                text,
                only_sections_up_to=None if modification_instructions else section_id,
            )
            _emit_phase_end(section_id, "template")
            _emit_section_done(section_id)
            if finalize_bundle:
                _rebuild_all_sections(out_path)
                _finalize_output_bundle(out_path, meta_path)
            return text
        _emit_phase_end(section_id, "template")

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

    # Load the model once and reuse it across every LangGraph node (planner,
    # writer, verifier, revision). OpenAI path skips local weights.
    model, tokenizer = None, None
    if _uses_local_qwen():
        from llm_qwen import _load_qwen_model as _load_model_once

        model, tokenizer = _load_model_once(model_name)
        print("Model loaded once; reusing for all nodes in this section.")
    else:
        print(f"LLM_PROVIDER={_llm_provider()}; using cloud API (no local Qwen load).")

    result = _run_section_graph(
        section_state=state,
        retriever=retriever,
        output_dir=out_path,
        model_name=model_name,
        combine_immediately=True,
        only_sections_up_to=None if modification_instructions else section_id,
        model=model,
        tokenizer=tokenizer,
    )
    out_text = result.get("verified_text") or result.get("draft_text", "")
    _emit_section_done(section_id)
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
    llm_sections = [
        sid for sid in valid_sections if sid not in {"ExpectedTimetable", "Contents"}
    ]
    use_cached_model = len(llm_sections) > 1

    model, tokenizer = None, None
    if use_cached_model and _uses_local_qwen():
        from llm_qwen import _load_qwen_model

        model, tokenizer = _load_qwen_model(model_name)
        print("Model loaded once; reusing for all sections.")
    elif use_cached_model:
        print(f"LLM_PROVIDER={_llm_provider()}; using cloud API for all sections.")

    retriever = _create_retriever(rag_path)
    meta_path = _resolve_issuer_metadata_path(issuer_metadata_path)

    results: dict[str, str] = {}
    for section_id in valid_sections:
        if section_id == "ExpectedTimetable":
            _emit_phase_start(section_id, "template")
            text = _render_expected_timetable(rag_path, out_path)
            results[section_id] = text
            _emit_phase_end(section_id, "template")
            _emit_section_done(section_id)
        elif section_id == "Contents":
            _rebuild_all_sections(out_path)
            results[section_id] = _generate_contents_body(_load_existing_sections(out_path))
            _emit_section_done(section_id)
        elif section_id == "UseOfProceeds":
            _emit_phase_start(section_id, "template")
            text = _render_use_of_proceeds_template(rag_path)
            if text:
                section_name = _lookup_section_name(section_id)
                safe_name = section_name.replace(" ", "_").replace("&", "and")
                out_file = out_path / f"section_{section_id}_{safe_name}.md"
                out_file.write_text(f"# Section {section_id}: {section_name}\n\n{text}", encoding="utf-8")
                print(f"Saved: {out_file}")
                results[section_id] = text
                _emit_phase_end(section_id, "template")
                _emit_section_done(section_id)
            else:
                _emit_phase_end(section_id, "template")
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
                _emit_section_done(section_id)
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
            _emit_section_done(section_id)
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
        default=_workspace_default("agent1_output"),
        help="Directory containing Agent1 output",
    )
    parser.add_argument(
        "--output-dir",
        default=_workspace_default("agent2_output"),
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
    parser.add_argument(
        "--stream",
        action="store_true",
        help="Emit structured JSON events on stdout for live UI streaming",
    )
    args = parser.parse_args()

    if args.stream:
        from agent2_stream import enable_stream

        enable_stream()

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

    from agent2_stream import emit, stream_enabled

    if stream_enabled():
        emit({"type": "done", "ok": True})


if __name__ == "__main__":
    main()

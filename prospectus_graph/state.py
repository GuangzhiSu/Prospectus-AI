from __future__ import annotations

from typing import Any, TypedDict


class EvidenceChunk(TypedDict, total=False):
    chunk_id: str
    section_id: str
    section: str
    source_file: str
    sheet_name: str
    chunk_index: int
    text: str
    sheet_summary: str
    source_type: str
    metadata: dict[str, Any]


class VerificationIssue(TypedDict, total=False):
    severity: str
    code: str
    message: str
    category: str  # DATA_MISSING | WRITING_ERROR


class RetrievedFact(TypedDict, total=False):
    field: str
    period: str | None
    metric: str
    value: Any
    unit: str | None
    metadata: dict[str, Any]


class SectionDraftState(TypedDict, total=False):
    section_id: str
    section_name: str
    requirements: str
    rag_dir: str
    output_dir: str
    model_name: str
    max_context_chars: int
    modification_instructions: str | None
    retrieved_chunks: list[EvidenceChunk]
    retrieval_context: str
    retrieval_notes: list[str]
    # Hybrid retrieval output
    text_evidence: list[EvidenceChunk]
    retrieved_facts: list[RetrievedFact]
    formatted_facts: str
    # Section Planner output
    planner_outline: str
    planner_fact_mapping: dict[str, list[str]]  # subsection -> fact_ids or field paths
    draft_text: str
    initial_draft_text: str
    revision_count: int
    max_revision_loops: int
    should_revise: bool
    revision_instructions: list[str]
    verifier_summary: str
    verifier_raw_output: str
    mechanical_verification_issues: list[VerificationIssue]
    verification_issues: list[VerificationIssue]
    verifier_passed: bool
    verified_text: str
    output_file: str
    combined_output_file: str

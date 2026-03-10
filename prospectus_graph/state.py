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


class VerificationIssue(TypedDict):
    severity: str
    code: str
    message: str


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
    draft_text: str
    verification_issues: list[VerificationIssue]
    verifier_passed: bool
    verified_text: str
    output_file: str
    combined_output_file: str

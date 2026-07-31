"""Shared types for the eligibility pipeline (no LLM imports)."""
from __future__ import annotations

from typing import Any, Literal, TypedDict

ConfirmationStatus = Literal["extracted", "confirmed", "rejected", "hard_entered"]

EXTRACTED = "extracted"
CONFIRMED = "confirmed"
REJECTED = "rejected"
HARD_ENTERED = "hard_entered"


class Provenance(TypedDict, total=False):
    source_file: str
    page_start: int | None
    page_end: int | None
    span_preview: str
    confidence: float


class ExtractedField(TypedDict, total=False):
    """One extracted (or hard-entered) leaf feeding the hard engine."""

    field_id: str
    value: Any
    unit: str | None
    kind: Literal["quantifiable", "narrative", "deal_param", "structural"]
    confirmation_status: ConfirmationStatus
    provenance: Provenance
    null_reason: str | None


def resolved_for_hard_gate(field: ExtractedField | dict) -> bool:
    """Hard gates only consume confirmed or hard-entered values."""
    status = field.get("confirmation_status")
    if status in (CONFIRMED, HARD_ENTERED):
        return field.get("value") is not None
    return False

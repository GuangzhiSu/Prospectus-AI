"""Section 3 — LLM analysis of unquantifiable / qualitative text."""
from __future__ import annotations

from .analyzer import (
    NOT_EVALUATED,
    PASS_SIGNAL,
    TRIGGERED,
    SoftConditionEngine,
    SoftFinding,
    findings_as_dicts,
)

__all__ = [
    "NOT_EVALUATED",
    "PASS_SIGNAL",
    "TRIGGERED",
    "SoftConditionEngine",
    "SoftFinding",
    "findings_as_dicts",
]

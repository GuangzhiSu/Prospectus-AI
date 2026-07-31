"""Listing-eligibility diagnostic — standalone four-stage package.

Stages (each in its own subpackage):

1. ``extraction`` — read user documents; extract quantifiable fields and
   narrative excerpts (LLM; Mode B confirmation before hard use).
2. ``hard_inspection`` — deterministic threshold comparison (no LLM).
3. ``qualitative`` — LLM analysis of unquantifiable / substance signals.
4. ``feedback`` — LLM readiness + improvement feedback (diagnostic tone).

This package ``__init__`` deliberately re-exports ONLY the hard-path core so
``import eligibility`` / ``import eligibility.engine`` stay free of any LLM
dependency (enforced by ``tests/test_no_llm_in_hard_path``).
"""
from __future__ import annotations

from .hard_inspection.engine import (
    EvalContext,
    INDETERMINATE,
    MISSING_INPUT,
    NOT_EVALUATED,
    PASS,
    SHORTFALL,
    eval_gate,
)
from .hard_inspection.loader import load_all, load_ruleset

__all__ = [
    "EvalContext",
    "PASS",
    "SHORTFALL",
    "MISSING_INPUT",
    "INDETERMINATE",
    "NOT_EVALUATED",
    "eval_gate",
    "load_all",
    "load_ruleset",
]

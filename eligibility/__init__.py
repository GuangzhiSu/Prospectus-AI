"""Listing-eligibility diagnostic module.

A diagnostic tool, not an adjudicator. For each listing pathway it reports which
quantitative criteria are met, fall short, lack inputs, or cannot be determined,
each tied to a cited rule reference; it never decides whether an issuer can or
cannot list.

Two physically separated engines:

* hard engine (``engine``): pure deterministic Python over versioned thresholds;
  never calls an LLM and never imports the soft module.
* soft engine (``soft``): a typed interface plus stubs for the qualitative
  conditions that will later use an LLM and retrieval; every condition currently
  returns ``NOT_EVALUATED``.

This package ``__init__`` deliberately re-exports ONLY the hard-path core
(engine + loader) so that ``import eligibility`` / ``import eligibility.engine``
stays free of any LLM or soft-engine dependency (enforced by
``tests/test_no_llm_in_hard_path``). Import the report assembler and CLI from
their own modules: ``from eligibility.report import build_report``.

Thresholds live in versioned YAML under ``rules/`` with two independent flags,
``threshold_verified`` (value checked against the rulebook) and
``effective_from_verified`` (date checked), plus a separate ``human_signoff`` per
gate; ``threshold_verified`` never implies human sign-off. Issuer values are only
ever read, never recomputed; a null value is ``MISSING_INPUT``.
"""
from __future__ import annotations

from .engine import (
    EvalContext,
    INDETERMINATE,
    MISSING_INPUT,
    NOT_EVALUATED,
    PASS,
    SHORTFALL,
    eval_gate,
)
from .loader import load_all, load_ruleset

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

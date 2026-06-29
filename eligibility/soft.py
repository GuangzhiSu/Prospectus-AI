"""Soft-condition engine -- interface and stubs ONLY (this phase).

Substantive listing gates (customer / supplier concentration, connected-party
independence, competing business, internal-control integrity, equity / WVR /
pre-IPO clarity) are NOT bright-line pass/fail. Each is a SIGNAL that triggers
heightened scrutiny and expert / LLM judgment. They are defined declaratively in
``rules/qualitative_substance.yaml`` (a ``layer: soft`` ruleset) and surfaced
here as flagged findings carrying severity and provenance -- never a verdict.

This phase ships the structure and a typed interface so an LLM plus retrieval
backend can be wired in later. Every finding is ``NOT_EVALUATED`` and every gate
is ``requires_llm: true``. This module is isolated from the hard engine: the hard
engine never imports it (an import-isolation test enforces that), and no LLM is
called here.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .loader import load_soft_layer

NOT_EVALUATED = "NOT_EVALUATED"


@dataclass
class SoftFinding:
    """One substantive-signal finding. Flagged for review, never adjudicated."""

    gate_id: str
    condition: str
    rule_ref: str
    severity: str
    status: str = NOT_EVALUATED
    trigger_signal: dict = field(default_factory=dict)
    secondary_metric: str | None = None
    substantive_concern: str = ""
    disclosed_in_section: list = field(default_factory=list)
    remediation_path: str = ""
    rule_ref_guidance: str = ""
    compliance_overlay: str | None = None
    cross_ref: str | None = None
    factors: list = field(default_factory=list)
    provenance_verified: bool = False
    signal_level_verified: bool = False
    requires_llm: bool = True
    # Future: the soft backend sets this true when the signal probe fires against
    # issuer data. This phase it is always False (signals not evaluated).
    triggered: bool = False
    stub_reason: str = "qualitative signal; expert/LLM judgment not wired in this phase"


def _finding_from_gate(gate: dict) -> SoftFinding:
    return SoftFinding(
        gate_id=gate.get("id", ""),
        condition=gate.get("condition", ""),
        rule_ref=gate.get("rule_ref", ""),
        severity=gate.get("severity", ""),
        trigger_signal=gate.get("trigger_signal", {}) or {},
        secondary_metric=gate.get("secondary_metric"),
        substantive_concern=gate.get("substantive_concern", ""),
        disclosed_in_section=gate.get("disclosed_in_section", []) or [],
        remediation_path=gate.get("remediation_path", ""),
        rule_ref_guidance=gate.get("guidance_ref", ""),
        compliance_overlay=gate.get("compliance_overlay"),
        cross_ref=gate.get("cross_ref"),
        factors=gate.get("factors", []) or [],
        provenance_verified=bool(gate.get("provenance_verified", False)),
        signal_level_verified=bool(gate.get("signal_level_verified", False)),
        requires_llm=bool(gate.get("requires_llm", True)),
    )


class SoftConditionEngine:
    """Interface placeholder for the soft (LLM + retrieval) path.

    The constructor accepts the backends it will eventually use so wiring them
    later does not change call sites. ``evaluate_all`` performs no LLM call in
    this phase; it loads the ``layer: soft`` rulesets and returns a flagged
    ``NOT_EVALUATED`` finding for every substantive signal.
    """

    def __init__(self, llm=None, retriever=None):
        self.llm = llm
        self.retriever = retriever

    def conditions(self) -> list[dict]:
        gates = []
        for ruleset in load_soft_layer():
            gates.extend(ruleset.get("gates", []))
        return gates

    def evaluate(self, gate: dict, root: dict) -> SoftFinding:
        # STUB: deterministic placeholder. No LLM call, no retrieval. The
        # trigger_signal probe against issuer data is deferred to when the soft
        # backend is wired; this phase only flags the signal.
        return _finding_from_gate(gate)

    def evaluate_all(self, root: dict) -> list[SoftFinding]:
        return [self.evaluate(gate, root) for gate in self.conditions()]

"""Qualitative (unquantifiable-text) analysis — LLM soft path.

Upgrades the former soft stubs: when an LLM is configured, narrative excerpts
from extraction are scored against ``qualitative/rules/*.yaml`` substantive
signals. Hard engine never imports this module.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from ..common.llm import chat_json, stub_mode
from ..hard_inspection.loader import load_soft_layer
from .heuristics import apply_heuristic_findings

NOT_EVALUATED = "NOT_EVALUATED"
PASS_SIGNAL = "PASS_SIGNAL"
TRIGGERED = "TRIGGERED"

_PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


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
    triggered: bool = False
    rationale: str = ""
    evidence_spans: list = field(default_factory=list)
    stub_reason: str = ""


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
        stub_reason=(
            "qualitative signal; LLM not configured — NOT_EVALUATED"
            if stub_mode()
            else ""
        ),
    )


def _render_prompt(template: str, **kwargs: str) -> tuple[str, str]:
    text = template
    for key, value in kwargs.items():
        text = text.replace("{{" + key + "}}", value)
    system, user = "", text
    if text.startswith("System:"):
        parts = text.split("\nUser:", 1)
        system = parts[0].replace("System:", "", 1).strip()
        user = parts[1].strip() if len(parts) > 1 else ""
    return system, user


def _apply_llm_findings(
    findings: list[SoftFinding], llm_payload: dict[str, Any]
) -> list[SoftFinding]:
    by_id = {f.gate_id: f for f in findings}
    for item in llm_payload.get("findings") or []:
        gid = item.get("gate_id")
        if gid not in by_id:
            continue
        f = by_id[gid]
        status = item.get("status") or NOT_EVALUATED
        if status not in (PASS_SIGNAL, TRIGGERED, NOT_EVALUATED):
            status = NOT_EVALUATED
        f.status = status
        triggered = item.get("triggered")
        f.triggered = bool(triggered) if triggered is not None else status == TRIGGERED
        f.rationale = item.get("rationale") or ""
        f.evidence_spans = item.get("evidence_spans") or []
        if item.get("remediation_hint"):
            f.remediation_path = item["remediation_hint"]
        f.stub_reason = ""
    return findings


class SoftConditionEngine:
    """Soft (LLM + narrative) path for unquantifiable listing signals.

    Constructor accepts optional backends for future retrieval wiring. When the
    LLM is unavailable (stub mode), every finding remains ``NOT_EVALUATED``.
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
        return _finding_from_gate(gate)

    def evaluate_all(
        self,
        root: dict,
        *,
        narrative: list[dict] | None = None,
    ) -> list[SoftFinding]:
        findings = [self.evaluate(gate, root) for gate in self.conditions()]
        if not narrative:
            return findings

        # Always apply heuristics first so sparse dumps still score.
        findings = apply_heuristic_findings(findings, narrative=narrative, root=root)

        if stub_mode():
            return findings

        remaining = [f for f in findings if f.status == NOT_EVALUATED]
        if not remaining:
            return findings

        gates_compact = [
            {
                "gate_id": g.get("id"),
                "condition": g.get("condition"),
                "rule_ref": g.get("rule_ref"),
                "severity": g.get("severity"),
                "trigger_signal": g.get("trigger_signal"),
                "substantive_concern": g.get("substantive_concern"),
                "factors": g.get("factors"),
            }
            for g in self.conditions()
            if g.get("id") in {f.gate_id for f in remaining}
        ]
        template = (_PROMPTS_DIR / "analyze_signals.txt").read_text(encoding="utf-8")
        system, user = _render_prompt(
            template,
            gates_json=json.dumps(gates_compact, ensure_ascii=False, indent=2),
            narrative_json=json.dumps(narrative, ensure_ascii=False, indent=2),
            issuer_context_json=json.dumps(
                {"issuer_id": root.get("issuer_id")}, ensure_ascii=False
            ),
        )
        # Prefer PASS_SIGNAL over NOT_EVALUATED when evidence is affirmative.
        system = (
            system
            + "\n\nIf excerpts affirmatively show the concern is absent "
            "(e.g. diversified customers, independence statements), use "
            "PASS_SIGNAL — not NOT_EVALUATED. Reserve NOT_EVALUATED for "
            "truly missing topics. Reply with JSON only."
        )
        payload = chat_json(
            system,
            user,
            stub_payload={"findings": [], "notes": ["stub"]},
        )
        return _apply_llm_findings(findings, payload)


def findings_as_dicts(findings: list[SoftFinding]) -> list[dict]:
    return [asdict(f) for f in findings]

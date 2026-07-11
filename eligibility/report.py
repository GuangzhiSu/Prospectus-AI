"""Assemble the diagnostic report and render the readiness scorecard.

The report states, per listing pathway, which checks pass / fall short / are
missing inputs / cannot be determined, with the governing ``rule_ref`` and the
exact issuer-input path read for each. It carries ``verdict: null`` and never
emits an eligible / not-eligible conclusion. All emitted strings are English.
"""
from __future__ import annotations

from dataclasses import asdict

from . import engine
from .engine import (
    EvalContext,
    GateResult,
    INDETERMINATE,
    MISSING_INPUT,
    NOT_EVALUATED,
    PASS,
    SHORTFALL,
    eval_gate,
)
from .loader import gate_effective, unverified_thresholds
from .soft import SoftConditionEngine

DISCLAIMER = (
    "Diagnostic only. For each listing pathway this report states which "
    "quantitative criteria are met, fall short, lack inputs, or cannot be "
    "determined, and cites the governing rule reference. It does NOT decide "
    "whether the issuer can or cannot list, and renders no verdict or "
    "recommendation. Thresholds flagged threshold_verified: false are pending a "
    "rulebook check; no gate has human sign-off for client use "
    "(human_signoff: false everywhere)."
)

AI_BOUNDARY = {
    "structured_field_input": {
        "uses_ai": False,
        "component": "profile form / CompanyProfile editor",
        "role": (
            "Issuer supplies resolved fields such as profit, revenue, market cap, "
            "FX rate, continuity years, WVR ownership, and key dates directly."
        ),
    },
    "document_table_extraction": {
        "uses_ai": True,
        "component": "Agent1 + LLM",
        "role": (
            "Issuer documents, financial statements, and spreadsheets are read "
            "and normalized into the same resolved issuer input / CompanyProfile."
        ),
    },
    "hard_threshold_engine": {
        "uses_ai": False,
        "component": "eligibility.engine",
        "role": (
            "Resolved values are compared against versioned rule thresholds. "
            "This stage deliberately avoids LLM calls so outputs are auditable, "
            "reproducible, and regression-testable."
        ),
    },
    "soft_signal_layer": {
        "uses_ai": True,
        "component": "eligibility.soft + retrieval backend",
        "status": "modeled; LLM/retrieval wiring pending",
        "signals": [
            "customer_concentration",
            "supplier_concentration",
            "connected_transactions_independence",
            "competing_business",
            "financial_internal_controls",
            "equity_clarity_wvr_preipo",
            "shell_company_pattern",
        ],
    },
}


def _suitability_synthesis(findings: list[dict]) -> dict:
    """Roll up overall Rule 8.04 suitability from the substantive signals.

    This is the umbrella synthesis, not a sibling gate: the concern level
    aggregates the severities of TRIGGERED signals. With the soft backend not
    wired this phase, no signal fires, so the level is 'not_assessed'. Carries no
    verdict.
    """
    high = {"high"}
    elevated = {"medium", "medium_high"}
    fired = [f for f in findings if f.get("triggered")]
    evaluated_any = any(f["status"] != "NOT_EVALUATED" for f in findings)
    if not evaluated_any:
        level = "not_assessed"
    elif any(f["severity"] in high for f in fired):
        level = "high"
    elif any(f["severity"] in elevated for f in fired):
        level = "elevated"
    else:
        level = "none"
    return {
        "rule_ref": "Main Board Listing Rule 8.04",
        "concern_level": level,
        "verdict": None,
        "basis": (
            "Umbrella suitability synthesis: the concern level rolls up the "
            "severities of TRIGGERED substantive signals; it has no independent "
            "trigger. Signals are requires_llm / evaluated:false this phase, so the "
            "level is 'not_assessed' until the soft backend fires them."
        ),
        "contributing_signals": [
            {"gate_id": f["gate_id"], "severity": f["severity"],
             "status": f["status"], "triggered": f.get("triggered", False)}
            for f in findings
        ],
    }


def _gate_to_dict(gate: GateResult) -> dict:
    return {
        "gate_id": gate.gate_id,
        "title": gate.title,
        "rule_ref": gate.rule_ref,
        "ruleset": gate.ruleset,
        "rule_version": gate.rule_version,
        "threshold_verified": gate.threshold_verified,
        "effective_from_verified": gate.effective_from_verified,
        "human_signoff": gate.human_signoff,
        "requires_llm": gate.requires_llm,
        "evaluated": gate.evaluated,
        "status": gate.status,
        "verdict": None,
        "note": gate.note,
        "checks": [asdict(c) for c in gate.checks],
    }


def build_report(
    issuer_id: str,
    rulesets: list[dict],
    ctx: EvalContext,
    fx_profile: dict | None,
    generated_at: str,
    as_of_date: str | None = None,
) -> dict:
    """Run the hard engine over every ruleset and assemble the report dict."""
    ruleset_blocks = []
    status_tally = {PASS: 0, SHORTFALL: 0, MISSING_INPUT: 0, INDETERMINATE: 0,
                    NOT_EVALUATED: 0}

    for rs in rulesets:
        meta = {"ruleset": rs.get("ruleset"), "version": rs.get("version")}
        gate_dicts = []
        for gate in rs["gates"]:
            if not gate_effective(gate, as_of_date):
                continue
            result = eval_gate(gate, meta, ctx)
            status_tally[result.status] = status_tally.get(result.status, 0) + 1
            gate_dicts.append(_gate_to_dict(result))
        evaluated_gates = [g for g in gate_dicts if g["evaluated"]]
        ruleset_blocks.append(
            {
                "ruleset": rs.get("ruleset"),
                "ruleset_name": rs.get("ruleset_name", rs.get("ruleset")),
                "version": rs.get("version"),
                "source_file": rs.get("_source_file"),
                "all_thresholds_verified": bool(evaluated_gates)
                and all(g["threshold_verified"] for g in evaluated_gates),
                "all_human_signoff": bool(gate_dicts)
                and all(g["human_signoff"] for g in gate_dicts),
                "in_regression_baseline": rs.get("in_regression_baseline", False),
                "source_ref": rs.get("source_ref"),
                "pending_consultation": rs.get("pending_consultation"),
                "gates": gate_dicts,
            }
        )

    soft_findings = [asdict(f) for f in SoftConditionEngine().evaluate_all(ctx.root)]
    suitability = _suitability_synthesis(soft_findings)

    fx_block = fx_profile or {
        "fx_rate_to_hkd": None,
        "note": (
            "No FX rate supplied. HK$ gates that need a non-HKD value converted "
            "return INDETERMINATE."
        ),
    }

    return {
        "report_type": "listing_eligibility_diagnostic",
        "schema": "eligibility.report.v1",
        "disclaimer": DISCLAIMER,
        "ai_boundary": AI_BOUNDARY,
        "verdict": None,
        "issuer_id": issuer_id,
        "generated_at": generated_at,
        "as_of_date": as_of_date,
        "fx_profile": fx_block,
        "path_vars": ctx.path_vars,
        "status_legend": {
            PASS: "Converted value present and meets the threshold.",
            SHORTFALL: "Converted value present but below the threshold.",
            MISSING_INPUT: "The value itself is null, absent, or not resolved.",
            INDETERMINATE: (
                "Value present but cannot be compared because the currency "
                "conversion is missing."
            ),
            NOT_EVALUATED: (
                "Rule authored but intentionally not evaluated in this phase."
            ),
        },
        "rulesets": ruleset_blocks,
        "soft_conditions": soft_findings,
        "suitability_synthesis": suitability,
        "summary": {
            "verdict": None,
            "status_counts": status_tally,
            "gates_total": sum(len(b["gates"]) for b in ruleset_blocks),
            "unverified_thresholds": unverified_thresholds(rulesets),
            "human_signoff_complete": all(
                b["all_human_signoff"] for b in ruleset_blocks
            ) if ruleset_blocks else False,
        },
    }


def render_scorecard(report: dict) -> str:
    """Render a plain-text, English readiness scorecard (no verdict)."""
    lines = []
    lines.append("Listing Eligibility Diagnostic -- readiness scorecard")
    lines.append(f"Issuer: {report['issuer_id']}    Generated: {report['generated_at']}")
    fx = report["fx_profile"].get("fx_rate_to_hkd")
    lines.append(f"FX rate to HKD: {fx if fx is not None else 'not supplied'}")
    lines.append("")
    lines.append(DISCLAIMER)
    lines.append("")
    lines.append(
        "AI boundary: Agent1 + LLM may extract issuer facts into CompanyProfile; "
        "the hard threshold engine intentionally uses no AI; soft signals are "
        "modeled for future LLM/retrieval review."
    )
    lines.append("")
    for block in report["rulesets"]:
        tv = "thresholds verified vs rulebook" if block["all_thresholds_verified"] \
            else "thresholds not all verified"
        baseline = "regression" if block["in_regression_baseline"] else "not in baseline"
        lines.append(
            f"== {block['ruleset_name']} (v{block['version']}, {baseline}; {tv}; "
            "human sign-off pending)"
        )
        if block.get("pending_consultation"):
            lines.append(f"   pending consultation: {block['pending_consultation']}")
        for gate in block["gates"]:
            if gate.get("requires_llm"):
                marker = "requires_llm (soft engine)"
            elif gate["evaluated"]:
                marker = "threshold_verified" if gate["threshold_verified"] \
                    else "threshold_unverified"
                if not gate["effective_from_verified"]:
                    marker += ", effective_from_unverified"
            else:
                marker = "not evaluated"
            lines.append(
                f"  [{gate['status']:13}] {gate['title']}  ({gate['rule_ref']})  <{marker}>"
            )
            for chk in gate["checks"]:
                detail = f"required {chk['required']}; actual {chk['actual']}"
                if chk["note"]:
                    detail += f"; {chk['note']}"
                lines.append(
                    f"        - {chk['status']:13} {chk['metric']}: {detail}"
                )
        lines.append("")
    counts = report["summary"]["status_counts"]
    tally = "  ".join(f"{k}={v}" for k, v in counts.items())
    lines.append(f"Status tally (no verdict): {tally}")
    pending = report["summary"]["unverified_thresholds"]
    lines.append(f"Checks pending threshold verification: {len(pending)}")
    lines.append(f"Human sign-off: pending on all gates ({report['summary']['gates_total']})")
    lines.append("")
    lines.append(
        "Substantive (soft-layer) signals -- flagged for expert/LLM review, no verdict:"
    )
    for f in report["soft_conditions"]:
        prov = "rule-anchored" if f["provenance_verified"] \
            else "rule-ref needs human verify"
        signal = "" if f["signal_level_verified"] else "; signal level is a heuristic probe"
        lines.append(
            f"  - [{f['status']}] {f['gate_id']} (severity {f['severity']}; {prov}{signal})"
            f"  ({f['rule_ref']})"
        )
        if f["substantive_concern"]:
            lines.append(f"        concern: {f['substantive_concern']}")
    syn = report["suitability_synthesis"]
    lines.append("")
    lines.append(
        f"Suitability synthesis (Rule 8.04, no verdict): concern_level = "
        f"{syn['concern_level']} (rolled up from the substantive signals above)"
    )
    return "\n".join(lines)

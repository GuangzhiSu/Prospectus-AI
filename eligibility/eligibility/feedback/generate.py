"""Section 4 — LLM feedback on IPO readiness and improvement priorities.

Consumes hard-inspection results + qualitative findings (+ extraction notes)
and produces founder-facing feedback. Diagnostic tone only — not a legal
verdict — but explicitly answers "are we ready?" and "what to improve?".

When the cloud / local model returns thinking prose or non-JSON, we salvage
JSON when possible and otherwise emit comprehensive structured feedback from
hard-gate results (never an empty panel).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..common.llm import chat_json, chat_text, stub_mode

_PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"

DISCLAIMER = (
    "Diagnostic feedback only. This is not legal advice, not an exchange "
    "determination, and not a recommendation of listing venue. Thresholds may "
    "lack external professional sign-off (human_signoff: false)."
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


def _check_shortfall_line(check: dict[str, Any]) -> str:
    metric = check.get("metric") or check.get("id") or "metric"
    actual = check.get("actual")
    required = check.get("required")
    note = check.get("note") or ""
    bits = [str(metric)]
    if actual is not None:
        bits.append(f"observed {actual}")
    if required is not None:
        bits.append(f"required {required}")
    line = " — ".join(bits) if len(bits) > 1 else bits[0]
    if note:
        line += f" ({note})"
    return line


def _hard_summary(hard_report: dict[str, Any]) -> dict[str, Any]:
    shortfalls = []
    missing = []
    passes = []
    indeterminate = []
    for block in hard_report.get("rulesets") or []:
        for gate in block.get("gates") or []:
            failing_checks = [
                c
                for c in (gate.get("checks") or [])
                if c.get("status") in {"SHORTFALL", "MISSING_INPUT", "INDETERMINATE"}
            ]
            entry = {
                "gate_id": gate.get("gate_id"),
                "title": gate.get("title"),
                "rule_ref": gate.get("rule_ref"),
                "status": gate.get("status"),
                "ruleset": block.get("ruleset"),
                "failing_checks": [
                    {
                        "id": c.get("id"),
                        "metric": c.get("metric"),
                        "status": c.get("status"),
                        "actual": c.get("actual"),
                        "required": c.get("required"),
                        "note": c.get("note"),
                    }
                    for c in failing_checks[:6]
                ],
            }
            status = gate.get("status")
            if status == "SHORTFALL":
                shortfalls.append(entry)
            elif status == "MISSING_INPUT":
                missing.append(entry)
            elif status == "PASS":
                passes.append(entry)
            elif status == "INDETERMINATE":
                indeterminate.append(entry)
    return {
        "status_counts": (hard_report.get("summary") or {}).get("status_counts", {}),
        "shortfalls": shortfalls[:40],
        "missing_inputs": missing[:40],
        "passes": passes[:40],
        "indeterminate": indeterminate[:20],
    }


def _stub_feedback(hard_report: dict[str, Any], qualitative: list[dict]) -> dict[str, Any]:
    """Comprehensive structured feedback from hard gates (LLM-independent)."""
    summary = _hard_summary(hard_report)
    counts = summary["status_counts"]
    shortfall_n = int(counts.get("SHORTFALL", 0) or 0)
    missing_n = int(counts.get("MISSING_INPUT", 0) or 0)
    pass_n = int(counts.get("PASS", 0) or 0)
    triggered = [f for f in qualitative if f.get("triggered")]

    if shortfall_n > 0 or triggered:
        readiness = "not_ready"
        headline = (
            "Not ready to go public yet — fix the shortfalls below before a "
            "serious sponsor discussion."
        )
    elif missing_n > 0:
        readiness = "unclear_missing_inputs"
        headline = (
            "Readiness is unclear because key quantitative inputs are still missing."
        )
    elif pass_n > 0:
        readiness = "ready_to_discuss"
        headline = (
            "Hard quantitative gates that could be evaluated look met; "
            "proceed to sponsor / counsel discussion (diagnostic only)."
        )
    else:
        readiness = "unclear_missing_inputs"
        headline = "Insufficient evaluated gates to assess readiness."

    gaps = []
    for g in summary["shortfalls"][:10]:
        area = g.get("title") or g.get("gate_id") or "shortfall gate"
        check_lines = [
            _check_shortfall_line(c)
            for c in (g.get("failing_checks") or [])
            if c.get("status") == "SHORTFALL"
        ]
        if check_lines:
            detail = (
                f"SHORTFALL under {g.get('rule_ref')}. "
                + "; ".join(check_lines[:3])
            )
        else:
            detail = f"Status SHORTFALL under {g.get('rule_ref')}."
        gaps.append(
            {
                "area": area,
                "severity": "high",
                "detail": detail,
                "rule_ref": g.get("rule_ref"),
                "suggested_action": (
                    f"Close the gap on “{area}” by improving the observed metric(s) "
                    "toward the listing threshold, or evaluate an alternative "
                    "listing standard / pathway that better fits the current profile."
                ),
            }
        )
    for g in summary["missing_inputs"][:10]:
        area = g.get("title") or g.get("gate_id") or "missing input"
        gaps.append(
            {
                "area": area,
                "severity": "medium",
                "detail": (
                    f"MISSING_INPUT under {g.get('rule_ref')}. "
                    "The engine could not resolve the required field from uploads "
                    "or deal parameters."
                ),
                "rule_ref": g.get("rule_ref"),
                "suggested_action": (
                    f"Supply inputs for “{area}”: upload audited financials, "
                    "confirm extracted values, and enter deal parameters "
                    "(offer price, share count, FX) where needed."
                ),
            }
        )
    for f in triggered[:8]:
        gaps.append(
            {
                "area": f.get("gate_id") or f.get("condition") or "qualitative signal",
                "severity": f.get("severity") or "medium",
                "detail": f.get("rationale")
                or f.get("substantive_concern")
                or "Qualitative signal triggered.",
                "rule_ref": f.get("rule_ref"),
                "suggested_action": f.get("remediation_path")
                or "Prepare disclosure and a remediation plan for sponsor review.",
            }
        )

    priority_actions: list[str] = []
    seen_actions: set[str] = set()
    for item in gaps:
        action = item.get("suggested_action")
        if not action or action in seen_actions:
            continue
        seen_actions.add(action)
        priority_actions.append(action)
        if len(priority_actions) >= 6:
            break

    top_shortfalls = [
        (g.get("title") or g.get("gate_id") or "gate")
        for g in summary["shortfalls"][:3]
    ]
    paragraphs = [
        (
            f"Across evaluated hard gates: PASS={pass_n}, SHORTFALL={shortfall_n}, "
            f"MISSING_INPUT={missing_n}."
        )
    ]
    if top_shortfalls:
        paragraphs.append(
            "The most urgent quantitative gaps are: "
            + "; ".join(top_shortfalls)
            + "."
        )
    if triggered:
        paragraphs.append(
            "At least one qualitative signal needs attention: "
            + str(triggered[0].get("gate_id") or triggered[0].get("condition"))
            + "."
        )
    if pass_n > 0:
        paragraphs.append(
            f"{pass_n} gate(s) already PASS — keep those strengths intact while "
            "closing shortfalls."
        )
    paragraphs.append(
        "Use the gaps and priority actions below as a working checklist with "
        "sponsors and counsel (diagnostic only)."
    )

    return {
        "readiness": readiness,
        "headline": headline,
        "summary": " ".join(paragraphs),
        "strengths": [
            g.get("title") or g.get("gate_id") for g in summary["passes"][:8]
        ],
        "gaps": gaps,
        "priority_actions": priority_actions,
        "disclaimer": DISCLAIMER,
        "stub": True,
        "source": "structured",
    }


_VALID_READINESS = frozenset(
    {"ready_to_discuss", "not_ready", "unclear_missing_inputs"}
)


def _looks_like_schema_placeholder(text: Any) -> bool:
    """True when the model echoed the prompt schema instead of real copy."""
    if not isinstance(text, str):
        return True
    stripped = text.strip()
    if not stripped:
        return True
    if "|" in stripped and any(
        token in stripped
        for token in (
            "ready_to_discuss",
            "not_ready",
            "unclear_missing_inputs",
            "high|medium",
        )
    ):
        return True
    if stripped.startswith("<") and stripped.endswith(">"):
        return True
    if stripped in {"...", "<...>", "<or null>", "<ordered next steps>"}:
        return True
    return False


def _normalize_feedback(
    payload: dict[str, Any] | None,
    fallback: dict[str, Any],
) -> dict[str, Any]:
    """Merge LLM feedback with structured fallback; reject schema-echo responses."""
    if not isinstance(payload, dict):
        out = dict(fallback)
        out["stub"] = True
        out["source"] = "structured"
        out.setdefault("disclaimer", DISCLAIMER)
        return out

    if payload.get("stub") or payload.get("llm_error"):
        out = dict(fallback)
        out["stub"] = True
        out["source"] = "llm_fallback"
        if payload.get("llm_error"):
            out["llm_error"] = payload.get("llm_error")
        if payload.get("notes"):
            out["notes"] = list(payload.get("notes") or [])
        out.setdefault("disclaimer", DISCLAIMER)
        return out

    out = dict(fallback)
    readiness = payload.get("readiness")
    if readiness in _VALID_READINESS:
        out["readiness"] = readiness
    headline = payload.get("headline")
    summary = payload.get("summary")
    if not _looks_like_schema_placeholder(headline):
        out["headline"] = headline
    if not _looks_like_schema_placeholder(summary):
        out["summary"] = summary

    strengths = payload.get("strengths")
    if isinstance(strengths, list) and strengths:
        cleaned = [
            s
            for s in strengths
            if isinstance(s, str) and not _looks_like_schema_placeholder(s)
        ]
        if cleaned:
            out["strengths"] = cleaned

    gaps = payload.get("gaps")
    if isinstance(gaps, list) and gaps:
        cleaned_gaps = []
        for gap in gaps:
            if not isinstance(gap, dict):
                continue
            detail = gap.get("detail")
            if _looks_like_schema_placeholder(detail) and _looks_like_schema_placeholder(
                gap.get("area")
            ):
                continue
            cleaned_gaps.append(gap)
        if cleaned_gaps:
            out["gaps"] = cleaned_gaps

    actions = payload.get("priority_actions")
    if isinstance(actions, list) and actions:
        seen: set[str] = set()
        cleaned_actions: list[str] = []
        for action in actions:
            if not isinstance(action, str) or _looks_like_schema_placeholder(action):
                continue
            if action in seen:
                continue
            seen.add(action)
            cleaned_actions.append(action)
            if len(cleaned_actions) >= 6:
                break
        if cleaned_actions:
            out["priority_actions"] = cleaned_actions

    disclaimer = payload.get("disclaimer")
    if isinstance(disclaimer, str) and not _looks_like_schema_placeholder(disclaimer):
        out["disclaimer"] = disclaimer
    else:
        out.setdefault("disclaimer", DISCLAIMER)

    echoed = (
        _looks_like_schema_placeholder(payload.get("headline"))
        or _looks_like_schema_placeholder(payload.get("summary"))
        or payload.get("readiness") not in _VALID_READINESS
    )
    if echoed:
        out = dict(fallback)
        out["stub"] = True
        out["source"] = "llm_fallback"
        out["notes"] = [
            "Model returned schema placeholders; showing comprehensive structured feedback."
        ]
        out.setdefault("disclaimer", DISCLAIMER)
        return out

    out["stub"] = False
    out["source"] = "llm"
    return out


def _enrich_with_prose(
    fallback: dict[str, Any],
    *,
    market_hint: str,
    hard_summary: dict[str, Any],
) -> dict[str, Any]:
    """Last-resort: ask for short prose and fold it into structured feedback."""
    try:
        prose = chat_text(
            (
                "You write concise IPO listing-readiness feedback for founders. "
                "Diagnostic only — not legal advice. Write 3-5 sentences covering "
                "readiness, top shortfalls, and next steps."
            ),
            (
                f"Market: {market_hint or 'unspecified'}\n"
                f"Hard-gate summary JSON:\n"
                f"{json.dumps(hard_summary, ensure_ascii=False)[:6000]}\n\n"
                "Write plain prose only (no JSON)."
            ),
            max_tokens=700,
            temperature=0.2,
        )
    except Exception:  # noqa: BLE001
        return fallback

    prose = (prose or "").strip()
    if len(prose) < 40 or _looks_like_schema_placeholder(prose):
        return fallback
    # Reject obvious thinking dumps.
    if prose.lower().startswith("thinking") or "we are asked" in prose.lower()[:80]:
        return fallback

    out = dict(fallback)
    # Keep structured gaps/actions; upgrade narrative fields.
    first = prose.split(". ")
    if first:
        out["headline"] = first[0].rstrip(".") + "."
    out["summary"] = prose
    out["stub"] = False
    out["source"] = "llm_prose"
    out["notes"] = list(out.get("notes") or []) + [
        "Narrative rewritten from model prose; gaps remain rule-linked structured items."
    ]
    return out


def generate_feedback(
    hard_report: dict[str, Any],
    *,
    qualitative_findings: list[dict] | None = None,
    extraction_notes: dict[str, Any] | None = None,
    market_hint: str = "",
) -> dict[str, Any]:
    """Generate readiness feedback from hard + qualitative analysis results."""
    qualitative = qualitative_findings or hard_report.get("soft_conditions") or []
    fallback = _stub_feedback(hard_report, qualitative)
    if stub_mode():
        return fallback

    hard_summary = _hard_summary(hard_report)
    template = (_PROMPTS_DIR / "feedback.txt").read_text(encoding="utf-8")
    system, user = _render_prompt(
        template,
        market_hint=market_hint or "unspecified",
        hard_summary_json=json.dumps(hard_summary, ensure_ascii=False),
        qualitative_json=json.dumps(qualitative, ensure_ascii=False),
        extraction_notes_json=json.dumps(extraction_notes or {}, ensure_ascii=False),
    )
    payload = chat_json(
        system,
        user,
        stub_payload=fallback,
        max_tokens=3072,
    )
    normalized = _normalize_feedback(payload, fallback)
    if normalized.get("source") == "llm":
        return normalized

    # Prose salvage keeps comprehensive gaps while upgrading narrative wording.
    enriched = _enrich_with_prose(
        normalized,
        market_hint=market_hint,
        hard_summary=hard_summary,
    )
    return enriched

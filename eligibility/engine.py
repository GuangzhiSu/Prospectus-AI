"""Hard eligibility engine -- pure deterministic Python. No LLM, ever.

The engine reads already-resolved issuer values through the read-only resolver
and compares them to versioned thresholds taken from the rule configs. It
produces, per check, exactly one of four evaluation statuses and never renders
an eligible / not-eligible verdict (that is out of scope by design):

    PASS           converted value present and meets the threshold
    SHORTFALL      converted value present but below the threshold
    MISSING_INPUT  the value itself is null / absent / not resolved
    INDETERMINATE  value present but cannot be compared because the required
                   currency conversion is missing

A gate whose config sets ``evaluated: false`` is not run; it surfaces as
``NOT_EVALUATED`` (a separate, non-evaluation marker -- e.g. Chapter 18C, which
has no fixture this phase).

The engine never performs a financial computation. Aggregates (e.g. three-year
cash flow) must already exist as resolved fields in the issuer input; if they do
not, the relevant check is ``MISSING_INPUT``. Selecting which period record to
read is done via explicit path variables supplied in the run profile, not by the
engine guessing the latest year.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from .resolver import read_leaf, get_node, Leaf

# --- evaluation statuses ---------------------------------------------------
PASS = "PASS"
SHORTFALL = "SHORTFALL"
MISSING_INPUT = "MISSING_INPUT"
INDETERMINATE = "INDETERMINATE"
NOT_EVALUATED = "NOT_EVALUATED"  # config opted out (evaluated: false)
EVAL_STATUSES = (PASS, SHORTFALL, MISSING_INPUT, INDETERMINATE)

# --- currency / scale parsing ---------------------------------------------
_SCALE = {
    "trillion": 1e12,
    "billion": 1e9,
    "million": 1e6,
    "thousand": 1e3,
}
_CURRENCIES = ("HKD", "RMB", "CNY", "USD", "EUR", "GBP")

_OPS = {
    ">=": lambda a, b: a >= b,
    ">": lambda a, b: a > b,
    "<=": lambda a, b: a <= b,
    "<": lambda a, b: a < b,
    "==": lambda a, b: a == b,
}

_VAR_RE = re.compile(r"\{([A-Za-z0-9_]+)\}")


@dataclass
class EvalContext:
    """Everything the engine reads that is not a threshold.

    ``fx`` is the run profile's ``fx_rate_to_hkd`` block (or None). ``path_vars``
    substitutes named placeholders such as ``{latest_audited_fy}`` into input
    paths so the rules stay issuer-agnostic.
    """

    root: dict
    fx: dict | None = None
    path_vars: dict = field(default_factory=dict)
    # CompanyProfile-style run inputs that are not issuer financials, e.g.
    # intended_application_date / expected_listing_date (both nullable). Read by
    # conditional-override thresholds; never inferred.
    profile: dict = field(default_factory=dict)


@dataclass
class CheckResult:
    check_id: str
    metric: str
    status: str
    rule_ref: str = ""
    operator: str = ""
    required: str = ""
    actual: Any = None
    used_path: str = ""
    note: str = ""
    # provenance (passed through from the rule config; see README)
    threshold_verified: bool = False
    effective_from: str | None = None
    effective_from_verified: bool = False
    verified_against: str = ""
    verified_on: str = ""
    verified_by: str = ""
    date_note: str = ""
    guidance_note: str = ""


@dataclass
class GateResult:
    gate_id: str
    title: str
    rule_ref: str
    ruleset: str
    rule_version: str
    evaluated: bool
    status: str
    checks: list
    human_signoff: bool = False
    threshold_verified: bool = False        # rollup: all checks checked vs rulebook
    effective_from_verified: bool = False   # rollup: all checks' dates verified
    requires_llm: bool = False              # qualitative; routed to the soft engine
    note: str = ""


def parse_money_unit(unit: str | None) -> tuple[str | None, float]:
    """Return ``(currency or None, scale)`` for a unit string.

    Non-monetary units (``%``, ``days``, counts, votes, None) yield
    ``(None, 1.0)``. ``CNY`` is normalised to ``RMB``.
    """
    if not unit or not isinstance(unit, str):
        return None, 1.0
    text = unit.strip()
    currency = None
    for code in _CURRENCIES:
        if re.search(rf"\b{code}\b", text, re.IGNORECASE):
            currency = code.upper()
            break
    if currency == "CNY":
        currency = "RMB"
    scale = 1.0
    for word, factor in _SCALE.items():
        if re.search(rf"\b{word}\b", text, re.IGNORECASE):
            scale = factor
            break
    return currency, scale


def _threshold_parts(threshold: Any) -> tuple[Any, str | None]:
    if isinstance(threshold, dict):
        return threshold.get("value"), threshold.get("unit")
    return threshold, None


def _fmt_threshold(operator: str, threshold: Any) -> str:
    value, unit = _threshold_parts(threshold)
    return f"{operator} {value}{(' ' + unit) if unit else ''}"


def _fmt_amount(value: Any, unit: str | None) -> str:
    return f"{value}{(' ' + unit) if unit else ''}"


def _convert_to_hkd(
    value_abs: float, currency: str, fx: dict | None
) -> tuple[float | None, str]:
    """Convert an absolute monetary amount to HKD using the profile fx block.

    Returns ``(converted, note)`` or ``(None, reason)``. Never invents a rate.
    """
    if currency == "HKD":
        return value_abs, ""
    if not fx or fx.get("value") is None:
        return None, (
            f"requires {currency}->HKD conversion rate "
            "(no fx_rate_to_hkd supplied in the run profile)"
        )
    from_currency = (fx.get("from_currency") or "").upper() or None
    if from_currency and from_currency != currency:
        return None, (
            f"supplied fx_rate_to_hkd converts {from_currency}->HKD, "
            f"not {currency}->HKD"
        )
    rate = fx["value"]
    as_of = fx.get("as_of_date")
    note = f"converted {currency}->HKD at {rate}"
    if as_of:
        note += f" as of {as_of}"
    return value_abs * rate, note


def _resolve_path(raw_path: str, path_vars: dict) -> tuple[str, str | None]:
    """Substitute ``{var}`` placeholders. Returns ``(path, unresolved_var)``."""
    def repl(match: "re.Match") -> str:
        name = match.group(1)
        return str(path_vars[name]) if name in path_vars else match.group(0)

    resolved = _VAR_RE.sub(repl, raw_path)
    unresolved = _VAR_RE.search(resolved)
    return resolved, (unresolved.group(1) if unresolved else None)


def eval_check(check: dict, ctx: EvalContext) -> CheckResult:
    """Evaluate one leaf check, then attach its config provenance."""
    result = _eval_check_core(check, ctx)
    result.threshold_verified = bool(check.get("threshold_verified", False))
    result.effective_from = check.get("effective_from")
    result.effective_from_verified = bool(check.get("effective_from_verified", False))
    result.verified_against = check.get("verified_against", "")
    result.verified_on = check.get("verified_on", "")
    result.verified_by = check.get("verified_by", "")
    result.date_note = check.get("date_note", "")
    result.guidance_note = check.get("guidance_note", "")
    return result


def _resolve_threshold(check: dict, ctx: EvalContext) -> tuple[Any, str | None, str]:
    """Resolve a check's effective threshold, applying a conditional override.

    Returns ``(threshold, forced_status, note)``. A ``conditional_override`` block
    swaps in an alternative threshold when ALL of its ``when_all`` date conditions
    hold against the run-profile dates. If any required profile date is missing,
    ``forced_status`` is ``INDETERMINATE`` (the engine cannot choose which
    threshold applies) and the note names the dates required. No date is inferred.
    """
    base = check.get("threshold")
    override = check.get("conditional_override")
    if not override:
        return base, None, ""
    conditions = override.get("when_all", [])
    fields = [c.get("profile_field") for c in conditions]
    missing = [f for f in fields if not ctx.profile.get(f)]
    if missing:
        return base, INDETERMINATE, (
            "requires run-profile dates " + " and ".join(fields)
            + " to choose base vs temporarily-reduced threshold"
        )
    holds = True
    for cond in conditions:
        value = str(ctx.profile.get(cond["profile_field"]))
        op = _OPS.get(cond.get("operator"))
        target = str(cond.get("value"))
        if op is None or not op(value, target):
            holds = False
            break
    if holds:
        source = override.get("source", "")
        return override.get("threshold"), None, (
            "temporarily-reduced threshold applied"
            + (f" ({source})" if source else "")
        )
    return base, None, "base threshold (temporary-reduction window not applicable)"


def _to_comparable(value: float, unit: str | None, target_unit: str | None,
                   fx: dict | None) -> tuple[float | None, str | None, str]:
    """Reconcile a monetary value to a target currency for comparison.

    Returns ``(absolute_value, status, note)``. ``status`` is ``INDETERMINATE``
    when a conversion is needed but unavailable; otherwise ``None``.
    """
    a_ccy, a_scale = parse_money_unit(unit)
    t_ccy, t_scale = parse_money_unit(target_unit)
    a_abs = value * a_scale
    if t_ccy and a_ccy and t_ccy != a_ccy:
        if t_ccy != "HKD":
            return None, INDETERMINATE, f"no converter available for {a_ccy}->{t_ccy}"
        converted, note = _convert_to_hkd(a_abs, a_ccy, fx)
        if converted is None:
            return None, INDETERMINATE, note
        return converted, None, note
    if t_ccy and not a_ccy:
        return None, INDETERMINATE, (
            f"value carries no currency unit; cannot compare to {target_unit}")
    return a_abs, None, ""


def _extract_ratio(elem: Any) -> float | None:
    """Pull a numeric ratio out of one rd_ratio_by_year element (read-only)."""
    if isinstance(elem, bool):
        return None
    if isinstance(elem, (int, float)):
        return float(elem)
    if isinstance(elem, dict):
        value = elem.get("value")
        if isinstance(value, dict):
            value = value.get("value")
        if isinstance(value, bool):
            return None
        if isinstance(value, (int, float)):
            return float(value)
    return None


def _read_ratio_series(root: dict, path: str) -> list[float] | None:
    """Read a list of already-resolved per-year ratios. None if absent/incomplete.

    This never computes a ratio; the series must already exist in the input.
    """
    node = get_node(root, path)
    if not isinstance(node, list) or not node:
        return None
    out = []
    for elem in node:
        ratio = _extract_ratio(elem)
        if ratio is None:
            return None
        out.append(ratio)
    return out


def _tier_required_text(tiers: dict) -> str:
    parts = []
    if isinstance(tiers.get("commercial"), dict):
        parts.append(f"commercial >= {tiers['commercial'].get('value')}%")
    if isinstance(tiers.get("pre_commercial_mid"), dict):
        parts.append(
            f"pre-commercial(rev>=band low) >= {tiers['pre_commercial_mid'].get('value')}%")
    if isinstance(tiers.get("pre_commercial_low"), dict):
        parts.append(
            f"pre-commercial(rev<band low) >= {tiers['pre_commercial_low'].get('value')}%")
    return "tiered: " + "; ".join(parts)


def _eval_rd_ratio_tiered(check: dict, ctx: EvalContext) -> CheckResult:
    """Evaluate the Chapter 18C R&D expenditure-ratio gate (Rule 18C.04(2)+(3)).

    Tier (15% / 30% / 50%) is selected from the run-profile ``company_type`` and,
    for pre-commercial companies, the issuer's most-recent-year revenue band. The
    pass condition is the application-period rule 18C.04(3): the tier ratio must be
    met yearly for at least ``min_years_meeting`` of the three financial years AND
    on aggregate. Per-year ratios and the aggregate are READ-ONLY resolved inputs;
    this never computes a ratio. Absent inputs -> MISSING_INPUT; present but the
    2-of-3 / aggregate test fails -> SHORTFALL.
    """
    cid = check.get("id", "")
    metric = check.get("metric", "")
    rule_ref = check.get("rule_ref", "")
    op = "rd_ratio_tiered"
    tiers = check.get("tiers", {})
    required_text = _tier_required_text(tiers)
    type_field = check.get("company_type_field", "company_type")

    company_type = ctx.profile.get(type_field)
    if not company_type:
        return CheckResult(cid, metric, MISSING_INPUT, rule_ref, op, required_text,
                           None, type_field,
                           f"requires '{type_field}' in run profile to select the R&D ratio tier")
    ctype = str(company_type).lower().replace("-", "_")
    tier_note = ""
    if ctype == "commercial":
        tier = tiers.get("commercial")
        tier_note = "commercial tier"
    elif ctype in ("pre_commercial", "precommercial"):
        bounds = check.get("revenue_band_bounds", {})
        rev_path, _ = _resolve_path(check.get("revenue_path", ""), ctx.path_vars)
        rleaf = read_leaf(ctx.root, rev_path)
        if not rleaf.present:
            return CheckResult(cid, metric, MISSING_INPUT, rule_ref, op, required_text,
                               None, rev_path,
                               "requires revenue (most recent audited year) to select the pre-commercial R&D ratio band")
        rev_abs, status, note = _to_comparable(rleaf.value, rleaf.unit,
                                               bounds.get("unit"), ctx.fx)
        if status == INDETERMINATE:
            return CheckResult(cid, metric, INDETERMINATE, rule_ref, op, required_text,
                               _fmt_amount(rleaf.value, rleaf.unit), rev_path, note)
        _, b_scale = parse_money_unit(bounds.get("unit"))
        low_abs = bounds.get("low", 0) * b_scale
        if rev_abs < low_abs:
            tier = tiers.get("pre_commercial_low")
            tier_note = "pre-commercial tier, revenue below band low"
        else:
            tier = tiers.get("pre_commercial_mid")
            tier_note = "pre-commercial tier, revenue at/above band low"
    else:
        return CheckResult(cid, metric, INDETERMINATE, rule_ref, op, required_text,
                           None, type_field,
                           f"unrecognized company_type '{company_type}'")

    if not isinstance(tier, dict) or not isinstance(tier.get("value"), (int, float)):
        return CheckResult(cid, metric, MISSING_INPUT, rule_ref, op, required_text,
                           None, "", "tier threshold missing in rule config")
    tier_value = tier["value"]

    by_year_path, _ = _resolve_path(check.get("by_year_path", ""), ctx.path_vars)
    agg_path, _ = _resolve_path(check.get("aggregate_path", ""), ctx.path_vars)
    years = _read_ratio_series(ctx.root, by_year_path)
    agg_leaf = read_leaf(ctx.root, agg_path)
    if years is None or not agg_leaf.present:
        missing = []
        if years is None:
            missing.append(by_year_path)
        if not agg_leaf.present:
            missing.append(agg_path)
        return CheckResult(cid, metric, MISSING_INPUT, rule_ref, op, required_text,
                           None, by_year_path,
                           "requires resolved R&D ratio inputs ("
                           + ", ".join(missing)
                           + "); eligibility never computes the ratio")
    if not isinstance(agg_leaf.value, (int, float)) or isinstance(agg_leaf.value, bool):
        return CheckResult(cid, metric, MISSING_INPUT, rule_ref, op, required_text,
                           agg_leaf.value, agg_path, "aggregate ratio is not numeric")

    min_years = check.get("min_years_meeting", 2)
    years_meeting = sum(1 for r in years if r >= tier_value)
    ok = (years_meeting >= min_years) and (agg_leaf.value >= tier_value)
    required = (f">= {tier_value}% in >= {min_years} of {len(years)} years "
                f"AND >= {tier_value}% aggregate ({tier_note})")
    actual = (f"{years_meeting}/{len(years)} years >= {tier_value}%; "
              f"aggregate {agg_leaf.value}%")
    return CheckResult(cid, metric, PASS if ok else SHORTFALL, rule_ref, op,
                       required, actual, by_year_path, tier_note)


def _read_check_input(check: dict, ctx: EvalContext) -> Leaf:
    """Read a check's value from either the issuer root (``input_path``) or the
    run profile / CompanyProfile (``profile_field``). Returns a Leaf; an absent
    or unresolved input is a not-present Leaf carrying the reason.
    """
    profile_field = check.get("profile_field")
    if profile_field is not None:
        value = ctx.profile.get(profile_field)
        if value is None:
            return Leaf(False,
                        reason=f"profile field '{profile_field}' not provided in run profile",
                        path=f"profile.{profile_field}")
        return Leaf(True, value, None, value, path=f"profile.{profile_field}")
    raw_path = check.get("input_path", "")
    path, unresolved = _resolve_path(raw_path, ctx.path_vars)
    if unresolved is not None:
        return Leaf(False,
                    reason=f"path variable '{unresolved}' not provided in the run profile",
                    path=path)
    return read_leaf(ctx.root, path)


def _eval_check_core(check: dict, ctx: EvalContext) -> CheckResult:
    """Evaluate one leaf check against the issuer input or CompanyProfile."""
    check_id = check.get("id", "")
    metric = check.get("metric", "")
    operator = check.get("operator", ">=")
    rule_ref = check.get("rule_ref", "")
    threshold = check.get("threshold")

    # tiered, multi-year R&D ratio test (Chapter 18C 18C.04) -- its own evaluator
    if operator == "rd_ratio_tiered":
        return _eval_rd_ratio_tiered(check, ctx)

    leaf = _read_check_input(check, ctx)
    path = leaf.path

    # presence / boolean operators
    if operator == "exists":
        status = PASS if leaf.present else MISSING_INPUT
        return CheckResult(
            check_id, metric, status, rule_ref, operator, "must be present",
            leaf.value if leaf.present else None, path,
            "" if leaf.present else (leaf.reason or ""),
        )
    if operator in ("is_true", "is_false"):
        if not leaf.present:
            return CheckResult(
                check_id, metric, MISSING_INPUT, rule_ref, operator,
                operator, None, path, leaf.reason or "",
            )
        if not isinstance(leaf.value, bool):
            return CheckResult(
                check_id, metric, INDETERMINATE, rule_ref, operator,
                operator, leaf.value, path,
                "value is not a boolean; cannot evaluate truth condition",
            )
        ok = leaf.value if operator == "is_true" else (not leaf.value)
        return CheckResult(
            check_id, metric, PASS if ok else SHORTFALL, rule_ref, operator,
            operator, leaf.value, path,
        )

    # numeric comparison -- resolve the effective threshold first. A missing
    # override date yields INDETERMINATE regardless of the actual value, because
    # the engine cannot decide which threshold (base vs reduced) applies.
    threshold, forced, co_note = _resolve_threshold(check, ctx)
    if forced == INDETERMINATE:
        return CheckResult(
            check_id, metric, INDETERMINATE, rule_ref, operator,
            _fmt_threshold(operator, threshold),
            (_fmt_amount(leaf.value, leaf.unit) if leaf.present else None),
            path, co_note,
        )

    if not leaf.present:
        return CheckResult(
            check_id, metric, MISSING_INPUT, rule_ref, operator,
            _fmt_threshold(operator, threshold), None, path, leaf.reason or "",
        )
    actual = leaf.value
    if not isinstance(actual, (int, float)) or isinstance(actual, bool):
        return CheckResult(
            check_id, metric, MISSING_INPUT, rule_ref, operator,
            _fmt_threshold(operator, threshold), actual, path,
            "actual value is not numeric",
        )

    thr_value, thr_unit = _threshold_parts(threshold)
    if not isinstance(thr_value, (int, float)):
        return CheckResult(
            check_id, metric, MISSING_INPUT, rule_ref, operator,
            _fmt_threshold(operator, threshold), actual, path,
            "threshold value is not numeric in the rule config",
        )

    a_ccy, a_scale = parse_money_unit(leaf.unit)
    t_ccy, t_scale = parse_money_unit(thr_unit)
    a_abs = actual * a_scale
    t_abs = thr_value * t_scale

    def _join(*parts: str) -> str:
        return "; ".join(p for p in parts if p)

    if t_ccy and a_ccy and t_ccy != a_ccy:
        if t_ccy != "HKD":
            return CheckResult(
                check_id, metric, INDETERMINATE, rule_ref, operator,
                _fmt_threshold(operator, threshold),
                _fmt_amount(actual, leaf.unit), path,
                _join(co_note, f"no converter available for {a_ccy}->{t_ccy}"),
            )
        converted, conv_note = _convert_to_hkd(a_abs, a_ccy, ctx.fx)
        if converted is None:
            return CheckResult(
                check_id, metric, INDETERMINATE, rule_ref, operator,
                _fmt_threshold(operator, threshold),
                _fmt_amount(actual, leaf.unit), path, _join(co_note, conv_note),
            )
        a_abs = converted
        note = _join(co_note, conv_note)
    elif t_ccy and not a_ccy:
        return CheckResult(
            check_id, metric, INDETERMINATE, rule_ref, operator,
            _fmt_threshold(operator, threshold),
            _fmt_amount(actual, leaf.unit), path,
            _join(co_note,
                  f"actual value carries no currency unit; cannot compare to {thr_unit}"),
        )
    else:
        note = co_note

    ok = _OPS[operator](a_abs, t_abs)
    return CheckResult(
        check_id, metric, PASS if ok else SHORTFALL, rule_ref, operator,
        _fmt_threshold(operator, threshold), _fmt_amount(actual, leaf.unit),
        path, note,
    )


def _combine_all_of(statuses: list[str]) -> str:
    if not statuses:
        return MISSING_INPUT
    if all(s == PASS for s in statuses):
        return PASS
    if any(s == SHORTFALL for s in statuses):
        return SHORTFALL
    if any(s == MISSING_INPUT for s in statuses):
        return MISSING_INPUT
    return INDETERMINATE


def _combine_any_of(statuses: list[str]) -> str:
    if not statuses:
        return MISSING_INPUT
    if any(s == PASS for s in statuses):
        return PASS
    if any(s == INDETERMINATE for s in statuses):
        return INDETERMINATE
    if any(s == MISSING_INPUT for s in statuses):
        return MISSING_INPUT
    return SHORTFALL


def eval_requirement(req: dict, ctx: EvalContext) -> tuple[str, list]:
    """Recursively evaluate a requirement node.

    Forms: ``{"all_of": [...]}``, ``{"any_of": [...]}``, ``{"check": {...}}``,
    or a bare leaf check dict. Returns ``(status, [CheckResult, ...])``.
    """
    if isinstance(req, dict) and "all_of" in req:
        statuses, results = [], []
        for child in req["all_of"]:
            status, child_results = eval_requirement(child, ctx)
            statuses.append(status)
            results.extend(child_results)
        return _combine_all_of(statuses), results
    if isinstance(req, dict) and "any_of" in req:
        statuses, results = [], []
        for child in req["any_of"]:
            status, child_results = eval_requirement(child, ctx)
            statuses.append(status)
            results.extend(child_results)
        return _combine_any_of(statuses), results
    check = req.get("check", req) if isinstance(req, dict) else req
    result = eval_check(check, ctx)
    return result.status, [result]


def eval_gate(gate: dict, ruleset_meta: dict, ctx: EvalContext) -> GateResult:
    """Evaluate a single gate, honouring ``evaluated: false`` opt-out."""
    rule_version = ruleset_meta.get("version", "")
    ruleset = ruleset_meta.get("ruleset", "")
    human_signoff = bool(gate.get("human_signoff", False))
    requires_llm = bool(gate.get("requires_llm", False))
    rule_ref = gate.get("rule_ref", "")
    title = gate.get("title", "")

    # Qualitative gates are never hard-evaluated, regardless of the evaluated
    # flag: the hard engine cannot assess them. They are routed to the soft
    # engine when it is wired.
    if requires_llm:
        return GateResult(
            gate["id"], title, rule_ref, ruleset, rule_version,
            False, NOT_EVALUATED, [],
            human_signoff=human_signoff, requires_llm=True,
            note=gate.get(
                "stub_reason",
                "qualitative condition; routed to the soft engine (requires_llm)",
            ),
        )

    if not gate.get("evaluated", True):
        return GateResult(
            gate["id"], title, rule_ref, ruleset, rule_version,
            False, NOT_EVALUATED, [],
            human_signoff=human_signoff,
            note=gate.get(
                "stub_reason",
                "rule authored but not evaluated in this phase",
            ),
        )

    requirement = gate.get("requirement")
    if requirement is None:
        # a flat 'checks' list is treated as an implicit all_of
        if "checks" in gate:
            requirement = {"all_of": [{"check": c} for c in gate["checks"]]}
        else:
            requirement = {"all_of": []}

    status, results = eval_requirement(requirement, ctx)
    # let checks inherit the gate rule_ref when they do not carry their own
    for result in results:
        if not result.rule_ref:
            result.rule_ref = rule_ref
    # rollups: a gate is threshold/date verified only if every check is
    threshold_verified = bool(results) and all(r.threshold_verified for r in results)
    effective_from_verified = bool(results) and all(
        r.effective_from_verified for r in results
    )
    return GateResult(
        gate["id"], title, rule_ref, ruleset, rule_version,
        True, status, results,
        human_signoff=human_signoff,
        threshold_verified=threshold_verified,
        effective_from_verified=effective_from_verified,
    )

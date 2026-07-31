"""End-to-end eligibility pipeline: extract → confirm → hard → qualitative → feedback.

Standalone: does not import ai-module / Agent1 / Agent2.
"""
from __future__ import annotations

import datetime
import json
from pathlib import Path
from typing import Any

from .extraction import (
    extract_from_paths,
    merge_deal_params,
    resolve_rulesets,
)
from .extraction.issuer_builder import (
    apply_confirmations,
    build_issuer_from_extraction,
    structured_form_to_issuer,
)
from .extraction.chapter_deterministic import (
    merge_deterministic_into_issuer,
    merge_deterministic_into_profile,
)
from .feedback import generate_feedback
from .hard_inspection.engine import EvalContext
from .hard_inspection.loader import load_all, select_by_name
from .report import build_report


# Align extraction period keys with hard-gate path placeholders when the UI
# does not supply path_vars (documents-only runs).
_DEFAULT_PATH_VARS = {
    "latest_audited_fy": "FY_latest",
    "prior_fy_1": "FY_prior_1",
    "prior_fy_2": "FY_prior_2",
}


def _ensure_path_vars(profile: dict[str, Any]) -> dict[str, Any]:
    path_vars = dict(profile.get("path_vars") or {})
    for key, value in _DEFAULT_PATH_VARS.items():
        path_vars.setdefault(key, value)
    profile["path_vars"] = path_vars
    return profile


_DEFAULT_FX_TO_HKD = {
    "RMB": 1.08,
    "CNY": 1.08,
    "SGD": 5.85,
    "USD": 7.80,
}


def _issuer_uses_rmb(issuer: dict[str, Any]) -> bool:
    blob = json.dumps(issuer, ensure_ascii=False).upper()
    return "RMB" in blob or "CNY" in blob


def _ensure_fx_profile(issuer: dict[str, Any], profile: dict[str, Any]) -> dict[str, Any]:
    """Ensure FX rates exist for HKD-pivoted multi-market comparisons.

    Hard gates compare across HKD / CNY / SGD. Without rates, monetary checks
    become INDETERMINATE. Documented approximate defaults are better for founder
    diagnostics than a blank scorecard — override via the FX field anytime.
    """
    fx = profile.get("fx_rate_to_hkd")
    if not fx:
        if not _issuer_uses_rmb(issuer):
            # Still attach SGD/USD defaults so SGX thresholds can resolve vs HKD.
            profile["fx_rate_to_hkd"] = {
                "value": 1.0,
                "from_currency": "HKD",
                "as_of_date": datetime.date.today().isoformat(),
                "source_ref": "eligibility_default_multi_fx",
                "rates": dict(_DEFAULT_FX_TO_HKD),
                "note": (
                    "Default multi-currency→HKD rates for cross-market comparisons. "
                    "Enter deal-specific rates to override."
                ),
            }
            return profile
        profile["fx_rate_to_hkd"] = {
            "value": 1.08,
            "from_currency": "RMB",
            "as_of_date": datetime.date.today().isoformat(),
            "source_ref": "eligibility_default_approx_cny_hkd",
            "rates": dict(_DEFAULT_FX_TO_HKD),
            "note": (
                "Approximate CNY→HKD rate applied because extracted amounts are in "
                "RMB/CNY and no FX was supplied. Enter a deal-specific rate to override."
            ),
        }
        return profile

    rates = dict(_DEFAULT_FX_TO_HKD)
    rates.update(fx.get("rates") or {})
    from_ccy = (fx.get("from_currency") or "").upper()
    if fx.get("value") is not None and from_ccy:
        rates[from_ccy] = float(fx["value"])
        if from_ccy == "RMB":
            rates["CNY"] = float(fx["value"])
    fx["rates"] = rates
    profile["fx_rate_to_hkd"] = fx
    return profile


def _load_json(path: str | Path | None) -> dict:
    if not path:
        return {}
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def run_hard_only(
    issuer: dict[str, Any],
    profile: dict[str, Any] | None = None,
    *,
    ruleset_names: list[str] | None = None,
    as_of_date: str | None = None,
    narrative: list[dict] | None = None,
    include_feedback: bool = False,
    market_hint: str = "",
    extraction_notes: dict | None = None,
) -> dict[str, Any]:
    """Run hard inspection (+ qualitative + optional feedback) on issuer JSON."""
    profile = profile or {}
    rulesets = load_all()
    if ruleset_names:
        rulesets = select_by_name(rulesets, ruleset_names)

    fx_profile = (
        {"fx_rate_to_hkd": profile["fx_rate_to_hkd"]}
        if "fx_rate_to_hkd" in profile
        else None
    )
    ctx = EvalContext(
        root=issuer,
        fx=profile.get("fx_rate_to_hkd"),
        path_vars=profile.get("path_vars", {}),
        profile=profile,
    )
    generated_at = datetime.datetime.now().isoformat(timespec="seconds")
    issuer_id = issuer.get("issuer_id", "unknown")
    report = build_report(
        issuer_id,
        rulesets,
        ctx,
        fx_profile,
        generated_at,
        as_of_date,
        narrative=narrative,
    )
    if include_feedback:
        report["feedback"] = generate_feedback(
            report,
            qualitative_findings=report.get("soft_conditions"),
            extraction_notes=extraction_notes,
            market_hint=market_hint or profile.get("market_hint", ""),
        )
    return report


def run_pipeline(
    *,
    issuer_path: str | Path | None = None,
    issuer: dict[str, Any] | None = None,
    document_paths: list[str | Path] | None = None,
    profile_path: str | Path | None = None,
    profile: dict[str, Any] | None = None,
    ruleset_names: list[str] | None = None,
    market_key: str | None = None,
    as_of_date: str | None = None,
    market_hint: str = "",
    include_feedback: bool = True,
    auto_confirm_extraction: bool = False,
    confirmed_ids: list[str] | None = None,
    rejected_ids: list[str] | None = None,
    structured_form: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Full four-stage run with Mode B confirmation support.

    Input modes (any combination):
    - ``issuer`` / ``issuer_path``: structured v3 issuer JSON
    - ``document_paths``: uploads → extraction → (confirm) → issuer merge
    - ``structured_form``: UI form fields → issuer + profile
    """
    profile = dict(profile or _load_json(profile_path))
    market_hint = market_hint or profile.get("market_hint", "")
    ruleset_names = resolve_rulesets(market_key, ruleset_names)

    if structured_form:
        form_issuer, form_profile = structured_form_to_issuer(structured_form)
        profile = {**form_profile, **profile}
        if not issuer and not issuer_path:
            issuer = form_issuer
        market_hint = market_hint or form_profile.get("market_hint", "")

    extraction_package: dict[str, Any] | None = None
    narrative: list[dict] = []
    if document_paths:
        extraction_package = extract_from_paths(
            list(document_paths),
            market_hint=market_hint,
            auto_confirm=False,
        )
        extraction_package["deal_params"] = merge_deal_params(profile)
        if auto_confirm_extraction or confirmed_ids is not None or rejected_ids:
            apply_confirmations(
                extraction_package,
                confirmed_ids=confirmed_ids,
                rejected_ids=rejected_ids,
                confirm_all=auto_confirm_extraction,
            )
        narrative = extraction_package.get("narrative") or []
        built = build_issuer_from_extraction(
            extraction_package,
            profile=profile,
            base_issuer=issuer or (_load_json(issuer_path) if issuer_path else None),
            issuer_id=profile.get("issuer_id"),
        )
        issuer = merge_deterministic_into_issuer(built, extraction_package)
        profile = merge_deterministic_into_profile(profile, extraction_package)

    if issuer is None:
        if issuer_path:
            issuer = _load_json(issuer_path)
        else:
            issuer = {
                "issuer_id": profile.get("issuer_id", "extracted_pending_confirmation"),
                "schema": "eligibility.issuer.pending_v1",
                "note": (
                    "No issuer JSON supplied. Hard gates will mostly be "
                    "MISSING_INPUT until extracted fields are confirmed."
                ),
            }

    profile = _ensure_path_vars(profile)
    profile = _ensure_fx_profile(issuer, profile)

    # Drop WVR hard pack when the issuer shows no WVR / dual-class structure.
    if ruleset_names:
        dwvr = ((issuer or {}).get("company_legal_entity") or {}).get("dwvr") or {}
        has_wvr = bool(dwvr.get("structure_effective"))
        if not has_wvr:
            ruleset_names = [
                name
                for name in ruleset_names
                if "WVR" not in name.upper() and "8A" not in name.upper()
            ]

    report = run_hard_only(
        issuer,
        profile,
        ruleset_names=ruleset_names,
        as_of_date=as_of_date,
        narrative=narrative,
        include_feedback=include_feedback,
        market_hint=market_hint,
        extraction_notes={
            "missing_fields": (extraction_package or {}).get("missing_fields"),
            "notes": (extraction_package or {}).get("notes"),
            "llm_stub": (extraction_package or {}).get("llm_stub"),
            "errors": (extraction_package or {}).get("errors"),
        }
        if extraction_package
        else None,
    )
    if extraction_package is not None:
        report["extraction"] = extraction_package
    report["issuer"] = issuer
    report["pipeline"] = {
        "stages": [
            "extraction",
            "hard_inspection",
            "qualitative",
            "feedback" if include_feedback else None,
        ],
        "standalone": True,
        "market_key": market_key,
        "rulesets": ruleset_names,
    }
    return report


def run_session_dict(payload: dict[str, Any]) -> dict[str, Any]:
    """JSON-in / JSON-out entry used by the Next.js API bridge."""
    return run_pipeline(
        issuer=payload.get("issuer"),
        issuer_path=payload.get("issuer_path"),
        document_paths=payload.get("document_paths"),
        profile=payload.get("profile"),
        profile_path=payload.get("profile_path"),
        ruleset_names=payload.get("ruleset_names"),
        market_key=payload.get("market_key"),
        as_of_date=payload.get("as_of_date"),
        market_hint=payload.get("market_hint") or "",
        include_feedback=bool(payload.get("include_feedback", True)),
        auto_confirm_extraction=bool(payload.get("auto_confirm", False)),
        confirmed_ids=payload.get("confirmed_ids"),
        rejected_ids=payload.get("rejected_ids"),
        structured_form=payload.get("structured_form"),
    )

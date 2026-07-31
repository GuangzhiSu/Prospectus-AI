"""Mode B: confirmed extraction → issuer v3-shaped JSON for the hard engine.

Unconfirmed / rejected quantifiable fields are omitted so hard gates surface
``MISSING_INPUT`` rather than provisional PASS/SHORTFALL.
"""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from ..common.types import CONFIRMED, HARD_ENTERED, resolved_for_hard_gate

# Map extraction field_id → (issuer path segments, optional period-aware flag)
_FIELD_MAP: dict[str, dict[str, Any]] = {
    "revenue": {
        "path": ("financials", "income_statement"),
        "period_key": "revenue",
        "perioded": True,
    },
    "profit_attributable_to_owners": {
        "path": ("financials", "income_statement"),
        "period_key": "profit_attributable_to_owners",
        "perioded": True,
    },
    "net_profit_before_nonrecurring": {
        "path": ("financials", "income_statement"),
        "period_key": "net_profit_before_nonrecurring",
        "perioded": True,
    },
    "net_profit_after_nonrecurring": {
        "path": ("financials", "income_statement"),
        "period_key": "net_profit_after_nonrecurring",
        "perioded": True,
    },
    "operating_cash_flow": {
        "path": ("financials", "income_statement"),
        "period_key": "operating_cash_flow",
        "perioded": True,
    },
    "pre_tax_profit_ex_nonrecurrent": {
        "path": ("financials", "income_statement"),
        "period_key": "pre_tax_profit_ex_nonrecurrent",
        "perioded": True,
    },
    "total_assets": {
        "path": ("financials", "balance_sheet"),
        "period_key": "total_assets",
        "perioded": True,
    },
    "net_assets": {
        "path": ("financials", "balance_sheet"),
        "period_key": "net_assets",
        "perioded": True,
    },
    "rd_expenditure": {
        "path": ("financials", "income_statement"),
        "period_key": "rd_expenditure",
        "perioded": True,
    },
    "total_operating_expenditure": {
        "path": ("financials", "income_statement"),
        "period_key": "total_operating_expenditure",
        "perioded": True,
    },
    "expected_market_cap": {
        "path": ("offering_use_of_proceeds",),
        "key": "market_capitalisation_at_listing",
        "perioded": False,
    },
    "public_float_pct": {
        "path": ("offering_use_of_proceeds",),
        "key": "public_float_pct",
        "perioded": False,
    },
    "shareholder_count": {
        "path": ("offering_use_of_proceeds",),
        "key": "shareholders_at_listing",
        "perioded": False,
    },
    "free_float_market_value": {
        "path": ("offering_use_of_proceeds",),
        "key": "free_float_market_value_at_listing",
        "perioded": False,
    },
}


def _as_leaf(value: Any, unit: str | None) -> Any:
    if isinstance(value, dict) and "value" in value:
        return value
    if unit:
        return {"value": value, "unit": unit}
    return value


def _ensure_period_row(rows: list[dict], period: str) -> dict:
    for row in rows:
        if row.get("period") == period:
            return row
    row: dict[str, Any] = {"period": period}
    rows.append(row)
    return row


def _set_nested(root: dict, path: tuple[str, ...], key: str, leaf: Any) -> None:
    node: Any = root
    for part in path:
        if part not in node or not isinstance(node[part], dict):
            node[part] = {}
        node = node[part]
    node[key] = leaf


def apply_confirmations(
    extraction_package: dict[str, Any],
    *,
    confirmed_ids: list[str] | None = None,
    rejected_ids: list[str] | None = None,
    confirm_all: bool = False,
) -> dict[str, Any]:
    """Mutate/return extraction package with confirmation statuses applied."""
    confirmed = set(confirmed_ids or [])
    rejected = set(rejected_ids or [])
    for item in extraction_package.get("quantifiable") or []:
        fid = item.get("field_id")
        if fid in rejected:
            item["confirmation_status"] = "rejected"
        elif confirm_all or fid in confirmed:
            if item.get("value") is not None:
                item["confirmation_status"] = CONFIRMED
    return extraction_package


def build_issuer_from_extraction(
    extraction_package: dict[str, Any],
    *,
    profile: dict[str, Any] | None = None,
    base_issuer: dict[str, Any] | None = None,
    issuer_id: str | None = None,
) -> dict[str, Any]:
    """Build an issuer envelope from confirmed / hard-entered fields only."""
    profile = profile or {}
    issuer: dict[str, Any] = deepcopy(base_issuer) if base_issuer else {
        "schema_version": "v3",
        "issuer_id": issuer_id
        or profile.get("issuer_id")
        or "pending_confirmation",
        "financials": {"income_statement": [], "balance_sheet": []},
        "offering_use_of_proceeds": {},
        "source": "eligibility.mode_b",
    }
    period = (profile.get("path_vars") or {}).get("latest_audited_fy") or "FY_latest"

    fields = list(extraction_package.get("quantifiable") or [])
    fields.extend(extraction_package.get("deal_params") or [])

    for item in fields:
        if not resolved_for_hard_gate(item):
            continue
        fid = item.get("field_id")
        spec = _FIELD_MAP.get(fid or "")
        if not spec:
            # Stash unknowns under extraction_confirmed for audit; hard rules
            # that need them must use known field_ids.
            bag = issuer.setdefault("extraction_confirmed", {})
            bag[fid] = _as_leaf(item.get("value"), item.get("unit"))
            continue
        leaf = _as_leaf(item.get("value"), item.get("unit"))
        if spec.get("perioded"):
            section = issuer.setdefault("financials", {})
            key = spec["path"][1] if len(spec["path"]) > 1 else "income_statement"
            rows = section.setdefault(key, [])
            if not isinstance(rows, list):
                rows = []
                section[key] = rows
            row = _ensure_period_row(rows, period)
            row[spec["period_key"]] = leaf
        else:
            _set_nested(issuer, spec["path"], spec["key"], leaf)

    # Lift expected market cap alias used by many packs
    offering = issuer.setdefault("offering_use_of_proceeds", {})
    if (
        "market_capitalisation_at_listing" not in offering
        and profile.get("expected_market_cap") is not None
    ):
        offering["market_capitalisation_at_listing"] = profile["expected_market_cap"]

    # When extraction only has a single-year operating cash flow leaf, also
    # expose it on the aggregate path Main Board 8.05(2) looks for.
    income_rows = (issuer.get("financials") or {}).get("income_statement") or []
    if isinstance(income_rows, list):
        for row in income_rows:
            if row.get("period") != period:
                continue
            ocf = row.get("operating_cash_flow")
            if ocf is not None and "operating_cash_flow_aggregate_track_record" not in (
                issuer.get("financials") or {}
            ):
                issuer.setdefault("financials", {})[
                    "operating_cash_flow_aggregate_track_record"
                ] = ocf
            break

    return issuer


def structured_form_to_issuer(form: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Convert UI structured fields into (issuer JSON, run profile).

    Expected form keys (strings or numbers, HKD million scale for HKEX demo):
    issuer_name, latest_profit, preceding_two_year_profit, track_record_profit,
    latest_revenue, market_cap, operating_cashflow, management_continuity_years,
    ownership_continuity (yes/no/unknown), wvr_ownership_pct,
    path_vars, fx_rate_to_hkd, offer_price, post_offering_total_shares.
    """
    def num(key: str) -> float | None:
        raw = form.get(key)
        if raw is None or raw == "":
            return None
        try:
            return float(raw)
        except (TypeError, ValueError):
            return None

    period = (form.get("path_vars") or {}).get("latest_audited_fy") or "FY2024"
    prior1 = (form.get("path_vars") or {}).get("prior_fy_1") or "FY2023"
    prior2 = (form.get("path_vars") or {}).get("prior_fy_2") or "FY2022"

    income = [{"period": period}]
    if num("latest_revenue") is not None:
        income[0]["revenue"] = {"value": num("latest_revenue"), "unit": "HKD million"}
    if num("latest_profit") is not None:
        income[0]["profit_attributable_to_owners"] = {
            "value": num("latest_profit"),
            "unit": "HKD million",
        }

    financials: dict[str, Any] = {"income_statement": income}
    if num("preceding_two_year_profit") is not None:
        financials["profit_attributable_to_owners_aggregate_two_preceding_years"] = {
            "value": num("preceding_two_year_profit"),
            "unit": "HKD million",
        }
    if num("track_record_profit") is not None:
        financials["profit_attributable_to_owners_aggregate_track_record"] = {
            "value": num("track_record_profit"),
            "unit": "HKD million",
        }
    if num("operating_cashflow") is not None:
        financials["operating_cash_flow_aggregate_track_record"] = {
            "value": num("operating_cashflow"),
            "unit": "HKD million",
        }

    offering: dict[str, Any] = {}
    if num("market_cap") is not None:
        offering["market_capitalisation_at_listing"] = {
            "value": num("market_cap"),
            "unit": "HKD million",
        }

    issuer: dict[str, Any] = {
        "schema_version": "v3",
        "issuer_id": form.get("issuer_name") or "structured_form",
        "financials": financials,
        "offering_use_of_proceeds": offering,
        "company_legal_entity": {
            "dwvr": {
                "structure_effective": None,
                "aggregate_wvr_beneficiaries": {
                    "total_ownership_pct": num("wvr_ownership_pct"),
                },
            }
        },
        "source": "eligibility.structured_form",
    }

    ownership = form.get("ownership_continuity")
    profile: dict[str, Any] = {
        "path_vars": {
            "latest_audited_fy": period,
            "prior_fy_1": prior1,
            "prior_fy_2": prior2,
        },
        "issuer_id": issuer["issuer_id"],
        "market_hint": form.get("market_hint") or "",
    }
    if form.get("fx_rate_to_hkd") is not None:
        profile["fx_rate_to_hkd"] = form["fx_rate_to_hkd"]
    if num("management_continuity_years") is not None:
        profile["management_continuity_years"] = num("management_continuity_years")
    if ownership in ("yes", "no"):
        profile["ownership_continuity_recent_audited_fy"] = ownership == "yes"
    for key in (
        "offer_price",
        "post_offering_total_shares",
        "expected_market_cap",
        "intended_application_date",
        "expected_listing_date",
    ):
        if form.get(key) is not None:
            profile[key] = form[key]

    return issuer, profile


# Market → default ruleset ids for the UI / API
MARKET_RULESETS: dict[str, list[str]] = {
    "hkex_main_board": [
        "HKEX_Main_Board",
        "HKEX_Chapter_8A_WVR",
        "HKEX_Public_Float",
    ],
    "hkex_gem": ["HKEX_GEM", "HKEX_Public_Float"],
    "hkex_18a": ["HKEX_Chapter_18A_Biotech", "HKEX_Public_Float"],
    "hkex_18c": ["HKEX_Chapter_18C_Specialist_Technology", "HKEX_Public_Float"],
    "cn_main_board": ["CN_Main_Board", "CN_CSRC_Preconditions"],
    "cn_star": ["CN_STAR_Market", "CN_CSRC_Preconditions"],
    "cn_chinext": ["CN_ChiNext", "CN_CSRC_Preconditions"],
    "cn_bse": ["CN_BSE"],
    "sgx_mainboard": ["SGX_Mainboard"],
    "sgx_catalist": ["SGX_Catalist"],
}


def resolve_rulesets(market_key: str | None, explicit: list[str] | None = None) -> list[str] | None:
    if explicit:
        return explicit
    if not market_key:
        return None
    return MARKET_RULESETS.get(market_key)

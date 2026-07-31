"""Field catalog for eligibility extraction (Mode B hybrid input).

Quantifiable fields feed the hard engine after human confirmation.
Narrative fields feed the qualitative LLM analyzer.
Deal parameters are never AI-invented — they must be hard-entered.
"""
from __future__ import annotations

from typing import Any

# Minimal catalog aligned with update/ workbook sheet 2_Field_Dictionary
# (narrative summary). Full limb thresholds stay in hard_inspection/rules YAML.

QUANTIFIABLE_FIELDS: list[dict[str, Any]] = [
    {"field_id": "revenue", "kind": "quantifiable", "unit_hint": "currency"},
    {"field_id": "profit_attributable_to_owners", "kind": "quantifiable", "unit_hint": "currency"},
    {"field_id": "net_profit_before_nonrecurring", "kind": "quantifiable", "unit_hint": "currency"},
    {"field_id": "net_profit_after_nonrecurring", "kind": "quantifiable", "unit_hint": "currency"},
    {"field_id": "operating_cash_flow", "kind": "quantifiable", "unit_hint": "currency"},
    {"field_id": "total_assets", "kind": "quantifiable", "unit_hint": "currency"},
    {"field_id": "net_assets", "kind": "quantifiable", "unit_hint": "currency"},
    {"field_id": "rd_expenditure", "kind": "quantifiable", "unit_hint": "currency"},
    {"field_id": "total_operating_expenditure", "kind": "quantifiable", "unit_hint": "currency"},
    {"field_id": "management_continuity_years", "kind": "quantifiable", "unit_hint": "years"},
    {"field_id": "ownership_continuity_recent_audited_fy", "kind": "quantifiable", "unit_hint": "years"},
    {"field_id": "trading_record_years", "kind": "quantifiable", "unit_hint": "years"},
    {"field_id": "shareholder_count", "kind": "quantifiable", "unit_hint": "count"},
    {"field_id": "public_float_pct", "kind": "quantifiable", "unit_hint": "percent"},
]

DEAL_PARAM_FIELDS: list[dict[str, Any]] = [
    {"field_id": "offer_price", "kind": "deal_param"},
    {"field_id": "post_offering_total_shares", "kind": "deal_param"},
    {"field_id": "expected_market_cap", "kind": "deal_param"},
    {"field_id": "intended_application_date", "kind": "deal_param"},
    {"field_id": "expected_listing_date", "kind": "deal_param"},
    {"field_id": "fx_rate_to_hkd", "kind": "deal_param"},
]

NARRATIVE_TOPICS: list[str] = [
    "industry_position",
    "business_model",
    "rd_substance",
    "technology_leadership",
    "customer_concentration",
    "supplier_concentration",
    "connected_transactions",
    "competing_business",
    "governance_independence",
    "internal_controls",
    "equity_wvr_structure",
    "risk_factors",
]


def field_ids_quantifiable() -> list[str]:
    return [f["field_id"] for f in QUANTIFIABLE_FIELDS]


def field_ids_deal_params() -> list[str]:
    return [f["field_id"] for f in DEAL_PARAM_FIELDS]

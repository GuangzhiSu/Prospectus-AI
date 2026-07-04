"""
Issuer metadata layer: conditional chapters and mandatory warnings derive from these flags.
Edit ../issuer_metadata.json (or pass --issuer-metadata) before running Agent2.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

METADATA_FIELDS: tuple[str, ...] = (
    "is_wr",
    "is_18c",
    "is_precommercial",
    "has_vie",
    "is_prc_issue",
    "uses_fini_eapp",
    "has_cornerstone",
    "has_overallotment",
    "needs_how_to_apply",
    "has_downward_offer_price_adjustment",
    "has_offer_size_adjustment_option",
    "has_major_litigation",
    "is_loss_making",
    "has_net_liabilities",
    "has_negative_operating_cash_flow",
)

# Issuer business-model classification (spec §39.3). Drives issuer-type
# conditional drafting rules in section requirements.
ISSUER_TYPES: tuple[str, ...] = (
    "AI_foundation_model",
    "AI_software",
    "gaming_IP",
    "SaaS",
    "biotech",
    "manufacturing",
    "other",
)


def default_metadata() -> dict[str, Any]:
    out: dict[str, Any] = {k: False for k in METADATA_FIELDS}
    out["issuer_type"] = "other"
    return out


def load_issuer_metadata(path: Path | None) -> dict[str, Any]:
    """Load issuer metadata JSON; missing file -> all False / issuer_type 'other'."""
    if path is None or not path.exists():
        return default_metadata()
    with open(path, encoding="utf-8") as f:
        raw: Any = json.load(f)
    if not isinstance(raw, dict):
        return default_metadata()
    out = default_metadata()
    for k in METADATA_FIELDS:
        if k in raw:
            out[k] = bool(raw[k])
    issuer_type = str(raw.get("issuer_type", "other")).strip()
    out["issuer_type"] = issuer_type if issuer_type in ISSUER_TYPES else "other"
    return out


def format_metadata_for_prompt(meta: dict[str, Any]) -> str:
    lines = [
        "ISSUER METADATA (authoritative — derive conditional sections and mandatory warnings only from these flags):",
        f"  - issuer_type: {meta.get('issuer_type', 'other')}",
    ]
    for k in METADATA_FIELDS:
        lines.append(f"  - {k}: {meta.get(k, False)}")
    return "\n".join(lines)


def mandatory_warning_snippet_ids(meta: dict[str, Any]) -> list[str]:
    """Which locked snippet IDs must appear in the prospectus (by reference or full text)."""
    base = [
        "rule_11_20_disclaimer",
        "reliance_only",
        "website_not_part",
        "territorial_restrictions",
    ]
    if meta.get("is_wr"):
        base.append("wvr_warning")
    if meta.get("is_18c"):
        base.append("chapter_18c_warning")
    if meta.get("is_precommercial"):
        base.append("pre_commercial_warning")
    if meta.get("has_vie"):
        base.append("vie_structural_risk_note")
    return base


_ISSUER_TYPE_EMPHASIS: dict[str, str] = {
    "AI_foundation_model": (
        "AI foundation model issuer: Summary/Business must cover model suite and modalities, "
        "product/model timeline, AI-native products and Open Platform, user/paying-user metrics, "
        "R&D team and expenses, compute/inference efficiency where material; Risk Factors must "
        "cover model performance deterioration, technology evolution, training data/IP "
        "infringement, generated content liability, compute cost, data privacy, AI regulation and "
        "commercialization uncertainty; Regulatory Overview must cover generative AI filing, "
        "algorithm recommendation, deep synthesis, AIGC labeling, cybersecurity review, data "
        "export and personal information protection where evidenced."
    ),
    "AI_software": (
        "AI software / computer vision issuer: Summary/Business must cover AI infrastructure, "
        "commercialized model count, computing capacity, vertical software platforms, customer "
        "verticals and customer count; include non-IFRS adjusted losses and business "
        "sustainability discussion if loss-making."
    ),
    "gaming_IP": (
        "Gaming / IP issuer: Summary/Business must cover licensed and proprietary IPs, launched/"
        "operated games and pipeline, gross billings, MAU, MPU, ARPPU and paying conversion "
        "rate, revenue-sharing fund flow, goodwill/intangibles if material; Risk Factors must "
        "cover IP licensing, game approvals/publication numbers, player retention, monetization, "
        "game lifecycle, channel dependence, virtual currency regulation and minors protection; "
        "Glossary must define gaming operating metrics before use."
    ),
    "SaaS": (
        "SaaS / enterprise software issuer: emphasise subscription/recurring revenue model, "
        "retention and expansion metrics, customer concentration and contract terms; define "
        "operating metrics in Glossary before use."
    ),
    "biotech": (
        "Biotech / healthcare issuer: emphasise pipeline stage disclosure, regulatory approval "
        "pathway, R&D expenses and clinical milestones; align commercialization risk language "
        "across Summary, Business and Risk Factors."
    ),
    "manufacturing": (
        "Manufacturing / consumer issuer: emphasise production capacity and utilisation, supply "
        "chain and raw material dependence, customer/supplier concentration and quality control."
    ),
}


def conditional_section_emphasis(meta: dict[str, Any]) -> str:
    """Short prompt block: which sections need extra disclosure emphasis."""
    parts: list[str] = []
    issuer_type = str(meta.get("issuer_type", "other"))
    if issuer_type in _ISSUER_TYPE_EMPHASIS:
        parts.append(_ISSUER_TYPE_EMPHASIS[issuer_type])
    if meta.get("has_vie"):
        parts.append(
            "VIE / contractual arrangements: ensure ContractualArrangements + cross-refs to Regulation and Risk Factors."
        )
    if meta.get("is_wr"):
        parts.append(
            "Weighted voting rights: disclose in Share Capital, Controlling Shareholders, Risk Factors as required."
        )
    if meta.get("is_18c") or meta.get("is_precommercial"):
        parts.append(
            "Chapter 18C / Pre-Commercial: align Business, Financial Information, Use of Proceeds, and Risk Factors."
        )
    if meta.get("needs_how_to_apply"):
        parts.append(
            "How to Apply: GlobalOfferingStructure and ExpectedTimetable MUST cross-reference application procedures; blocker if missing."
        )
    if meta.get("has_cornerstone") or meta.get("has_overallotment"):
        parts.append(
            "Offering mechanics: cornerstone and/or over-allotment — Structure of the Global Offering and Underwriting must reconcile."
        )
    if meta.get("is_prc_issue"):
        parts.append(
            "PRC issuer: ensure regulatory, tax, and foreign exchange disclosures are scoped to supported evidence."
        )
    if meta.get("has_downward_offer_price_adjustment"):
        parts.append(
            "Downward Offer Price Adjustment: Cover must state maximum Offer Price, bottom of the "
            "indicative range and lowest adjusted price; Expected Timetable must include the "
            "reduction announcement; cross-reference Structure of Global Offering and How to Apply."
        )
    if meta.get("has_offer_size_adjustment_option"):
        parts.append(
            "Offer Size Adjustment Option: disclose in Cover, Structure of the Global Offering and "
            "Use of Proceeds; reconcile maximum additional shares and proceeds impact."
        )
    if meta.get("has_major_litigation"):
        parts.append(
            "Major litigation/regulatory events: summarize claim, exposure, management view in "
            "Summary and Business with Risk Factors cross-reference."
        )
    if (
        meta.get("is_loss_making")
        or meta.get("has_net_liabilities")
        or meta.get("has_negative_operating_cash_flow")
        or meta.get("is_precommercial")
    ):
        parts.append(
            "Business sustainability: loss-making / net liabilities / negative operating cash "
            "flow / pre-commercial status triggers a sustainability discussion in Summary and "
            "Financial Information, with going-concern and funding-reliance risk factors."
        )
    if not parts:
        return "No additional regime-specific emphasis beyond standard Exchange working-draft controls."
    return "\n".join(parts)


def save_example(path: Path) -> None:
    example = default_metadata()
    example["needs_how_to_apply"] = True
    path.write_text(json.dumps(example, indent=2) + "\n", encoding="utf-8")

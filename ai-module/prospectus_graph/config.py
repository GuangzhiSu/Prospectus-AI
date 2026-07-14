from __future__ import annotations

import json
from pathlib import Path

# -----------------------------------------------------------------------------
# Section taxonomy (prospectus structure; agent1 chunks A–H are mapped to these)
# 1) Front matter  2) Risk & compliance  3) Parties & corporate  4) Industry & business
# 5) Governance & related parties  6) Capital & financials  7) Offering mechanics
# -----------------------------------------------------------------------------
SECTIONS = [
    # 1) Front matter
    ("ExpectedTimetable", "Expected Timetable"),
    ("Contents", "Contents"),
    ("Summary", "Summary"),
    ("Definitions", "Definitions"),
    ("Glossary", "Glossary of Technical Terms"),
    ("ForwardLooking", "Forward-Looking Statements"),
    # 2) Risk & compliance
    ("RiskFactors", "Risk Factors"),
    ("Waivers", "Waivers from Strict Compliance with Listing Rules (Waivers and Exemptions)"),
    ("InfoProspectus", "Information about this Prospectus and the Global Offering"),
    # 3) Parties & corporate info
    ("DirectorsParties", "Directors and Parties Involved in the Global Offering"),
    ("CorporateInfo", "Corporate Information"),
    # 4) Industry & business
    ("Regulation", "Regulation (Regulatory Overview)"),
    ("IndustryOverview", "Industry Overview"),
    ("HistoryReorg", "History, Reorganization, and Corporate Structure"),
    ("Business", "Business"),
    ("ContractualArrangements", "Contractual Arrangements (Variable Interest Entities)"),
    # 5) Governance & related parties
    ("ControllingShareholders", "Relationship with Our Controlling Shareholders"),
    ("ConnectedTransactions", "Connected Transactions"),
    ("DirectorsSeniorMgmt", "Directors and Senior Management"),
    ("SubstantialShareholders", "Substantial Shareholders"),
    # 6) Capital & financials
    ("ShareCapital", "Share Capital"),
    ("FinancialInfo", "Financial Information"),
    # 7) Offering mechanics
    ("UseOfProceeds", "Future Plans and Use of Proceeds"),
    ("Underwriting", "Underwriting"),
    ("GlobalOfferingStructure", "Structure of the Global Offering"),
]

# Schema-aware fact retrieval: section_id -> required fact field prefixes (from JSON)
# When set, retriever MUST include facts from these schemas; not random chunk selection.
SECTION_FACT_SCHEMA: dict[str, list[str]] = {
    "Summary": [
        "financials.income_statement",
        "operating_metrics",
        "industry_market",
        "business_products",
        "customers_suppliers",
        "rd_ip",
        "company_profile",
        "company_legal_entity",
        "offering_use_of_proceeds",
    ],
    "Business": [
        "company_legal_entity",
        "business_products",
        "products_and_technology",
        "customers_suppliers",
        "rd_ip",
        "customers",
        "industry_market",
        "regulatory_legal",
    ],
    "FinancialInfo": [
        "financials",
        "operating_metrics",
        "business_products.revenue",
        "customers_suppliers",
    ],
    "IndustryOverview": [
        "industry_market",
        "market",
        "competition",
    ],
    "RiskFactors": [
        "risk_seeds",
        "risk_related_data",
        "financials",
        "business_products",
        "regulatory_legal",
        "offering_use_of_proceeds",
        "company_legal_entity.share_classes",
        "company_legal_entity.dwvr",
    ],
    "ShareCapital": [
        "shareholders",
        "company_legal_entity.share_capital",
        "offering_use_of_proceeds.share_capital",
    ],
    "UseOfProceeds": [
        "offering_use_of_proceeds.use_of_proceeds",
        "ipo_offering.use_of_proceeds",
        "offering_use_of_proceeds.offer",
        "offering_use_of_proceeds.underwriting",
    ],
    "Regulation": [
        "regulatory_legal",
        "rd_ip.data_security_privacy",
        "business_products",
    ],
    "HistoryReorg": [
        "company_legal_entity",
    ],
    "ContractualArrangements": [
        "company_legal_entity",
        "regulatory_legal",
    ],
    "ConnectedTransactions": [
        "related_party_transactions",
    ],
    "DirectorsSeniorMgmt": [
        "management_governance",
    ],
    "ControllingShareholders": [
        "management_governance",
        "company_legal_entity",
    ],
    "SubstantialShareholders": [
        "management_governance.shareholders",
        "company_legal_entity.shareholders",
    ],
    "Underwriting": [
        "offering_use_of_proceeds",
    ],
    "GlobalOfferingStructure": [
        "offering_use_of_proceeds",
    ],
}

# Text-topic routing mirrors the fact schema but can be narrower where identity
# facts are enough and narrative should prioritise operating materials.
SECTION_TEXT_SCHEMA: dict[str, list[str]] = {
    **SECTION_FACT_SCHEMA,
    "Business": [
        "business_products",
        "customers_suppliers",
        "rd_ip",
        "industry_market.competitive_landscape",
        "regulatory_legal",
    ],
    "Summary": [
        "business_products",
        "industry_market",
        "financials",
        "risk_seeds",
        "offering_use_of_proceeds",
    ],
    "FinancialInfo": [
        "financials",
        "business_products.business_model",
        "business_products.business_sustainability_drivers",
        "customers_suppliers",
    ],
}

# Map agent2 section_id -> agent1 section_ids (fallback when no schema)
SECTION_TO_AGENT1_IDS: dict[str, list[str]] = {
    "ExpectedTimetable": ["H", "E"],
    "Contents": ["A", "B", "C", "D", "E", "F", "G", "H"],
    "Summary": ["A", "B", "D", "E", "F"],
    "Definitions": ["A", "B", "C", "D", "E", "F", "G", "H"],
    "Glossary": ["A", "B"],
    "ForwardLooking": ["A", "B", "C", "D"],
    "RiskFactors": ["C"],
    "Waivers": ["G"],
    "InfoProspectus": ["H", "E"],
    "DirectorsParties": ["F", "H"],
    "CorporateInfo": ["A", "F", "G"],
    "Regulation": ["B", "G"],
    "IndustryOverview": ["B"],
    "HistoryReorg": ["A", "F"],
    "Business": ["A", "B"],
    "ContractualArrangements": ["A", "G"],
    "ControllingShareholders": ["F"],
    "ConnectedTransactions": ["F", "G"],
    "DirectorsSeniorMgmt": ["F"],
    "SubstantialShareholders": ["F", "E"],
    "ShareCapital": ["E"],
    "FinancialInfo": ["D"],
    "UseOfProceeds": ["E"],
    "Underwriting": ["H"],
    "GlobalOfferingStructure": ["H", "E"],
}

DEFAULT_MAX_CONTEXT_CHARS = 15000
DEFAULT_MODEL = "Qwen/Qwen3.5-4B"


def load_section_requirements(requirements_path: Path) -> dict[str, dict]:
    """Load section requirements from JSON."""
    if not requirements_path.exists():
        import logging

        logging.getLogger(__name__).warning(
            "Section requirements file not found: %s", requirements_path
        )
        return {}
    with open(requirements_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not data:
        import logging

        logging.getLogger(__name__).warning(
            "Section requirements file is empty: %s", requirements_path
        )
    return data

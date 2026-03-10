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

# Map agent2 section_id -> agent1 section_ids
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
DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct"


def load_section_requirements(requirements_path: Path) -> dict[str, dict]:
    """Load section requirements from JSON."""
    if not requirements_path.exists():
        return {}
    with open(requirements_path, "r", encoding="utf-8") as f:
        return json.load(f)

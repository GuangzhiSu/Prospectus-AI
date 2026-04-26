"""
Seed loader: build the initial canonical graph with top-level HKEX-style sections only.

Subsections, functions, patterns, and mined edges can be added in later phases.
"""

from __future__ import annotations

from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.models.nodes import SectionNode

# Canonical SectionType ids (stable slugs) in typical TOC order for HK tech IPO prospectuses.
CANONICAL_SECTION_SPECS: list[tuple[str, str, bool, int]] = [
    # (id, human-readable canonical_name, mandatory, typical_order_index)
    ("Cover", "Cover", True, 0),
    ("Important_Notice", "Important", True, 1),
    ("Expected_Timetable", "Expected Timetable", True, 2),
    ("Contents", "Contents", True, 3),
    ("Summary", "Summary", True, 4),
    ("Definitions", "Definitions", True, 5),
    ("Glossary_of_Technical_Terms", "Glossary of Technical Terms", True, 6),
    ("Forward_Looking_Statements", "Forward-Looking Statements", True, 7),
    ("Risk_Factors", "Risk Factors", True, 8),
    ("Waivers_and_Exemptions", "Waivers from Strict Compliance with Listing Rules (Waivers and Exemptions)", True, 9),
    ("Prospectus_and_Global_Offering_Information", "Information about this Prospectus and the Global Offering", True, 10),
    ("Parties_Involved_in_the_Global_Offering", "Directors and Parties Involved in the Global Offering", True, 11),
    ("Corporate_Information", "Corporate Information", True, 12),
    ("Regulatory_Overview", "Regulation (Regulatory Overview)", True, 13),
    ("Industry_Overview", "Industry Overview", True, 14),
    ("History_Reorganization_Corporate_Structure", "History, Reorganization, and Corporate Structure", True, 15),
    ("Business", "Business", True, 16),
    ("Contractual_Arrangements_VIE", "Contractual Arrangements (Variable Interest Entities)", False, 17),
    ("Relationship_with_Controlling_Shareholders", "Relationship with Our Controlling Shareholders", True, 18),
    ("Connected_Transactions", "Connected Transactions", True, 19),
    ("Directors_and_Senior_Management", "Directors and Senior Management", True, 20),
    ("Substantial_Shareholders", "Substantial Shareholders", True, 21),
    ("Share_Capital", "Share Capital", True, 22),
    ("Financial_Information", "Financial Information", True, 23),
    ("Future_Plans_and_Use_of_Proceeds", "Future Plans and Use of Proceeds", True, 24),
    ("Cornerstone_Investors", "Cornerstone Investors", False, 25),
    ("Underwriting", "Underwriting", True, 26),
    ("Structure_of_the_Global_Offering", "Structure of the Global Offering", True, 27),
    ("How_to_Apply_for_Hong_Kong_Offer_Shares", "How to Apply for Hong Kong Offer Shares", True, 28),
    ("Appendices", "Appendices", True, 29),
    ("Back_Cover", "Back Cover", True, 30),
]


def seed_canonical_sections(manager: GraphManager | None = None) -> GraphManager:
    """
    Populate ``manager`` with one :class:`SectionNode` per canonical section.

    If ``manager`` is None, a new :class:`GraphManager` is created.
    """
    mgr = manager if manager is not None else GraphManager()
    for sid, cname, mandatory, order in CANONICAL_SECTION_SPECS:
        node = SectionNode(
            id=sid,
            canonical_name=cname,
            mandatory=mandatory,
            typical_order_index=order,
            aliases=[],
            description=f"Canonical section: {cname}",
        )
        mgr.add_node(node)
    return mgr

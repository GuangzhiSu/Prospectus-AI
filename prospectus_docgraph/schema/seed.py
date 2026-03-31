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
    ("Expected_Timetable", "Expected Timetable", True, 0),
    ("Contents", "Contents", True, 1),
    ("Summary", "Summary", True, 2),
    ("Definitions", "Definitions", True, 3),
    ("Glossary_of_Technical_Terms", "Glossary of Technical Terms", True, 4),
    ("Forward_Looking_Statements", "Forward-Looking Statements", True, 5),
    ("Risk_Factors", "Risk Factors", True, 6),
    ("Waivers_and_Exemptions", "Waivers from Strict Compliance with Listing Rules (Waivers and Exemptions)", True, 7),
    ("Prospectus_and_Global_Offering_Information", "Information about this Prospectus and the Global Offering", True, 8),
    ("Parties_Involved_in_the_Global_Offering", "Directors and Parties Involved in the Global Offering", True, 9),
    ("Corporate_Information", "Corporate Information", True, 10),
    ("Regulatory_Overview", "Regulation (Regulatory Overview)", True, 11),
    ("Industry_Overview", "Industry Overview", True, 12),
    ("History_Reorganization_Corporate_Structure", "History, Reorganization, and Corporate Structure", True, 13),
    ("Business", "Business", True, 14),
    ("Contractual_Arrangements_VIE", "Contractual Arrangements (Variable Interest Entities)", False, 15),
    ("Relationship_with_Controlling_Shareholders", "Relationship with Our Controlling Shareholders", True, 16),
    ("Connected_Transactions", "Connected Transactions", True, 17),
    ("Directors_and_Senior_Management", "Directors and Senior Management", True, 18),
    ("Substantial_Shareholders", "Substantial Shareholders", True, 19),
    ("Share_Capital", "Share Capital", True, 20),
    ("Financial_Information", "Financial Information", True, 21),
    ("Future_Plans_and_Use_of_Proceeds", "Future Plans and Use of Proceeds", True, 22),
    ("Underwriting", "Underwriting", True, 23),
    ("Structure_of_the_Global_Offering", "Structure of the Global Offering", True, 24),
    ("How_to_Apply_for_Hong_Kong_Offer_Shares", "How to Apply for Hong Kong Offer Shares", True, 25),
    ("Appendices", "Appendices", True, 26),
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

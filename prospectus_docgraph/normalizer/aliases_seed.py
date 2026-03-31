"""
Default alias strings -> canonical **section** ids (underscore slugs).

Expand via :meth:`TitleNormalizer.register_alias`.
"""

from __future__ import annotations

# alias_lower -> canonical_section_id
DEFAULT_SECTION_ALIASES: dict[str, str] = {
    # User examples + common HK prospectus variants
    "our business": "Business",
    "the business": "Business",
    "business": "Business",
    "history and development": "History_Reorganization_Corporate_Structure",
    "history, reorganization and corporate structure": "History_Reorganization_Corporate_Structure",
    "history reorganization and corporate structure": "History_Reorganization_Corporate_Structure",
    "operating and financial review": "Financial_Information",
    "financial information": "Financial_Information",
    "use of proceeds": "Future_Plans_and_Use_of_Proceeds",
    "future plans and use of proceeds": "Future_Plans_and_Use_of_Proceeds",
    "global offering": "Structure_of_the_Global_Offering",
    "structure of the global offering": "Structure_of_the_Global_Offering",
    "regulations": "Regulatory_Overview",
    "regulation": "Regulatory_Overview",
    "regulatory overview": "Regulatory_Overview",
    "industry": "Industry_Overview",
    "industry overview": "Industry_Overview",
    "risk factors": "Risk_Factors",
    "principal risks": "Risk_Factors",
    "summary": "Summary",
    "definitions": "Definitions",
    "glossary": "Glossary_of_Technical_Terms",
    "glossary of technical terms": "Glossary_of_Technical_Terms",
    "forward-looking statements": "Forward_Looking_Statements",
    "waivers": "Waivers_and_Exemptions",
    "waivers from strict compliance with listing rules": "Waivers_and_Exemptions",
    "waivers from strict compliance with listing rules (waivers and exemptions)": "Waivers_and_Exemptions",
    "underwriting": "Underwriting",
    "connected transactions": "Connected_Transactions",
    "substantial shareholders": "Substantial_Shareholders",
    "share capital": "Share_Capital",
    "how to apply for hong kong offer shares": "How_to_Apply_for_Hong_Kong_Offer_Shares",
    "how to apply": "How_to_Apply_for_Hong_Kong_Offer_Shares",
    "appendices": "Appendices",
    "expected timetable": "Expected_Timetable",
    "contents": "Contents",
}

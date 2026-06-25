"""Crosswalk loader: map Agent2 section ids ↔ Schema B (per-section) keys ↔
Schema A gating documents / deliverables.

Used by ``agent2.py`` to inject gating-doc context into the writer prompt and
to raise ``[[AI: DD evidence needed]]`` placeholders when the crosswalk-linked
field has no value in ``prospectus_kg_output/inputs/records/<doc>.json``.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


AGENT2_TO_SCHEMA_B: dict[str, str] = {
    "ExpectedTimetable": "Expected_Timetable",
    "Contents": "Contents",
    "Summary": "Summary",
    "Definitions": "Definitions",
    "Glossary": "Glossary_of_Technical_Terms",
    "ForwardLooking": "Forward_Looking_Statements",
    "RiskFactors": "Risk_Factors",
    "Waivers": "Waivers_and_Exemptions",
    "InfoProspectus": "Prospectus_and_Global_Offering_Information",
    "DirectorsParties": "Parties_Involved_in_the_Global_Offering",
    "CorporateInfo": "Corporate_Information",
    "Regulation": "Regulatory_Overview",
    "IndustryOverview": "Industry_Overview",
    "HistoryReorg": "History_Reorganization_Corporate_Structure",
    "Business": "Business",
    "ContractualArrangements": "Contractual_Arrangements_VIE",
    "ControllingShareholders": "Relationship_with_Controlling_Shareholders",
    "ConnectedTransactions": "Connected_Transactions",
    "DirectorsSeniorMgmt": "Directors_and_Senior_Management",
    "SubstantialShareholders": "Substantial_Shareholders",
    "ShareCapital": "Share_Capital",
    "FinancialInfo": "Financial_Information",
    "UseOfProceeds": "Future_Plans_and_Use_of_Proceeds",
    "Underwriting": "Underwriting",
    "GlobalOfferingStructure": "Structure_of_the_Global_Offering",
}


_DEFAULT_CROSSWALK_PATH = (
    Path(__file__).resolve().parents[1]
    / "prospectus_kg_output"
    / "inputs"
    / "input_schema_crosswalk.json"
)
_DEFAULT_SCHEMA_A_PATH = (
    Path(__file__).resolve().parents[1]
    / "prospectus_kg_output"
    / "inputs"
    / "input_schema.json"
)


@lru_cache(maxsize=4)
def _load_json(path: str) -> dict[str, Any]:
    p = Path(path)
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


@lru_cache(maxsize=4)
def _build_field_index(schema_path: str) -> dict[str, dict[str, Any]]:
    """Return {field_id: field_dict} across every (sub-)category in Schema A."""
    data = _load_json(schema_path)
    out: dict[str, dict[str, Any]] = {}

    def _walk(cat: dict[str, Any]) -> None:
        for f in cat.get("fields") or []:
            fid = f.get("field_id")
            if fid:
                out[fid] = f
        for sub in cat.get("sub_categories") or []:
            _walk(sub)

    for cat in data.get("categories") or []:
        _walk(cat)
    return out


def schema_b_key(section_id: str) -> str | None:
    """Return the Schema B canonical key for an Agent2 section id."""
    return AGENT2_TO_SCHEMA_B.get(section_id)


def gating_docs_for_section(
    section_id: str,
    crosswalk_path: Path | None = None,
    schema_path: Path | None = None,
) -> dict[str, Any]:
    """Return {gating_documents: [...], deliverables: [...], report_anchor: str}
    resolved from the crosswalk, with ``name_en`` / ``description`` / ``field_id``
    hydrated from Schema A.

    Returns an empty dict when the section is unknown or the crosswalk files
    are missing.
    """
    b_key = schema_b_key(section_id)
    if not b_key:
        return {}
    cw = _load_json(str(crosswalk_path or _DEFAULT_CROSSWALK_PATH))
    section_entry = (cw.get("sections") or {}).get(b_key) or {}
    if not section_entry:
        return {}
    field_index = _build_field_index(str(schema_path or _DEFAULT_SCHEMA_A_PATH))

    def _resolve(ids: list[str]) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for fid in ids:
            entry = field_index.get(fid)
            if not entry:
                out.append({"field_id": fid, "field_name": fid, "description": ""})
            else:
                out.append(
                    {
                        "field_id": fid,
                        "field_name": entry.get("field_name") or fid,
                        "description": entry.get("description") or "",
                        "report_anchor": entry.get("report_anchor") or "",
                        "evidence_source": entry.get("evidence_source") or "",
                    }
                )
        return out

    return {
        "schema_b_key": b_key,
        "report_anchor": section_entry.get("report_anchor") or "",
        "gating_documents": _resolve(section_entry.get("gating_documents") or []),
        "deliverables": _resolve(section_entry.get("deliverables") or []),
    }


def format_gating_block(section_id: str) -> str:
    """Render the gating-doc context for the Agent2 writer prompt.

    Returns an empty string when no crosswalk entry exists; otherwise a block
    containing (a) gating documents, (b) deliverables, and (c) the required
    AI-tag convention the writer must use when the evidence is absent.
    """
    info = gating_docs_for_section(section_id)
    if not info:
        return ""

    lines: list[str] = [
        "REPORT-DRIVEN GATING DOCUMENTS (from IPO_Input_Report §5):",
        f"Anchor: {info.get('report_anchor') or 'n/a'}",
    ]
    if info.get("gating_documents"):
        lines.append("Gating documents (must exist in VDR before this section can be drafted):")
        for entry in info["gating_documents"]:
            lines.append(
                f"  - {entry['field_id']} — {entry['field_name']}: {entry['description']}".rstrip()
            )
    if info.get("deliverables"):
        lines.append("Professional-party deliverables supporting this section:")
        for entry in info["deliverables"]:
            lines.append(
                f"  - {entry['field_id']} — {entry['field_name']}: {entry['description']}".rstrip()
            )

    lines.extend(
        [
            "",
            "DD evidence policy:",
            "- When an assertion depends on one of the gating documents above and the "
            "provided context is silent, raise a tag of the form:",
            "    [[AI: DD evidence needed — <gating_doc_field_id>]]",
            "  in place of the disputed clause. Do NOT fabricate the content of the gating doc.",
            "- When a gating doc IS reflected in the context, cite it verbatim via the normal",
            "  [[AI:CITE|source=...]] machinery and do not raise the DD tag.",
        ]
    )
    return "\n".join(lines)


__all__ = [
    "AGENT2_TO_SCHEMA_B",
    "schema_b_key",
    "gating_docs_for_section",
    "format_gating_block",
]

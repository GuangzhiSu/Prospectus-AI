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
)


def default_metadata() -> dict[str, bool]:
    return {k: False for k in METADATA_FIELDS}


def load_issuer_metadata(path: Path | None) -> dict[str, bool]:
    """Load issuer metadata JSON; missing file -> all False."""
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
    return out


def format_metadata_for_prompt(meta: dict[str, bool]) -> str:
    lines = [
        "ISSUER METADATA (authoritative — derive conditional sections and mandatory warnings only from these flags):",
    ]
    for k in METADATA_FIELDS:
        lines.append(f"  - {k}: {meta.get(k, False)}")
    return "\n".join(lines)


def mandatory_warning_snippet_ids(meta: dict[str, bool]) -> list[str]:
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


def conditional_section_emphasis(meta: dict[str, bool]) -> str:
    """Short prompt block: which sections need extra disclosure emphasis."""
    parts: list[str] = []
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
    if not parts:
        return "No additional regime-specific emphasis beyond standard HKEX working-draft controls."
    return "\n".join(parts)


def save_example(path: Path) -> None:
    example = {k: False for k in METADATA_FIELDS}
    example["needs_how_to_apply"] = True
    path.write_text(json.dumps(example, indent=2) + "\n", encoding="utf-8")

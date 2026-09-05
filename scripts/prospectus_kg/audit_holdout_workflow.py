#!/usr/bin/env python3
"""Model-free readiness audit for 12 isolated holdout workflow cases.

This does not pretend to be a Writer-quality score. It verifies the part of the
workflow that can be proven without an API key: stable company isolation,
contract coverage, complete numeric/date atom capture, unit routing and bounded
Developer Tools evidence parts. A real generated draft is still evaluated by
the same deterministic metrics in ``/rca/evaluate``.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "frontend" / "web" / "devtools-data" / "index.json"
INPUTS = ROOT / "prospectus_kg_output" / "inputs" / "input_records"
SECTIONS = ROOT / "prospectus_kg_output" / "sections_toc"
CONTRACTS = ROOT / "ai-module" / "prompts" / "sections" / "execution_contracts.json"

FAMILIES = (
    "Cover",
    "Summary",
    "Risk_Factors",
    "Industry_Overview",
    "Business",
    "Financial_Information",
    "Regulatory_Overview",
    "History_Reorganization_Corporate_Structure",
    "Connected_Transactions",
    "Share_Capital",
    "Underwriting",
    "Appendices",
)

NUMBER_RE = re.compile(
    r"(?<![A-Za-z])(?:HK\$|RMB|US\$|USD|HKD)?\s*"
    r"(?:\(?-?\d[\d,]*(?:\.\d+)?\)?%?|20\d{2})(?![A-Za-z])",
    re.I,
)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def numeric_tokens(value: Any) -> set[str]:
    if isinstance(value, str):
        text = value
    elif isinstance(value, list):
        # Preserve adjacent table rows such as ``US$`` then ``12,533``.  JSON
        # punctuation between rows would create a false extraction miss.
        text = "\n".join(str(item or "") for item in value)
    else:
        text = json.dumps(value, ensure_ascii=False)
    tokens: set[str] = set()
    for match in NUMBER_RE.finditer(text):
        token = re.sub(r"\s+", "", match.group(0).casefold()).replace(",", "")
        tokens.add(token)
        without_currency = re.sub(r"^(?:hk\$|rmb|us\$|usd|hkd)", "", token)
        if without_currency and without_currency != token:
            tokens.add(without_currency)
    return tokens


def section_reference(document_id: str, section_id: str) -> str:
    document = load_json(SECTIONS / f"{document_id}.json")
    for section in document.get("sections") or []:
        if section.get("canonical_section") == section_id:
            return re.sub(
                r"\s+[—–-]\s*\d+\s*[—–-]\s+",
                " ",
                str(section.get("text") or ""),
            )
    return ""


def value_present(entry: Any) -> bool:
    raw = entry.get("value") if isinstance(entry, dict) else entry
    return raw not in (None, "", [], {})


def not_applicable(entry: Any) -> bool:
    return isinstance(entry, dict) and (
        entry.get("applicable") is False
        or entry.get("evidence_status") == "not_applicable"
    )


def select_cases(index: dict[str, Any]) -> list[tuple[str, str]]:
    holdout = set(index.get("benchmarkSplit", {}).get("holdoutCompanyIds") or [])
    companies = [item for item in index.get("companies") or [] if item.get("id") in holdout]
    selected: list[tuple[str, str]] = []
    used: set[str] = set()
    for section_id in FAMILIES:
        match = next(
            (
                company
                for company in companies
                if company.get("id") not in used
                and any(
                    section.get("id") == section_id and section.get("rcaReady")
                    for section in company.get("sections") or []
                )
            ),
            None,
        )
        if match is None:
            raise RuntimeError(f"No isolated holdout case is available for {section_id}.")
        document_id = str(match["id"])
        used.add(document_id)
        selected.append((document_id, section_id))
    return selected


def audit_case(
    document_id: str,
    section_id: str,
    contracts_by_section: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    prepared = load_json(INPUTS / document_id / f"{section_id}.json")
    contract = contracts_by_section[section_id]
    values = prepared.get("contract_values") or {}
    applicable = [entry for entry in values.values() if not not_applicable(entry)]
    populated = [entry for entry in applicable if value_present(entry)]
    atoms = prepared.get("evidence_atoms") or []
    reference_numbers = numeric_tokens(section_reference(document_id, section_id))
    atom_numbers = numeric_tokens([atom.get("value") for atom in atoms])
    numeric_capture = (
        round(100 * len(reference_numbers & atom_numbers) / len(reference_numbers), 1)
        if reference_numbers
        else 100.0
    )
    atom_by_id = {str(atom.get("id")): atom for atom in atoms}
    routed_ids: list[str] = []
    max_unit_characters = 0
    runtime_parts = 0
    for unit in prepared.get("section_units") or []:
        ids = [str(value) for value in unit.get("evidenceAtomIds") or []]
        routed_ids.extend(ids)
        size = sum(len(json.dumps(atom_by_id.get(atom_id, {}), ensure_ascii=False)) + 4 for atom_id in ids)
        max_unit_characters = max(max_unit_characters, size)
        runtime_parts += max(1, math.ceil(size / 45_000))
    routing_complete = len(routed_ids) == len(set(routed_ids)) == len(atoms)
    max_atom_characters = max(
        (len(str(atom.get("value") or "")) for atom in atoms), default=0
    )
    source_traceable = all(
        atom.get("source_file")
        and atom.get("page_start") is not None
        and atom.get("char_start") is not None
        and atom.get("char_end") is not None
        for atom in atoms
    )
    return {
        "companyId": document_id,
        "sectionId": section_id,
        "contractSourceHash": contract.get("sourceHash"),
        "inputFieldCoverage": round(100 * len(populated) / max(len(applicable), 1), 1),
        "numericAndDateAtomCapture": numeric_capture,
        "evidenceAtoms": len(atoms),
        "contractUnits": len(contract.get("units") or []),
        "runtimeParts": runtime_parts,
        "largestUnsplitUnitCharacters": max_unit_characters,
        "maximumEvidenceAtomCharacters": max_atom_characters,
        "allAtomsSourceTraceable": source_traceable,
        "routingComplete": routing_complete,
        "referenceExcludedFromPreparedData": "referenceText" not in prepared,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    index = load_json(INDEX)
    contracts_document = load_json(CONTRACTS)
    contracts_by_section = {
        str(contract["sectionId"]): contract
        for contract in contracts_document.get("contracts", {}).values()
    }
    cases = [
        audit_case(document_id, section_id, contracts_by_section)
        for document_id, section_id in select_cases(index)
    ]
    summary = {
        "caseCount": len(cases),
        "companyCount": len({case["companyId"] for case in cases}),
        "sectionFamilyCount": len({case["sectionId"] for case in cases}),
        "minimumInputFieldCoverage": min(case["inputFieldCoverage"] for case in cases),
        "minimumNumericAndDateAtomCapture": min(
            case["numericAndDateAtomCapture"] for case in cases
        ),
        "allEvidenceRoutedExactlyOnce": all(case["routingComplete"] for case in cases),
        "allAtomsSourceTraceable": all(case["allAtomsSourceTraceable"] for case in cases),
        "maximumEvidenceAtomCharacters": max(
            case["maximumEvidenceAtomCharacters"] for case in cases
        ),
        "referenceExcludedFromAllPreparedInputs": all(
            case["referenceExcludedFromPreparedData"] for case in cases
        ),
    }
    report = {
        "splitMethod": index.get("benchmarkSplit", {}).get("method"),
        "contractVersion": contracts_document.get("version"),
        "summary": summary,
        "cases": cases,
    }
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if (
        summary["caseCount"] != 12
        or summary["companyCount"] != 12
        or summary["sectionFamilyCount"] != 12
        or not summary["allEvidenceRoutedExactlyOnce"]
        or not summary["allAtomsSourceTraceable"]
        or summary["maximumEvidenceAtomCharacters"] > 900
        or not summary["referenceExcludedFromAllPreparedInputs"]
        or summary["minimumNumericAndDateAtomCapture"] < 99.9
    ):
        raise SystemExit(1)


if __name__ == "__main__":
    main()

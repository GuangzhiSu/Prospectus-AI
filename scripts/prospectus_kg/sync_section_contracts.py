#!/usr/bin/env python3
"""Synchronize section extraction schema and shared execution contracts.

The command is deterministic and model-free.  ``--check`` is suitable for CI
and fails when a generated artifact is stale or runtime prompt/extraction code
contains a real corpus issuer name.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
AI_MODULE = ROOT / "ai-module"
if str(AI_MODULE) not in sys.path:
    sys.path.insert(0, str(AI_MODULE))

from prospectus_graph.execution_contract import (  # noqa: E402
    compile_execution_contracts,
)


REQUIREMENTS_PATH = AI_MODULE / "prompts" / "sections" / "requirements.json"
CONTRACTS_PATH = AI_MODULE / "prompts" / "sections" / "execution_contracts.json"
SCHEMA_PATH = ROOT / "prospectus_kg_output" / "inputs" / "input_schema_sections.json"
DEVTOOLS_INDEX = ROOT / "frontend" / "web" / "devtools-data" / "index.json"

RUNTIME_TEXT_PATHS = (
    AI_MODULE / "prompts" / "agents",
    AI_MODULE / "prompts" / "core",
    ROOT / "scripts" / "prospectus_kg" / "stage3_extract_v2.py",
    ROOT / "scripts" / "prospectus_kg" / "enrich_input_records_from_sections.py",
    AI_MODULE / "agent1.py",
    AI_MODULE / "agent2.py",
    ROOT / "scripts" / "prospectus_kg",
)


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _schema_from_contracts(document: dict[str, Any]) -> dict[str, Any]:
    categories: list[dict[str, Any]] = []
    for contract in document["contracts"].values():
        fields = []
        for field in contract["fields"]:
            fields.append(
                {
                    "field_id": field["fieldId"],
                    "field_name": field["label"],
                    "type": "string_or_structured_value",
                    "description": field.get("description")
                    or "Required by the maintained SectionSpec.",
                    "aliases": field.get("aliases") or [],
                    "required": True,
                }
            )
        categories.append(
            {
                "category_id": f"section_{contract['sectionId']}",
                "category_name": contract["sectionName"],
                "maps_to_sections": [contract["sectionId"]],
                "function": (
                    "Generated from ai-module/prompts/sections/requirements.json; "
                    "do not edit this schema by hand."
                ),
                "fields": fields,
            }
        )
    categories.sort(key=lambda item: item["maps_to_sections"][0])
    return {
        "source": "ai-module/prompts/sections/requirements.json",
        "description": (
            "Generated per-section input schema. The maintained SectionSpec is the "
            "only source of required fields."
        ),
        "contract_version": document["version"],
        "contract_source_hash": document["sourceHash"],
        "categories": categories,
    }


def _serialized(value: dict[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=False) + "\n"


def _issuer_markers() -> list[str]:
    if not DEVTOOLS_INDEX.is_file():
        return []
    data = _load_json(DEVTOOLS_INDEX)
    markers: list[str] = []
    for company in data.get("companies") or []:
        name = str(company.get("name") or "").strip()
        document_id = str(company.get("id") or "").strip()
        lowered = name.casefold()
        if (
            len(name) >= 8
            and not lowered.startswith("issuer ")
            and not lowered.startswith(("a company ", "an exempted company "))
        ):
            markers.append(name)
        if len(document_id) >= 8:
            markers.append(document_id)
    return markers


def _runtime_text_files() -> list[Path]:
    files: list[Path] = [REQUIREMENTS_PATH]
    for candidate in RUNTIME_TEXT_PATHS:
        if candidate.is_file():
            files.append(candidate)
        elif candidate.is_dir():
            files.extend(sorted(candidate.rglob("*.txt")))
            files.extend(sorted(candidate.rglob("*.md")))
            files.extend(sorted(candidate.rglob("*.py")))
    return files


def _company_specific_occurrences() -> list[str]:
    markers = _issuer_markers()
    if not markers:
        return []
    findings: list[str] = []
    for path in _runtime_text_files():
        text = path.read_text(encoding="utf-8", errors="ignore")
        for marker in markers:
            if marker.casefold() in text.casefold():
                findings.append(f"{path.relative_to(ROOT)}: {marker}")
    return findings


def _embedded_examples(document: dict[str, Any]) -> list[str]:
    """Reject legacy sample values that can leak issuer-specific constants.

    SectionSpec is a field/structure contract.  Concrete values now come only
    from source-linked EvidenceAtoms, so maintaining example values here is
    both unnecessary and a source of cross-company overfitting.
    """

    findings: list[str] = []
    for section_id, requirement in document.items():
        for index, field in enumerate(
            requirement.get("kg_required_input_fields") or [], start=1
        ):
            if isinstance(field, dict) and "example" in field:
                label = field.get("field") or field.get("field_id") or index
                findings.append(f"{section_id}.{label}")
    return findings


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument(
        "--allow-company-examples",
        action="store_true",
        help="Temporarily skip the runtime company-name lint.",
    )
    args = parser.parse_args()

    requirements = _load_json(REQUIREMENTS_PATH)
    examples = _embedded_examples(requirements)
    if examples:
        preview = ", ".join(examples[:8])
        suffix = f" (and {len(examples) - 8} more)" if len(examples) > 8 else ""
        raise SystemExit(
            "SectionSpec must not contain concrete example values: "
            + preview
            + suffix
        )
    contracts = compile_execution_contracts(requirements)
    schema = _schema_from_contracts(contracts)
    expected = {
        CONTRACTS_PATH: _serialized(contracts),
        SCHEMA_PATH: _serialized(schema),
    }

    stale = []
    for path, content in expected.items():
        current = path.read_text(encoding="utf-8") if path.is_file() else ""
        if current != content:
            stale.append(str(path.relative_to(ROOT)))
            if not args.check:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding="utf-8")

    findings = [] if args.allow_company_examples else _company_specific_occurrences()
    if args.check and stale:
        raise SystemExit("Generated section contract artifacts are stale: " + ", ".join(stale))
    if findings:
        raise SystemExit(
            "Company-specific runtime examples are prohibited:\n- " + "\n- ".join(findings)
        )
    if not args.check:
        print(
            f"Synchronized {contracts['contractCount']} section contracts "
            f"({contracts['sourceHash'][:12]})."
        )


if __name__ == "__main__":
    main()

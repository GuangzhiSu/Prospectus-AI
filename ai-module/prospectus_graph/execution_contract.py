"""Versioned, model-independent execution contracts for prospectus sections.

The contract is deliberately compiled from ``requirements.json`` rather than
maintained as a second hand-written schema.  Both Agent2 and Developer Tools
consume the serialized form produced here, which prevents prompt requirements,
data extraction and evaluation from silently drifting apart.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from typing import Any, Iterable


CONTRACT_VERSION = "section-execution-contract/1.0"

# These sections cannot approach filed-prospectus completeness in a single
# writer call.  They are always planned and drafted as independent units.
LONG_SECTION_IDS = frozenset(
    {
        "Summary",
        "RiskFactors",
        "Regulation",
        "IndustryOverview",
        "HistoryReorg",
        "Business",
        "ContractualArrangements",
        "ConnectedTransactions",
        "DirectorsSeniorMgmt",
        "FinancialInfo",
        "Underwriting",
        "GlobalOfferingStructure",
        "HowToApply",
        "Appendices",
    }
)

_STOPWORDS = frozenset(
    {
        "a",
        "an",
        "and",
        "as",
        "at",
        "by",
        "for",
        "from",
        "if",
        "in",
        "into",
        "is",
        "of",
        "on",
        "or",
        "our",
        "the",
        "their",
        "to",
        "with",
    }
)


def normalize_identifier(value: str) -> str:
    """Return a stable comparison key for labels from different generations."""

    return re.sub(r"[^a-z0-9]+", "", str(value or "").casefold())


def slugify(value: str, fallback: str = "item") -> str:
    value = re.sub(r"[^a-z0-9]+", "_", str(value or "").casefold()).strip("_")
    return value[:96] or fallback


def _tokens(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", str(value or "").casefold())
        if len(token) > 1 and token not in _STOPWORDS
    }


def required_input_labels(requirement: dict[str, Any]) -> list[str]:
    """Return the maintained required inputs, with the KG fields as fallback."""

    configured = requirement.get("required_input_fields") or []
    if configured:
        return [str(item).strip() for item in configured if str(item).strip()]
    labels: list[str] = []
    for item in requirement.get("kg_required_input_fields") or []:
        if isinstance(item, dict):
            label = item.get("field") or item.get("field_id")
        else:
            label = item
        if label and str(label).strip():
            labels.append(str(label).strip())
    return labels


def _kg_field_metadata(requirement: dict[str, Any]) -> list[dict[str, Any]]:
    fields: list[dict[str, Any]] = []
    for item in requirement.get("kg_required_input_fields") or []:
        if isinstance(item, dict):
            label = item.get("field") or item.get("field_id")
            if label:
                fields.append(
                    {
                        "label": str(label).strip(),
                        "description": str(item.get("description") or "").strip(),
                    }
                )
        elif str(item).strip():
            fields.append({"label": str(item).strip(), "description": ""})
    return fields


def _field_aliases(label: str, kg_fields: list[dict[str, Any]]) -> list[str]:
    aliases = [label, slugify(label)]
    label_tokens = _tokens(label)
    scored: list[tuple[float, str]] = []
    for field in kg_fields:
        candidate = field["label"]
        candidate_tokens = _tokens(candidate + " " + field.get("description", ""))
        overlap = len(label_tokens & candidate_tokens)
        union = len(label_tokens | candidate_tokens) or 1
        if overlap:
            scored.append((overlap / union, candidate))
    for _, candidate in sorted(scored, reverse=True)[:3]:
        aliases.append(candidate)
    seen: set[str] = set()
    result: list[str] = []
    for alias in aliases:
        key = normalize_identifier(alias)
        if key and key not in seen:
            seen.add(key)
            result.append(alias)
    return result


def _outline(requirement: dict[str, Any]) -> list[str]:
    maintained = requirement.get("mandatory_subsections") or []
    if maintained:
        return [str(item).strip() for item in maintained if str(item).strip()]
    outline: list[str] = []
    for item in requirement.get("kg_typical_structure") or []:
        label = item.get("subsection") if isinstance(item, dict) else item
        if label and str(label).strip():
            outline.append(str(label).strip())
    return outline


def _unit_title(outline_item: str, index: int) -> str:
    title = re.sub(r"^\s*(?:\d+[.)]|[A-Z][.)])\s*", "", outline_item).strip()
    title = re.split(r"\s+[—–-]\s+|:\s+", title, maxsplit=1)[0].strip()
    return title[:140] or f"Unit {index}"


def _best_unit_index(label: str, units: list["SectionUnitPlan"]) -> int:
    field_tokens = _tokens(label)
    if not units:
        return 0
    scores: list[tuple[float, int]] = []
    for index, unit in enumerate(units):
        unit_tokens = _tokens(unit.title + " " + unit.instruction)
        overlap = len(field_tokens & unit_tokens)
        score = overlap / max(len(field_tokens), 1)
        scores.append((score, -index))
    score, neg_index = max(scores)
    return -neg_index if score > 0 else 0


@dataclass
class EvidenceField:
    field_id: str
    label: str
    aliases: list[str]
    required: bool = True
    description: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "fieldId": self.field_id,
            "label": self.label,
            "aliases": self.aliases,
            "required": self.required,
            "description": self.description,
        }


@dataclass
class SectionUnitPlan:
    unit_id: str
    order: int
    title: str
    instruction: str
    required_field_ids: list[str] = field(default_factory=list)
    table_requirements: list[str] = field(default_factory=list)
    target_characters: int = 5000

    def to_dict(self) -> dict[str, Any]:
        return {
            "unitId": self.unit_id,
            "order": self.order,
            "title": self.title,
            "instruction": self.instruction,
            "requiredFieldIds": self.required_field_ids,
            "tableRequirements": self.table_requirements,
            "targetCharacters": self.target_characters,
        }


@dataclass
class SectionExecutionContract:
    prompt_id: str
    section_id: str
    section_name: str
    generation_mode: str
    is_long_section: bool
    fields: list[EvidenceField]
    units: list[SectionUnitPlan]
    source_hash: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": CONTRACT_VERSION,
            "promptId": self.prompt_id,
            "sectionId": self.section_id,
            "sectionName": self.section_name,
            "generationMode": self.generation_mode,
            "isLongSection": self.is_long_section,
            "fields": [item.to_dict() for item in self.fields],
            "units": [item.to_dict() for item in self.units],
            "sourceHash": self.source_hash,
        }


def compile_section_contract(
    prompt_id: str, requirement: dict[str, Any]
) -> SectionExecutionContract:
    section_id = str(requirement.get("kg_section_id") or prompt_id)
    section_name = str(requirement.get("name") or section_id.replace("_", " "))
    mode = str(requirement.get("generation_mode") or "evidence_based_drafting")
    is_long = prompt_id in LONG_SECTION_IDS
    kg_fields = _kg_field_metadata(requirement)

    fields: list[EvidenceField] = []
    used_ids: set[str] = set()
    for index, label in enumerate(required_input_labels(requirement), start=1):
        base_id = f"{section_id}.{slugify(label, f'field_{index}')}"
        field_id = base_id
        suffix = 2
        while field_id in used_ids:
            field_id = f"{base_id}_{suffix}"
            suffix += 1
        used_ids.add(field_id)
        best_description = ""
        aliases = _field_aliases(label, kg_fields)
        for kg_field in kg_fields:
            if any(
                normalize_identifier(kg_field["label"])
                == normalize_identifier(alias)
                for alias in aliases
            ):
                best_description = kg_field.get("description", "")
                break
        fields.append(
            EvidenceField(
                field_id=field_id,
                label=label,
                aliases=aliases,
                description=best_description,
            )
        )

    outline = _outline(requirement)
    if not is_long:
        instruction = "\n".join(outline) if outline else section_name
        units = [
            SectionUnitPlan(
                unit_id=f"{section_id}:01",
                order=1,
                title=section_name,
                instruction=instruction,
                required_field_ids=[item.field_id for item in fields],
                table_requirements=[
                    str(item).strip()
                    for item in requirement.get("table_requirements") or []
                    if str(item).strip()
                ],
                target_characters=4500
                if mode == "controlled_template_fill"
                else 6500,
            )
        ]
    else:
        if not outline:
            outline = [section_name]
        units = [
            SectionUnitPlan(
                unit_id=f"{section_id}:{index:02d}",
                order=index,
                title=_unit_title(item, index),
                instruction=item,
                target_characters=(
                    9000
                    if mode == "professional_source_assembly_only"
                    else 7000
                    if mode in {"risk_narrative_drafting", "legal_checklist_drafting"}
                    else 6000
                ),
            )
            for index, item in enumerate(outline, start=1)
        ]
        for field_item in fields:
            units[_best_unit_index(field_item.label, units)].required_field_ids.append(
                field_item.field_id
            )
        for table in requirement.get("table_requirements") or []:
            table_text = str(table).strip()
            if table_text:
                units[_best_unit_index(table_text, units)].table_requirements.append(
                    table_text
                )

    fingerprint_payload = {
        "promptId": prompt_id,
        "sectionId": section_id,
        "generationMode": mode,
        "fields": [item.to_dict() for item in fields],
        "units": [item.to_dict() for item in units],
    }
    source_hash = hashlib.sha256(
        json.dumps(
            fingerprint_payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
        ).encode("utf-8")
    ).hexdigest()
    return SectionExecutionContract(
        prompt_id=prompt_id,
        section_id=section_id,
        section_name=section_name,
        generation_mode=mode,
        is_long_section=is_long,
        fields=fields,
        units=units,
        source_hash=source_hash,
    )


def compile_execution_contracts(
    requirements: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    contracts = {
        prompt_id: compile_section_contract(prompt_id, requirement).to_dict()
        for prompt_id, requirement in requirements.items()
    }
    document_hash = hashlib.sha256(
        json.dumps(
            contracts, ensure_ascii=False, sort_keys=True, separators=(",", ":")
        ).encode("utf-8")
    ).hexdigest()
    return {
        "version": CONTRACT_VERSION,
        "sourceHash": document_hash,
        "contractCount": len(contracts),
        "contracts": contracts,
    }


def contract_for_section(
    requirements: dict[str, dict[str, Any]], section_id: str
) -> SectionExecutionContract | None:
    for prompt_id, requirement in requirements.items():
        if prompt_id == section_id or requirement.get("kg_section_id") == section_id:
            return compile_section_contract(prompt_id, requirement)
    return None


def contract_field_ids(contracts: Iterable[SectionExecutionContract]) -> set[str]:
    return {field.field_id for contract in contracts for field in contract.fields}


__all__ = [
    "CONTRACT_VERSION",
    "LONG_SECTION_IDS",
    "EvidenceField",
    "SectionExecutionContract",
    "SectionUnitPlan",
    "compile_execution_contracts",
    "compile_section_contract",
    "contract_for_section",
    "normalize_identifier",
    "required_input_labels",
    "slugify",
]

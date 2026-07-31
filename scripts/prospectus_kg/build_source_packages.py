#!/usr/bin/env python3
"""Build realistic source-package manifests from reverse-engineered records.

Stage 3 extraction currently stores values by final prospectus section. Real IPO
work starts from a data room: term sheets, accountants' schedules, legal memos,
industry consultant reports, DD questionnaires, use-of-proceeds schedules, etc.

This script maps the section-level reverse-extracted values into that realistic
source-document layer. It is deterministic and can run over all 125 corpus
prospectuses without an LLM; when Stage 3 is later rerun with ChatGPT/OpenAI, the
same manifest automatically becomes more traceable because values carry spans
and likely_source_document metadata.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class SourceTemplate:
    source_document_kind: str
    display_name: str
    schema_a_field_id: str
    agent1_domain: str
    canonical_sections: tuple[str, ...]
    recommended_format: str


SOURCE_TEMPLATES: tuple[SourceTemplate, ...] = (
    SourceTemplate(
        "offering_term_sheet",
        "Offering structure and pricing term sheet",
        "gate.cover",
        "offering_use_of_proceeds",
        ("Cover", "Prospectus_and_Global_Offering_Information", "Structure_of_the_Global_Offering", "Underwriting"),
        "json",
    ),
    SourceTemplate(
        "expected_timetable_schedule",
        "Expected timetable and application procedures schedule",
        "gate.timetable",
        "offering_use_of_proceeds",
        ("Expected_Timetable", "How_to_Apply_for_Hong_Kong_Offer_Shares"),
        "xlsx",
    ),
    SourceTemplate(
        "use_of_proceeds_schedule",
        "Use-of-proceeds allocation schedule",
        "gate.use_of_proceeds",
        "offering_use_of_proceeds",
        ("Future_Plans_and_Use_of_Proceeds",),
        "xlsx",
    ),
    SourceTemplate(
        "industry_consultant_report",
        "Industry consultant report and market data workbook",
        "prof.industry_consultant.research_report",
        "industry_market",
        ("Industry_Overview",),
        "pdf+xlsx",
    ),
    SourceTemplate(
        "business_due_diligence_memo",
        "Sponsor business due-diligence memo and management questionnaire",
        "prof.sponsor.dd_memorandum",
        "business_products",
        ("Summary", "Business"),
        "docx",
    ),
    SourceTemplate(
        "risk_register",
        "Sponsor/counsel risk register",
        "gate.risk",
        "risk_seeds",
        ("Risk_Factors",),
        "xlsx",
    ),
    SourceTemplate(
        "accountants_report_and_mdna",
        "Accountants' report, financial model and MD&A support schedules",
        "prof.accountants.audit_report",
        "financials",
        ("Financial_Information", "Appendices"),
        "pdf+xlsx",
    ),
    SourceTemplate(
        "corporate_records_pack",
        "Corporate records, reorganization steps and share capital pack",
        "issuer.corp.certificate_of_incorporation",
        "company_legal_entity",
        ("Corporate_Information", "History_Reorganization_Corporate_Structure", "Share_Capital"),
        "docx+xlsx",
    ),
    SourceTemplate(
        "shareholder_register_and_interests",
        "Shareholder register and SFO interests schedule",
        "issuer.corp.shareholder_register",
        "management_governance",
        ("Relationship_with_Controlling_Shareholders", "Substantial_Shareholders", "Cornerstone_Investors"),
        "xlsx",
    ),
    SourceTemplate(
        "directors_management_questionnaires",
        "Director and senior management questionnaires",
        "issuer.directors.questionnaires",
        "management_governance",
        ("Directors_and_Senior_Management", "Parties_Involved_in_the_Global_Offering"),
        "xlsx+docx",
    ),
    SourceTemplate(
        "legal_regulatory_memos",
        "Legal, regulatory, waiver, VIE and connected transaction memos",
        "prof.legal.regulatory_opinion",
        "regulatory_legal",
        ("Regulatory_Overview", "Waivers_and_Exemptions", "Contractual_Arrangements_VIE", "Connected_Transactions"),
        "docx",
    ),
    SourceTemplate(
        "definitions_and_glossary_workbook",
        "Definitions and glossary workbook",
        "gate.definitions",
        "company_legal_entity",
        ("Definitions", "Glossary_of_Technical_Terms"),
        "xlsx",
    ),
    SourceTemplate(
        "front_matter_legal_notices",
        "Front matter legal notices and responsibility statements",
        "gate.front_matter",
        "regulatory_legal",
        ("Important_Notice", "Forward_Looking_Statements", "Contents"),
        "docx",
    ),
)


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _section_schema(schema_path: Path) -> dict[str, list[dict[str, Any]]]:
    data = _load_json(schema_path)
    out: dict[str, list[dict[str, Any]]] = {}
    for category in data.get("categories", []) or []:
        sid = (category.get("maps_to_sections") or [category.get("category_name")])[0]
        if sid:
            out[sid] = category.get("fields") or []
    return out


def _toc_by_section(toc_path: Path) -> dict[str, dict[str, Any]]:
    data = _load_json(toc_path)
    by_section: dict[str, dict[str, Any]] = {}
    for sec in data.get("sections", []) or []:
        sid = sec.get("canonical_section")
        if sid and sid not in by_section:
            by_section[sid] = sec
    return by_section


def _shape(value: Any) -> str:
    if isinstance(value, dict) and "value" in value:
        return str(value.get("original_input_shape") or _shape(value.get("value")))
    if isinstance(value, list):
        if value and all(isinstance(x, dict) for x in value):
            return "table"
        return "list"
    if isinstance(value, dict):
        return "object"
    return "scalar"


def _has_page_provenance(value: dict[str, Any]) -> bool:
    return bool(value.get("source_file")) and value.get("page_start") is not None


def _wrap_value(value: Any, *, sec_meta: dict[str, Any], default_source_kind: str) -> dict[str, Any] | None:
    if value in (None, "", [], {}):
        return None
    if isinstance(value, dict) and "value" in value:
        had_page_provenance = _has_page_provenance(value)
        wrapped = dict(value)
        wrapped.setdefault("likely_source_document", default_source_kind)
        wrapped.setdefault("original_input_shape", _shape(value.get("value")))
    else:
        wrapped = {
            "value": value,
            "likely_source_document": default_source_kind,
            "original_input_shape": _shape(value),
        }
        had_page_provenance = False
    wrapped.setdefault("source_file", sec_meta.get("source_file") or "")
    wrapped.setdefault("page_start", sec_meta.get("page_start"))
    wrapped.setdefault("page_end", sec_meta.get("page_end"))
    wrapped.setdefault("span_preview", "")
    if "evidence_status" not in wrapped or (
        wrapped.get("evidence_status") == "legacy_no_page_span" and _has_page_provenance(wrapped)
    ):
        wrapped["evidence_status"] = (
            "traceable" if had_page_provenance else "section_traceable"
        ) if _has_page_provenance(wrapped) else "legacy_no_page_span"
    return wrapped


def _traceable_value(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and "value" in value
        and bool(value.get("source_file"))
        and value.get("page_start") is not None
    )


def _section_cache(input_records_dir: Path, doc_id: str, section_id: str) -> dict[str, Any]:
    return _load_json(input_records_dir / doc_id / f"{section_id}.json")


def _section_source_materials(input_records_dir: Path, doc_id: str, section_id: str) -> dict[str, Any]:
    cache = _section_cache(input_records_dir, doc_id, section_id)
    materials = cache.get("extracted_source_materials")
    return materials if isinstance(materials, dict) else {}


def _extract_fields_for_section(
    *,
    doc_id: str,
    section_id: str,
    fields: list[dict[str, Any]],
    input_records_dir: Path,
    merged_record: dict[str, Any],
    toc_sections: dict[str, dict[str, Any]],
    default_source_kind: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    sec_meta = toc_sections.get(section_id) or {}
    cache = _section_cache(input_records_dir, doc_id, section_id)
    cache_values = cache.get("values") if isinstance(cache.get("values"), dict) else {}
    merged_values = (merged_record.get("record") or {}).get(f"section_{section_id}") or {}
    extracted: list[dict[str, Any]] = []
    missing: list[dict[str, Any]] = []
    null_reasons = cache.get("null_reasons") if isinstance(cache.get("null_reasons"), dict) else {}

    for field in fields:
        field_id = field.get("field_id") or ""
        field_name = field.get("field_name") or field_id.split(".")[-1]
        cache_raw = cache_values.get(field_name)
        merged_raw = merged_values.get(field_id) if isinstance(merged_values, dict) else None
        raw = merged_raw if _traceable_value(merged_raw) and not _traceable_value(cache_raw) else cache_raw
        if raw is None:
            raw = merged_raw
        wrapped = _wrap_value(raw, sec_meta=sec_meta, default_source_kind=default_source_kind)
        if wrapped is None:
            missing.append(
                {
                    "section_id": section_id,
                    "field_id": field_id,
                    "field_name": field_name,
                    "reason": null_reasons.get(field_name) or "not extracted from published prospectus",
                }
            )
            continue
        extracted.append(
            {
                "section_id": section_id,
                "field_id": field_id,
                "field_name": field_name,
                "description": field.get("description") or "",
                **wrapped,
            }
        )
    return extracted, missing


def build_for_doc(
    doc_id: str,
    *,
    schema: dict[str, list[dict[str, Any]]],
    sections_dir: Path,
    records_dir: Path,
    input_records_dir: Path,
) -> dict[str, Any]:
    toc_sections = _toc_by_section(sections_dir / f"{doc_id}.json")
    merged_record = _load_json(records_dir / f"{doc_id}.json")
    source_documents: list[dict[str, Any]] = []
    agent1_seed: dict[str, Any] = {
        "schema_version": "reverse-engineered-source-package/1.0",
        "issuer_id": doc_id,
        "language": "en",
    }
    counter = Counter()

    for tmpl in SOURCE_TEMPLATES:
        extracted_all: list[dict[str, Any]] = []
        missing_all: list[dict[str, Any]] = []
        page_ranges: list[dict[str, Any]] = []
        for sid in tmpl.canonical_sections:
            if sid not in toc_sections and sid not in schema:
                continue
            meta = toc_sections.get(sid) or {}
            if meta:
                page_ranges.append(
                    {
                        "section_id": sid,
                        "page_start": meta.get("page_start"),
                        "page_end": meta.get("page_end"),
                        "source_file": meta.get("source_file") or f"{doc_id}.pdf",
                    }
                )
            extracted, missing = _extract_fields_for_section(
                doc_id=doc_id,
                section_id=sid,
                fields=schema.get(sid, []),
                input_records_dir=input_records_dir,
                merged_record=merged_record,
                toc_sections=toc_sections,
                default_source_kind=tmpl.source_document_kind,
            )
            extracted_all.extend(extracted)
            missing_all.extend(missing)
            materials = _section_source_materials(input_records_dir, doc_id, sid)
            if materials and page_ranges:
                page_ranges[-1]["source_material_counts"] = materials.get("counts") or {}

        section_materials = [
            _section_source_materials(input_records_dir, doc_id, sid)
            for sid in tmpl.canonical_sections
        ]
        section_materials = [m for m in section_materials if m]
        if not extracted_all and not page_ranges and not section_materials:
            continue
        counter["source_documents"] += 1
        counter["extracted_fields"] += len(extracted_all)
        counter["missing_fields"] += len(missing_all)
        counter["traceable_fields"] += sum(1 for f in extracted_all if _has_page_provenance(f))
        counter["source_material_sections"] += len(section_materials)
        counter["source_material_numeric_facts"] += sum(
            len(m.get("key_numeric_facts") or []) for m in section_materials
        )
        counter["source_material_narrative_points"] += sum(
            len(m.get("key_narrative_points") or []) for m in section_materials
        )
        source_doc = {
            "source_document_kind": tmpl.source_document_kind,
            "display_name": tmpl.display_name,
            "schema_a_field_id": tmpl.schema_a_field_id,
            "agent1_domain": tmpl.agent1_domain,
            "recommended_format": tmpl.recommended_format,
            "canonical_sections": list(tmpl.canonical_sections),
            "prospectus_page_ranges": page_ranges,
            "extracted_fields": extracted_all,
            "missing_fields": missing_all,
            "section_source_materials": section_materials,
        }
        source_documents.append(source_doc)
        domain = agent1_seed.setdefault(tmpl.agent1_domain, {})
        domain.setdefault("reverse_engineered_sources", []).append(
            {
                "source_document_kind": tmpl.source_document_kind,
                "schema_a_field": tmpl.schema_a_field_id,
                "section_source_materials": section_materials,
                "fields": [
                    {
                        "field_id": f["field_id"],
                        "field_name": f["field_name"],
                        "value": f["value"],
                        "source_file": f.get("source_file"),
                        "page_start": f.get("page_start"),
                        "page_end": f.get("page_end"),
                        "span_preview": f.get("span_preview"),
                    }
                    for f in extracted_all
                ],
            }
        )

    return {
        "document_id": doc_id,
        "source_pdf": f"{doc_id}.pdf",
        "generation_method": "deterministic mapping from section-level reverse extraction",
        "limitations": [
            "Values are inferred from the published prospectus, not from actual issuer data-room files.",
            "Fields lacking source_file/page_start should be regenerated with stage3_extract_v2 --provider openai or a fresh local model run.",
            "Professional opinions are source-document placeholders and should not be treated as signed opinions.",
        ],
        "counts": dict(counter),
        "source_documents": source_documents,
        "agent1_input_seed": agent1_seed,
    }


def build_all(
    *,
    schema_path: Path,
    sections_dir: Path,
    records_dir: Path,
    input_records_dir: Path,
    out_dir: Path,
    only_doc: str | None = None,
    limit: int | None = None,
) -> dict[str, Any]:
    schema = _section_schema(schema_path)
    doc_ids = sorted(p.stem for p in records_dir.glob("*.json"))
    if only_doc:
        doc_ids = [only_doc]
    if limit:
        doc_ids = doc_ids[:limit]
    out_dir.mkdir(parents=True, exist_ok=True)

    totals = Counter()
    docs_written = 0
    for doc_id in doc_ids:
        package = build_for_doc(
            doc_id,
            schema=schema,
            sections_dir=sections_dir,
            records_dir=records_dir,
            input_records_dir=input_records_dir,
        )
        doc_out = out_dir / doc_id
        doc_out.mkdir(parents=True, exist_ok=True)
        (doc_out / "source_package.json").write_text(
            json.dumps(package, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        (doc_out / "agent1_input_seed.json").write_text(
            json.dumps(package["agent1_input_seed"], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        docs_written += 1
        totals.update(package.get("counts") or {})

    summary = {
        "documents_written": docs_written,
        "output_dir": str(out_dir),
        "counts": dict(totals),
    }
    (out_dir / "_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Build realistic source-package manifests.")
    parser.add_argument("--schema-path", type=Path, default=Path("prospectus_kg_output/inputs/input_schema_sections.json"))
    parser.add_argument("--sections-dir", type=Path, default=Path("prospectus_kg_output/sections_toc"))
    parser.add_argument("--records-dir", type=Path, default=Path("prospectus_kg_output/inputs/records"))
    parser.add_argument("--input-records-dir", type=Path, default=Path("prospectus_kg_output/inputs/input_records"))
    parser.add_argument("--out-dir", type=Path, default=Path("prospectus_kg_output/inputs/source_packages"))
    parser.add_argument("--only-doc", default=None)
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    summary = build_all(
        schema_path=args.schema_path,
        sections_dir=args.sections_dir,
        records_dir=args.records_dir,
        input_records_dir=args.input_records_dir,
        out_dir=args.out_dir,
        only_doc=args.only_doc,
        limit=args.limit,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts" / "prospectus_kg"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from audit_reverse_extraction import audit  # noqa: E402
from build_source_packages import build_all  # noqa: E402
from enrich_input_records_from_sections import enrich_all  # noqa: E402


def test_audit_reverse_extraction_flags_legacy_and_bad_values(tmp_path):
    records = tmp_path / "records"
    records.mkdir()
    (records / "demo.json").write_text(
        json.dumps(
            {
                "document_id": "demo",
                "record": {
                    "section_Business": {
                        "Business.mission_statement": "To build useful software.",
                        "Business.competitors": "No explicit competitors are disclosed.",
                        "Business.market_position": {
                            "value": "largest platform by revenue",
                            "source_file": "demo.pdf",
                            "page_start": 12,
                            "page_end": 13,
                            "span_preview": "largest platform by revenue",
                        },
                    }
                },
            }
        ),
        encoding="utf-8",
    )

    report = audit(records)
    assert report["totals"]["filled"] == 3
    assert report["totals"]["traceable"] == 1
    assert report["totals"]["legacy"] == 2
    assert report["totals"]["bad_value_patterns"] == 1


def test_build_source_packages_maps_sections_to_realistic_documents(tmp_path):
    schema_dir = tmp_path / "inputs"
    records_dir = schema_dir / "records"
    input_records_dir = schema_dir / "input_records" / "demo"
    sections_dir = tmp_path / "sections"
    out_dir = schema_dir / "source_packages"
    records_dir.mkdir(parents=True)
    input_records_dir.mkdir(parents=True)
    sections_dir.mkdir()

    (schema_dir / "input_schema_sections.json").write_text(
        json.dumps(
            {
                "categories": [
                    {
                        "category_name": "Future_Plans_and_Use_of_Proceeds",
                        "maps_to_sections": ["Future_Plans_and_Use_of_Proceeds"],
                        "fields": [
                            {
                                "field_id": "Future_Plans_and_Use_of_Proceeds.Net_Proceeds",
                                "field_name": "Net_Proceeds",
                                "description": "Estimated net proceeds.",
                            }
                        ],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    (sections_dir / "demo.json").write_text(
        json.dumps(
            {
                "document_id": "demo",
                "sections": [
                    {
                        "canonical_section": "Future_Plans_and_Use_of_Proceeds",
                        "source_file": "demo.pdf",
                        "page_start": 100,
                        "page_end": 105,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    (input_records_dir / "Future_Plans_and_Use_of_Proceeds.json").write_text(
        json.dumps(
            {
                "values": {
                    "Net_Proceeds": {
                        "value": "HK$100 million",
                        "span_preview": "net proceeds of HK$100 million",
                    }
                },
                "extracted_source_materials": {
                    "schema_version": "section-source-materials/1.0",
                    "section_id": "Future_Plans_and_Use_of_Proceeds",
                    "source_file": "demo.pdf",
                    "page_start": 100,
                    "page_end": 105,
                    "key_numeric_facts": [
                        {
                            "kind": "numeric_fact",
                            "text": "Approximately 50%, or HK$50 million, will be used for research and development.",
                            "source_file": "demo.pdf",
                            "page_start": 100,
                            "page_end": 105,
                        }
                    ],
                    "key_narrative_points": [],
                    "source_excerpt_blocks": [],
                    "counts": {"numeric_facts": 1, "narrative_points": 0},
                },
            }
        ),
        encoding="utf-8",
    )
    (records_dir / "demo.json").write_text(
        json.dumps({"document_id": "demo", "record": {}}),
        encoding="utf-8",
    )

    summary = build_all(
        schema_path=schema_dir / "input_schema_sections.json",
        sections_dir=sections_dir,
        records_dir=records_dir,
        input_records_dir=schema_dir / "input_records",
        out_dir=out_dir,
    )
    assert summary["documents_written"] == 1
    assert summary["counts"]["traceable_fields"] == 1
    package = json.loads((out_dir / "demo" / "source_package.json").read_text(encoding="utf-8"))
    proceeds_doc = next(
        d for d in package["source_documents"]
        if d["source_document_kind"] == "use_of_proceeds_schedule"
    )
    assert proceeds_doc["agent1_domain"] == "offering_use_of_proceeds"
    assert proceeds_doc["extracted_fields"][0]["value"] == "HK$100 million"
    assert proceeds_doc["extracted_fields"][0]["page_start"] == 100
    assert proceeds_doc["extracted_fields"][0]["evidence_status"] == "section_traceable"
    assert proceeds_doc["section_source_materials"][0]["counts"]["numeric_facts"] == 1
    assert summary["counts"]["source_material_numeric_facts"] == 1
    seed = json.loads((out_dir / "demo" / "agent1_input_seed.json").read_text(encoding="utf-8"))
    assert "offering_use_of_proceeds" in seed
    seed_sources = seed["offering_use_of_proceeds"]["reverse_engineered_sources"]
    assert seed_sources[0]["section_source_materials"][0]["key_numeric_facts"][0]["text"].startswith("Approximately 50%")


def test_enrich_input_records_adds_dense_source_materials(tmp_path):
    input_records_dir = tmp_path / "input_records"
    doc_dir = input_records_dir / "demo"
    sections_dir = tmp_path / "sections"
    doc_dir.mkdir(parents=True)
    sections_dir.mkdir()

    (doc_dir / "Industry_Overview.json").write_text(
        json.dumps({"values": {"industry_name": "software"}}),
        encoding="utf-8",
    )
    (sections_dir / "demo.json").write_text(
        json.dumps(
            {
                "document_id": "demo",
                "sections": [
                    {
                        "canonical_section": "Industry_Overview",
                        "source_file": "demo.pdf",
                        "page_start": 10,
                        "page_end": 12,
                        "text": (
                            "INDUSTRY OVERVIEW\n"
                            "The market size increased from RMB1.0 billion in 2020 "
                            "to RMB2.0 billion in 2022, representing a CAGR of 41.4%. "
                            "According to Frost & Sullivan, digital transformation "
                            "continues to drive demand for enterprise software."
                        ),
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    report = enrich_all(input_records_dir=input_records_dir, sections_dir=sections_dir)
    assert report["counts"]["files_enriched"] == 1
    enriched = json.loads((doc_dir / "Industry_Overview.json").read_text(encoding="utf-8"))
    materials = enriched["extracted_source_materials"]
    assert materials["source_file"] == "demo.pdf"
    assert materials["counts"]["numeric_facts"] >= 1
    assert materials["key_numeric_facts"][0]["page_start"] == 10
    assert "RMB1.0 billion" in materials["key_numeric_facts"][0]["text"]

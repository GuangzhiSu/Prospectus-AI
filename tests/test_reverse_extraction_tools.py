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
                }
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
    seed = json.loads((out_dir / "demo" / "agent1_input_seed.json").read_text(encoding="utf-8"))
    assert "offering_use_of_proceeds" in seed

from __future__ import annotations

import json
from pathlib import Path

from agent1 import run_agent1
from agent2 import run_agent2_single
from prospectus_graph.retrievers import HybridRetriever


def _write_company_fixture(path: Path) -> None:
    data = {
        "schema_version": "v3-test",
        "issuer_id": "demo-ai",
        "offering_use_of_proceeds": {
            "offer": {
                "offer_price": {"low": 3.85, "high": 3.99, "currency": "HKD"},
                "total_offer_shares": {"value": 1_500_000_000, "unit": "shares"},
                "over_allotment_shares": {"value": 225_000_000, "unit": "shares"},
            },
            "use_of_proceeds": {
                "basis": {
                    "value": "an Offer Price of HK$3.92 per Offer Share, being the mid-point of the indicative Offer Price range"
                },
                "net_proceeds_sensitivity_hkd": {
                    "note": {
                        "value": "If the Offer Price is fixed above or below the mid-point, the net proceeds will increase or decrease accordingly."
                    }
                },
                "allocation": [
                    {
                        "purpose": "Research and development",
                        "pct": 60,
                        "amount_hkd_approx": 3_393_000_000,
                        "timeline": "one to two years after Listing",
                        "sub_allocation": [
                            {
                                "purpose": "AI model training infrastructure",
                                "pct": 25,
                                "amount_hkd_approx": 1_414_000_000,
                            },
                            {
                                "purpose": "productisation of multimodal algorithms",
                                "pct": 35,
                                "amount_hkd_approx": 1_979_000_000,
                            },
                        ],
                    },
                    {
                        "purpose": "Business expansion",
                        "pct": 25,
                        "amount_hkd_approx": 1_414_000_000,
                        "timeline": "two to three years after Listing",
                    },
                    {
                        "purpose": "Working capital and general corporate purposes",
                        "pct": 15,
                        "amount_hkd_approx": 848_000_000,
                        "timeline": "one to two years after Listing",
                    },
                ],
            },
        },
        "business_products": {
            "future_plans": [
                "The Company plans to expand AI model infrastructure, commercialise multimodal products and deepen enterprise deployment."
            ]
        },
    }
    path.write_text(json.dumps(data), encoding="utf-8")


def test_agent1_preserves_indexed_proceeds_rows_and_dossier(tmp_path):
    data_dir = tmp_path / "data"
    out_dir = tmp_path / "agent1"
    data_dir.mkdir()
    _write_company_fixture(data_dir / "issuer.json")

    run_agent1(data_dir=data_dir, output_dir=out_dir, model_name="dummy")

    facts = [
        json.loads(line)
        for line in (out_dir / "fact_store.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    fields = {f["field"] for f in facts}
    assert "offering_use_of_proceeds.use_of_proceeds.allocation[0]" in fields
    assert "offering_use_of_proceeds.use_of_proceeds.allocation[1]" in fields
    assert "offering_use_of_proceeds.use_of_proceeds.allocation[0].sub_allocation[0]" in fields

    dossier = json.loads((out_dir / "section_dossiers.json").read_text(encoding="utf-8"))
    proceeds = next(s for s in dossier["sections"] if s["section_id"] == "UseOfProceeds")
    assert proceeds["warning_level"] == "ok"
    assert not proceeds["missing_required_slots"]
    assert any(
        slot["slot"] == "Allocation table by purpose" and slot["status"] == "covered"
        for slot in proceeds["content_slot_status"]
    )

    retriever = HybridRetriever(out_dir, use_semantic=False)
    result = retriever.retrieve(
        section_id="UseOfProceeds",
        section_name="Future Plans and Use of Proceeds",
        requirements="Draft the allocation table and implementation plan.",
        max_context_chars=12000,
    )
    assert "SECTION EVIDENCE DOSSIER" in result.retrieval_context
    assert "Allocation table by purpose" in result.retrieval_context
    assert "Indexed schedule rows" in result.formatted_facts


def test_agent1_routes_reverse_section_json_and_source_materials(tmp_path):
    data_dir = tmp_path / "data"
    out_dir = tmp_path / "agent1"
    data_dir.mkdir()
    (data_dir / "Industry_Overview.json").write_text(
        json.dumps(
            {
                "values": {
                    "market_size": {
                        "value": "RMB10.5 billion",
                        "source_file": "demo.pdf",
                        "page_start": 20,
                    }
                },
                "extracted_source_materials": {
                    "section_id": "Industry_Overview",
                    "key_numeric_facts": [
                        {
                            "text": "The market grew from RMB5.0 billion in 2020 to RMB10.5 billion in 2023.",
                            "source_file": "demo.pdf",
                            "page_start": 20,
                        }
                    ],
                    "key_narrative_points": [
                        {"text": "Digital transformation continues to drive industry demand."}
                    ],
                },
            }
        ),
        encoding="utf-8",
    )

    run_agent1(data_dir=data_dir, output_dir=out_dir, model_name="dummy")

    facts = [
        json.loads(line)
        for line in (out_dir / "fact_store.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert {f["metadata"]["section_hint"] for f in facts} == {"B"}
    assert any(
        f["metadata"].get("prospectus_section_hint") == "Industry_Overview"
        for f in facts
    )

    chunks = [
        json.loads(line)
        for line in (out_dir / "text_chunks.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert any("RMB5.0 billion" in c["text"] for c in chunks)
    assert any(c.get("prospectus_section_hint") == "Industry_Overview" for c in chunks)
    assert any(c.get("source_type") == "json_source_material" for c in chunks)


def test_agent1_unwraps_source_package_agent1_seed(tmp_path):
    data_dir = tmp_path / "data"
    out_dir = tmp_path / "agent1"
    data_dir.mkdir()
    (data_dir / "source_package.json").write_text(
        json.dumps(
            {
                "document_id": "demo",
                "agent1_input_seed": {
                    "industry_market": {
                        "reverse_engineered_sources": [
                            {
                                "source_document_kind": "industry_consultant_report",
                                "section_source_materials": [
                                    {
                                        "section_id": "Industry_Overview",
                                        "key_narrative_points": [
                                            {"text": "The addressable market is expanding due to SaaS adoption."}
                                        ],
                                        "term_definitions": [
                                            {"term": "SaaS", "definition": "software as a service"}
                                        ],
                                    }
                                ],
                                "fields": [
                                    {
                                        "field_name": "growth_rate",
                                        "value": "23.4%",
                                        "source_file": "demo.pdf",
                                    }
                                ],
                            }
                        ]
                    }
                },
            }
        ),
        encoding="utf-8",
    )

    run_agent1(data_dir=data_dir, output_dir=out_dir, model_name="dummy")

    facts = [
        json.loads(line)
        for line in (out_dir / "fact_store.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert facts
    assert {f["metadata"]["section_hint"] for f in facts} == {"B"}

    chunks = [
        json.loads(line)
        for line in (out_dir / "text_chunks.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert any("SaaS adoption" in c["text"] for c in chunks)
    assert any("SaaS: software as a service" in c["text"] for c in chunks)
    assert any(c.get("prospectus_section_hint") == "Industry_Overview" for c in chunks)


def test_use_of_proceeds_template_renders_complete_section(tmp_path):
    data_dir = tmp_path / "data"
    agent1_dir = tmp_path / "agent1"
    agent2_dir = tmp_path / "agent2"
    data_dir.mkdir()
    _write_company_fixture(data_dir / "issuer.json")

    run_agent1(data_dir=data_dir, output_dir=agent1_dir, model_name="dummy")
    section = run_agent2_single(
        "UseOfProceeds",
        rag_dir=agent1_dir,
        output_dir=agent2_dir,
        max_revision_loops=0,
        model_name="dummy",
        finalize_bundle=False,
    )

    assert "We intend to use the net proceeds" in section
    assert "Research and development" in section
    assert "**100%**" in section
    assert "HK$5,655.0 million" in section
    assert "HK$3.85 to HK$3.99" in section
    assert "[[AI:CITE|" in section
    assert "[[AI:VERIFY|" in section
    assert "[\u25cf]" not in section

    saved = agent2_dir / "section_UseOfProceeds_Future_Plans_and_Use_of_Proceeds.md"
    assert saved.exists()

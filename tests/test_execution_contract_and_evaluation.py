from __future__ import annotations

import json
from pathlib import Path

from prospectus_graph.evaluation import clean_annotated_draft, evaluate_draft
from prospectus_graph.execution_contract import compile_execution_contracts


ROOT = Path(__file__).resolve().parent.parent
REQUIREMENTS = ROOT / "ai-module" / "prompts" / "sections" / "requirements.json"


def test_all_section_specs_compile_to_versioned_fields_and_units():
    requirements = json.loads(REQUIREMENTS.read_text(encoding="utf-8"))
    document = compile_execution_contracts(requirements)

    assert document["contractCount"] == 31
    assert len(document["sourceHash"]) == 64
    assert all(contract["fields"] for contract in document["contracts"].values())
    assert all(contract["units"] for contract in document["contracts"].values())
    assert len(document["contracts"]["Business"]["units"]) > 1
    assert len(document["contracts"]["Cover"]["units"]) == 1
    assert not any(
        "example" in field
        for requirement in requirements.values()
        for field in requirement.get("kg_required_input_fields", [])
        if isinstance(field, dict)
    )


def _contract() -> dict:
    return {
        "fields": [
            {
                "fieldId": "Cover.stock_code",
                "label": "stock code",
                "aliases": ["stock_code"],
            },
            {
                "fieldId": "Cover.offer_price",
                "label": "offer price",
                "aliases": ["offer_price"],
            },
        ],
        "units": [
            {
                "unitId": "Cover:01",
                "title": "Cover",
                "order": 1,
            }
        ],
    }


def _prepared() -> dict:
    return {
        "contract_values": {
            "Cover.stock_code": {"value": "2658"},
            "Cover.offer_price": {"value": "HK$58.00 per H Share"},
        },
        "evidence_atoms": [
            {
                "id": "ev_1",
                "value": "Stock code: 2658",
                "priority": "required",
            },
            {
                "id": "ev_2",
                "value": "Offer Price: HK$58.00 per H Share",
                "priority": "required",
            },
        ],
    }


def test_clean_and_annotated_outputs_are_separate_and_faithful():
    annotated = (
        "## Cover\n\nStock code: 2658. Offer Price: HK$58.00 per H Share. "
        "[[AI:CITE|evidence=ev_1]]\n\n### Verification Notes\n\nVerification status: passed."
    )
    clean = clean_annotated_draft(annotated)
    result = evaluate_draft(
        contract=_contract(),
        prepared_data=_prepared(),
        annotated_draft=annotated,
        clean_draft=clean,
    )

    assert "[[AI:" not in clean
    assert "Verification Notes" not in clean
    assert result.numeric_precision == 100
    assert result.numeric_recall == 100
    assert not result.hard_failures


def test_unsupported_number_is_a_non_compensable_hard_failure():
    annotated = (
        "## Cover\n\nImaginary Holdings Limited (stock code: 2658) set the "
        "Offer Price at HK$99.00 per H Share on 1 January 2027."
    )
    result = evaluate_draft(
        contract=_contract(),
        prepared_data=_prepared(),
        annotated_draft=annotated,
    )

    assert "unsupported_numeric_claim" in result.hard_failures
    assert "unsupported_date_claim" in result.hard_failures
    assert "unsupported_entity_claim" in result.hard_failures
    assert result.overall_score <= 49

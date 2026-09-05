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
    assert [
        field["label"] for field in document["contracts"]["Contents"]["fields"]
    ] == ["ordered_contents_entries", "front_matter_notices_if_present"]
    assert not any(
        "example" in field
        for requirement in requirements.values()
        for field in requirement.get("kg_required_input_fields", [])
        if isinstance(field, dict)
    )


def test_legacy_aliases_require_semantic_overlap():
    requirements = json.loads(REQUIREMENTS.read_text(encoding="utf-8"))
    contracts = compile_execution_contracts(requirements)["contracts"]
    cover = contracts["Cover"]
    aliases = {field["fieldId"]: field["aliases"] for field in cover["fields"]}

    assert aliases["Cover.stock_code"] == ["Stock code"]
    assert "stock_code" not in aliases[
        "Cover.total_number_of_offer_shares_number_of_hong_kong_offer_shares_number_of_international_offer_shar"
    ]
    assert "stock_code" not in aliases[
        "Cover.brokerage_and_levy_rates_brokerage_sfc_transaction_levy_stock_exchange_trading_fee_afrc_transact"
    ]
    assert "key_underwriters" not in aliases["Cover.offering_type_global_offering"]
    assert "key_underwriters" in aliases[
        "Cover.names_of_joint_sponsors_overall_coordinators_joint_global_coordinators_joint_bookrunners_joint_l"
    ]

    for contract in contracts.values():
        owners: dict[str, str] = {}
        for field in contract["fields"]:
            for alias in field["aliases"]:
                assert alias not in owners, (
                    f"{contract['sectionId']} alias {alias!r} is shared by "
                    f"{owners.get(alias)!r} and {field['fieldId']!r}"
                )
                owners[alias] = field["fieldId"]


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


def test_clean_output_removes_a_truncated_trailing_ai_tag():
    clean = clean_annotated_draft(
        "## Contents\n\n| Summary | 1 | [[AI:CITE|source=user_document; doc=demo.pdf;"
    )
    assert clean == "## Contents\n\n| Summary | 1 |"


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

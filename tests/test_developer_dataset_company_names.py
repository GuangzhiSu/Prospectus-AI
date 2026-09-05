"""Regression tests for real issuer names in Developer Tools."""

from __future__ import annotations

import pytest

from scripts.build_devtools_dataset import (
    company_name,
    developer_prepared_data,
    name_from_definition,
)


def section(canonical: str, text: str) -> dict[str, str]:
    return {
        "canonical_section": canonical,
        "raw_title": canonical.replace("_", " "),
        "text": text,
    }


def test_front_matter_name_wins_over_pre_rename_definition_name() -> None:
    toc = {
        "sections": [
            section(
                "Cover",
                """IMPORTANT
Boyaa Interactive International Limited
博雅互動國際有限公司
(Incorporated in the Cayman Islands with limited liability)
GLOBAL OFFERING""",
            ),
            section(
                "Definitions",
                """“Company”, “our Company”, “we” or “us”
Boyaa Interactive Limited, a company subsequently renamed
Boyaa Interactive International Limited""",
            ),
        ]
    }

    assert company_name({}, toc, "00434_global_offering_1") == (
        "Boyaa Interactive International Limited"
    )


def test_definition_recovers_name_missing_from_cover_logo() -> None:
    toc = {
        "sections": [
            section(
                "Cover",
                """If you are in any doubt, seek professional advice.
(incorporated in Hong Kong with limited liability)
GLOBAL OFFERING""",
            ),
            section(
                "Definitions",
                """“Company”, “our Company”,
“Group”, “our Group”, “we” or
“us”
BYD
Electronic
(International)
Company
Limited
(比亞迪電子（國際）有限公司), a company incorporated in Hong Kong""",
            ),
        ]
    }

    assert name_from_definition(toc) == (
        "BYD Electronic (International) Company Limited"
    )


def test_builder_refuses_an_issuer_number_placeholder() -> None:
    with pytest.raises(RuntimeError, match="refusing to publish"):
        company_name({}, {"sections": []}, "00285_global_offering_1")


def test_developer_payload_keeps_atoms_once_without_duplicate_text() -> None:
    atom = {"id": "ev_1", "value": "Stock Code: 1234", "text": "Stock Code: 1234"}
    prepared = {
        "contract_values": {"Cover.stock_code": {"value": "1234"}},
        "evidence_atoms": [atom],
        "section_units": [{"unitId": "Cover:01", "evidenceAtomIds": ["ev_1"]}],
        "extracted_source_materials": {
            "counts": {"evidence_atoms": 1},
            "evidence_atoms": [atom],
            "key_numeric_facts": [atom],
        },
    }

    compact = developer_prepared_data(prepared)

    assert compact["evidence_atoms"] == [{"id": "ev_1", "value": "Stock Code: 1234"}]
    assert compact["extracted_source_materials"] == {"counts": {"evidence_atoms": 1}}
    assert compact["section_units"] == prepared["section_units"]

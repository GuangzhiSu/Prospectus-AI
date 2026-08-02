"""Regression tests for real issuer names in Developer Tools."""

from __future__ import annotations

import pytest

from scripts.build_devtools_dataset import company_name, name_from_definition


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

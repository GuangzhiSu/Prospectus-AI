"""Tests for readable, lossless prospectus reference text."""

from __future__ import annotations

from scripts.prospectus_kg.reference_text import (
    fragmented_line_runs,
    non_whitespace_text,
    reflow_reference_text,
)


def test_sensetime_definition_words_are_rejoined() -> None:
    raw = """DEFINITIONS
In this Prospectus, the following terms shall have
the meanings set out below.
“affiliate”
any
other
person,
directly
or
indirectly,
controlling
or
controlled by or under direct or indirect common control with
such specified person
“Amind”
Amind Inc., an exempted company incorporated under the
laws of the Cayman Islands with limited liability
— 32 —


DEFINITIONS
“Articles” or “Articles of
Association”
the amended and restated articles of association
of our Company"""

    result = reflow_reference_text(raw, "Definitions")

    assert "any other person, directly or indirectly, controlling or controlled" in result
    assert "“Articles” or “Articles of Association”" in result
    assert "\nany\nother\n" not in result
    assert fragmented_line_runs(result) == 0
    assert non_whitespace_text(result) == non_whitespace_text(raw)


def test_quoted_phrase_inside_a_definition_is_not_treated_as_a_new_term() -> None:
    raw = """DEFINITIONS
“China”, “Mainland China” or “PRC”
the People’s Republic of China, except where references to “China”,
“Mainland China” and the “PRC” do not apply to Hong Kong
SAR, Macau and Taiwan Region
“Class A Share(s)”
class A ordinary shares of the Company"""

    result = reflow_reference_text(raw, "Definitions")

    assert (
        "references to “China”, “Mainland China” and the “PRC” do not apply"
        in result
    )
    assert "Taiwan Region\n\n“Class A Share(s)”" in result
    assert non_whitespace_text(result) == non_whitespace_text(raw)


def test_unquoted_glossary_keeps_terms_and_reflows_definitions() -> None:
    raw = """GLOSSARY OF TECHNICAL TERMS
The glossary contains definitions of technical terms used in this Prospectus.
ERP system
enterprise resource planning system
EVDO
a telecommunications standard for the wireless transmission of
data through radio signals.
O2O
a business mode that improves a retailer's service offerings through offline-
to-online
user
engagement."""

    result = reflow_reference_text(raw, "Glossary_of_Technical_Terms")

    assert "ERP system\n\nenterprise resource planning system" in result
    assert "offline-to-online user engagement." in result
    assert fragmented_line_runs(result) == 0
    assert non_whitespace_text(result) == non_whitespace_text(raw)


def test_prose_is_reflowed_but_numeric_table_rows_are_preserved() -> None:
    prose = """BUSINESS
We provide artificial intelligence software and
related platform services to enterprise customers."""
    table = """No.
Province
Total
1
15
2
17
56
73
2
Beijing
107"""

    assert "software and related platform" in reflow_reference_text(prose, "Business")
    assert reflow_reference_text(table, "Business") == table
    assert non_whitespace_text(reflow_reference_text(prose, "Business")) == (
        non_whitespace_text(prose)
    )

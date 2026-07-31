"""Part 2: parsed models, TitleNormalizer, MatchResult."""

from __future__ import annotations

import pytest

from prospectus_docgraph.normalizer.title_normalizer import TitleNormalizer
from prospectus_docgraph.parser.structure import ParsedDocument, ParsedSection


def test_normalize_text_strips_numbering() -> None:
    n = TitleNormalizer()
    assert n.normalize_text("  3.1  Risk Factors  ") == "risk factors"
    assert n.normalize_text("Chapter IV Industry Overview") == "industry overview"


def test_match_section_alias_examples() -> None:
    n = TitleNormalizer()
    r = n.match_section("Our Business")
    assert r.canonical_name == "Business"
    assert r.match_method == "alias"
    assert r.confidence >= 0.9


def test_match_section_exact_display() -> None:
    n = TitleNormalizer()
    r = n.match_section("Risk Factors")
    assert r.canonical_name == "Risk_Factors"
    assert r.match_method in ("exact_id", "exact_display")


def test_register_alias() -> None:
    n = TitleNormalizer()
    n.register_alias("Risk_Factors", "Principal Risk Factors Disclosure")
    r = n.match_section("Principal Risk Factors Disclosure")
    assert r.canonical_name == "Risk_Factors"
    assert r.match_method == "alias"


def test_batch_match() -> None:
    n = TitleNormalizer()
    titles = ["Summary", "Unknown XYZ Section Title"]
    out = n.batch_match(titles)
    assert len(out) == 2
    assert out[0].canonical_name == "Summary"
    assert out[1].match_method == "none"


def test_infer_with_llm_not_implemented() -> None:
    n = TitleNormalizer()
    with pytest.raises(NotImplementedError):
        n.infer_with_llm("foo", None)


def test_match_subsection_with_parent_alias() -> None:
    n = TitleNormalizer()
    n.register_subsection_alias(
        "Risk_Factors",
        "Credit risk",
        "risk_factors__credit_risk",
    )
    r = n.match_subsection("Credit risk", "Risk_Factors")
    assert r.canonical_name == "risk_factors__credit_risk"
    assert r.confidence >= 0.9


def test_parsed_document_model() -> None:
    doc = ParsedDocument(
        document_id="doc1",
        source_file="sample.pdf",
        sections=[
            ParsedSection(
                document_id="doc1",
                source_file="sample.pdf",
                raw_title="Summary",
                normalized_title="summary",
                canonical_section="Summary",
                level=1,
                order_index=0,
                confidence=0.99,
            )
        ],
    )
    assert doc.sections[0].canonical_section == "Summary"


def test_match_result_model() -> None:
    from prospectus_docgraph.models.enums import NodeType
    from prospectus_docgraph.normalizer.match_result import MatchResult

    m2 = MatchResult(
        raw_title="x",
        normalized_title="x",
        canonical_name="Business",
        node_type=NodeType.SECTION,
        confidence=1.0,
        match_method="exact_id",
    )
    assert m2.confidence == 1.0

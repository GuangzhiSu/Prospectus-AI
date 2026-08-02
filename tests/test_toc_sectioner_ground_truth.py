"""Regression tests for complete, exact-boundary prospectus sectioning."""

from __future__ import annotations

from scripts.prospectus_kg.toc_sectioner import (
    _Position,
    _build_sections,
    _candidate_offsets,
    _resolve_heading_boundary,
    _slice_pages,
)
from prospectus_docgraph.normalizer.title_normalizer import TitleNormalizer


def test_nested_outline_selects_real_section_level() -> None:
    toc = [
        [1, "assembled.pdf", -1],
        [2, "inner.pdf", -1],
        [3, "SUMMARY", 2],
        [3, "RISK FACTORS", 12],
        [3, "BUSINESS", 40],
        [3, "FINANCIAL INFORMATION", 100],
    ]
    sections, section_level, _entries = _build_sections(
        toc, 180, TitleNormalizer(fuzzy_cutoff=0.78)
    )
    assert section_level == 3
    assert [section.canonical for section in sections] == [
        "Summary",
        "Risk_Factors",
        "Business",
        "Financial_Information",
    ]


def test_multiline_heading_resolves_to_exact_character_offset() -> None:
    page = "Prior section tail.\nSTRUCTURE AND CONDITIONS OF THE\nGLOBAL OFFERING\nBody"
    offsets = _candidate_offsets(
        page, "STRUCTURE AND CONDITIONS OF THE GLOBAL OFFERING"
    )
    assert offsets == [page.index("STRUCTURE")]
    boundary = _resolve_heading_boundary(
        {8: page},
        "STRUCTURE AND CONDITIONS OF THE GLOBAL OFFERING",
        8,
        8,
    )
    assert boundary.method == "heading_exact"
    assert boundary.position == _Position(7, page.index("STRUCTURE"))


def test_heading_does_not_match_word_inside_prose() -> None:
    page = "Overview of business opportunities.\nMore prose.\nBUSINESS\n– 140 –"
    offsets = _candidate_offsets(page, "BUSINESS")
    assert offsets == [page.rindex("BUSINESS")]


def test_heading_with_colon_and_disclaimer_on_same_line_is_valid() -> None:
    page = "IMPORTANT: If you are in any doubt, seek professional advice.\nIssuer"
    assert _candidate_offsets(page, "IMPORTANT") == [0]


def test_punctuation_only_line_before_heading_is_not_part_of_boundary() -> None:
    page = "Prior table ................\nBUSINESS\nSection body"
    assert _candidate_offsets(page, "BUSINESS") == [page.index("BUSINESS")]


def test_running_header_extracted_after_body_uses_page_start() -> None:
    page = "OVERVIEW\nFirst-page section body.\nBUSINESS\n– 140 –"
    boundary = _resolve_heading_boundary({150: page}, "BUSINESS", 150, 150)
    assert boundary.method == "running_header_page_start"
    assert boundary.position == _Position(149, 0)


def test_same_page_boundary_has_no_overlap_or_gap() -> None:
    pages = {1: "SUMMARY\nSummary body.\nBUSINESS\nBusiness body."}
    boundary = pages[1].index("BUSINESS")
    summary = _slice_pages(pages, _Position(0, 0), _Position(0, boundary), 1)
    business = _slice_pages(
        pages, _Position(0, boundary), _Position(1, 0), 1
    )
    assert "BUSINESS" not in summary
    assert business.startswith("BUSINESS")
    assert summary + business == pages[1]


def test_long_section_is_never_truncated() -> None:
    body = "BUSINESS\n" + ("complete evidence line\n" * 5_000)
    result = _slice_pages({1: body}, _Position(0, 0), _Position(1, 0), 1)
    assert result == body
    assert "truncated" not in result


def test_abbreviated_bookmark_matches_long_visible_heading() -> None:
    page = (
        "APPENDIX VII\nDOCUMENTS DELIVERED TO\nTHE REGISTRAR OF COMPANIES IN\n"
        "HONG KONG AND AVAILABLE FOR INSPECTION\nBody"
    )
    boundary = _resolve_heading_boundary(
        {491: page},
        "Appendix VII - Documents Delivered and Available for Inspection",
        491,
        491,
    )
    assert boundary.method == "heading_fuzzy"
    assert boundary.position == _Position(490, 0)

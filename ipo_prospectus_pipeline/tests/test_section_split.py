"""Tests for section splitting logic."""

from src.schemas import ExtractedDocument, ExtractedPage, SectionRecord
from src.subsection_split import split_section_into_subsections, _is_subsection_heading


def test_is_subsection_heading():
    assert _is_subsection_heading("1.1 Products and Services") is True
    assert _is_subsection_heading("a) Overview") is True
    assert _is_subsection_heading("Plain paragraph text here.") is False


def test_split_section_into_subsections_single():
    sec = SectionRecord(
        section_name_raw="Business",
        section_name_canonical="Business",
        start_page=10,
        end_page=15,
        text="Some content without subsection headings.",
    )
    result = split_section_into_subsections(sec, "doc1", ["Business"])
    assert len(result) >= 1
    assert result[0].subsection_name == "Business"
    assert result[0].text == sec.text


def test_split_section_into_subsections_with_headings():
    sec = SectionRecord(
        section_name_raw="Business",
        section_name_canonical="Business",
        start_page=10,
        end_page=12,
        text="Intro.\n\n1.1 Products and Services\n\nWe sell products.\n\n1.2 Markets\n\nWe serve markets.",
    )
    result = split_section_into_subsections(sec, "doc1", ["Business"])
    assert len(result) >= 2
    names = [r.subsection_name for r in result]
    assert "Products and Services" in names or "Business" in names

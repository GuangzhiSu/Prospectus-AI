"""Tests for Pydantic schemas and JSON serialization."""

import pytest
from src.schemas import (
    ExtractedDocument,
    SectionRecord,
    DocumentSections,
    SectionDatasetRow,
    SubsectionDatasetRow,
    DataToTextDatasetRow,
    get_json_schema_for_extraction,
    BusinessExtraction,
)


def test_extracted_document_roundtrip():
    doc = ExtractedDocument(
        document_id="test-doc",
        source_path="/path/to/file.pdf",
        status="ok",
        pages=[],
        total_pages=10,
    )
    assert doc.document_id == "test-doc"
    assert doc.model_dump_json()


def test_section_record():
    r = SectionRecord(
        section_name_raw="Risk Factors",
        section_name_canonical="Risk Factors",
        start_page=12,
        end_page=28,
        text="Some risk text.",
    )
    assert r.section_name_canonical == "Risk Factors"
    assert r.model_dump()


def test_section_dataset_row():
    row = SectionDatasetRow(
        document_id="doc1",
        section_name="Business",
        input={"document_metadata": {}, "structured_facts": {}},
        output_text="Full section text here.",
        source_pages=[1, 2, 3],
    )
    out = row.model_dump_json()
    assert "doc1" in out
    assert "Business" in out


def test_json_schema_for_extraction():
    schema = get_json_schema_for_extraction(BusinessExtraction)
    assert "properties" in schema
    assert "confidence" in schema.get("properties", {})

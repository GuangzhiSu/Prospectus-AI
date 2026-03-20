"""Tests for PDF extraction (requires a sample PDF or mock)."""

import tempfile
from pathlib import Path

import pytest

from src.pdf_extract import extract_from_pdf
from src.schemas import ExtractedDocument


def test_extract_from_pdf_missing_file():
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "nonexistent.pdf"
        doc = extract_from_pdf(path)
        assert doc.status == "failed"
        assert doc.error_message is not None


def test_extracted_document_schema():
    doc = ExtractedDocument(
        document_id="x",
        source_path="/x.pdf",
        status="ok",
        pages=[],
        total_pages=0,
    )
    assert doc.status == "ok"
    assert doc.model_dump()

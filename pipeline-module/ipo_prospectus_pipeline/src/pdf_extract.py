"""PDF text and structure extraction. Deterministic parsing only."""

from __future__ import annotations

import re
from pathlib import Path

import structlog
from pydantic import BaseModel

from .schemas import ExtractedDocument, ExtractedPage, HeadingCandidate, PageBlock

logger = structlog.get_logger()

# Patterns that often indicate section headings in IPO prospectuses
HEADING_PATTERNS = [
    re.compile(r"^\s*(?:CHAPTER|Part|Section)\s+[\dIVXLCDM]+[\.:]?\s*(.+)$", re.IGNORECASE),
    re.compile(r"^(\d+\.)\s+([A-Z][^.]+)$"),  # "1. Risk Factors"
    re.compile(r"^([IVXLCDM]+\.)\s+([A-Z][^.]+)$", re.IGNORECASE),  # "I. Summary"
    re.compile(r"^(\d+\.\d+)\s+([A-Z][^.]+)$"),  # "1.1 Subsection"
    re.compile(r"^([A-Z][A-Z\s]{10,80})$"),  # ALL CAPS line (short)
    re.compile(r"^[•\-\*]\s*([A-Z][^.]+)$"),
]


def _is_likely_heading(line: str, prev_line: str) -> tuple[bool, int]:
    """Return (is_heading, level). Level 1 = main section, 2 = subsection."""
    line = line.strip()
    if not line or len(line) > 200:
        return False, 0
    for i, pat in enumerate(HEADING_PATTERNS):
        m = pat.match(line)
        if m:
            level = 1 if i in (0, 1, 2, 4) else 2
            return True, level
    # Short all-caps line after blank
    if not prev_line.strip() and line.isupper() and 5 <= len(line) <= 100:
        return True, 1
    return False, 0


def _detect_table_candidate(block_text: str) -> bool:
    """Heuristic: multiple tabs or many numbers in a short span."""
    if "\t" in block_text and block_text.count("\t") >= 2:
        return True
    digits = sum(1 for c in block_text if c.isdigit())
    if len(block_text) < 800 and digits > len(block_text) // 4:
        return True
    return False


def extract_from_pdf(pdf_path: Path) -> ExtractedDocument:
    """
    Extract text, page numbers, heading candidates, and table-like blocks from a PDF.
    Uses PyMuPDF. On failure, returns document with status 'failed' or 'partial'.
    """
    import fitz  # PyMuPDF

    doc_id = pdf_path.stem
    result = ExtractedDocument(
        document_id=doc_id,
        source_path=str(pdf_path.resolve()),
        status="ok",
        pages=[],
        total_pages=0,
    )
    try:
        doc = fitz.open(pdf_path)  # raises if file missing or invalid
        result.total_pages = len(doc)
        prev_line = ""
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            blocks = []
            heading_candidates = []
            for block in page.get_text("dict")["blocks"]:
                block_text = ""
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        block_text += span.get("text", "")
                    block_text += "\n"
                block_text = block_text.strip()
                if not block_text:
                    continue
                first_line = block_text.split("\n")[0].strip()
                is_heading, level = _is_likely_heading(first_line, prev_line)
                if is_heading:
                    heading_candidates.append(
                        HeadingCandidate(text=first_line, page=page_num + 1, level=level)
                    )
                block_type = "table_candidate" if _detect_table_candidate(block_text) else "paragraph"
                blocks.append(PageBlock(text=block_text, block_type=block_type, page=page_num + 1))
                prev_line = first_line
            result.pages.append(
                ExtractedPage(
                    page_number=page_num + 1,
                    text=text,
                    heading_candidates=heading_candidates,
                    blocks=blocks,
                )
            )
        doc.close()
    except Exception as e:
        logger.exception("pdf_extract_failed", path=str(pdf_path), error=str(e))
        result.status = "failed"
        result.error_message = str(e)
        if result.pages:
            result.status = "partial"
    return result

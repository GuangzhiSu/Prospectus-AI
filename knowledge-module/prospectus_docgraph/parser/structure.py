"""
Parsed document structure from heading extraction (PDF pipeline not implemented here).

These models describe *what was read* from a filing; canonical fields are filled by
:class:`prospectus_docgraph.normalizer.title_normalizer.TitleNormalizer`.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ParsedHeadingBase(BaseModel):
    """
    Common fields for headings and text chunks after parsing.

    ``canonical_*`` fields are populated by the normalization pipeline.
    """

    document_id: str = Field(..., description="Stable id for this document in a corpus.")
    source_file: str = Field(..., description="Original file name or path key.")
    raw_title: str = Field("", description="Heading text as extracted.")
    normalized_title: str = Field("", description="After text normalization (pre-matching).")
    canonical_section: str | None = Field(
        None,
        description="Canonical section id, e.g. Risk_Factors.",
    )
    canonical_subsection: str | None = Field(
        None,
        description="Canonical subsection slug if resolved.",
    )
    level: int = Field(0, ge=0, description="TOC depth (0 = document root).")
    page_start: int | None = Field(None, ge=1, description="Start page if known.")
    page_end: int | None = Field(None, ge=1, description="End page if known.")
    order_index: int = Field(0, ge=0, description="Reading order within parent.")
    text: str = Field("", description="Body text under this heading, if extracted.")
    parent_title: str | None = Field(None, description="Immediate parent heading raw string.")
    confidence: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Match confidence for canonical fields.",
    )


class ParsedSubsection(ParsedHeadingBase):
    """A subsection under a :class:`ParsedSection`."""

    subsections: list["ParsedSubsection"] = Field(
        default_factory=list,
        description="Nested subsections (rare deep TOC).",
    )


class ParsedSection(ParsedHeadingBase):
    """A top-level or major section in the extracted TOC."""

    subsections: list[ParsedSubsection] = Field(default_factory=list)


class ParsedChunk(ParsedHeadingBase):
    """
    A contiguous text block (paragraph, table caption, etc.).

    May have empty ``raw_title`` if the chunk is body-only.
    """

    chunk_type: str = Field(
        "body",
        description="e.g. body, table, footnote — parser-specific.",
    )


class ParsedDocument(BaseModel):
    """Full document: metadata + section tree + optional flat chunks."""

    document_id: str
    source_file: str
    sections: list[ParsedSection] = Field(default_factory=list)
    chunks: list[ParsedChunk] = Field(
        default_factory=list,
        description="Optional flat stream of non-heading blocks.",
    )
    metadata: dict[str, Any] = Field(default_factory=dict)


ParsedSubsection.model_rebuild()
ParsedSection.model_rebuild()

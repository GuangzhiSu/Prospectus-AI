"""Pydantic models and JSON schemas for pipeline data structures."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


# --- PDF extraction ---


class PageBlock(BaseModel):
    """A block of text on a page (paragraph or table-like)."""
    text: str
    block_type: str = "paragraph"  # paragraph | table_candidate
    page: int


class HeadingCandidate(BaseModel):
    """Detected heading on a page."""
    text: str
    page: int
    level: int = 1  # 1 = main section, 2 = subsection


class ExtractedPage(BaseModel):
    """Single page extraction result."""
    page_number: int
    text: str
    heading_candidates: list[HeadingCandidate] = Field(default_factory=list)
    blocks: list[PageBlock] = Field(default_factory=list)


class ExtractedDocument(BaseModel):
    """Raw extraction result for one PDF."""
    document_id: str
    source_path: str
    status: str = "ok"  # ok | partial | failed
    pages: list[ExtractedPage] = Field(default_factory=list)
    total_pages: int = 0
    error_message: str | None = None


# --- Section splitting ---


class SectionRecord(BaseModel):
    """One section within a document."""
    section_name_raw: str
    section_name_canonical: str
    start_page: int
    end_page: int
    text: str


class DocumentSections(BaseModel):
    """Section-split result for one document."""
    document_id: str
    sections: list[SectionRecord] = Field(default_factory=list)


# --- Subsection ---


class SubsectionRecord(BaseModel):
    """One subsection within a section."""
    subsection_name: str
    text: str
    start_page: int
    end_page: int


# --- Structured extraction (evidence) ---


class EvidenceSnippet(BaseModel):
    """Evidence supporting an extracted fact."""
    field_name: str
    snippet: str
    page: int | None = None


class BaseStructuredExtraction(BaseModel):
    """Base for all extraction outputs."""
    confidence: float = Field(ge=0.0, le=1.0, description="Extraction confidence 0-1")
    evidence: list[EvidenceSnippet] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)


# Business extraction schema
class BusinessExtraction(BaseStructuredExtraction):
    company_positioning: str | None = None
    product_segments: list[str] = Field(default_factory=list)
    products: list[str] = Field(default_factory=list)
    technology: str | None = None
    customers: str | None = None
    sales_model: str | None = None
    production_model: str | None = None
    competition: str | None = None
    strategy: str | None = None


# Financial extraction schema
class FinancialExtraction(BaseStructuredExtraction):
    revenue: str | None = None
    gross_margin: str | None = None
    net_loss: str | None = None
    rd_expenses: str | None = None
    selling_expenses: str | None = None
    inventory: str | None = None
    cash_flow: str | None = None
    period_labels: list[str] = Field(default_factory=list)


# Risk factors extraction schema
class RiskFactorItem(BaseModel):
    risk_category: str  # e.g. customer_concentration, regulatory
    description: str
    evidence_snippet: str | None = None
    page: int | None = None


class RiskFactorsExtraction(BaseStructuredExtraction):
    risks: list[RiskFactorItem] = Field(default_factory=list)


# Offering extraction schema
class OfferingExtraction(BaseStructuredExtraction):
    offering_shares: str | None = None
    price_range: str | None = None
    exchange: str | None = None
    listing_date: str | None = None
    underwriters: list[str] = Field(default_factory=list)
    use_of_proceeds: str | None = None


# Shareholders extraction schema
class ShareholdersExtraction(BaseStructuredExtraction):
    controlling_shareholders: list[str] = Field(default_factory=list)
    cornerstone_investors: list[str] = Field(default_factory=list)
    holding_platforms: list[str] = Field(default_factory=list)


# --- Dataset row types ---


class SectionDatasetRow(BaseModel):
    """One row in section_dataset.jsonl."""
    document_id: str
    section_name: str
    input: dict[str, Any]  # document_metadata + structured_facts
    output_text: str
    source_pages: list[int] = Field(default_factory=list)


class SubsectionDatasetRow(BaseModel):
    """One row in subsection_dataset.jsonl."""
    document_id: str
    section_name: str
    subsection_name: str
    input: dict[str, Any]
    output_text: str
    source_pages: list[int] = Field(default_factory=list)


class DataToTextDatasetRow(BaseModel):
    """One row in data_to_text_dataset.jsonl."""
    document_id: str
    task_type: str  # financial_narrative | risk_narrative | business_description
    input_data: dict[str, Any]
    target_text: str
    evidence: list[dict[str, Any]] = Field(default_factory=list)


class HeadingNormalizationOutput(BaseModel):
    """LLM output for heading normalization."""
    section_name_canonical: str
    confidence: float = Field(ge=0.0, le=1.0)


def get_json_schema_for_extraction(model: type[BaseModel]) -> dict[str, Any]:
    """Return JSON schema for OpenAI structured output."""
    return model.model_json_schema()

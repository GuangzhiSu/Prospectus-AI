"""Structured extraction via OpenAI API or local Qwen: section/subsection facts with JSON schema."""

from __future__ import annotations

from typing import Any

import structlog

from .client_factory import create_pipeline_llm_client
from .config import PipelineConfig
from .llm_protocol import PipelineLLMClient
from .prompts import load_prompt
from .schemas import (
    BusinessExtraction,
    FinancialExtraction,
    RiskFactorsExtraction,
    OfferingExtraction,
    ShareholdersExtraction,
    get_json_schema_for_extraction,
)

logger = structlog.get_logger()

MAX_CHARS = 20_000

# Map canonical section name -> extraction type and schema
SECTION_EXTRACTION_MAP = {
    "Business": ("business", BusinessExtraction),
    "Financial Information": ("financial", FinancialExtraction),
    "Risk Factors": ("risk_factors", RiskFactorsExtraction),
    "Underwriting": ("offering", OfferingExtraction),
    "Structure of the Global Offering": ("offering", OfferingExtraction),
    "Future Plans and Use of Proceeds": ("offering", OfferingExtraction),
    "Substantial Shareholders": ("shareholders", ShareholdersExtraction),
}


def _openai_schema_from_pydantic(schema: dict) -> dict:
    """Build OpenAI json_schema format: name, strict, schema."""
    return {
        "name": schema.get("title", "extraction") + "_schema",
        "strict": True,
        "schema": schema,
    }


def extract_section_structured(
    section_name: str,
    section_text: str,
    config: PipelineConfig,
    client: PipelineLLMClient | None = None,
    save_id: str | None = None,
) -> dict[str, Any] | None:
    """
    Run structured extraction for a section. Returns parsed dict or None on failure.
    Uses section_structured_extraction prompt and schema by section type.
    """
    entry = SECTION_EXTRACTION_MAP.get(section_name)
    if not entry:
        return None
    _, model_class = entry
    text = section_text[:MAX_CHARS] + ("\n\n[... truncated ...]" if len(section_text) > MAX_CHARS else "")

    prompt = load_prompt("section_structured_extraction", section_name=section_name, section_text=text)
    messages = [{"role": "user", "content": prompt}]
    schema = get_json_schema_for_extraction(model_class)
    response_format = _openai_schema_from_pydantic(schema)

    if client is None:
        client = create_pipeline_llm_client(config)
    try:
        resp = client.create_response(
            messages,
            response_format=response_format,
            response_format_type="json_schema",
            raw_save_id=save_id,
        )
    except Exception as e:
        logger.warning("extraction_failed", section=section_name, error=str(e))
        return None
    return resp.get("parsed")


def extract_financial_narrative(section_text: str, config: PipelineConfig, client: PipelineLLMClient | None = None) -> dict[str, Any] | None:
    """Extract financial facts for data-to-text (financial_narrative)."""
    text = section_text[:MAX_CHARS] + ("\n\n[... truncated ...]" if len(section_text) > MAX_CHARS else "")
    prompt = load_prompt("financial_narrative_extraction", section_text=text)
    messages = [{"role": "user", "content": prompt}]
    schema = get_json_schema_for_extraction(FinancialExtraction)
    response_format = _openai_schema_from_pydantic(schema)
    if client is None:
        client = create_pipeline_llm_client(config)
    try:
        resp = client.create_response(messages, response_format=response_format, response_format_type="json_schema")
        return resp.get("parsed")
    except Exception as e:
        logger.warning("financial_extraction_failed", error=str(e))
        return None


def extract_risk_narrative(section_text: str, config: PipelineConfig, client: PipelineLLMClient | None = None) -> dict[str, Any] | None:
    """Extract risk factors for data-to-text (risk_narrative)."""
    text = section_text[:MAX_CHARS] + ("\n\n[... truncated ...]" if len(section_text) > MAX_CHARS else "")
    prompt = load_prompt("risk_factor_extraction", section_text=text)
    messages = [{"role": "user", "content": prompt}]
    schema = get_json_schema_for_extraction(RiskFactorsExtraction)
    response_format = _openai_schema_from_pydantic(schema)
    if client is None:
        client = create_pipeline_llm_client(config)
    try:
        resp = client.create_response(messages, response_format=response_format, response_format_type="json_schema")
        return resp.get("parsed")
    except Exception as e:
        logger.warning("risk_extraction_failed", error=str(e))
        return None

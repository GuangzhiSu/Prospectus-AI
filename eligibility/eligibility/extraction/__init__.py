"""Section 1 — information extraction from user-uploaded documents."""
from __future__ import annotations

from .documents import DocumentBundle, TextBlock, load_document, load_documents
from .extract import (
    confirm_fields,
    extract_from_bundle,
    extract_from_paths,
    merge_deal_params,
)
from .issuer_builder import (
    MARKET_RULESETS,
    apply_confirmations,
    build_issuer_from_extraction,
    resolve_rulesets,
    structured_form_to_issuer,
)
from .schema import (
    DEAL_PARAM_FIELDS,
    NARRATIVE_TOPICS,
    QUANTIFIABLE_FIELDS,
    field_ids_deal_params,
    field_ids_quantifiable,
)

__all__ = [
    "DocumentBundle",
    "TextBlock",
    "load_document",
    "load_documents",
    "extract_from_bundle",
    "extract_from_paths",
    "confirm_fields",
    "merge_deal_params",
    "MARKET_RULESETS",
    "apply_confirmations",
    "build_issuer_from_extraction",
    "resolve_rulesets",
    "structured_form_to_issuer",
    "QUANTIFIABLE_FIELDS",
    "DEAL_PARAM_FIELDS",
    "NARRATIVE_TOPICS",
    "field_ids_quantifiable",
    "field_ids_deal_params",
]

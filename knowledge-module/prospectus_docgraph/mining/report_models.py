"""Reviewable refinement output (Part 4) — not applied until :func:`~prospectus_docgraph.mining.refinement.apply_refinement`."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class SectionRecommendation(BaseModel):
    section_id: str
    document_frequency: int = Field(
        ...,
        description="Distinct documents containing at least one instance of this section.",
    )
    support_count: int = Field(
        ...,
        description="Total section instances (may exceed document_frequency if duplicates exist).",
    )
    total_documents: int
    frequency_ratio: float
    mean_mapping_confidence: float | None = None
    current_mandatory: bool | None = None
    recommended_mandatory: bool
    rationale: str


class SubsectionRecommendation(BaseModel):
    parent_section_id: str
    subsection_id: str
    document_frequency: int
    support_count: int
    total_documents: int
    frequency_ratio_within_parent: float
    mean_mapping_confidence: float | None = None
    tier: Literal["mandatory_like", "frequent_optional", "rare_optional"]
    current_mandatory: bool | None = None
    recommended_mandatory: bool
    rationale: str


class OrderingRecommendation(BaseModel):
    """Update ``typical_order_index`` from corpus mean order (rounded)."""

    section_id: str
    current_typical_order_index: int | None = None
    recommended_typical_order_index: int
    average_order_index_observed: float


class PrecedenceRecommendation(BaseModel):
    """Directed edge ``typically_precedes`` candidate from transition mining."""

    predecessor_id: str
    successor_id: str
    transition_count: int
    transition_fraction_of_corpus: float
    rationale: str


class AliasRecommendation(BaseModel):
    """Suggest adding a surface string to ``aliases`` on a section or subsection node."""

    target_kind: Literal["section", "subsection"]
    target_id: str
    parent_section_id: str | None = Field(
        None,
        description="For subsections, ontology parent section id.",
    )
    suggested_alias: str
    sample_raw_titles: list[str] = Field(default_factory=list)
    evidence_count: int = 0
    mean_confidence_when_seen: float | None = None


class LowConfidenceMapping(BaseModel):
    kind: Literal["section", "subsection"]
    document_id: str
    raw_title: str
    normalized_title: str = ""
    canonical_id: str | None = None
    parent_section_id: str | None = None
    confidence: float
    match_method: str | None = None


class UnmatchedHeading(BaseModel):
    kind: Literal["section", "subsection"]
    document_id: str
    raw_title: str
    normalized_title: str = ""
    canonical_section_id: str | None = None
    canonical_subsection_id: str | None = None
    parent_section_instance_id: str | None = None
    match_method: str | None = None


class SectionCooccurrenceInsight(BaseModel):
    """Sections that often appear together in the same filing (unordered)."""

    section_a: str
    section_b: str
    co_document_count: int
    fraction_of_documents: float


class GraphRefinementReport(BaseModel):
    """
    Human-reviewable bundle produced by :class:`~prospectus_docgraph.mining.corpus_miner.CorpusMiner`.

    Apply explicitly via :func:`~prospectus_docgraph.mining.refinement.apply_refinement`.
    """

    total_documents: int
    mining_config_summary: dict[str, Any] = Field(default_factory=dict)
    section_recommendations: list[SectionRecommendation] = Field(default_factory=list)
    subsection_recommendations: list[SubsectionRecommendation] = Field(default_factory=list)
    ordering_recommendations: list[OrderingRecommendation] = Field(default_factory=list)
    precedence_recommendations: list[PrecedenceRecommendation] = Field(default_factory=list)
    alias_recommendations: list[AliasRecommendation] = Field(default_factory=list)
    low_confidence_mappings: list[LowConfidenceMapping] = Field(default_factory=list)
    unmatched_headings: list[UnmatchedHeading] = Field(default_factory=list)
    section_cooccurrence_insights: list[SectionCooccurrenceInsight] = Field(default_factory=list)

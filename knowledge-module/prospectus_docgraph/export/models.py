"""Structured records for planner / generator / alias training (Part 5)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class SectionSchemaCard(BaseModel):
    """One canonical section with ontology neighborhood (for schema supervision)."""

    section_id: str
    canonical_name: str
    aliases: list[str] = Field(default_factory=list)
    mandatory: bool
    optional: bool = Field(
        default=False,
        description="Typically ``not mandatory``; explicit for training labels.",
    )
    typical_order_index: int | None = None
    common_subsections: list[str] = Field(
        default_factory=list,
        description="Subsection node ids linked via ``contains``.",
    )
    optional_subsections: list[str] = Field(
        default_factory=list,
        description="Subsection node ids linked via ``optionally_contains``.",
    )
    common_patterns: list[str] = Field(
        default_factory=list,
        description="Pattern node ids from ``commonly_uses_pattern``.",
    )
    common_evidence_types: list[str] = Field(
        default_factory=list,
        description="Evidence node ids from ``supported_by`` (outgoing).",
    )
    activated_conditions: list[str] = Field(
        default_factory=list,
        description="Condition node ids touching this section via ``activated_by_condition``.",
    )
    typical_predecessors: list[str] = Field(
        default_factory=list,
        description="Section ids that ``typically_precedes`` this section.",
    )
    typical_successors: list[str] = Field(
        default_factory=list,
        description="Section ids this section ``typically_precedes``.",
    )


class PlannerTrainingExample(BaseModel):
    """One document section instance (TOC supervision for a planner)."""

    document_id: str
    section_instance_id: str
    canonical_section: str | None
    raw_section_title: str
    normalized_section_title: str = ""
    conditions_inferred: list[str] = Field(
        default_factory=list,
        description="From ParsedDocument.metadata['conditions'] or similar.",
    )
    ordered_subsection_instance_ids: list[str] = Field(default_factory=list)
    ordered_subsection_canonical_ids: list[str | None] = Field(default_factory=list)
    observed_subsections: list[str] = Field(
        default_factory=list,
        description="Distinct resolved subsection ontology ids under this instance.",
    )
    missing_canonical_subsections: list[str] = Field(
        default_factory=list,
        description="Mandatory ontology subsections not observed under this instance.",
    )
    page_start: int | None = None
    page_end: int | None = None
    summary_stats: dict[str, Any] = Field(
        default_factory=dict,
        description="e.g. num_subsection_instances, mean_subsection_confidence.",
    )


class GeneratorTrainingExample(BaseModel):
    """One section or subsection instance (generation supervision)."""

    document_id: str
    instance_id: str
    instance_kind: Literal["section", "subsection"]
    canonical_section: str | None
    canonical_subsection: str | None = None
    raw_title: str
    text: str = ""
    parent_context: str = ""
    structural_tags: list[str] = Field(default_factory=list)
    ordering_tags: dict[str, Any] = Field(default_factory=dict)


class AliasTrainingRecord(BaseModel):
    """Low-confidence or unmatched heading for review / alias training."""

    kind: Literal["section", "subsection", "unmatched"]
    document_id: str
    raw_title: str
    normalized_title: str = ""
    canonical_id: str | None = None
    parent_section_instance_id: str | None = None
    parent_canonical_section_id: str | None = None
    confidence: float | None = None
    match_method: str | None = None
    reason: str = ""

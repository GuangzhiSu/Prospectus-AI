"""Pydantic node models for prospectus structure (discriminated by ``node_type``)."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field

from prospectus_docgraph.models.enums import GraphLayer, NodeType


class BaseNode(BaseModel):
    """Shared fields for all structural nodes."""

    id: str = Field(..., description="Stable identifier (slug), unique in the graph.")
    description: str | None = Field(None, description="Optional gloss for tooling / UI.")
    graph_layer: Literal[GraphLayer.ONTOLOGY, GraphLayer.INSTANCE] = Field(
        GraphLayer.ONTOLOGY,
        description="Ontology = schema types; instance = document occurrence.",
    )


class SectionNode(BaseNode):
    """Top-level canonical chapter (HKEX-style section)."""

    node_type: Literal[NodeType.SECTION] = NodeType.SECTION
    canonical_name: str = Field(
        ...,
        description="Canonical section key, e.g. Risk_Factors.",
    )
    mandatory: bool = Field(
        ...,
        description="Whether the section is typically mandatory in this template.",
    )
    typical_order_index: int | None = Field(
        None,
        ge=0,
        description="Loose TOC ordering; lower appears earlier.",
    )
    aliases: list[str] = Field(
        default_factory=list,
        description="Alternative headings seen in prospectuses.",
    )


class SubsectionNode(BaseNode):
    """Nested heading type under a section."""

    node_type: Literal[NodeType.SUBSECTION] = NodeType.SUBSECTION
    canonical_name: str = Field(..., description="Subsection heading key.")
    parent_section: str = Field(
        ...,
        description="``id`` of the parent SectionNode.",
    )
    mandatory: bool = False
    aliases: list[str] = Field(default_factory=list)


class FunctionNode(BaseNode):
    """Disclosure function (why a passage exists: definitional, cautionary, etc.)."""

    node_type: Literal[NodeType.DISCLOSURE_FUNCTION] = NodeType.DISCLOSURE_FUNCTION
    canonical_name: str = Field(..., description="Function label / slug.")
    aliases: list[str] = Field(default_factory=list)


class PatternNode(BaseNode):
    """Rhetorical / boilerplate pattern."""

    node_type: Literal[NodeType.RHETORICAL_PATTERN] = NodeType.RHETORICAL_PATTERN
    canonical_name: str = Field(..., description="Pattern label / slug.")
    aliases: list[str] = Field(default_factory=list)


class EvidenceNode(BaseNode):
    """Evidence hook type (citation style, cross-ref to appendix, etc.)."""

    node_type: Literal[NodeType.EVIDENCE_TYPE] = NodeType.EVIDENCE_TYPE
    canonical_name: str = Field(..., description="Evidence-type label / slug.")
    aliases: list[str] = Field(default_factory=list)


class ConditionNode(BaseNode):
    """Listing regime or issuer condition (e.g. 18C, WVR) affecting disclosure."""

    node_type: Literal[NodeType.CONDITION_TYPE] = NodeType.CONDITION_TYPE
    canonical_name: str = Field(..., description="Condition label / slug.")
    aliases: list[str] = Field(default_factory=list)


class AliasNode(BaseNode):
    """
    Surface title variant (alias) that normalizes to another structural node.

    Edges ``has_alias`` usually link a SectionNode or SubsectionNode to an AliasNode.
    """

    node_type: Literal[NodeType.ALIAS_TITLE] = NodeType.ALIAS_TITLE
    alias_title: str = Field(..., description="Raw TOC / heading string variant.")
    target_node_id: str | None = Field(
        None,
        description="Resolved canonical node id, if known.",
    )


# --- Document instance nodes (Part 3: corpus, not ontology) -----------------


class DocumentNode(BaseNode):
    """One parsed prospectus filing instance."""

    id: str = Field(..., description="Stable id, e.g. doc:{document_id}.")
    node_type: Literal[NodeType.DOCUMENT] = NodeType.DOCUMENT
    graph_layer: Literal[GraphLayer.INSTANCE] = GraphLayer.INSTANCE
    document_id: str = Field(..., description="Corpus document id (matches ParsedDocument).")
    source_file: str = Field(..., description="Original file name or path key.")


class DocumentSectionInstanceNode(BaseNode):
    """One occurrence of a top-level section in a specific document."""

    node_type: Literal[NodeType.DOCUMENT_SECTION_INSTANCE] = (
        NodeType.DOCUMENT_SECTION_INSTANCE
    )
    graph_layer: Literal[GraphLayer.INSTANCE] = GraphLayer.INSTANCE
    document_id: str = Field(..., description="Parent document id.")
    instance_key: str = Field(
        ...,
        description="Unique key within this doc (e.g. section order index).",
    )
    canonical_section_id: str | None = Field(
        None,
        description="Resolved ontology SectionType id; may be None if unresolved.",
    )
    raw_title: str = ""
    normalized_title: str = ""
    page_start: int | None = Field(None, ge=1)
    page_end: int | None = Field(None, ge=1)
    order_index: int = Field(0, ge=0, description="Reading order among siblings.")
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    match_method: str | None = Field(None, description="How canonical was resolved.")


class DocumentSubsectionInstanceNode(BaseNode):
    """One occurrence of a subsection under a section instance."""

    node_type: Literal[NodeType.DOCUMENT_SUBSECTION_INSTANCE] = (
        NodeType.DOCUMENT_SUBSECTION_INSTANCE
    )
    graph_layer: Literal[GraphLayer.INSTANCE] = GraphLayer.INSTANCE
    document_id: str = Field(..., description="Parent document id.")
    parent_section_instance_id: str = Field(..., description="DocumentSectionInstance id.")
    instance_key: str = Field(..., description="Unique key within parent section.")
    canonical_subsection_id: str | None = Field(
        None,
        description="Ontology SubsectionType id if resolved.",
    )
    raw_title: str = ""
    normalized_title: str = ""
    page_start: int | None = Field(None, ge=1)
    page_end: int | None = Field(None, ge=1)
    order_index: int = Field(0, ge=0)
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    match_method: str | None = None


GraphNode = Annotated[
    SectionNode
    | SubsectionNode
    | FunctionNode
    | PatternNode
    | EvidenceNode
    | ConditionNode
    | AliasNode
    | DocumentNode
    | DocumentSectionInstanceNode
    | DocumentSubsectionInstanceNode,
    Field(discriminator="node_type"),
]

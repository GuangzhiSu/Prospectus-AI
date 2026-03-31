"""Enumerations for the HKEX prospectus structural graph (schema-first, not company facts)."""

from __future__ import annotations

from enum import Enum


class GraphLayer(str, Enum):
    """Whether a vertex belongs to the schema ontology or a concrete filing instance."""

    ONTOLOGY = "ontology"
    INSTANCE = "instance"


class NodeType(str, Enum):
    """Vertex categories in the structural knowledge graph."""

    # Ontology (schema)
    SECTION = "SectionType"
    SUBSECTION = "SubsectionType"
    DISCLOSURE_FUNCTION = "DisclosureFunction"
    RHETORICAL_PATTERN = "RhetoricalPattern"
    EVIDENCE_TYPE = "EvidenceType"
    CONDITION_TYPE = "ConditionType"
    ALIAS_TITLE = "AliasTitle"
    # Document instances (corpus)
    DOCUMENT = "DocumentNode"
    DOCUMENT_SECTION_INSTANCE = "DocumentSectionInstance"
    DOCUMENT_SUBSECTION_INSTANCE = "DocumentSubsectionInstance"


class EdgeType(str, Enum):
    """Directed structural relations between nodes."""

    CONTAINS = "contains"
    OPTIONALLY_CONTAINS = "optionally_contains"
    HAS_FUNCTION = "has_function"
    COMMONLY_USES_PATTERN = "commonly_uses_pattern"
    SUPPORTED_BY = "supported_by"
    ACTIVATED_BY_CONDITION = "activated_by_condition"
    HAS_ALIAS = "has_alias"
    TYPICALLY_PRECEDES = "typically_precedes"
    DEPENDS_ON = "depends_on"
    CROSS_REFERENCES = "cross_references"
    # Ontology ↔ instance (Part 3)
    INSTANCE_OF = "instance_of"
    APPEARS_IN = "appears_in"
    HAS_CHILD_INSTANCE = "has_child_instance"
    FOLLOWED_BY_INSTANCE = "followed_by_instance"

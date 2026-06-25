"""Edge records with optional mining / provenance metadata."""

from __future__ import annotations

from pydantic import BaseModel, Field

from prospectus_docgraph.models.enums import EdgeType


class EdgeMetadata(BaseModel):
    """Provenance and corpus statistics attached to an edge."""

    confidence: float | None = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Optional score in [0,1] from rules or learned model.",
    )
    source: str | None = Field(
        None,
        description="Origin of the edge (e.g. rule_pack, corpus_mining, manual_seed).",
    )
    support_count: int | None = Field(
        None,
        ge=0,
        description="How many prospectus instances supported this edge (mining).",
    )
    notes: str | None = Field(None, description="Free-text annotation.")


class TypedEdge(BaseModel):
    """
    One directed edge in the structural graph.

    Stored on ``networkx.MultiDiGraph`` edges together with a stable key for multigraphs.
    """

    source_id: str
    target_id: str
    edge_type: EdgeType
    metadata: EdgeMetadata = Field(default_factory=EdgeMetadata)

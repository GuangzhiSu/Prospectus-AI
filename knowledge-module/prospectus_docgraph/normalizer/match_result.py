"""Result of matching a raw title to a canonical graph node."""

from __future__ import annotations

from pydantic import BaseModel, Field

from prospectus_docgraph.models.enums import NodeType


class MatchAlternative(BaseModel):
    """Other plausible canonical targets below the chosen threshold or for review."""

    canonical_name: str = Field(..., description="Canonical id, e.g. Business.")
    confidence: float = Field(..., ge=0.0, le=1.0)
    match_method: str = Field(..., description="How this alternative was scored.")


class MatchResult(BaseModel):
    """Outcome of matching one raw heading string."""

    raw_title: str
    normalized_title: str
    canonical_name: str | None = Field(
        None,
        description="Resolved canonical node id (section or subsection slug).",
    )
    node_type: NodeType = Field(
        ...,
        description="Whether this match is a section type or subsection type.",
    )
    confidence: float = Field(..., ge=0.0, le=1.0)
    match_method: str = Field(
        ...,
        description="exact_id | exact_display | alias | fuzzy | none | llm (reserved).",
    )
    alternatives: list[MatchAlternative] = Field(
        default_factory=list,
        description="Runner-up candidates for debugging and active learning.",
    )

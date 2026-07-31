"""Configuration for corpus mining and graph refinement (Part 4)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class MiningConfig:
    """
    Thresholds for inferring recommendations from corpus statistics.

    All ``*_threshold`` values are in ``[0, 1]`` unless noted.
    """

    # Section appears in at least this fraction of documents → recommend mandatory.
    mandatory_threshold: float = 0.92
    # Section appears in fewer than this fraction → treat as optional / rare for sections.
    section_optional_threshold: float = 0.35
    # Subsection (within parent) doc-frequency tiers.
    frequent_optional_threshold: float = 0.22
    rare_optional_threshold: float = 0.04
    # Subsection doc-frequency above this (within parent) → recommend mandatory-like.
    mandatory_like_subsection_threshold: float = 0.88
    # Minimum fraction of documents that must exhibit a section transition A→B to add
    # ``typically_precedes`` (also subject to ``min_precedence_pair_count``).
    precedence_threshold: float = 0.12
    # Absolute minimum transition count (stability for small corpora).
    min_precedence_pair_count: int = 5
    # Mapping confidence below this triggers alias / review suggestions.
    alias_suggestion_threshold: float = 0.88
    # Confidence below this is listed as low-confidence (section/subsection instances).
    low_confidence_threshold: float = 0.88

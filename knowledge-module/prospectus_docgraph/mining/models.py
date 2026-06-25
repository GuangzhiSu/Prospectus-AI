"""Aggregated corpus statistics used by :class:`~prospectus_docgraph.mining.corpus_miner.CorpusMiner`."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class SectionMinedStats:
    """Empirical statistics for one canonical section id across the ingested corpus."""

    section_id: str
    document_frequency: int
    support_count: int
    average_order_index: float
    average_token_length: float
    predecessor_counts: dict[str, int] = field(default_factory=dict)
    successor_counts: dict[str, int] = field(default_factory=dict)
    mean_mapping_confidence: float = 0.0
    # Other sections that appear in the same document (unordered pair counts).
    cooccurrence_counts: dict[str, int] = field(default_factory=dict)


@dataclass
class SubsectionMinedStats:
    """Statistics for one canonical subsection slug under a parent section id."""

    parent_section_id: str
    subsection_id: str
    document_frequency: int
    support_count: int
    average_order_index_within_parent: float
    mean_mapping_confidence: float = 0.0
    # Other subsection ids that appear together under the same parent section instance (doc counts).
    cooccurrence_with: dict[str, int] = field(default_factory=dict)


@dataclass
class MinedCorpusSnapshot:
    """
    Full mining input: either produced by :func:`~prospectus_docgraph.mining.collector.collect_from_graph`
    or constructed manually in tests.
    """

    total_documents: int
    section_stats: dict[str, SectionMinedStats]
    # parent_section_id -> subsection_id -> stats
    subsection_stats: dict[str, dict[str, SubsectionMinedStats]]
    # Ordered predecessor → successor counts (global, for precedence mining).
    section_transition_counts: dict[tuple[str, str], int] = field(default_factory=dict)
    low_confidence_events: list[dict[str, Any]] = field(default_factory=list)
    unmatched_headings: list[dict[str, Any]] = field(default_factory=list)

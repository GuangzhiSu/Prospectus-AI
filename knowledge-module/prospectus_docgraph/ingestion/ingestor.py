"""
Ingest :class:`ParsedDocument` trees into a shared NetworkX graph alongside ontology nodes.

Ontology nodes (``graph_layer=ontology``) are schema types; instance nodes (``graph_layer=instance``)
are concrete occurrences in a filing. Both live in the same :class:`~prospectus_docgraph.graph.manager.GraphManager`.
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.models.edges import EdgeMetadata, TypedEdge
from prospectus_docgraph.models.enums import EdgeType, NodeType
from prospectus_docgraph.models.nodes import (
    DocumentNode,
    DocumentSectionInstanceNode,
    DocumentSubsectionInstanceNode,
)
from prospectus_docgraph.normalizer.match_result import MatchResult
from prospectus_docgraph.normalizer.title_normalizer import TitleNormalizer
from prospectus_docgraph.parser.structure import (
    ParsedDocument,
    ParsedSection,
    ParsedSubsection,
)


def _safe_doc_slug(document_id: str) -> str:
    s = re.sub(r"[^\w\-]+", "_", (document_id or "").strip())
    return s or "unknown"


def _edge(confidence: float | None = None, source: str = "ingest") -> EdgeMetadata:
    return EdgeMetadata(confidence=confidence, source=source)


@dataclass
class CorpusStatistics:
    """Aggregates collected while ingesting one or more :class:`ParsedDocument` instances."""

    section_frequency: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    subsection_frequency: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    section_order_index_sum: dict[str, float] = field(default_factory=lambda: defaultdict(float))
    section_order_index_count: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    predecessor_successor_pairs: dict[tuple[str, str], int] = field(
        default_factory=lambda: defaultdict(int)
    )
    total_section_instances: int = 0
    sum_order_index_all_sections: float = 0.0

    def record_section_instance(
        self,
        canonical_key: str,
        order_index: int,
    ) -> None:
        self.section_frequency[canonical_key] += 1
        self.section_order_index_sum[canonical_key] += float(order_index)
        self.section_order_index_count[canonical_key] += 1
        self.total_section_instances += 1
        self.sum_order_index_all_sections += float(order_index)

    def record_subsection_instance(self, canonical_key: str) -> None:
        self.subsection_frequency[canonical_key] += 1

    def record_transition(self, pred: str | None, succ: str) -> None:
        if pred is None:
            return
        self.predecessor_successor_pairs[(pred, succ)] += 1

    def to_summary_dict(self) -> dict[str, Any]:
        """Human-readable summary including per-section mean order_index."""
        avg_order_global: float | None
        if self.total_section_instances:
            avg_order_global = self.sum_order_index_all_sections / self.total_section_instances
        else:
            avg_order_global = None

        avg_order_by_section: dict[str, float] = {}
        for cid, n in self.section_order_index_count.items():
            if n:
                avg_order_by_section[cid] = self.section_order_index_sum[cid] / n

        top_pairs = sorted(
            self.predecessor_successor_pairs.items(),
            key=lambda x: -x[1],
        )[:50]

        return {
            "section_frequency": dict(sorted(self.section_frequency.items())),
            "subsection_frequency": dict(sorted(self.subsection_frequency.items())),
            "average_order_index_global": avg_order_global,
            "average_order_index_by_canonical_section": avg_order_by_section,
            "predecessor_successor_pairs": {
                f"{a} -> {b}": c for (a, b), c in top_pairs
            },
            "predecessor_successor_pairs_raw": [
                {"predecessor": a, "successor": b, "count": c}
                for (a, b), c in sorted(
                    self.predecessor_successor_pairs.items(),
                    key=lambda x: -x[1],
                )
            ],
            "totals": {
                "section_instances": self.total_section_instances,
            },
        }


class ProspectusIngestor:
    """
    Add document instance nodes and wire them to seeded ontology nodes.

    Edges
    -----
    - ``instance_of``: section/subsection instance → canonical SectionType / SubsectionType (if resolvable
      and subsection target exists in the graph).
    - ``has_child_instance``: document → section instance; section instance → subsection instance.
    - ``appears_in``: section instance → document; subsection instance → section instance.
    - ``followed_by_instance``: consecutive section instances within the same document.
    """

    def __init__(
        self,
        manager: GraphManager,
        *,
        normalizer: TitleNormalizer | None = None,
    ) -> None:
        self._mgr = manager
        self._normalizer = normalizer if normalizer is not None else TitleNormalizer()
        self._stats = CorpusStatistics()

    @property
    def statistics(self) -> CorpusStatistics:
        return self._stats

    def ingest_documents(self, documents: list[ParsedDocument]) -> None:
        for doc in documents:
            self.ingest_document(doc)

    def ingest_document(self, parsed_doc: ParsedDocument) -> None:
        doc_slug = _safe_doc_slug(parsed_doc.document_id)
        doc_node_id = f"doc:{doc_slug}"

        doc_node = DocumentNode(
            id=doc_node_id,
            document_id=parsed_doc.document_id,
            source_file=parsed_doc.source_file,
            description=f"Parsed filing {parsed_doc.document_id}",
        )
        self._mgr.add_node(doc_node)

        prev_canon_key: str | None = None
        prev_section_instance_id: str | None = None

        for order, sec in enumerate(parsed_doc.sections):
            sec_inst_id = f"{doc_node_id}:sec:{order}"
            match = self._resolve_section(sec)
            canon = match.canonical_name
            canon_key = canon if canon is not None else "__unresolved__"

            sec_node = DocumentSectionInstanceNode(
                id=sec_inst_id,
                document_id=parsed_doc.document_id,
                instance_key=str(order),
                canonical_section_id=canon,
                raw_title=sec.raw_title,
                normalized_title=match.normalized_title or sec.normalized_title,
                page_start=sec.page_start,
                page_end=sec.page_end,
                order_index=sec.order_index if sec.order_index is not None else order,
                confidence=match.confidence if canon else sec.confidence,
                match_method=match.match_method,
                description=f"Section instance in {parsed_doc.document_id}",
            )
            self._mgr.add_node(sec_node)

            self._stats.record_section_instance(canon_key, sec_node.order_index)
            self._stats.record_transition(prev_canon_key, canon_key)

            # Parent / membership
            self._mgr.add_edge(
                TypedEdge(
                    source_id=doc_node_id,
                    target_id=sec_inst_id,
                    edge_type=EdgeType.HAS_CHILD_INSTANCE,
                    metadata=_edge(sec_node.confidence),
                )
            )
            self._mgr.add_edge(
                TypedEdge(
                    source_id=sec_inst_id,
                    target_id=doc_node_id,
                    edge_type=EdgeType.APPEARS_IN,
                    metadata=_edge(sec_node.confidence),
                )
            )

            if canon and self._mgr.nx_graph.has_node(canon):
                self._mgr.add_edge(
                    TypedEdge(
                        source_id=sec_inst_id,
                        target_id=canon,
                        edge_type=EdgeType.INSTANCE_OF,
                        metadata=_edge(sec_node.confidence),
                    )
                )

            if prev_section_instance_id is not None:
                self._mgr.add_edge(
                    TypedEdge(
                        source_id=prev_section_instance_id,
                        target_id=sec_inst_id,
                        edge_type=EdgeType.FOLLOWED_BY_INSTANCE,
                        metadata=_edge(),
                    )
                )

            self._ingest_subsections(
                parsed_doc.document_id,
                sec_inst_id,
                canon,
                sec.subsections,
                path_prefix="",
            )

            prev_canon_key = canon_key
            prev_section_instance_id = sec_inst_id

    def _ingest_subsections(
        self,
        document_id: str,
        parent_section_instance_id: str,
        parent_canonical_section_id: str | None,
        subsections: list[ParsedSubsection],
        *,
        path_prefix: str,
    ) -> None:
        for idx, sub in enumerate(subsections):
            instance_key = f"{path_prefix}{idx}" if path_prefix == "" else f"{path_prefix}.{idx}"
            sub_id = f"{parent_section_instance_id}:sub:{instance_key.replace('.', '_')}"

            match = self._resolve_subsection(sub, parent_canonical_section_id)
            sub_canon = match.canonical_name
            sub_key = sub_canon if sub_canon is not None else "__unresolved__"
            self._stats.record_subsection_instance(sub_key)

            sub_node = DocumentSubsectionInstanceNode(
                id=sub_id,
                document_id=document_id,
                parent_section_instance_id=parent_section_instance_id,
                instance_key=instance_key,
                canonical_subsection_id=sub_canon,
                raw_title=sub.raw_title,
                normalized_title=match.normalized_title or sub.normalized_title,
                page_start=sub.page_start,
                page_end=sub.page_end,
                order_index=sub.order_index if sub.order_index is not None else idx,
                confidence=match.confidence,
                match_method=match.match_method,
                description=f"Subsection instance under {parent_section_instance_id}",
            )
            self._mgr.add_node(sub_node)

            self._mgr.add_edge(
                TypedEdge(
                    source_id=parent_section_instance_id,
                    target_id=sub_id,
                    edge_type=EdgeType.HAS_CHILD_INSTANCE,
                    metadata=_edge(sub_node.confidence),
                )
            )
            self._mgr.add_edge(
                TypedEdge(
                    source_id=sub_id,
                    target_id=parent_section_instance_id,
                    edge_type=EdgeType.APPEARS_IN,
                    metadata=_edge(sub_node.confidence),
                )
            )

            if sub_canon and self._mgr.nx_graph.has_node(sub_canon):
                self._mgr.add_edge(
                    TypedEdge(
                        source_id=sub_id,
                        target_id=sub_canon,
                        edge_type=EdgeType.INSTANCE_OF,
                        metadata=_edge(sub_node.confidence),
                    )
                )

            self._ingest_subsections(
                document_id,
                parent_section_instance_id,
                parent_canonical_section_id,
                sub.subsections,
                path_prefix=instance_key,
            )

    def _resolve_section(self, sec: ParsedSection) -> MatchResult:
        if sec.canonical_section:
            return MatchResult(
                raw_title=sec.raw_title,
                normalized_title=self._normalizer.normalize_text(sec.raw_title),
                canonical_name=sec.canonical_section,
                node_type=NodeType.SECTION,
                confidence=sec.confidence,
                match_method="parsed_field",
                alternatives=[],
            )
        return self._normalizer.match_section(sec.raw_title or sec.normalized_title)

    def _resolve_subsection(
        self,
        sub: ParsedSubsection,
        parent_canonical_section_id: str | None,
    ) -> MatchResult:
        if sub.canonical_subsection:
            return MatchResult(
                raw_title=sub.raw_title,
                normalized_title=self._normalizer.normalize_text(sub.raw_title),
                canonical_name=sub.canonical_subsection,
                node_type=NodeType.SUBSECTION,
                confidence=sub.confidence,
                match_method="parsed_field",
                alternatives=[],
            )
        return self._normalizer.match_subsection(
            sub.raw_title or sub.normalized_title,
            parent_canonical_section_id,
        )

    def summarize_corpus_statistics(self) -> dict[str, Any]:
        """Return a JSON-serializable summary of corpus-level ingestion stats."""
        return self._stats.to_summary_dict()

    def export_statistics_json(self, path: Path) -> None:
        """Write :meth:`summarize_corpus_statistics` to ``path``."""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(self.summarize_corpus_statistics(), indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
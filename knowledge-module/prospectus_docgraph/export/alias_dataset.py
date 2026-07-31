"""Alias / heading review dataset from instance nodes and mining collector."""

from __future__ import annotations

from prospectus_docgraph.export.models import AliasTrainingRecord
from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.mining.collector import collect_from_graph


class AliasTrainingExporter:
    """
    Export low-confidence resolved headings and unmatched headings for manual review.

    Uses the same aggregation as Part 4 :func:`~prospectus_docgraph.mining.collector.collect_from_graph`.
    """

    def __init__(self, *, low_confidence_threshold: float = 0.88) -> None:
        self.low_confidence_threshold = low_confidence_threshold

    def export_records(self, manager: GraphManager) -> list[AliasTrainingRecord]:
        snap = collect_from_graph(
            manager,
            low_confidence_threshold=self.low_confidence_threshold,
        )
        out: list[AliasTrainingRecord] = []
        for ev in snap.low_confidence_events:
            kind = str(ev.get("kind", "section"))
            p_inst = None
            p_canon = None
            if kind == "subsection":
                p_canon = ev.get("parent_section_id")  # canonical parent section id
            out.append(
                AliasTrainingRecord(
                    kind=kind if kind in ("section", "subsection") else "section",
                    document_id=str(ev.get("document_id", "")),
                    raw_title=str(ev.get("raw_title", "")),
                    normalized_title=str(ev.get("normalized_title", "")),
                    canonical_id=ev.get("canonical_id"),
                    parent_section_instance_id=p_inst,
                    parent_canonical_section_id=str(p_canon) if p_canon else None,
                    confidence=float(ev.get("confidence", 0.0)),
                    match_method=str(ev.get("match_method")) if ev.get("match_method") else None,
                    reason="low_confidence",
                )
            )
        for u in snap.unmatched_headings:
            out.append(
                AliasTrainingRecord(
                    kind="unmatched",
                    document_id=str(u.get("document_id", "")),
                    raw_title=str(u.get("raw_title", "")),
                    normalized_title=str(u.get("normalized_title", "")),
                    canonical_id=u.get("canonical_section_id") or u.get("canonical_subsection_id"),
                    parent_section_instance_id=u.get("parent_section_instance_id"),
                    parent_canonical_section_id=None,
                    confidence=None,
                    match_method=str(u.get("match_method")) if u.get("match_method") else None,
                    reason="unmatched_or_unknown_target",
                )
            )
        return out

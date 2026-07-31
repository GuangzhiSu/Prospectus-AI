"""Planner training examples from document section instances."""

from __future__ import annotations

import statistics
from typing import Any

from prospectus_docgraph.export.loaders import infer_conditions_from_metadata
from prospectus_docgraph.export.models import PlannerTrainingExample
from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.models.enums import EdgeType, GraphLayer
from prospectus_docgraph.models.nodes import (
    DocumentNode,
    DocumentSectionInstanceNode,
    DocumentSubsectionInstanceNode,
)
from prospectus_docgraph.parser.structure import ParsedDocument


class PlannerTrainingExporter:
    """Export one :class:`PlannerTrainingExample` per :class:`DocumentSectionInstanceNode`."""

    def export_records(
        self,
        manager: GraphManager,
        parsed_by_doc: dict[str, ParsedDocument] | None = None,
    ) -> list[PlannerTrainingExample]:
        parsed_by_doc = parsed_by_doc or {}
        out: list[PlannerTrainingExample] = []
        for node in manager.iter_nodes_by_layer(GraphLayer.INSTANCE):
            if not isinstance(node, DocumentNode):
                continue
            parsed = parsed_by_doc.get(node.document_id)
            secs = _section_instances_under_document(manager, node.id)
            secs.sort(key=lambda s: s.order_index)
            for sec in secs:
                out.append(self._one(manager, sec, parsed))
        return out

    def _one(
        self,
        manager: GraphManager,
        sec: DocumentSectionInstanceNode,
        parsed: ParsedDocument | None,
    ) -> PlannerTrainingExample:
        subs = _subsection_instances_under_section(manager, sec.id)
        subs.sort(key=lambda s: s.order_index)
        canon = sec.canonical_section_id
        ordered_ids = [s.id for s in subs]
        ordered_canon = [s.canonical_subsection_id for s in subs]
        observed = sorted(
            {x for x in ordered_canon if x is not None},
        )
        missing: list[str] = []
        if canon and manager.nx_graph.has_node(canon):
            mandatory = [
                n.id
                for n in manager.get_subsections_for_section_by_edge(
                    canon, edge_type=EdgeType.CONTAINS
                )
                if n.mandatory
            ]
            missing = sorted(set(mandatory) - set(observed))

        confs = [s.confidence for s in subs if subs]
        stats: dict[str, Any] = {
            "num_subsection_instances": len(subs),
            "section_confidence": sec.confidence,
        }
        if confs:
            stats["mean_subsection_confidence"] = statistics.mean(confs)

        return PlannerTrainingExample(
            document_id=sec.document_id,
            section_instance_id=sec.id,
            canonical_section=canon,
            raw_section_title=sec.raw_title,
            normalized_section_title=sec.normalized_title,
            conditions_inferred=infer_conditions_from_metadata(parsed),
            ordered_subsection_instance_ids=ordered_ids,
            ordered_subsection_canonical_ids=ordered_canon,
            observed_subsections=observed,
            missing_canonical_subsections=missing,
            page_start=sec.page_start,
            page_end=sec.page_end,
            summary_stats=stats,
        )


def _section_instances_under_document(manager: GraphManager, doc_id: str) -> list[DocumentSectionInstanceNode]:
    out: list[DocumentSectionInstanceNode] = []
    for nid, _t, _e in manager.get_neighbors(
        doc_id,
        direction="out",
        edge_types={EdgeType.HAS_CHILD_INSTANCE},
    ):
        n = manager.get_node(nid)
        if isinstance(n, DocumentSectionInstanceNode):
            out.append(n)
    return out


def _subsection_instances_under_section(
    manager: GraphManager,
    section_instance_id: str,
) -> list[DocumentSubsectionInstanceNode]:
    out: list[DocumentSubsectionInstanceNode] = []
    for nid, _t, _e in manager.get_neighbors(
        section_instance_id,
        direction="out",
        edge_types={EdgeType.HAS_CHILD_INSTANCE},
    ):
        n = manager.get_node(nid)
        if isinstance(n, DocumentSubsectionInstanceNode):
            out.append(n)
    return out

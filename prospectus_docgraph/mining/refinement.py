"""
Apply a reviewed :class:`~prospectus_docgraph.mining.report_models.GraphRefinementReport`
to ontology nodes and edges. Call **only** after explicit human approval.
"""

from __future__ import annotations

from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.mining.report_models import GraphRefinementReport
from prospectus_docgraph.models.edges import EdgeMetadata, TypedEdge
from prospectus_docgraph.models.enums import EdgeType
from prospectus_docgraph.models.nodes import SectionNode, SubsectionNode


def _has_typically_precedes(manager: GraphManager, pred: str, succ: str) -> bool:
    for nid, _t, _e in manager.get_neighbors(
        pred,
        direction="out",
        edge_types={EdgeType.TYPICALLY_PRECEDES},
    ):
        if nid == succ:
            return True
    return False


def _merge_alias(existing: list[str], new: str) -> list[str]:
    n = new.strip()
    if not n:
        return existing
    low = {x.strip().lower() for x in existing}
    if n.lower() in low:
        return existing
    return [*existing, n]


def apply_refinement(
    manager: GraphManager,
    report: GraphRefinementReport,
    *,
    apply_section_mandatory: bool = True,
    apply_subsection_mandatory: bool = True,
    apply_ordering: bool = True,
    apply_precedence_edges: bool = True,
    apply_alias_merges: bool = True,
) -> None:
    """
    Mutate the ontology layer in ``manager`` according to ``report``.

    Instance nodes are untouched. Missing ontology nodes are skipped with no error.
    """
    if apply_section_mandatory:
        for rec in report.section_recommendations:
            if not manager.nx_graph.has_node(rec.section_id):
                continue
            node = manager.get_node(rec.section_id)
            if not isinstance(node, SectionNode):
                continue
            updated = node.model_copy(update={"mandatory": rec.recommended_mandatory})
            manager.add_node(updated)

    if apply_subsection_mandatory:
        for rec in report.subsection_recommendations:
            if not manager.nx_graph.has_node(rec.subsection_id):
                continue
            node = manager.get_node(rec.subsection_id)
            if not isinstance(node, SubsectionNode):
                continue
            updated = node.model_copy(update={"mandatory": rec.recommended_mandatory})
            manager.add_node(updated)

    if apply_ordering:
        for rec in report.ordering_recommendations:
            if not manager.nx_graph.has_node(rec.section_id):
                continue
            node = manager.get_node(rec.section_id)
            if not isinstance(node, SectionNode):
                continue
            updated = node.model_copy(
                update={"typical_order_index": rec.recommended_typical_order_index}
            )
            manager.add_node(updated)

    if apply_precedence_edges:
        for rec in report.precedence_recommendations:
            if not manager.nx_graph.has_node(rec.predecessor_id):
                continue
            if not manager.nx_graph.has_node(rec.successor_id):
                continue
            if _has_typically_precedes(manager, rec.predecessor_id, rec.successor_id):
                continue
            manager.add_edge(
                TypedEdge(
                    source_id=rec.predecessor_id,
                    target_id=rec.successor_id,
                    edge_type=EdgeType.TYPICALLY_PRECEDES,
                    metadata=EdgeMetadata(
                        confidence=min(1.0, rec.transition_fraction_of_corpus),
                        source="corpus_mining",
                        support_count=rec.transition_count,
                        notes=rec.rationale[:500],
                    ),
                )
            )

    if apply_alias_merges:
        for rec in report.alias_recommendations:
            tid = rec.target_id
            if not manager.nx_graph.has_node(tid):
                continue
            node = manager.get_node(tid)
            if rec.target_kind == "section":
                if not isinstance(node, SectionNode):
                    continue
                aliases = _merge_alias(list(node.aliases), rec.suggested_alias)
                manager.add_node(node.model_copy(update={"aliases": aliases}))
            else:
                if not isinstance(node, SubsectionNode):
                    continue
                aliases = _merge_alias(list(node.aliases), rec.suggested_alias)
                manager.add_node(node.model_copy(update={"aliases": aliases}))

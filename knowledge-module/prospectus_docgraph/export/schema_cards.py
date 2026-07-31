"""Export section schema cards from ontology nodes and typed edges."""

from __future__ import annotations

from prospectus_docgraph.export.models import SectionSchemaCard
from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.models.enums import EdgeType
from prospectus_docgraph.models.nodes import SectionNode


class SectionSchemaCardExporter:
    """Build :class:`SectionSchemaCard` records for every :class:`SectionNode` in the graph."""

    def export_records(self, manager: GraphManager) -> list[SectionSchemaCard]:
        out: list[SectionSchemaCard] = []
        for sec in manager.get_sections():
            out.append(self._one(manager, sec))
        return out

    def _one(self, manager: GraphManager, sec: SectionNode) -> SectionSchemaCard:
        sid = sec.id
        common = [
            n.id
            for n in manager.get_subsections_for_section_by_edge(
                sid, edge_type=EdgeType.CONTAINS
            )
        ]
        optional = [
            n.id
            for n in manager.get_subsections_for_section_by_edge(
                sid, edge_type=EdgeType.OPTIONALLY_CONTAINS
            )
        ]
        patterns = self._both_ways(manager, sid, EdgeType.COMMONLY_USES_PATTERN)
        evidence = self._both_ways(manager, sid, EdgeType.SUPPORTED_BY)
        _ = self._out_kind(manager, sid, EdgeType.HAS_FUNCTION)  # reserved for future tags
        conditions = self._condition_neighbors(manager, sid)

        pred = [
            n
            for n, _t, _e in manager.get_neighbors(
                sid,
                direction="in",
                edge_types={EdgeType.TYPICALLY_PRECEDES},
            )
            if manager.nx_graph.has_node(n)
            and isinstance(manager.get_node(n), SectionNode)
        ]
        succ = [
            n
            for n, _t, _e in manager.get_neighbors(
                sid,
                direction="out",
                edge_types={EdgeType.TYPICALLY_PRECEDES},
            )
            if manager.nx_graph.has_node(n)
            and isinstance(manager.get_node(n), SectionNode)
        ]

        return SectionSchemaCard(
            section_id=sid,
            canonical_name=sec.canonical_name,
            aliases=list(sec.aliases),
            mandatory=sec.mandatory,
            optional=not sec.mandatory,
            typical_order_index=sec.typical_order_index,
            common_subsections=sorted(common),
            optional_subsections=sorted(optional),
            common_patterns=sorted(patterns),
            common_evidence_types=sorted(evidence),
            activated_conditions=sorted(conditions),
            typical_predecessors=sorted(pred),
            typical_successors=sorted(succ),
        )

    def _out_kind(self, manager: GraphManager, sid: str, et: EdgeType) -> list[str]:
        return [
            n
            for n, _t, _e in manager.get_neighbors(
                sid,
                direction="out",
                edge_types={et},
            )
        ]

    def _both_ways(self, manager: GraphManager, sid: str, et: EdgeType) -> list[str]:
        """Some seed graphs attach patterns/evidence in either direction."""
        seen: set[str] = set(self._out_kind(manager, sid, et))
        for n, _t, _e in manager.get_neighbors(
            sid,
            direction="in",
            edge_types={et},
        ):
            seen.add(n)
        return sorted(seen)

    def _condition_neighbors(self, manager: GraphManager, sid: str) -> list[str]:
        out: set[str] = set()
        for n, _t, _e in manager.get_neighbors(
            sid,
            direction="out",
            edge_types={EdgeType.ACTIVATED_BY_CONDITION},
        ):
            out.add(n)
        for n, _t, _e in manager.get_neighbors(
            sid,
            direction="in",
            edge_types={EdgeType.ACTIVATED_BY_CONDITION},
        ):
            out.add(n)
        return list(out)

"""
Graph manager backed by ``networkx.MultiDiGraph``.

All NetworkX usage is confined here so a Neo4j-backed implementation can expose the same API later.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterator, Literal

import networkx as nx
from pydantic import TypeAdapter

from prospectus_docgraph.models.edges import TypedEdge
from prospectus_docgraph.models.enums import EdgeType, GraphLayer, NodeType
from prospectus_docgraph.models.nodes import GraphNode, SectionNode, SubsectionNode

_GRAPH_NODE_ADAPTER: TypeAdapter[GraphNode] = TypeAdapter(GraphNode)


class GraphManager:
    """
    Structural prospectus graph with typed nodes and edges.

    Node attributes
    ----------------
    ``model`` : dict
        JSON-compatible dict from :class:`GraphNode` (discriminated union).

    Edge attributes
    ---------------
    ``model`` : dict
        JSON-compatible dict from :class:`TypedEdge``.
    """

    ATTR_NODE_MODEL = "model"
    ATTR_EDGE_MODEL = "model"

    def __init__(self, graph: nx.MultiDiGraph | None = None) -> None:
        self._g = graph if graph is not None else nx.MultiDiGraph()

    @property
    def nx_graph(self) -> nx.MultiDiGraph:
        """Low-level access; prefer methods below for backend portability."""
        return self._g

    def add_node(self, node: GraphNode) -> None:
        """Insert or replace a node by ``node.id``."""
        payload = _GRAPH_NODE_ADAPTER.dump_python(node, mode="json")
        self._g.add_node(node.id, **{self.ATTR_NODE_MODEL: payload})

    def add_edge(self, edge: TypedEdge, *, key: int | None = None) -> Any:
        """
        Add a directed edge. Returns the multigraph edge key.

        Raises
        ------
        KeyError
            If ``source_id`` or ``target_id`` is not an existing node.
        """
        if not self._g.has_node(edge.source_id):
            raise KeyError(f"Unknown source node: {edge.source_id}")
        if not self._g.has_node(edge.target_id):
            raise KeyError(f"Unknown target node: {edge.target_id}")
        ep = edge.model_dump(mode="json")
        return self._g.add_edge(
            edge.source_id,
            edge.target_id,
            key=key,
            **{self.ATTR_EDGE_MODEL: ep},
        )

    def get_node(self, node_id: str) -> GraphNode:
        """Deserialize the Pydantic node model."""
        if not self._g.has_node(node_id):
            raise KeyError(f"Unknown node id: {node_id}")
        raw = self._g.nodes[node_id][self.ATTR_NODE_MODEL]
        return _GRAPH_NODE_ADAPTER.validate_python(raw)

    def get_neighbors(
        self,
        node_id: str,
        *,
        direction: Literal["out", "in", "both"] = "out",
        edge_types: set[EdgeType] | None = None,
    ) -> list[tuple[str, EdgeType, TypedEdge]]:
        """
        List neighbor node ids connected to ``node_id``, with edge type and full edge model.

        Parameters
        ----------
        direction
            ``out`` = successors, ``in`` = predecessors, ``both`` = union (deduplicated by neighbor).
        edge_types
            If set, only include edges whose type is in this set.
        """
        if not self._g.has_node(node_id):
            raise KeyError(f"Unknown node id: {node_id}")

        results: list[tuple[str, EdgeType, TypedEdge]] = []
        seen: set[tuple[str, str, Any]] = set()

        def consider(u: str, v: str, k: Any, *, neighbor: str) -> None:
            data = self._g.edges[u, v, k]
            te = TypedEdge.model_validate(data[self.ATTR_EDGE_MODEL])
            if edge_types is not None and te.edge_type not in edge_types:
                return
            sig = (u, v, k)
            if sig in seen:
                return
            seen.add(sig)
            results.append((neighbor, te.edge_type, te))

        if direction in ("out", "both"):
            for _u, v, k in self._g.out_edges(node_id, keys=True):
                consider(node_id, v, k, neighbor=v)
        if direction in ("in", "both"):
            for u, _v, k in self._g.in_edges(node_id, keys=True):
                consider(u, node_id, k, neighbor=u)

        return results

    def get_sections(self) -> list[SectionNode]:
        """Return all section nodes sorted by ``typical_order_index`` (None last)."""
        sections: list[SectionNode] = []
        for _nid, data in self._g.nodes(data=True):
            node = _GRAPH_NODE_ADAPTER.validate_python(data[self.ATTR_NODE_MODEL])
            if isinstance(node, SectionNode):
                sections.append(node)

        def sort_key(s: SectionNode) -> tuple[int, str]:
            o = s.typical_order_index
            return (o if o is not None else 10**9, s.id)

        sections.sort(key=sort_key)
        return sections

    def iter_nodes_by_layer(self, layer: GraphLayer) -> Iterator[GraphNode]:
        """Yield nodes whose ``graph_layer`` matches (ontology vs instance)."""
        for _nid, data in self._g.nodes(data=True):
            node = _GRAPH_NODE_ADAPTER.validate_python(data[self.ATTR_NODE_MODEL])
            if node.graph_layer == layer:
                yield node

    def get_subsections_for_section(self, section_id: str) -> list[SubsectionNode]:
        """
        Subsection nodes linked from ``section_id`` via ``contains`` or ``optionally_contains``.
        """
        allowed = {EdgeType.CONTAINS, EdgeType.OPTIONALLY_CONTAINS}
        out: list[SubsectionNode] = []
        for neighbor, etype, _te in self.get_neighbors(
            section_id, direction="out", edge_types=allowed
        ):
            node = self.get_node(neighbor)
            if isinstance(node, SubsectionNode):
                out.append(node)
        return out

    def get_subsections_for_section_by_edge(
        self,
        section_id: str,
        *,
        edge_type: EdgeType,
    ) -> list[SubsectionNode]:
        """Subsection nodes linked via a single edge type (e.g. ``contains`` vs ``optionally_contains``)."""
        out: list[SubsectionNode] = []
        for neighbor, etype, _te in self.get_neighbors(
            section_id,
            direction="out",
            edge_types={edge_type},
        ):
            node = self.get_node(neighbor)
            if isinstance(node, SubsectionNode):
                out.append(node)
        return out

    def iter_typed_edges(self) -> Iterator[tuple[str, str, TypedEdge]]:
        """Yield ``(source_id, target_id, edge_model)`` for every edge in the graph."""
        for u, v, _k, edata in self._g.edges(keys=True, data=True):
            te = TypedEdge.model_validate(edata[self.ATTR_EDGE_MODEL])
            yield u, v, te

    def export_graph_json(self, path: Path) -> None:
        """
        Write a portable JSON file with nodes and edges (not only NetworkX node-link).

        Format version 1.
        """
        nodes_out: list[dict[str, Any]] = []
        for _nid, data in self._g.nodes(data=True):
            nodes_out.append(data[self.ATTR_NODE_MODEL])

        edges_out: list[dict[str, Any]] = []
        for u, v, k, edata in self._g.edges(keys=True, data=True):
            em = edata[self.ATTR_EDGE_MODEL]
            edges_out.append(
                {
                    "source": u,
                    "target": v,
                    "key": k,
                    "edge": em,
                }
            )

        doc = {
            "format": "prospectus_docgraph",
            "version": 1,
            "nodes": nodes_out,
            "edges": edges_out,
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    def load_graph_json(self, path: Path) -> None:
        """Replace the in-memory graph from :meth:`export_graph_json` format."""
        raw = json.loads(path.read_text(encoding="utf-8"))
        if raw.get("format") != "prospectus_docgraph":
            raise ValueError("Unknown graph JSON format.")
        self._g.clear()
        for n in raw["nodes"]:
            node = _GRAPH_NODE_ADAPTER.validate_python(n)
            self.add_node(node)
        for item in raw["edges"]:
            edge = TypedEdge.model_validate(item["edge"])
            self.add_edge(edge, key=item.get("key"))

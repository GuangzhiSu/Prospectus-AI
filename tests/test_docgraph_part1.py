"""Part 1: enums, nodes, edges, GraphManager, seed, JSON I/O."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.models.edges import EdgeMetadata, TypedEdge
from prospectus_docgraph.models.enums import EdgeType, NodeType
from prospectus_docgraph.models.nodes import (
    AliasNode,
    SectionNode,
    SubsectionNode,
)
from prospectus_docgraph.schema.seed import CANONICAL_SECTION_SPECS, seed_canonical_sections


def test_enums_distinct() -> None:
    assert NodeType.SECTION.value == "SectionType"
    assert EdgeType.CONTAINS.value == "contains"


def test_section_node_roundtrip_via_manager() -> None:
    mgr = GraphManager()
    s = SectionNode(
        id="S1",
        canonical_name="Summary",
        mandatory=True,
        typical_order_index=2,
        aliases=["Executive Summary"],
        description="Exec summary",
    )
    mgr.add_node(s)
    out = mgr.get_node("S1")
    assert isinstance(out, SectionNode)
    assert out.canonical_name == "Summary"
    assert out.aliases == ["Executive Summary"]


def test_seed_count_matches_specs() -> None:
    mgr = seed_canonical_sections()
    secs = mgr.get_sections()
    assert len(secs) == len(CANONICAL_SECTION_SPECS)
    assert secs[0].id == "Expected_Timetable"
    assert secs[-1].id == "Appendices"


def test_subsection_edge() -> None:
    mgr = seed_canonical_sections()
    sub = SubsectionNode(
        id="sub:rf:general",
        canonical_name="General risks",
        parent_section="Risk_Factors",
        mandatory=True,
        aliases=[],
    )
    mgr.add_node(sub)
    mgr.add_edge(
        TypedEdge(
            source_id="Risk_Factors",
            target_id=sub.id,
            edge_type=EdgeType.CONTAINS,
            metadata=EdgeMetadata(source="seed", support_count=1),
        )
    )
    subs = mgr.get_subsections_for_section("Risk_Factors")
    assert len(subs) == 1
    assert subs[0].canonical_name == "General risks"


def test_export_import_json_roundtrip() -> None:
    mgr = seed_canonical_sections()
    sub = SubsectionNode(
        id="sub:test",
        canonical_name="Test",
        parent_section="Summary",
    )
    mgr.add_node(sub)
    mgr.add_edge(
        TypedEdge(
            source_id="Summary",
            target_id=sub.id,
            edge_type=EdgeType.CONTAINS,
        )
    )
    with tempfile.TemporaryDirectory() as td:
        p = Path(td) / "g.json"
        mgr.export_graph_json(p)
        mgr2 = GraphManager()
        mgr2.load_graph_json(p)
        assert len(mgr2.get_sections()) == len(CANONICAL_SECTION_SPECS)
        assert mgr2.get_node("sub:test").canonical_name == "Test"


def test_get_neighbors_filter() -> None:
    mgr = GraphManager()
    a = SectionNode(
        id="A",
        canonical_name="A",
        mandatory=True,
        typical_order_index=0,
    )
    b = AliasNode(id="al", alias_title="Ay", target_node_id="A")
    mgr.add_node(a)
    mgr.add_node(b)
    mgr.add_edge(
        TypedEdge(source_id="A", target_id="al", edge_type=EdgeType.HAS_ALIAS)
    )
    mgr.add_edge(
        TypedEdge(source_id="al", target_id="A", edge_type=EdgeType.CROSS_REFERENCES)
    )
    out_only = mgr.get_neighbors("A", direction="out", edge_types={EdgeType.HAS_ALIAS})
    assert len(out_only) == 1
    both = mgr.get_neighbors("A", direction="both")
    assert len(both) >= 1


def test_json_format_version() -> None:
    mgr = seed_canonical_sections()
    with tempfile.TemporaryDirectory() as td:
        p = Path(td) / "x.json"
        mgr.export_graph_json(p)
        doc = json.loads(p.read_text(encoding="utf-8"))
        assert doc["format"] == "prospectus_docgraph"
        assert doc["version"] == 1

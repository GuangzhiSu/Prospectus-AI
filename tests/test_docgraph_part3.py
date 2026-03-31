"""Part 3: instance nodes, ingestion, corpus statistics."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.ingestion import ProspectusIngestor
from prospectus_docgraph.models.enums import EdgeType, GraphLayer, NodeType
from prospectus_docgraph.models.nodes import DocumentNode, DocumentSectionInstanceNode
from prospectus_docgraph.parser.structure import ParsedDocument, ParsedSection
from prospectus_docgraph.schema.seed import seed_canonical_sections


def _fake_ipo_doc() -> ParsedDocument:
    """Minimal parsed TOC matching Part 3 example (canonical ids from seed)."""
    sections = [
        ParsedSection(
            document_id="demo-001",
            source_file="demo.pdf",
            raw_title="Summary",
            normalized_title="summary",
            canonical_section="Summary",
            page_start=10,
            page_end=25,
            order_index=0,
            confidence=0.99,
        ),
        ParsedSection(
            document_id="demo-001",
            source_file="demo.pdf",
            raw_title="Risk Factors",
            canonical_section="Risk_Factors",
            page_start=26,
            page_end=80,
            order_index=1,
            confidence=0.99,
        ),
        ParsedSection(
            document_id="demo-001",
            source_file="demo.pdf",
            raw_title="Business",
            canonical_section="Business",
            page_start=81,
            page_end=200,
            order_index=2,
            confidence=0.99,
        ),
        ParsedSection(
            document_id="demo-001",
            source_file="demo.pdf",
            raw_title="Financial Information",
            canonical_section="Financial_Information",
            page_start=201,
            page_end=260,
            order_index=3,
            confidence=0.99,
        ),
        ParsedSection(
            document_id="demo-001",
            source_file="demo.pdf",
            raw_title="Future Plans and Use of Proceeds",
            canonical_section="Future_Plans_and_Use_of_Proceeds",
            page_start=261,
            page_end=280,
            order_index=4,
            confidence=0.99,
        ),
    ]
    return ParsedDocument(
        document_id="demo-001",
        source_file="demo.pdf",
        sections=sections,
    )


def test_ingest_creates_instance_and_ontology_layers() -> None:
    mgr = seed_canonical_sections()
    ingestor = ProspectusIngestor(mgr)
    doc = _fake_ipo_doc()
    ingestor.ingest_document(doc)

    ontology = list(mgr.iter_nodes_by_layer(GraphLayer.ONTOLOGY))
    instance = list(mgr.iter_nodes_by_layer(GraphLayer.INSTANCE))
    assert len(ontology) == len(mgr.get_sections())
    assert len(instance) == 1 + 5  # document + five section instances

    doc_node = mgr.get_node("doc:demo-001")
    assert isinstance(doc_node, DocumentNode)
    assert doc_node.node_type == NodeType.DOCUMENT

    sec0 = mgr.get_node("doc:demo-001:sec:0")
    assert isinstance(sec0, DocumentSectionInstanceNode)
    assert sec0.canonical_section_id == "Summary"


def test_instance_of_and_followed_by_edges() -> None:
    mgr = seed_canonical_sections()
    ingestor = ProspectusIngestor(mgr)
    ingestor.ingest_document(_fake_ipo_doc())

    nbrs_summary = mgr.get_neighbors("doc:demo-001:sec:0", direction="out")
    types_out = {t for _nid, t, _e in nbrs_summary}
    assert EdgeType.INSTANCE_OF in types_out
    assert EdgeType.APPEARS_IN in types_out

    # Summary -> Risk Factors
    fb = mgr.get_neighbors(
        "doc:demo-001:sec:0",
        direction="out",
        edge_types={EdgeType.FOLLOWED_BY_INSTANCE},
    )
    assert len(fb) == 1
    assert fb[0][0] == "doc:demo-001:sec:1"


def test_corpus_statistics_and_export() -> None:
    mgr = seed_canonical_sections()
    ingestor = ProspectusIngestor(mgr)
    ingestor.ingest_documents([_fake_ipo_doc(), _fake_ipo_doc()])
    summary = ingestor.summarize_corpus_statistics()
    assert summary["section_frequency"]["Summary"] == 2
    assert summary["totals"]["section_instances"] == 10
    assert summary["average_order_index_global"] is not None
    pairs = summary["predecessor_successor_pairs_raw"]
    assert any(p["predecessor"] == "Summary" and p["successor"] == "Risk_Factors" for p in pairs)

    with tempfile.TemporaryDirectory() as td:
        p = Path(td) / "stats.json"
        ingestor.export_statistics_json(p)
        loaded = json.loads(p.read_text(encoding="utf-8"))
        assert loaded["section_frequency"]["Business"] == 2

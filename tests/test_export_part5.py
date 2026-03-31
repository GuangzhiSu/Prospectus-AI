"""Part 5: training export (schema cards, planner, generator, alias, CLI)."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from prospectus_docgraph.export.bundle import ExportConfig, TrainingDataBundleExporter
from prospectus_docgraph.export.cli import main
from prospectus_docgraph.export.loaders import load_parsed_documents
from prospectus_docgraph.export.schema_cards import SectionSchemaCardExporter
from prospectus_docgraph.ingestion import ProspectusIngestor
from prospectus_docgraph.models.edges import EdgeMetadata, TypedEdge
from prospectus_docgraph.models.enums import EdgeType
from prospectus_docgraph.models.nodes import PatternNode, SubsectionNode
from prospectus_docgraph.parser.structure import ParsedDocument, ParsedSection
from prospectus_docgraph.schema.seed import seed_canonical_sections


def test_schema_cards_include_neighbors() -> None:
    mgr = seed_canonical_sections()
    mgr.add_node(
        SubsectionNode(
            id="sub:rf:general",
            canonical_name="General risks",
            parent_section="Risk_Factors",
            mandatory=True,
        )
    )
    mgr.add_edge(
        TypedEdge(
            source_id="Risk_Factors",
            target_id="sub:rf:general",
            edge_type=EdgeType.CONTAINS,
        )
    )
    mgr.add_node(PatternNode(id="pat:warn", canonical_name="warning_disclosure"))
    mgr.add_edge(
        TypedEdge(
            source_id="Risk_Factors",
            target_id="pat:warn",
            edge_type=EdgeType.COMMONLY_USES_PATTERN,
        )
    )
    mgr.add_edge(
        TypedEdge(
            source_id="Summary",
            target_id="Risk_Factors",
            edge_type=EdgeType.TYPICALLY_PRECEDES,
            metadata=EdgeMetadata(source="test", support_count=10),
        )
    )
    cards = SectionSchemaCardExporter().export_records(mgr)
    rf = next(c for c in cards if c.section_id == "Risk_Factors")
    assert "sub:rf:general" in rf.common_subsections
    assert "pat:warn" in rf.common_patterns
    assert "Summary" in rf.typical_predecessors


def test_bundle_writes_jsonl_and_csv() -> None:
    mgr = seed_canonical_sections()
    doc = ParsedDocument(
        document_id="t1",
        source_file="x.pdf",
        metadata={"conditions": ["18C"]},
        sections=[
            ParsedSection(
                document_id="t1",
                source_file="x.pdf",
                raw_title="Summary",
                canonical_section="Summary",
                text="Hello summary body.",
                order_index=0,
                confidence=0.99,
            ),
        ],
    )
    ProspectusIngestor(mgr).ingest_document(doc)
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "exp"
        mgr.export_graph_json(Path(td) / "g.json")
        summary = TrainingDataBundleExporter(
            ExportConfig(formats=("json", "jsonl", "csv"))
        ).export_all(mgr, out, {"t1": doc})
        assert summary["planner_examples"] >= 1
        assert (out / "planner_training.jsonl").is_file()
        assert (out / "section_schema_cards_summary.csv").is_file()
        line = (out / "planner_training.jsonl").read_text(encoding="utf-8").strip()
        row = json.loads(line)
        assert row["document_id"] == "t1"
        assert row["conditions_inferred"] == ["18C"]
        gen = json.loads((out / "generator_training.jsonl").read_text(encoding="utf-8").splitlines()[0])
        assert gen["instance_kind"] == "section"
        assert "Hello summary body." in gen["text"]


def test_cli_loads_graph_and_parsed(tmp_path: Path) -> None:
    mgr = seed_canonical_sections()
    gpath = tmp_path / "graph.json"
    mgr.export_graph_json(gpath)
    parsed_path = tmp_path / "p.json"
    parsed_path.write_text(
        json.dumps(
            [
                {
                    "document_id": "d0",
                    "source_file": "a.pdf",
                    "sections": [],
                    "metadata": {},
                }
            ]
        ),
        encoding="utf-8",
    )
    out = tmp_path / "out"
    code = main(
        [
            "--input-graph",
            str(gpath),
            "--output",
            str(out),
            "--parsed-corpus",
            str(parsed_path),
            "--formats",
            "json",
        ]
    )
    assert code == 0
    assert (out / "export_summary.json").is_file()


def test_load_parsed_jsonl(tmp_path: Path) -> None:
    p = tmp_path / "c.jsonl"
    p.write_text(
        '{"document_id":"a","source_file":"f","sections":[]}\n',
        encoding="utf-8",
    )
    m = load_parsed_documents(p)
    assert "a" in m

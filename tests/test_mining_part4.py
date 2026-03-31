"""Part 4: corpus mining, refinement report, apply_refinement (mocked + small graph)."""

from __future__ import annotations

from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.ingestion import ProspectusIngestor
from prospectus_docgraph.mining import (
    CorpusMiner,
    MiningConfig,
    MinedCorpusSnapshot,
    SectionMinedStats,
    SubsectionMinedStats,
    apply_refinement,
)
from prospectus_docgraph.models.edges import TypedEdge
from prospectus_docgraph.models.enums import EdgeType
from prospectus_docgraph.models.nodes import SubsectionNode
from prospectus_docgraph.parser.structure import ParsedDocument, ParsedSection
from prospectus_docgraph.schema.seed import seed_canonical_sections


def test_mocked_snapshot_section_mandatory_and_precedence() -> None:
    cfg = MiningConfig(
        mandatory_threshold=0.90,
        precedence_threshold=0.10,
        min_precedence_pair_count=5,
        frequent_optional_threshold=0.20,
        mandatory_like_subsection_threshold=0.85,
    )
    miner = CorpusMiner(cfg)
    td = 150
    snap = MinedCorpusSnapshot(
        total_documents=td,
        section_stats={
            "Summary": SectionMinedStats(
                section_id="Summary",
                document_frequency=140,
                support_count=140,
                average_order_index=2.0,
                average_token_length=2.5,
                predecessor_counts={},
                successor_counts={"Risk_Factors": 130},
                mean_mapping_confidence=0.97,
                cooccurrence_counts={"Risk_Factors": 130},
            ),
            "Risk_Factors": SectionMinedStats(
                section_id="Risk_Factors",
                document_frequency=145,
                support_count=145,
                average_order_index=6.0,
                average_token_length=2.0,
                predecessor_counts={"Summary": 130},
                successor_counts={},
                mean_mapping_confidence=0.96,
                cooccurrence_counts={},
            ),
        },
        subsection_stats={},
        section_transition_counts={("Summary", "Risk_Factors"): 130},
        low_confidence_events=[
            {
                "kind": "section",
                "canonical_id": "Business",
                "raw_title": "Our Business",
                "normalized_title": "our business",
                "confidence": 0.72,
                "match_method": "fuzzy",
                "document_id": "d1",
            }
        ],
        unmatched_headings=[],
    )
    report = miner.mine_snapshot(snap)
    assert report.total_documents == 150
    summ = next(r for r in report.section_recommendations if r.section_id == "Summary")
    assert summ.recommended_mandatory is True
    assert summ.frequency_ratio == 140 / 150
    prec = report.precedence_recommendations
    assert any(p.predecessor_id == "Summary" and p.successor_id == "Risk_Factors" for p in prec)
    assert any(a.suggested_alias == "our business" for a in report.alias_recommendations)


def test_apply_refinement_updates_ontology() -> None:
    mgr = seed_canonical_sections()
    mgr.add_node(
        SubsectionNode(
            id="sub:rf:general",
            canonical_name="General risks",
            parent_section="Risk_Factors",
            mandatory=False,
        )
    )
    mgr.add_edge(
        TypedEdge(
            source_id="Risk_Factors",
            target_id="sub:rf:general",
            edge_type=EdgeType.CONTAINS,
        )
    )

    snap = MinedCorpusSnapshot(
        total_documents=100,
        section_stats={
            "Risk_Factors": SectionMinedStats(
                section_id="Risk_Factors",
                document_frequency=95,
                support_count=95,
                average_order_index=5.0,
                average_token_length=2.0,
                mean_mapping_confidence=0.95,
            ),
        },
        subsection_stats={
            "Risk_Factors": {
                "sub:rf:general": SubsectionMinedStats(
                    parent_section_id="Risk_Factors",
                    subsection_id="sub:rf:general",
                    document_frequency=90,
                    support_count=120,
                    average_order_index_within_parent=0.0,
                    mean_mapping_confidence=0.94,
                ),
            },
        },
        section_transition_counts={},
        low_confidence_events=[],
        unmatched_headings=[],
    )
    cfg = MiningConfig(
        mandatory_threshold=0.90,
        mandatory_like_subsection_threshold=0.85,
        frequent_optional_threshold=0.20,
    )
    report = CorpusMiner(cfg).mine_snapshot(snap, manager=mgr)

    apply_refinement(
        mgr,
        report,
        apply_precedence_edges=False,
        apply_alias_merges=False,
    )
    assert mgr.get_node("Risk_Factors").mandatory is True
    sub = mgr.get_node("sub:rf:general")
    assert sub.mandatory is True


def test_mine_graph_end_to_end() -> None:
    doc = ParsedDocument(
        document_id="ipo-1",
        source_file="a.pdf",
        sections=[
            ParsedSection(
                document_id="ipo-1",
                source_file="a.pdf",
                raw_title="Summary",
                canonical_section="Summary",
                order_index=0,
                confidence=0.99,
            ),
            ParsedSection(
                document_id="ipo-1",
                source_file="a.pdf",
                raw_title="Risk Factors",
                canonical_section="Risk_Factors",
                order_index=1,
                confidence=0.99,
            ),
        ],
    )
    mgr = seed_canonical_sections()
    ProspectusIngestor(mgr).ingest_document(doc)
    report = CorpusMiner(MiningConfig(mandatory_threshold=0.5)).mine_graph(mgr)
    assert report.total_documents == 1
    assert len(report.section_recommendations) >= 2

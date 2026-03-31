#!/usr/bin/env python3
"""
Demo: ingest a fake ParsedDocument (Summary, Risk Factors, Business, Financials, Use of Proceeds)
into the schema-first graph alongside canonical SectionType nodes.
"""

from __future__ import annotations

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from prospectus_docgraph.ingestion import ProspectusIngestor
from prospectus_docgraph.models.enums import GraphLayer
from prospectus_docgraph.parser.structure import ParsedDocument, ParsedSection
from prospectus_docgraph.schema.seed import seed_canonical_sections


def build_demo_document() -> ParsedDocument:
    sections = [
        ParsedSection(
            document_id="HKEX-DEMO-2026",
            source_file="example_prospectus.pdf",
            raw_title="Summary",
            canonical_section="Summary",
            page_start=12,
            page_end=28,
            order_index=0,
            confidence=0.99,
        ),
        ParsedSection(
            document_id="HKEX-DEMO-2026",
            source_file="example_prospectus.pdf",
            raw_title="Risk Factors",
            canonical_section="Risk_Factors",
            page_start=30,
            page_end=95,
            order_index=1,
            confidence=0.99,
        ),
        ParsedSection(
            document_id="HKEX-DEMO-2026",
            source_file="example_prospectus.pdf",
            raw_title="Business",
            canonical_section="Business",
            page_start=96,
            page_end=210,
            order_index=2,
            confidence=0.99,
        ),
        ParsedSection(
            document_id="HKEX-DEMO-2026",
            source_file="example_prospectus.pdf",
            raw_title="Financial Information",
            canonical_section="Financial_Information",
            page_start=211,
            page_end=275,
            order_index=3,
            confidence=0.99,
        ),
        ParsedSection(
            document_id="HKEX-DEMO-2026",
            source_file="example_prospectus.pdf",
            raw_title="Future Plans and Use of Proceeds",
            canonical_section="Future_Plans_and_Use_of_Proceeds",
            page_start=276,
            page_end=290,
            order_index=4,
            confidence=0.99,
        ),
    ]
    return ParsedDocument(
        document_id="HKEX-DEMO-2026",
        source_file="example_prospectus.pdf",
        sections=sections,
    )


def main() -> None:
    mgr = seed_canonical_sections()
    ingestor = ProspectusIngestor(mgr)
    ingestor.ingest_document(build_demo_document())

    n_ontology = sum(1 for _ in mgr.iter_nodes_by_layer(GraphLayer.ONTOLOGY))
    n_instance = sum(1 for _ in mgr.iter_nodes_by_layer(GraphLayer.INSTANCE))
    print("Ontology nodes (schema):", n_ontology)
    print("Instance nodes (this filing):", n_instance)
    print()
    print("Corpus statistics (single doc):")
    import json

    print(json.dumps(ingestor.summarize_corpus_statistics(), indent=2))


if __name__ == "__main__":
    main()

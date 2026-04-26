"""
Stage 1: build the structural ontology + instance graph from Stage 0 section JSONs.

Steps
-----
1. Load each ``prospectus_kg_output/sections_toc/<doc>.json`` into a ``ParsedDocument``.
2. Seed canonical SectionType ontology nodes via ``seed_canonical_sections``.
3. Ingest every document with ``ProspectusIngestor`` (instance nodes + edges).
4. Run ``CorpusMiner`` to produce a refinement report (frequencies, ordering, precedence,
   alias suggestions).
5. Apply the report to refine ontology nodes (mandatory flags, typical order, precedence edges,
   alias merges).
6. Export graph to ``prospectus_kg_output/structure/docgraph.json`` and write the report +
   corpus-statistics summary.

The entire pass is deterministic and LLM-free.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any

import structlog

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from prospectus_docgraph.graph.manager import GraphManager  # noqa: E402
from prospectus_docgraph.ingestion.ingestor import ProspectusIngestor  # noqa: E402
from prospectus_docgraph.mining.corpus_miner import CorpusMiner  # noqa: E402
from prospectus_docgraph.mining.refinement import apply_refinement  # noqa: E402
from prospectus_docgraph.normalizer.title_normalizer import TitleNormalizer  # noqa: E402
from prospectus_docgraph.parser.structure import ParsedDocument  # noqa: E402
from prospectus_docgraph.schema.seed import seed_canonical_sections  # noqa: E402

log = structlog.get_logger()


def _load_parsed_doc(path: Path) -> ParsedDocument:
    raw = json.loads(path.read_text(encoding="utf-8"))
    # Strip fields not in ParsedDocument / ParsedSection (like match_method); pydantic ignores
    # extras by default, so direct validation works.
    return ParsedDocument.model_validate(raw)


def run(
    sections_dir: Path,
    out_dir: Path,
) -> dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.time()

    mgr = GraphManager()
    seed_canonical_sections(mgr)
    log.info("seeded_ontology", nodes=mgr.nx_graph.number_of_nodes())

    normalizer = TitleNormalizer(fuzzy_cutoff=0.78)
    ingestor = ProspectusIngestor(mgr, normalizer=normalizer)

    files = sorted(
        [p for p in sections_dir.glob("*.json") if not p.name.startswith("_")]
    )

    docs: list[ParsedDocument] = []
    for f in files:
        try:
            docs.append(_load_parsed_doc(f))
        except Exception as exc:  # noqa: BLE001
            log.exception("parsed_doc_load_failed", doc=f.stem, error=str(exc))

    ingestor.ingest_documents(docs)
    log.info(
        "ingested",
        documents=len(docs),
        nodes=mgr.nx_graph.number_of_nodes(),
        edges=mgr.nx_graph.number_of_edges(),
    )

    miner = CorpusMiner()
    report = miner.mine_graph(mgr)
    log.info(
        "mined",
        section_recs=len(report.section_recommendations),
        ordering_recs=len(report.ordering_recommendations),
        precedence_recs=len(report.precedence_recommendations),
        aliases=len(report.alias_recommendations),
        unmatched=len(report.unmatched_headings),
    )

    apply_refinement(
        mgr,
        report,
        apply_section_mandatory=True,
        apply_subsection_mandatory=True,
        apply_ordering=True,
        apply_precedence_edges=True,
        apply_alias_merges=True,
    )
    log.info(
        "refined",
        nodes=mgr.nx_graph.number_of_nodes(),
        edges=mgr.nx_graph.number_of_edges(),
    )

    graph_path = out_dir / "docgraph.json"
    mgr.export_graph_json(graph_path)

    report_path = out_dir / "refinement_report.json"
    report_path.write_text(
        report.model_dump_json(indent=2) + "\n",
        encoding="utf-8",
    )
    stats_path = out_dir / "corpus_statistics.json"
    ingestor.export_statistics_json(stats_path)

    summary = {
        "stage": "stage1_structure",
        "documents_loaded": len(docs),
        "graph_nodes": mgr.nx_graph.number_of_nodes(),
        "graph_edges": mgr.nx_graph.number_of_edges(),
        "graph_path": str(graph_path),
        "report_path": str(report_path),
        "statistics_path": str(stats_path),
        "elapsed_seconds": round(time.time() - t0, 2),
    }
    (out_dir / "_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return summary


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="Stage 1: structural KG build.")
    ap.add_argument(
        "--sections-dir", type=Path, default=Path("prospectus_kg_output/sections_toc")
    )
    ap.add_argument(
        "--out-dir", type=Path, default=Path("prospectus_kg_output/structure")
    )
    args = ap.parse_args()
    summary = run(args.sections_dir, args.out_dir)
    print(json.dumps(summary, indent=2, ensure_ascii=False))

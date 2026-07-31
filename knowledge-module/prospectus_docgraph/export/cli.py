"""Command-line interface for Part 5 training exports."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from prospectus_docgraph.export.bundle import ExportConfig, TrainingDataBundleExporter
from prospectus_docgraph.export.loaders import load_graph, load_parsed_documents


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Export schema-first graph + instances to planner/generator/alias training files.",
    )
    p.add_argument(
        "--input",
        "--input-graph",
        dest="input_graph",
        type=Path,
        required=True,
        help="Graph JSON from GraphManager.export_graph_json (format prospectus_docgraph v1).",
    )
    p.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Output directory for JSON, JSONL, and CSV artifacts.",
    )
    p.add_argument(
        "--parsed-corpus",
        type=Path,
        default=None,
        help="Optional JSON or JSONL of ParsedDocument objects (body text + metadata).",
    )
    p.add_argument(
        "--formats",
        default="json,jsonl,csv",
        help="Comma-separated: json, jsonl, csv (default: all).",
    )
    p.add_argument(
        "--alias-confidence-threshold",
        type=float,
        default=0.88,
        help="Passed to alias mining collector (default 0.88).",
    )
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_arg_parser().parse_args(argv)
    fmt_parts = [x.strip().lower() for x in args.formats.split(",") if x.strip()]
    valid = {"json", "jsonl", "csv"}
    for f in fmt_parts:
        if f not in valid:
            print(f"Unknown format: {f}", file=sys.stderr)
            return 2

    mgr = load_graph(args.input_graph)
    parsed = load_parsed_documents(args.parsed_corpus) if args.parsed_corpus else None

    cfg = ExportConfig(
        formats=tuple(f for f in fmt_parts if f in valid),  # type: ignore[assignment]
        alias_low_confidence_threshold=args.alias_confidence_threshold,
    )
    exporter = TrainingDataBundleExporter(cfg)
    summary = exporter.export_all(mgr, args.output, parsed)
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

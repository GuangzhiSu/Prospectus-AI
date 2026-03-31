#!/usr/bin/env python3
"""
CLI for prospectus_docgraph (stats, schema load, seed demo).

Examples
--------
  python scripts/docgraph_cli.py seed-stats
  python scripts/docgraph_cli.py load-schema prospectus_docgraph/schema/data/default_schema.yaml
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


def cmd_seed_stats() -> None:
    from prospectus_docgraph.graph.manager import GraphManager
    from prospectus_docgraph.models.edges import EdgeMetadata, TypedEdge
    from prospectus_docgraph.models.enums import EdgeType
    from prospectus_docgraph.models.nodes import AliasNode
    from prospectus_docgraph.schema.seed import seed_canonical_sections

    mgr = seed_canonical_sections()
    alias = AliasNode(
        id="alias:risks_short",
        alias_title="Principal Risk Factors",
        target_node_id="Risk_Factors",
        description="Alias example",
    )
    mgr.add_node(alias)
    mgr.add_edge(
        TypedEdge(
            source_id="Risk_Factors",
            target_id=alias.id,
            edge_type=EdgeType.HAS_ALIAS,
            metadata=EdgeMetadata(source="demo", confidence=1.0),
        )
    )
    print("sections:", len(mgr.get_sections()))
    print("neighbors Risk_Factors:", len(mgr.get_neighbors("Risk_Factors")))


def cmd_load_schema(path: Path) -> None:
    from prospectus_docgraph.schema.loaders import load_schema_registry

    reg = load_schema_registry(path)
    print(f"version={reg.version} node_types={len(reg.node_types)} edge_types={len(reg.edge_types)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="prospectus_docgraph CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("seed-stats", help="Seed canonical sections + demo edge")
    p.set_defaults(func=lambda _: cmd_seed_stats())

    p2 = sub.add_parser("load-schema", help="Load YAML/JSON schema registry")
    p2.add_argument("path", type=Path)
    p2.set_defaults(func=lambda a: cmd_load_schema(a.path))

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()

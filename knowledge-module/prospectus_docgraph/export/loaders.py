"""Load graph JSON and optional parsed-document corpora."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.parser.structure import ParsedDocument


def load_graph(path: Path) -> GraphManager:
    """Load a graph from :meth:`~prospectus_docgraph.graph.manager.GraphManager.export_graph_json` format."""
    mgr = GraphManager()
    mgr.load_graph_json(path)
    return mgr


def load_parsed_documents(path: Path) -> dict[str, ParsedDocument]:
    """
    Load one or many :class:`ParsedDocument` objects keyed by ``document_id``.

    Supports ``.json`` (object or array) and ``.jsonl`` (one JSON object per line).
    """
    if path.suffix.lower() == ".jsonl":
        out: dict[str, ParsedDocument] = {}
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            p = ParsedDocument.model_validate_json(line)
            out[p.document_id] = p
        return out

    raw: Any = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, list):
        return {p["document_id"]: ParsedDocument.model_validate(p) for p in raw}
    return {raw["document_id"]: ParsedDocument.model_validate(raw)}


def infer_conditions_from_metadata(parsed: ParsedDocument | None) -> list[str]:
    """Read ``metadata['conditions']`` as string or list of strings (extensible)."""
    if parsed is None:
        return []
    meta = parsed.metadata
    c = meta.get("conditions")
    if c is None:
        return []
    if isinstance(c, str):
        return [c]
    if isinstance(c, list):
        return [str(x) for x in c]
    return [str(c)]

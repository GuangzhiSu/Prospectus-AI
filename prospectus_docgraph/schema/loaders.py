"""
Load structural *schema* metadata (allowed node/edge kinds, descriptions).

This is not the live NetworkX graph — it is a registry for validation and documentation.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field


class NodeTypeSpec(BaseModel):
    """Registry entry for a node kind (documentation + optional constraints)."""

    description: str = ""
    json_schema_hints: dict[str, Any] = Field(default_factory=dict)


class EdgeTypeSpec(BaseModel):
    """Registry entry for an edge kind."""

    description: str = ""
    allowed_source_kinds: list[str] = Field(default_factory=list)
    allowed_target_kinds: list[str] = Field(default_factory=list)


class GraphSchemaRegistry(BaseModel):
    """
    Top-level schema bundle loaded from JSON/YAML.

    Used to validate that graph operations only use known kinds (optional enforcement).
    """

    version: str = "0.1.0"
    node_types: dict[str, NodeTypeSpec] = Field(default_factory=dict)
    edge_types: dict[str, EdgeTypeSpec] = Field(default_factory=dict)
    extra: dict[str, Any] = Field(default_factory=dict)


def load_schema_registry(path: Path) -> GraphSchemaRegistry:
    """
    Load a :class:`GraphSchemaRegistry` from ``.json`` or ``.yaml`` / ``.yml``.

    Parameters
    ----------
    path:
        File path; suffix determines parser.
    """
    text = path.read_text(encoding="utf-8")
    suffix = path.suffix.lower()
    if suffix in {".yaml", ".yml"}:
        raw: Any = yaml.safe_load(text)
    elif suffix == ".json":
        raw = json.loads(text)
    else:
        raise ValueError(f"Unsupported schema file type: {path.suffix}")

    if not isinstance(raw, dict):
        raise ValueError("Schema root must be a mapping.")
    return GraphSchemaRegistry.model_validate(raw)


def save_schema_registry(registry: GraphSchemaRegistry, path: Path) -> None:
    """Write registry to JSON or YAML based on ``path`` suffix."""
    path.parent.mkdir(parents=True, exist_ok=True)
    suffix = path.suffix.lower()
    if suffix in {".yaml", ".yml"}:
        path.write_text(
            yaml.safe_dump(
                registry.model_dump(), sort_keys=False, allow_unicode=True
            ),
            encoding="utf-8",
        )
    elif suffix == ".json":
        path.write_text(
            json.dumps(registry.model_dump(), indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    else:
        raise ValueError(f"Unsupported schema file type: {path.suffix}")

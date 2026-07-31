"""
Export utilities for ML training (e.g. title normalization, edge classification).

Implementations will write JSONL / Parquet; interfaces only here.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

from prospectus_docgraph.graph.manager import GraphManager


class TrainingExporter(ABC):
    """Abstract: structural graph → training artifacts."""

    @abstractmethod
    def export(self, manager: GraphManager, out_dir: Path) -> None:
        raise NotImplementedError

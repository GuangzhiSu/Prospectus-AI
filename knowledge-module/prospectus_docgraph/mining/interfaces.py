"""
Legacy corpus-mining hooks (directory-based). Part 4 uses
:class:`~prospectus_docgraph.mining.corpus_miner.CorpusMiner` on ingested graphs instead.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class CorpusMiningResult:
    """Opaque result bag; concrete miners will define stable keys."""

    stats: dict[str, Any] = field(default_factory=dict)
    edge_weight_updates: list[tuple[str, str, str, float]] = field(default_factory=list)
    """(source_id, target_id, edge_kind_value, new_weight)"""


class CorpusDirectoryMiner(ABC):
    """Abstract miner over a corpus root directory (legacy)."""

    @abstractmethod
    def run(self, corpus_root: Path) -> CorpusMiningResult:
        raise NotImplementedError

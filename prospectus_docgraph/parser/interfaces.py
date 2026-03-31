"""
Parser interfaces — PDF pipeline plugs in here later.

No dependency on the old ``ParsedHeading`` / ``ProspectusParser`` names from earlier stubs;
keep this file minimal and forward-compatible.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


@dataclass(frozen=True, slots=True)
class ParsedHeading:
    """One heading line in document order (before normalization)."""

    title_raw: str
    level: int
    page_hint: int | None = None


class ProspectusParser(ABC):
    """Abstract parser: source file → ordered headings."""

    @abstractmethod
    def parse_headings(self, source: Path) -> Sequence[ParsedHeading]:
        raise NotImplementedError

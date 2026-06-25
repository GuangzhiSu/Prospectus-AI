"""
Legacy abstract hook (optional). Prefer :class:`TitleNormalizer` for Part 2.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class LegacyTitleNormalizer(ABC):
    """Minimal abstract API kept for backwards compatibility."""

    @abstractmethod
    def normalize(self, title_raw: str) -> str | None:
        raise NotImplementedError

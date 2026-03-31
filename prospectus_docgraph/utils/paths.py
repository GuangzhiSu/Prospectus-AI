"""Path helpers (always use ``pathlib``)."""

from __future__ import annotations

from pathlib import Path


def ensure_dir(path: Path) -> Path:
    """Create directory if needed; return absolute path."""
    path.mkdir(parents=True, exist_ok=True)
    return path.resolve()

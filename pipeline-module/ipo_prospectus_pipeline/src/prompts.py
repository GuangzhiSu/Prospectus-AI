"""Load and render prompt templates (pipeline extraction + shared ai-module core rules)."""

from __future__ import annotations

import sys
from pathlib import Path

_PIPELINE_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
_REPO_ROOT = Path(__file__).resolve().parents[3]
_AI_MODULE = _REPO_ROOT / "ai-module"


def _ensure_ai_module_on_path() -> None:
    if _AI_MODULE.is_dir() and str(_AI_MODULE) not in sys.path:
        sys.path.insert(0, str(_AI_MODULE))


def _shared_core_extraction_rules() -> str:
    try:
        _ensure_ai_module_on_path()
        from prompts.loader import load_core_extraction_rules

        return load_core_extraction_rules()
    except Exception:
        return (
            "- Do not invent facts. If information is not present, use null and list in missing_fields.\n"
            "- Preserve original terminology from the source text."
        )


def load_prompt(name: str, **kwargs: str) -> str:
    """Load pipeline prompt file by name (without .txt), substitute {{key}} with kwargs."""
    path = _PIPELINE_PROMPTS_DIR / f"{name}.txt"
    if not path.exists():
        raise FileNotFoundError(f"Prompt not found: {path}")
    kwargs.setdefault("core_extraction_rules", _shared_core_extraction_rules())
    text = path.read_text(encoding="utf-8")
    for key, value in kwargs.items():
        text = text.replace("{{" + key + "}}", str(value))
    return text

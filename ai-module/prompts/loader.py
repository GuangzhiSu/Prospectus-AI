"""Load and render prompt templates from the prompts package."""

from __future__ import annotations

from pathlib import Path

from .paths import agents_dir, core_dir, prompts_root


def _resolve_template_path(name: str) -> Path:
    """Resolve template by relative path or bare agent name."""
    candidate = Path(name)
    if candidate.suffix:
        path = prompts_root() / name
        if path.is_file():
            return path
    for base in (agents_dir(), core_dir(), prompts_root()):
        for ext in (".txt", ".md"):
            path = base / f"{name}{ext}"
            if path.is_file():
                return path
    raise FileNotFoundError(f"Prompt template not found: {name}")


def load_template(name: str, **kwargs: str) -> str:
    """Load a template file and substitute ``{{key}}`` placeholders."""
    path = _resolve_template_path(name)
    text = path.read_text(encoding="utf-8")
    for key, value in kwargs.items():
        text = text.replace("{{" + key + "}}", str(value))
    return text


def load_core(name: str) -> str:
    """Load a core markdown file without substitution."""
    path = core_dir() / name
    if not path.is_file():
        raise FileNotFoundError(f"Core prompt file not found: {path}")
    return path.read_text(encoding="utf-8")


def load_core_extraction_rules() -> str:
    """Compact extraction-oriented subset of exchange drafting rules."""
    return (
        "- Do not invent facts. If information is not present, use null and list in missing_fields.\n"
        "- Preserve original terminology (company names, product names, figures as stated).\n"
        "- Every important extracted field should include an evidence snippet from the source text.\n"
        "- Treat uncontrolled or promotional language as a defect in extracted claims."
    )

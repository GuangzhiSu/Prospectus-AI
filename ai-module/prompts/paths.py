"""Resolve prompt package paths and section requirements location."""

from __future__ import annotations

import logging
import os
import warnings
from pathlib import Path

log = logging.getLogger(__name__)

_PROMPTS_ROOT = Path(__file__).resolve().parent
_AI_MODULE_ROOT = _PROMPTS_ROOT.parent
_REPO_ROOT = _AI_MODULE_ROOT.parent


def prompts_root() -> Path:
    return _PROMPTS_ROOT


def core_dir() -> Path:
    return _PROMPTS_ROOT / "core"


def agents_dir() -> Path:
    return _PROMPTS_ROOT / "agents"


def sections_dir() -> Path:
    return _PROMPTS_ROOT / "sections"


def resolve_requirements_path() -> Path:
    """Resolve section requirements JSON (SSOT with compatibility fallbacks).

    Order:
      1. ``AI_PROMPTS_REQUIREMENTS`` env var
      2. ``ai-module/prompts/sections/requirements.json``
      3. repo root ``agent2_section_requirements.json`` (deprecated fallback)
    """
    env_path = os.environ.get("AI_PROMPTS_REQUIREMENTS", "").strip()
    if env_path:
        p = Path(env_path)
        if p.is_file():
            return p
        log.warning("AI_PROMPTS_REQUIREMENTS set but file missing: %s", p)

    canonical = sections_dir() / "requirements.json"
    if canonical.is_file():
        return canonical

    legacy = _REPO_ROOT / "agent2_section_requirements.json"
    if legacy.is_file():
        warnings.warn(
            "Loading agent2_section_requirements.json from repo root is deprecated; "
            f"migrate to {canonical}",
            DeprecationWarning,
            stacklevel=2,
        )
        return legacy

    return canonical


def resolve_generation_rules_path() -> Path:
    return sections_dir() / "generation_rules.json"


def repo_root() -> Path:
    return _REPO_ROOT

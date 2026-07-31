"""Unified prompt templates and composition for Prospectus AI agents."""

from .composer import (
    augment_requirements,
    build_planner_prompt,
    build_prompt,
    build_revision_prompt,
    build_verifier_prompt,
    compose_agent1_table_summary,
    compose_legacy_writer,
    compose_legacy_writer_system,
    compose_planner_prompt,
    compose_revision_prompt,
    compose_verifier_prompt,
    compose_writer_prompt,
)
from .loader import load_core, load_core_extraction_rules, load_template
from .paths import resolve_requirements_path

__all__ = [
    "augment_requirements",
    "build_planner_prompt",
    "build_prompt",
    "build_revision_prompt",
    "build_verifier_prompt",
    "compose_agent1_table_summary",
    "compose_legacy_writer",
    "compose_legacy_writer_system",
    "compose_planner_prompt",
    "compose_revision_prompt",
    "compose_verifier_prompt",
    "compose_writer_prompt",
    "load_core",
    "load_core_extraction_rules",
    "load_template",
    "resolve_requirements_path",
]

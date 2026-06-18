"""Apply platform-provided config paths before importing agents."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any


def _ensure_ai_module_root() -> Path:
    """Return ai-module root (parent of prospectus_ai package) and put it on sys.path."""
    import sys

    root = Path(__file__).resolve().parents[1]
    root_str = str(root)
    if root_str not in sys.path:
        sys.path.insert(0, root_str)
    return root


def apply_job_paths(job: dict[str, Any]) -> None:
    """
    Map contract job inputs to environment variables consumed by agents.

    Platform-owned files are never hard-coded inside the AI module; they arrive
    via the job manifest.
    """
    _ensure_ai_module_root()
    inputs = job["inputs"]

    if section_req := inputs.get("section_requirements_path"):
        os.environ["PROSPECTUS_SECTION_REQUIREMENTS"] = section_req

    if kg_dir := inputs.get("kg_inputs_dir"):
        kg = Path(kg_dir)
        os.environ["PROSPECTUS_KG_INPUTS_DIR"] = str(kg)
        os.environ["PROSPECTUS_INPUT_SCHEMA"] = str(kg / "input_schema.json")
        os.environ["PROSPECTUS_INPUT_SCHEMA_CROSSWALK"] = str(
            kg / "input_schema_crosswalk.json"
        )

    if issuer := inputs.get("issuer_metadata_path"):
        os.environ["PROSPECTUS_ISSUER_METADATA"] = issuer

    options = job.get("options") or {}
    if options.get("stream_progress") is False:
        os.environ["AGENT2_STREAM"] = "0"
    else:
        os.environ.setdefault("AGENT2_STREAM", "1")


def patch_agent_hooks() -> None:
    """Monkey-patch path resolution so agents read platform config from env."""
    import agent2
    import prospectus_graph.crosswalk as crosswalk

    crosswalk_env = os.environ.get("PROSPECTUS_INPUT_SCHEMA_CROSSWALK")
    schema_env = os.environ.get("PROSPECTUS_INPUT_SCHEMA")
    if crosswalk_env:
        crosswalk._DEFAULT_CROSSWALK_PATH = Path(crosswalk_env)
    if schema_env:
        crosswalk._DEFAULT_SCHEMA_A_PATH = Path(schema_env)
    if hasattr(crosswalk._load_json, "cache_clear"):
        crosswalk._load_json.cache_clear()

    _orig_build_requirements = agent2._build_requirements_map

    def _wrapped_build_requirements() -> dict[str, dict]:
        from prospectus_graph.config import load_section_requirements

        env = os.environ.get("PROSPECTUS_SECTION_REQUIREMENTS")
        if env:
            return load_section_requirements(Path(env))
        return _orig_build_requirements()

    agent2._build_requirements_map = _wrapped_build_requirements

    _orig_resolve = agent2._resolve_issuer_metadata_path

    def _wrapped_resolve(explicit: Path | None) -> Path | None:
        if explicit is not None:
            return _orig_resolve(explicit)
        env = os.environ.get("PROSPECTUS_ISSUER_METADATA")
        if env and Path(env).is_file():
            return Path(env)
        return _orig_resolve(None)

    agent2._resolve_issuer_metadata_path = _wrapped_resolve

"""Build contract v1 job manifests from a platform workspace."""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

from prospectus_platform.workspace import WorkspaceLayout


def _abs(p: Path) -> str:
    return str(p.resolve())


def build_agent1_job(
    workspace: WorkspaceLayout,
    *,
    job_id: str | None = None,
    model: str = "Qwen/Qwen2.5-3B-Instruct",
    project_id: str | None = None,
) -> dict[str, Any]:
    workspace.ensure()
    return {
        "contract_version": "1.0",
        "job_id": job_id or f"agent1-{uuid.uuid4().hex[:12]}",
        "task": "agent1",
        "inputs": {
            "materials_dir": _abs(workspace.materials),
            "project_id": project_id,
        },
        "outputs": {"work_dir": _abs(workspace.agent1_output)},
        "options": {"model": model},
    }


def build_agent2_job(
    workspace: WorkspaceLayout,
    *,
    job_id: str | None = None,
    model: str = "Qwen/Qwen2.5-3B-Instruct",
    sections: list[str] | None = None,
    modification_instructions: str | None = None,
) -> dict[str, Any]:
    workspace.ensure()
    inputs: dict[str, Any] = {
        "materials_dir": _abs(workspace.materials),
        "agent1_output_dir": _abs(workspace.agent1_output),
        "section_requirements_path": _abs(workspace.section_requirements),
    }
    if workspace.issuer_metadata.is_file():
        inputs["issuer_metadata_path"] = _abs(workspace.issuer_metadata)
    crosswalk = workspace.kg_inputs / "input_schema_crosswalk.json"
    if crosswalk.is_file():
        inputs["kg_inputs_dir"] = _abs(workspace.kg_inputs)

    options: dict[str, Any] = {
        "model": model,
        "stream_progress": True,
        "finalize_bundle": True,
    }
    if sections:
        options["sections"] = sections
    if modification_instructions:
        options["modification_instructions"] = modification_instructions

    return {
        "contract_version": "1.0",
        "job_id": job_id or f"agent2-{uuid.uuid4().hex[:12]}",
        "task": "agent2",
        "inputs": inputs,
        "outputs": {"work_dir": _abs(workspace.agent2_output)},
        "options": options,
    }


def write_job(job: dict[str, Any], workspace: WorkspaceLayout) -> Path:
    workspace.ensure()
    path = workspace.jobs / f"{job['job_id']}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(job, f, indent=2)
    return path


def read_ai_result(workspace: WorkspaceLayout, task: str) -> dict[str, Any] | None:
    work_dir = workspace.agent1_output if task == "agent1" else workspace.agent2_output
    result_path = work_dir / "ai-result.json"
    if not result_path.is_file():
        return None
    with open(result_path, encoding="utf-8") as f:
        return json.load(f)

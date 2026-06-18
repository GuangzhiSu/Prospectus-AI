"""Validate AI job manifests against contract v1."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class ContractError(ValueError):
    """Raised when a job manifest violates the contract."""


def _require(obj: dict[str, Any], key: str, ctx: str) -> Any:
    if key not in obj:
        raise ContractError(f"{ctx}: missing required field '{key}'")
    return obj[key]


def validate_job(job: dict[str, Any]) -> None:
    """Minimal runtime validation (no jsonschema dependency)."""
    version = _require(job, "contract_version", "job")
    if version != "1.0":
        raise ContractError(f"Unsupported contract_version: {version!r} (expected '1.0')")

    task = _require(job, "task", "job")
    if task not in {"agent1", "agent2"}:
        raise ContractError(f"Invalid task: {task!r}")

    _require(job, "job_id", "job")
    inputs = _require(job, "inputs", "job")
    outputs = _require(job, "outputs", "job")

    materials = _require(inputs, "materials_dir", "inputs")
    if not Path(materials).is_absolute():
        raise ContractError("inputs.materials_dir must be an absolute path")

    work_dir = _require(outputs, "work_dir", "outputs")
    if not Path(work_dir).is_absolute():
        raise ContractError("outputs.work_dir must be an absolute path")

    if task == "agent2":
        for key in ("agent1_output_dir", "section_requirements_path"):
            val = _require(inputs, key, "inputs")
            if not Path(val).is_absolute():
                raise ContractError(f"inputs.{key} must be an absolute path")
        if not Path(inputs["agent1_output_dir"]).exists():
            raise ContractError(
                f"inputs.agent1_output_dir does not exist: {inputs['agent1_output_dir']}"
            )
        if not Path(inputs["section_requirements_path"]).is_file():
            raise ContractError(
                f"inputs.section_requirements_path not found: {inputs['section_requirements_path']}"
            )

    for optional in ("issuer_metadata_path", "kg_inputs_dir", "data_manifest_path"):
        if optional in inputs and inputs[optional] is not None:
            if not Path(inputs[optional]).is_absolute():
                raise ContractError(f"inputs.{optional} must be an absolute path")


def load_job(path: Path) -> dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        job = json.load(f)
    validate_job(job)
    return job

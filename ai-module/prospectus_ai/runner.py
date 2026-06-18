"""Execute agent1/agent2 jobs defined by the platform contract."""

from __future__ import annotations

import json
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from prospectus_ai.path_overrides import apply_job_paths, patch_agent_hooks
from prospectus_ai.validate import ContractError, validate_job


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _result_path(job: dict[str, Any]) -> Path:
    outputs = job["outputs"]
    explicit = outputs.get("result_manifest_path")
    if explicit:
        return Path(explicit)
    return Path(outputs["work_dir"]) / "ai-result.json"


def _write_result(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


def _collect_agent1_outputs(work_dir: Path) -> dict[str, Any]:
    out: dict[str, Any] = {"work_dir": str(work_dir)}
    mapping = {
        "agent1_manifest_path": "manifest.json",
        "text_chunks_path": "text_chunks.jsonl",
        "fact_store_path": "fact_store.jsonl",
        "rag_chunks_path": "rag_chunks.jsonl",
    }
    for key, name in mapping.items():
        p = work_dir / name
        if p.exists():
            out[key] = str(p)
    return out


def _collect_agent2_outputs(work_dir: Path) -> dict[str, Any]:
    out: dict[str, Any] = {"work_dir": str(work_dir)}
    combined = work_dir / "all_sections.md"
    if combined.exists():
        out["combined_draft_path"] = str(combined)

    section_files: list[dict[str, str]] = []
    for path in sorted(work_dir.glob("section_*.md")):
        # section_ExpectedTimetable_Expected_Timetable.md → ExpectedTimetable
        parts = path.stem.split("_")
        section_id = parts[1] if len(parts) > 1 else path.stem
        section_files.append({"section_id": section_id, "path": str(path)})
    if section_files:
        out["section_files"] = section_files

    bundle: dict[str, str] = {}
    for name in (
        "draft_clean.md",
        "validation_report.md",
        "evidence_register.jsonl",
        "coverage_matrix.md",
    ):
        p = work_dir / name
        if p.exists():
            bundle[name] = str(p)
    if bundle:
        out["bundle_artifacts"] = bundle
    return out


def run_agent1_job(job: dict[str, Any]) -> dict[str, Any]:
    from agent1 import run_agent1

    inputs = job["inputs"]
    options = job.get("options") or {}
    work_dir = Path(job["outputs"]["work_dir"])

    run_agent1(
        data_dir=inputs["materials_dir"],
        output_dir=work_dir,
        text_chunk_size=int(options.get("text_chunk_size", 600)),
        text_chunk_overlap=int(options.get("text_chunk_overlap", 100)),
        model_name=str(options.get("model", "Qwen/Qwen2.5-3B-Instruct")),
        project_id=inputs.get("project_id"),
    )
    return _collect_agent1_outputs(work_dir)


def run_agent2_job(job: dict[str, Any]) -> dict[str, Any]:
    import agent2

    inputs = job["inputs"]
    options = job.get("options") or {}
    work_dir = Path(job["outputs"]["work_dir"])
    work_dir.mkdir(parents=True, exist_ok=True)

    agent1_dir = Path(inputs["agent1_output_dir"])
    sections = options.get("sections")
    model = str(options.get("model", "Qwen/Qwen2.5-3B-Instruct"))
    mod_instructions = options.get("modification_instructions")
    finalize = options.get("finalize_bundle", True)

    issuer_path = None
    if inputs.get("issuer_metadata_path"):
        issuer_path = Path(inputs["issuer_metadata_path"])

    if mod_instructions and sections and len(sections) == 1:
        agent2.run_agent2_single(
            section_id=sections[0],
            rag_dir=agent1_dir,
            output_dir=work_dir,
            modification_instructions=mod_instructions,
            max_context_chars=int(options.get("max_context_chars", 12000)),
            max_revision_loops=int(options.get("max_revision_loops", 1)),
            model_name=model,
            issuer_metadata_path=issuer_path,
            finalize_bundle=finalize,
        )
    elif sections and len(sections) == 1:
        agent2.run_agent2_single(
            section_id=sections[0],
            rag_dir=agent1_dir,
            output_dir=work_dir,
            max_context_chars=int(options.get("max_context_chars", 12000)),
            max_revision_loops=int(options.get("max_revision_loops", 1)),
            model_name=model,
            issuer_metadata_path=issuer_path,
            finalize_bundle=finalize,
        )
    else:
        section_list = None if not sections else list(sections)
        agent2.run_agent2(
            rag_dir=agent1_dir,
            output_dir=work_dir,
            sections=section_list,
            max_context_chars=int(options.get("max_context_chars", 12000)),
            max_revision_loops=int(options.get("max_revision_loops", 1)),
            model_name=model,
            issuer_metadata_path=issuer_path,
            finalize_bundle=finalize,
        )

    return _collect_agent2_outputs(work_dir)


def run_job(job: dict[str, Any]) -> dict[str, Any]:
    """Run a validated job and return the ai-result payload."""
    validate_job(job)
    apply_job_paths(job)
    patch_agent_hooks()

    started = time.time()
    result: dict[str, Any] = {
        "contract_version": "1.0",
        "job_id": job["job_id"],
        "task": job["task"],
        "status": "success",
        "started_at": _utc_now(),
        "outputs": {},
    }

    try:
        if job["task"] == "agent1":
            result["outputs"] = run_agent1_job(job)
        else:
            result["outputs"] = run_agent2_job(job)
    except Exception as exc:
        result["status"] = "error"
        result["error"] = {
            "message": str(exc),
            "detail": traceback.format_exc(),
        }

    result["metrics"] = {"duration_ms": int((time.time() - started) * 1000)}
    result["finished_at"] = _utc_now()
    return result


def run_job_file(job_path: Path) -> dict[str, Any]:
    with open(job_path, encoding="utf-8") as f:
        job = json.load(f)
    result = run_job(job)
    _write_result(_result_path(job), result)
    return result


def run_job_file_safe(job_path: Path) -> int:
    """CLI entry: return process exit code."""
    try:
        with open(job_path, encoding="utf-8") as f:
            job = json.load(f)
        validate_job(job)
    except (OSError, json.JSONDecodeError, ContractError) as exc:
        print(f"[prospectus_ai] Invalid job: {exc}")
        return 2

    result_path = _result_path(job)
    result = run_job(job)
    _write_result(result_path, result)
    if result["status"] == "success":
        print(f"[prospectus_ai] OK → {result_path}")
        return 0
    print(f"[prospectus_ai] FAILED → {result_path}")
    return 1

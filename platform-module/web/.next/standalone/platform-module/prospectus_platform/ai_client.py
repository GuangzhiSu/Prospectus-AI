"""Spawn the AI module CLI from the platform module."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

from prospectus_platform.job_builder import read_ai_result
from prospectus_platform.workspace import WorkspaceLayout


def default_ai_module_root() -> Path:
    """platform-module/prospectus_platform → modular/ai-module"""
    return Path(__file__).resolve().parents[2] / "ai-module"


def default_python(ai_module_root: Path) -> str:
    venv_py = ai_module_root / ".venv" / "bin" / "python"
    if venv_py.is_file():
        return str(venv_py)
    return os.environ.get("AGENT1_PYTHON") or sys.executable


class AiModuleClient:
    """Run AI jobs via `python -m prospectus_ai run --job <path>`."""

    def __init__(
        self,
        ai_module_root: Path,
        python: str | None = None,
        extra_env: dict[str, str] | None = None,
    ) -> None:
        self.ai_module_root = ai_module_root.resolve()
        self.python = python or default_python(self.ai_module_root)
        self.extra_env = extra_env or {}

    def run_job_file(
        self,
        job_path: Path,
        *,
        stream_stdout: bool = True,
    ) -> tuple[int, dict[str, Any] | None]:
        env = {**os.environ, **self.extra_env}
        cmd = [self.python, "-m", "prospectus_ai", "run", "--job", str(job_path.resolve())]
        proc = subprocess.run(
            cmd,
            cwd=str(self.ai_module_root),
            env=env,
            capture_output=not stream_stdout,
            text=True,
        )
        if stream_stdout and proc.stdout:
            print(proc.stdout, end="")
        if proc.stderr:
            print(proc.stderr, end="", file=sys.stderr)

        result: dict[str, Any] | None = None
        with open(job_path, encoding="utf-8") as f:
            job = json.load(f)
        work_dir = Path(job["outputs"]["work_dir"])
        result_path = work_dir / "ai-result.json"
        if result_path.is_file():
            with open(result_path, encoding="utf-8") as rf:
                result = json.load(rf)
        return proc.returncode, result

    def run_agent1(self, workspace: WorkspaceLayout, job_path: Path) -> dict[str, Any]:
        code, result = self.run_job_file(job_path)
        if code != 0 or not result or result.get("status") != "success":
            msg = (result or {}).get("error", {}).get("message", f"exit {code}")
            raise RuntimeError(f"Agent1 failed: {msg}")
        return result

    def run_agent2(self, workspace: WorkspaceLayout, job_path: Path) -> dict[str, Any]:
        code, result = self.run_job_file(job_path)
        if code != 0 or not result or result.get("status") != "success":
            msg = (result or {}).get("error", {}).get("message", f"exit {code}")
            raise RuntimeError(f"Agent2 failed: {msg}")
        return result

    def get_draft_markdown(self, workspace: WorkspaceLayout) -> str:
        result = read_ai_result(workspace, "agent2")
        if result and result.get("outputs", {}).get("combined_draft_path"):
            path = Path(result["outputs"]["combined_draft_path"])
            return path.read_text(encoding="utf-8")
        fallback = workspace.agent2_output / "all_sections.md"
        if fallback.is_file():
            return fallback.read_text(encoding="utf-8")
        raise FileNotFoundError("No agent2 draft found. Run agent2 first.")

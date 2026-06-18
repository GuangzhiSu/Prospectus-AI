#!/usr/bin/env python3
"""Run platform → AI pipeline (standalone modular project)."""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from prospectus_platform.ai_client import AiModuleClient, default_ai_module_root
from prospectus_platform.job_builder import build_agent1_job, build_agent2_job, write_job
from prospectus_platform.workspace import WorkspaceLayout


def _modular_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _seed_from_bundled(workspace: WorkspaceLayout) -> None:
    """Copy shipped defaults from modular/bundled/ when workspace files are missing."""
    root = _modular_root()
    bundled = root / "bundled"
    workspace.ensure()

    pairs = [
        (
            bundled / "platform-config" / "agent2_section_requirements.json",
            workspace.section_requirements,
        ),
        (bundled / "platform-config" / "issuer_metadata.json", workspace.issuer_metadata),
        (bundled / "sample-data" / "data.json", workspace.materials / "data.json"),
    ]
    for src, dst in pairs:
        if src.is_file() and not dst.is_file():
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)

    kg_bundled = bundled / "platform-config" / "kg-inputs"
    if kg_bundled.is_dir():
        workspace.kg_inputs.mkdir(parents=True, exist_ok=True)
        for f in kg_bundled.iterdir():
            if f.is_file():
                dst = workspace.kg_inputs / f.name
                if not dst.exists():
                    shutil.copy2(f, dst)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run platform → AI pipeline")
    parser.add_argument(
        "--workspace",
        type=Path,
        default=None,
        help="Workspace root (default: modular/workspace)",
    )
    parser.add_argument(
        "--task",
        choices=("agent1", "agent2", "both"),
        default="both",
    )
    parser.add_argument(
        "--sections",
        nargs="*",
        help="Agent2 section ids (default: all)",
    )
    args = parser.parse_args()

    modular = _modular_root()
    ws_path = args.workspace or (modular / "workspace")
    workspace = WorkspaceLayout(ws_path.resolve())
    _seed_from_bundled(workspace)

    if not any(workspace.materials.iterdir()):
        print(
            "No materials in",
            workspace.materials,
            "— add .xlsx/.json or ship bundled/sample-data/data.json",
            file=sys.stderr,
        )
        return 2

    client = AiModuleClient(default_ai_module_root())

    if args.task in ("agent1", "both"):
        job = build_agent1_job(workspace)
        job_path = write_job(job, workspace)
        print(f"Running agent1 job: {job_path}")
        client.run_agent1(workspace, job_path)

    if args.task in ("agent2", "both"):
        job = build_agent2_job(workspace, sections=args.sections or None)
        job_path = write_job(job, workspace)
        print(f"Running agent2 job: {job_path}")
        client.run_agent2(workspace, job_path)
        draft = client.get_draft_markdown(workspace)
        print(
            f"Draft ready ({len(draft)} chars) at",
            workspace.agent2_output / "all_sections.md",
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

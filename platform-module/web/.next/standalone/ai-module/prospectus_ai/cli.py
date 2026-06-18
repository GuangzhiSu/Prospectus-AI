"""CLI for the Prospectus AI module."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from prospectus_ai.runner import run_job_file_safe
from prospectus_ai.validate import ContractError, load_job


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Prospectus AI module — run agent jobs from platform contract manifests."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    run_p = sub.add_parser("run", help="Execute a job JSON file")
    run_p.add_argument(
        "--job",
        required=True,
        type=Path,
        help="Path to ai-job.json (see modular/contracts/v1/)",
    )

    val_p = sub.add_parser("validate", help="Validate a job file without running")
    val_p.add_argument("--job", required=True, type=Path)

    args = parser.parse_args(argv)

    if args.command == "validate":
        try:
            job = load_job(args.job)
            print(json.dumps({"ok": True, "job_id": job["job_id"], "task": job["task"]}))
            return 0
        except (OSError, json.JSONDecodeError, ContractError) as exc:
            print(json.dumps({"ok": False, "error": str(exc)}))
            return 2

    return run_job_file_safe(args.job)


if __name__ == "__main__":
    sys.exit(main())

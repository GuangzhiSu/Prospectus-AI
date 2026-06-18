#!/usr/bin/env python3
"""Download Qwen3.5-4B (or another HF id) for offline use. Used by first-run / settings UI.

Writes a small manifest next to the snapshot for sanity checks.

Usage:
  python scripts/download_qwen_model.py --out-dir "%LOCALAPPDATA%\\ProspectusAI\\models\\Qwen3.5-4B"
  python scripts/download_qwen_model.py --repo-id Qwen/Qwen3.5-4B --out-dir ./models/Qwen3.5-4B
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Download Qwen weights from Hugging Face Hub.")
    parser.add_argument(
        "--repo-id",
        default="Qwen/Qwen3.5-4B",
        help="Hugging Face model repo id",
    )
    parser.add_argument(
        "--out-dir",
        required=True,
        help="Local directory to snapshot into (created if missing)",
    )
    parser.add_argument(
        "--revision",
        default=None,
        help="Optional git revision (branch / tag / commit)",
    )
    args = parser.parse_args()
    out = Path(args.out_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)

    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print(
            "Install huggingface_hub: pip install huggingface_hub",
            file=sys.stderr,
        )
        return 1

    path = snapshot_download(
        repo_id=args.repo_id,
        local_dir=str(out),
        revision=args.revision,
    )
    manifest = {
        "repo_id": args.repo_id,
        "revision": args.revision,
        "local_dir": str(path),
    }
    (out / "download_manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"OK: snapshot at {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

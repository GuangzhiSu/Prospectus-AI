#!/usr/bin/env python3
"""Package the public Prospectus AI test dataset for GitHub Releases."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = REPO_ROOT / "dist" / "public-datasets" / "ProspectusAI-test-dataset.zip"


def _git_value(*args: str) -> str | None:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    value = result.stdout.strip()
    return value or None


def _sha256(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _iter_files(root: Path) -> list[Path]:
    if root.is_file():
        return [root]
    if not root.is_dir():
        raise FileNotFoundError(root)
    return sorted(path for path in root.rglob("*") if path.is_file())


def _write_text(zf: zipfile.ZipFile, name: str, text: str) -> None:
    info = zipfile.ZipInfo(name)
    info.date_time = datetime.now().timetuple()[:6]
    info.compress_type = zipfile.ZIP_DEFLATED
    zf.writestr(info, text)


def _readme(manifest: dict[str, object]) -> str:
    return f"""# Prospectus AI Test Dataset

This package is intended for end-to-end testing of Prospectus AI.

## Contents

- `prospectus_corpus/`: source prospectus PDF files.
- `prospectus_kg_output/inputs/`: reverse-engineered issuer input records, schemas, source packages, and extraction audits.
- `prospectus_kg_output/native_docs/`: extracted section-level source text used to trace facts back to the original prospectuses.

## Suggested Use

1. Unzip this archive beside a local Prospectus AI checkout or in a separate test workspace.
2. In the app, upload JSON files from `prospectus_kg_output/inputs/input_records/<prospectus_id>/` to test Agent1 preparation.
3. Use `prospectus_kg_output/inputs/source_packages/<prospectus_id>/agent1_input_seed.json` when you want the richest single-file test input for one prospectus.
4. Keep the PDF corpus available if you want to inspect or rebuild source traces.

## Build Metadata

- Created at: {manifest["created_at"]}
- Git commit: {manifest.get("git_commit") or "unknown"}
- Git branch: {manifest.get("git_branch") or "unknown"}
- Total files: {manifest["total_files"]}
- Total source bytes: {manifest["total_source_bytes"]}

Before publishing this dataset publicly, confirm that the included prospectus PDFs and generated derivatives may be redistributed in your release channel.
"""


def build_manifest(included_roots: list[str], files_by_root: dict[str, list[Path]]) -> dict[str, object]:
    counts: dict[str, int] = {}
    bytes_by_root: dict[str, int] = {}
    total_files = 0
    total_bytes = 0
    for rel, files in files_by_root.items():
        counts[rel] = len(files)
        size = sum(path.stat().st_size for path in files)
        bytes_by_root[rel] = size
        total_files += len(files)
        total_bytes += size

    dirty = _git_value("status", "--short") or ""
    return {
        "name": "ProspectusAI-test-dataset",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "git_commit": _git_value("rev-parse", "HEAD"),
        "git_branch": _git_value("branch", "--show-current"),
        "git_dirty": bool(dirty),
        "included_roots": included_roots,
        "file_counts": counts,
        "source_bytes": bytes_by_root,
        "total_files": total_files,
        "total_source_bytes": total_bytes,
    }


def package_dataset(args: argparse.Namespace) -> int:
    included_roots = [
        "prospectus_corpus",
        "prospectus_kg_output/inputs",
    ]
    if args.include_native_docs:
        included_roots.append("prospectus_kg_output/native_docs")

    files_by_root: dict[str, list[Path]] = {}
    for rel in included_roots:
        files_by_root[rel] = _iter_files(REPO_ROOT / rel)

    manifest = build_manifest(included_roots, files_by_root)

    if args.dry_run:
        print(json.dumps(manifest, indent=2))
        return 0

    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists() and not args.force:
        raise FileExistsError(f"{output} already exists; pass --force to overwrite")

    compression = zipfile.ZIP_DEFLATED
    with zipfile.ZipFile(
        output,
        mode="w",
        compression=compression,
        compresslevel=args.compresslevel,
        allowZip64=True,
    ) as zf:
        _write_text(zf, "README.md", _readme(manifest))
        _write_text(zf, "manifest.json", json.dumps(manifest, indent=2) + "\n")
        for rel, files in files_by_root.items():
            for path in files:
                zf.write(path, arcname=str(path.relative_to(REPO_ROOT)))

    sha = _sha256(output)
    print(f"Wrote {output}")
    print(f"Size bytes: {output.stat().st_size}")
    print(f"SHA256: {sha}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output zip path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--no-native-docs",
        dest="include_native_docs",
        action="store_false",
        help="Exclude prospectus_kg_output/native_docs from the package.",
    )
    parser.add_argument("--force", action="store_true", help="Overwrite an existing output zip.")
    parser.add_argument("--dry-run", action="store_true", help="Print package manifest without writing a zip.")
    parser.add_argument(
        "--compresslevel",
        type=int,
        default=6,
        choices=range(0, 10),
        metavar="0-9",
        help="Zip DEFLATE compression level (default: 6).",
    )
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(package_dataset(parse_args()))

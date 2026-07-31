#!/usr/bin/env bash
# Ingest a .tar.zst bundle (offline handoff). See docs/COLLABORATION.md.
# Usage: ./scripts/ingest_data_bundle.sh <archive.tar.zst> [--artifact <id>] [--skip-sha]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE="${1:?Usage: ingest_data_bundle.sh <archive.tar.zst> [--artifact id] [--skip-sha]}"
shift

cd "$REPO_ROOT"
EXTRA=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --artifact) EXTRA+=(--artifact "$2"); shift 2 ;;
    --skip-sha) EXTRA+=(--skip-sha); shift ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

python3 scripts/sync_data.py ingest "$ARCHIVE" "${EXTRA[@]}"

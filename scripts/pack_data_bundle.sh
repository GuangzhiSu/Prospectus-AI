#!/usr/bin/env bash
# Pack data artifacts for a manifest profile (offline handoff / before push).
# Usage: ./scripts/pack_data_bundle.sh [profile]
#   profile: minimal | kg-dev | dev-full  (default: dev-full)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE="${1:-dev-full}"

cd "$REPO_ROOT"
if ! python3 -c "import zstandard" 2>/dev/null; then
  echo "Install zstandard: pip install zstandard" >&2
  exit 1
fi

python3 scripts/sync_data.py publish-local --profile "$PROFILE" --update-manifest
echo "Bundles under dist/data-bundles/ — share .tar.zst files or run sync_data.py push"

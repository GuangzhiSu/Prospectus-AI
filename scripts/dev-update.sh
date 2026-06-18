#!/usr/bin/env bash
# Update a standalone modular checkout (no full re-download).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> git pull"
git pull

echo "==> AI module deps"
if [[ -f ai-module/requirements.txt ]]; then
  if [[ ! -x ai-module/.venv/bin/python ]]; then
    python3 -m venv ai-module/.venv
  fi
  # shellcheck disable=SC1091
  source ai-module/.venv/bin/activate
  pip install -q -e ai-module
  deactivate 2>/dev/null || true
fi

echo "==> Web deps"
npm install --prefix platform-module/web

if git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -q '^data/manifest.json'; then
  echo "==> data/manifest.json changed — consider: python scripts/sync_data.py fetch --profile kg-dev"
fi

echo "Done. Start UI: npm run dev"

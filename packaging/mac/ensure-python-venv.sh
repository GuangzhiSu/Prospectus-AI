#!/usr/bin/env bash
# Ensure venv/ exists with agent dependencies. Called from start-prospectus-ui.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -x "$ROOT/venv/bin/python3" ]]; then
  return 0 2>/dev/null || exit 0
fi

if [[ -x "$ROOT/venv/Scripts/python.exe" ]]; then
  echo "ERROR: This folder has a Windows Python environment (venv/Scripts). It cannot run on macOS." >&2
  echo "Download the Mac bundle built with: npm run pack:mac" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found. Install Python 3.10+ from https://www.python.org/downloads/macos/" >&2
  exit 1
fi

echo "[Prospectus AI] First launch: creating Python environment (may take several minutes)…"
python3 -m venv "$ROOT/venv"
# shellcheck disable=SC1091
source "$ROOT/venv/bin/activate"
pip install --upgrade pip wheel setuptools

if [[ -f "$ROOT/requirements-no-torch.txt" ]]; then
  REQ_NOTORCH="$ROOT/requirements-no-torch.txt"
else
  REQ_NOTORCH="$(mktemp)"
  grep -vE '^(#|$|[[:space:]]*torch)' "$ROOT/requirements.txt" | grep -v '^[[:space:]]*$' > "$REQ_NOTORCH" || true
fi

pip install "torch>=2.0.0" --index-url https://download.pytorch.org/whl/cpu
pip install -r "$REQ_NOTORCH"
deactivate || true

echo "[Prospectus AI] Python environment ready."

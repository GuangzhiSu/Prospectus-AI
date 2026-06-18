#!/usr/bin/env bash
# Modular pipeline: Agent1 → Agent2 via contract jobs (no browser required)
set -euo pipefail

MODULAR_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$MODULAR_ROOT"

VENV="$MODULAR_ROOT/ai-module/.venv"
if [[ ! -x "$VENV/bin/python" ]]; then
  echo "Run: npm run setup:ai  (or pip install -e ai-module)"
  exit 1
fi

# shellcheck disable=SC1091
source "$VENV/bin/activate"

SECTIONS="${*:-}"
if [[ $# -gt 0 && "$1" == --model ]]; then
  echo "Use platform web /settings for model selection, or edit job options."
  shift 2
  SECTIONS="$*"
fi

python platform-module/examples/run_pipeline.py \
  --workspace "$MODULAR_ROOT/workspace" \
  --task both \
  ${SECTIONS:+--sections} ${SECTIONS:+$SECTIONS}

echo "Done. Outputs: workspace/agent1_output, workspace/agent2_output"

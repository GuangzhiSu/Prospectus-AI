#!/usr/bin/env bash
# Run IPO prospectus pipeline with OpenAI API or local Qwen.
#
# Usage:
#   ./run_pipeline.sh [openai|qwen] [args passed to: python -m src.main ...]
#
# If the first argument is not "openai" or "qwen", it defaults to openai and all args go to src.main.
#
# Examples:
#   ./run_pipeline.sh openai --input ./pdfs --output ./outputs
#   ./run_pipeline.sh qwen --input ./pdfs --output ./outputs_qwen
#   ./run_pipeline.sh --input ./pdfs   # same as openai
#   QWEN_MODEL=Qwen/Qwen3.5-27B QWEN_USE_CPU=1 ./run_pipeline.sh qwen --stage split_sections
#
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PROVIDER=openai
if [[ "${1:-}" == "qwen" || "${1:-}" == "qwen_local" || "${1:-}" == "QWEN" ]]; then
  PROVIDER=qwen
  shift
elif [[ "${1:-}" == "openai" || "${1:-}" == "OPENAI" ]]; then
  PROVIDER=openai
  shift
fi

if [[ "$PROVIDER" == "openai" ]]; then
  export IPO_LLM_PROVIDER=openai
  exec python -m src.main --config configs/default.yaml "$@"
else
  export IPO_LLM_PROVIDER=qwen_local
  export QWEN_MODEL="${QWEN_MODEL:-Qwen/Qwen3.5-27B}"
  exec python -m src.main --config configs/qwen_local.yaml "$@"
fi

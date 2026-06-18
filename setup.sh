#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "Prospectus AI — standalone setup"
echo "Root: $ROOT"

python3 -m venv ai-module/.venv
# shellcheck disable=SC1091
source ai-module/.venv/bin/activate
pip install -U pip wheel
pip install -e ai-module
pip install -e platform-module
deactivate

npm install --prefix platform-module/web

ENV_FILE="platform-module/web/.env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" << EOF
PROSPECTUS_ROOT=$ROOT/workspace
MODULAR_ROOT=$ROOT
AI_MODULE_ROOT=$ROOT/ai-module
AGENT1_PYTHON=$ROOT/ai-module/.venv/bin/python
AGENT1_MODEL=Qwen/Qwen2.5-3B-Instruct
AGENT1_USE_CPU=1
EOF
  echo "Wrote $ENV_FILE"
fi

mkdir -p workspace/data workspace/platform-config workspace/agent1_output workspace/agent2_output

# Seed workspace from bundled defaults
B="$ROOT/bundled"
[[ -f $B/platform-config/agent2_section_requirements.json ]] && \
  cp -n $B/platform-config/agent2_section_requirements.json workspace/platform-config/ 2>/dev/null || true
[[ -f $B/platform-config/issuer_metadata.json ]] && \
  cp -n $B/platform-config/issuer_metadata.json workspace/platform-config/ 2>/dev/null || true
[[ -d $B/platform-config/kg-inputs ]] && \
  cp -n $B/platform-config/kg-inputs/* workspace/platform-config/kg-inputs/ 2>/dev/null || true
[[ -f $B/sample-data/data.json ]] && \
  cp -n $B/sample-data/data.json workspace/data/ 2>/dev/null || true

echo ""
echo "Setup complete."
echo "  npm run dev     — start web UI"
echo "  ./run_full_pipeline.sh — CLI pipeline"

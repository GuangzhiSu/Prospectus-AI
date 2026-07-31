#!/bin/bash
# Run full prospectus pipeline: agent1 (Excel → RAG) → agent2 (RAG → sections)
# Usage:
#   ./run_full_pipeline.sh              # Default: all sections
#   ./run_full_pipeline.sh Summary Definitions   # Specific sections only
#   ./run_full_pipeline.sh --model Qwen/Qwen2.5-3B-Instruct

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Parse args: sections or --model
MODEL=""
SECTIONS="all"

while [[ $# -gt 0 ]]; do
  case $1 in
    --model)
      MODEL="$2"
      shift 2
      ;;
    *)
      SECTIONS="$*"
      break
      ;;
  esac
done

echo "=========================================="
echo "Prospectus Pipeline: agent1 → agent2"
echo "=========================================="

WORKSPACE_PREFIX="${WORKSPACE_ROOT:-}"
DATA_DIR="${WORKSPACE_PREFIX:+$WORKSPACE_PREFIX/data}"
DATA_DIR="${DATA_DIR:-data}"
AGENT1_OUTPUT_DIR="${WORKSPACE_PREFIX:+$WORKSPACE_PREFIX/agent1_output}"
AGENT1_OUTPUT_DIR="${AGENT1_OUTPUT_DIR:-agent1_output}"
AGENT2_OUTPUT_DIR="${WORKSPACE_PREFIX:+$WORKSPACE_PREFIX/agent2_output}"
AGENT2_OUTPUT_DIR="${AGENT2_OUTPUT_DIR:-agent2_output}"

# 1. Check data
if [[ ! -d "$DATA_DIR" ]] || [[ -z "$(ls -A "$DATA_DIR"/*.xlsx 2>/dev/null)" ]] && [[ -z "$(ls -A "$DATA_DIR"/*.json 2>/dev/null)" ]]; then
  echo "Error: No .xlsx or .json files in $DATA_DIR/. Put Excel or JSON files there first."
  exit 1
fi
echo "[OK] Found data files in $DATA_DIR/"

# 2. Install deps
echo ""
echo "Step 1: Installing dependencies..."
pip install -q -r ai-module/requirements.txt
echo "[OK] Dependencies installed"

# 3. Run agent1
echo ""
echo "Step 2: Running agent1 (Excel + JSON → RAG chunks)..."
AGENT1_OPTS=""
[[ -n "$MODEL" ]] && AGENT1_OPTS="$AGENT1_OPTS --model $MODEL"
python ai-module/agent1.py --data-dir "$DATA_DIR" --output-dir "$AGENT1_OUTPUT_DIR" $AGENT1_OPTS || { echo "Agent1 failed. Fix and re-run."; exit 1; }
echo "[OK] agent1 done -> $AGENT1_OUTPUT_DIR/"

# 4. Run agent2
echo ""
echo "Step 3: Running agent2 (RAG → prospectus sections)..."
AGENT2_OPTS="--section $SECTIONS"
[[ -n "$MODEL" ]] && AGENT2_OPTS="$AGENT2_OPTS --model $MODEL"
python ai-module/agent2.py --rag-dir "$AGENT1_OUTPUT_DIR" --output-dir "$AGENT2_OUTPUT_DIR" $AGENT2_OPTS
echo "[OK] agent2 done -> $AGENT2_OUTPUT_DIR/"

echo ""
echo "=========================================="
echo "Done. Output:"
echo "  - $AGENT1_OUTPUT_DIR/rag_chunks.jsonl"
echo "  - $AGENT2_OUTPUT_DIR/section_*.md"
echo "  - $AGENT2_OUTPUT_DIR/all_sections.md"
echo "=========================================="

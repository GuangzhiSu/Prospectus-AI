#!/bin/bash
# Run full prospectus pipeline: agent1 (Excel → RAG) → agent2 (RAG → sections)
# Usage:
#   ./run_full_pipeline.sh              # Default: all sections
#   ./run_full_pipeline.sh A B D        # Specific sections only
#   ./run_full_pipeline.sh --classify-with-llm   # Use Qwen for agent1 classification

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Parse args: sections (A B D...) or --classify-with-llm, --model
CLASSIFY_WITH_LLM=""
MODEL=""
SECTIONS="all"

while [[ $# -gt 0 ]]; do
  case $1 in
    --classify-with-llm)
      CLASSIFY_WITH_LLM="--classify-with-llm"
      shift
      ;;
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

# 1. Check data
if [[ ! -d "data" ]] || [[ -z "$(ls -A data/*.xlsx 2>/dev/null)" ]]; then
  echo "Error: No .xlsx files in data/. Put Excel files there first."
  exit 1
fi
echo "[OK] Found Excel files in data/"

# 2. Install deps
echo ""
echo "Step 1: Installing dependencies..."
pip install -q -r requirements.txt
echo "[OK] Dependencies installed"

# 3. Run agent1
echo ""
echo "Step 2: Running agent1 (Excel → RAG chunks)..."
AGENT1_OPTS=""
[[ -n "$CLASSIFY_WITH_LLM" ]] && AGENT1_OPTS="$CLASSIFY_WITH_LLM"
[[ -n "$MODEL" ]] && AGENT1_OPTS="$AGENT1_OPTS --model $MODEL"
python agent1.py $AGENT1_OPTS
echo "[OK] agent1 done -> agent1_output/"

# 4. Run agent2
echo ""
echo "Step 3: Running agent2 (RAG → prospectus sections)..."
AGENT2_OPTS="--section $SECTIONS"
[[ -n "$MODEL" ]] && AGENT2_OPTS="$AGENT2_OPTS --model $MODEL"
python agent2.py $AGENT2_OPTS
echo "[OK] agent2 done -> agent2_output/"

echo ""
echo "=========================================="
echo "Done. Output:"
echo "  - agent1_output/rag_chunks.jsonl"
echo "  - agent2_output/section_*.md"
echo "  - agent2_output/all_sections.md"
echo "=========================================="

#!/usr/bin/env bash
# Parallel launcher for Stage 3b v2 across multiple GPUs.
#
# Shards the 125 HKEX prospectuses across the free GPUs (default 2,3,4). Each shard
# runs one `build_prospectus_kg --stages s3b` worker writing its per-(doc, section)
# JSON into the shared ``prospectus_kg_output/inputs/input_records/<doc>/`` tree.
# All workers are resume-safe (they skip cached section files), so it's fine to
# restart this script.
#
# Usage:
#   ./scripts/run_stage3b_parallel.sh                     # GPUs 2,3,4
#   GPUS="2,3" ./scripts/run_stage3b_parallel.sh          # custom GPU list
#   DRY_RUN=1 ./scripts/run_stage3b_parallel.sh           # print shard plan only

set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
source .venv/bin/activate

GPUS="${GPUS:-2,3,4}"
IFS=',' read -r -a GPU_ARR <<< "$GPUS"
NSHARDS="${#GPU_ARR[@]}"

SECTIONS_DIR="prospectus_kg_output/sections_toc"
LOG_DIR="prospectus_kg_output/logs/stage3b"
mkdir -p "$LOG_DIR"

mapfile -t DOCS < <(ls "$SECTIONS_DIR" | grep -v '^_' | sed 's/\.json$//' | sort)
TOTAL=${#DOCS[@]}
echo "Sharding $TOTAL docs across $NSHARDS GPUs: ${GPU_ARR[*]}"

declare -a PIDS
for ((i = 0; i < NSHARDS; i++)); do
    GPU="${GPU_ARR[$i]}"
    SHARD_FILE="$LOG_DIR/shard_${i}_docs.txt"
    : > "$SHARD_FILE"
    for ((j = i; j < TOTAL; j += NSHARDS)); do
        echo "${DOCS[$j]}" >> "$SHARD_FILE"
    done
    SHARD_N=$(wc -l < "$SHARD_FILE")
    echo "  shard $i (GPU $GPU): $SHARD_N docs"
    if [[ "${DRY_RUN:-0}" == "1" ]]; then
        continue
    fi
    (
        while IFS= read -r DOC; do
            [[ -z "$DOC" ]] && continue
            # CUDA_DEVICE_ORDER=PCI_BUS_ID makes CUDA's device indices match
            # nvidia-smi's indices. Without this, CUDA uses FASTEST_FIRST ordering and
            # CUDA_VISIBLE_DEVICES=N can silently land on a different physical GPU
            # than you expect (e.g. a GTX 1080 Ti with 11 GB instead of a 24 GB TITAN).
            CUDA_DEVICE_ORDER=PCI_BUS_ID CUDA_VISIBLE_DEVICES="$GPU" QWEN_MAX_CTX="${QWEN_MAX_CTX:-5120}" \
                python -m scripts.build_prospectus_kg \
                    --stages s3b \
                    --only-doc "$DOC" \
                    --max-tokens "${STAGE3B_MAX_TOKENS:-1024}" \
                >> "$LOG_DIR/shard_${i}.log" 2>&1 \
                || echo "[shard $i] WARN: doc $DOC failed, continuing" \
                    >> "$LOG_DIR/shard_${i}.log"
        done < "$SHARD_FILE"
    ) &
    PIDS+=("$!")
done

if [[ "${DRY_RUN:-0}" == "1" ]]; then
    echo "DRY_RUN=1 set; not launching workers."
    exit 0
fi

echo "Workers launched. PIDs: ${PIDS[*]}"
echo "Monitor: tail -f $LOG_DIR/shard_*.log"
wait "${PIDS[@]}"
echo "All shards complete."

#!/usr/bin/env bash
# One-shot Linux bundle: Next standalone + Python venv + agents + slim KG inputs.
# Produces dist/ProspectusAI/ and optionally dist/ProspectusAI-linux-*.tar.gz
#
# Usage (from repo root):
#   bash packaging/linux/build-full-release.sh
#
# Env:
#   NODE         — path to node binary (default: first of $NODE, `command -v node`, Cursor-bundled node)
#   INSTALL_ROOT — output directory relative to repo (default: dist/ProspectusAI)
#   SKIP_TAR     — if 1, do not create tar.gz
#   TORCH_CPU    — if 1 (default), install PyTorch CPU wheels for broader portability

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# Default folder name avoids clobbering dist/ProspectusAI (reserved for Windows bundle from build-prospectusai-windows.sh).
INSTALL_ROOT="${INSTALL_ROOT:-dist/ProspectusAI-linux}"
STAGE="$REPO_ROOT/$INSTALL_ROOT"
SKIP_TAR="${SKIP_TAR:-0}"
TORCH_CPU="${TORCH_CPU:-1}"

resolve_node() {
  if [[ -n "${NODE:-}" && -x "${NODE}" ]]; then
    echo "$NODE"
    return
  fi
  if command -v node >/dev/null 2>&1; then
    command -v node
    return
  fi
  local c
  c="$HOME/.cursor-server/bin/linux-x64/3e548838cf824b70851dd3ef27d0c6aae371b3f0/node"
  if [[ -x "$c" ]]; then
    echo "$c"
    return
  fi
  echo "ERROR: No node binary found. Install Node 20+ or set NODE=/path/to/node" >&2
  exit 1
}

NODE_BIN="$(resolve_node)"
echo "Using node: $NODE_BIN ($("$NODE_BIN" -v))"

WEB_DIR="$REPO_ROOT/frontend/web"
if [[ ! -d "$WEB_DIR/node_modules" ]]; then
  echo "ERROR: $WEB_DIR/node_modules missing — run npm install in frontend/web first." >&2
  exit 1
fi

echo "==> Building Next.js standalone…"
(
  cd "$WEB_DIR"
  NODE_ENV=production "$NODE_BIN" ./node_modules/next/dist/bin/next build
)

STANDALONE="$WEB_DIR/.next/standalone"
if [[ ! -f "$STANDALONE/frontend/web/server.js" ]]; then
  echo "ERROR: Expected $STANDALONE/frontend/web/server.js after build." >&2
  exit 1
fi

echo "==> Staging to $STAGE"
rm -rf "$STAGE"
mkdir -p "$STAGE"

# Next standalone layout for monorepo: copy inner tree to web/
mkdir -p "$STAGE/web"
cp -a "$STANDALONE/frontend/web/." "$STAGE/web/"
mkdir -p "$STAGE/web/.next"
cp -a "$WEB_DIR/.next/static" "$STAGE/web/.next/static"
mkdir -p "$STAGE/web/public"
cp -a "$WEB_DIR/public/." "$STAGE/web/public/"

ITEMS=(
  ai-module/agent1.py ai-module/agent2.py ai-module/llm_qwen.py ai-module/llm_openai.py
  ai-module/llm_anthropic.py ai-module/llm_providers.py ai-module/llm_sanitize.py ai-module/section_quality.py
  ai-module/requirements.txt ai-module/prospectus_graph
  agent2_section_requirements.json issuer_metadata.json scripts resources/templates
)
for i in "${ITEMS[@]}"; do
  src="$REPO_ROOT/$i"
  if [[ -e "$src" ]]; then
    cp -a "$src" "$STAGE/$(basename "$i")"
  else
    echo "WARN: missing $src" >&2
  fi
done

mkdir -p "$STAGE/prospectus_kg_output/inputs"
for f in input_schema.json input_schema_crosswalk.json; do
  src="$REPO_ROOT/prospectus_kg_output/inputs/$f"
  if [[ -f "$src" ]]; then
    cp -a "$src" "$STAGE/prospectus_kg_output/inputs/"
  else
    echo "WARN: missing $src" >&2
  fi
done
if [[ -f "$REPO_ROOT/prospectus_kg_output/inputs/_coverage_vs_report.md" ]]; then
  cp -a "$REPO_ROOT/prospectus_kg_output/inputs/_coverage_vs_report.md" "$STAGE/prospectus_kg_output/inputs/"
fi

echo "==> Creating Python venv + installing dependencies (may take several minutes)…"
if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found on PATH." >&2
  exit 1
fi
python3 -m venv "$STAGE/venv"
# shellcheck disable=SC1091
source "$STAGE/venv/bin/activate"
pip install --upgrade pip wheel setuptools

REQ_NOTORCH="$STAGE/.requirements-no-torch.txt"
grep -vE '^(#|$|[[:space:]]*torch)' "$REPO_ROOT/ai-module/requirements.txt" | grep -v '^[[:space:]]*$' > "$REQ_NOTORCH" || true

if [[ "$TORCH_CPU" == "1" ]]; then
  pip install "torch>=2.0.0" --index-url https://download.pytorch.org/whl/cpu
else
  pip install "torch>=2.0.0"
fi
pip install -r "$REQ_NOTORCH"
rm -f "$REQ_NOTORCH"
deactivate || true

cat > "$STAGE/start-prospectus-ui.sh" << 'EOS'
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
export PROSPECTUS_ROOT="$ROOT"
export PATH="$ROOT/venv/bin:$PATH"
export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-127.0.0.1}"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed or not on PATH."
  echo "Install Node 20+ (e.g. https://nodejs.org/ or apt install nodejs)."
  exit 1
fi

echo "PROSPECTUS_ROOT=$PROSPECTUS_ROOT"
echo "Starting Prospectus UI on http://${HOSTNAME}:${PORT} — open this URL in a browser."
cd "$ROOT/web"
exec node server.js
EOS
chmod +x "$STAGE/start-prospectus-ui.sh"

cat > "$STAGE/README-使用说明.txt" << 'EOF'
Prospectus AI — 本机运行说明（Linux 打包版）
================================================

1. 依赖
   - 已自带 Python 虚拟环境：venv/（安装时已写入 torch 等）
   - 你需要本机已安装 Node.js 20+（用于运行 web/server.js），例如：
     sudo apt install nodejs npm
     或从 https://nodejs.org/ 安装 LTS

2. 启动
   在终端进入本文件夹，执行：
     ./start-prospectus-ui.sh
   浏览器打开终端里提示的地址（默认 http://127.0.0.1:3000）。

3. 首次使用
   - 打开网页中的「Model & inference / settings」
   - 配置本地 Qwen 或 OpenAI 兼容 API；本地模型体积较大，请预留磁盘

4. 目录说明
   - web/        Next.js 独立运行目录（勿删）
   - venv/       Python 环境
   - agent1.py / agent2.py 等 — 与开发仓库一致

5. GPU（可选）
   本包默认使用 CPU 版 PyTorch 以便分发。若需 NVIDIA GPU，请自行在 venv 中重装 CUDA 版 torch：
     source venv/bin/activate
     pip install --upgrade torch --index-url https://download.pytorch.org/whl/cu124
   （版本号请按显卡与驱动选官方说明）
EOF

echo "==> Done: $STAGE"

if [[ "$SKIP_TAR" != "1" ]]; then
  ARCHIVE="$REPO_ROOT/dist/ProspectusAI-linux-$(uname -m)-$(date +%Y%m%d-%H%M).tar.gz"
  mkdir -p "$REPO_ROOT/dist"
  echo "==> Creating $ARCHIVE"
  tar -czf "$ARCHIVE" -C "$REPO_ROOT/dist" "$(basename "$STAGE")"
  echo "Archive: $ARCHIVE"
fi

echo "Send the folder $STAGE or the .tar.gz to users; they run ./start-prospectus-ui.sh after installing Node.js."

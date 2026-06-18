#!/usr/bin/env bash
# Build dist/ProspectusAI for Windows users — on a Linux build machine.
# Output includes: web/ (Next standalone, no Linux sharp binaries), node/ (Win Node),
# python-embed/ + get-pip.py, agents, start-prospectus-ui.bat (double-click).
# First run on Windows creates venv/ via ensure-python-venv.bat (several minutes).
#
# Usage from repo root:
#   bash packaging/linux/build-prospectusai-windows.sh
#
# Env: NODE, INSTALL_ROOT (default dist/ProspectusAI), SKIP_TAR, NODE_WIN_VER, PY_EMBED_VER

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL_ROOT="${INSTALL_ROOT:-dist/ProspectusAI}"
STAGE="$REPO_ROOT/$INSTALL_ROOT"
SKIP_TAR="${SKIP_TAR:-0}"
NODE_WIN_VER="${NODE_WIN_VER:-20.18.0}"
PY_EMBED_VER="${PY_EMBED_VER:-3.11.9}"

resolve_node() {
  if [[ -n "${NODE:-}" && -x "${NODE}" ]]; then echo "$NODE"; return; fi
  if command -v node >/dev/null 2>&1; then command -v node; return; fi
  local c="$HOME/.cursor-server/bin/linux-x64/3e548838cf824b70851dd3ef27d0c6aae371b3f0/node"
  if [[ -x "$c" ]]; then echo "$c"; return; fi
  echo "ERROR: No node binary found for next build." >&2
  exit 1
}

NODE_BIN="$(resolve_node)"
WEB_DIR="$REPO_ROOT/apps/web"
if [[ ! -d "$WEB_DIR/node_modules" ]]; then
  echo "ERROR: Run npm install in apps/web first." >&2
  exit 1
fi

echo "==> Building Next.js standalone (Linux build host; bundle excludes sharp natives for Windows Node)…"
(
  cd "$WEB_DIR"
  NODE_ENV=production "$NODE_BIN" ./node_modules/next/dist/bin/next build
)

STANDALONE="$WEB_DIR/.next/standalone"
if [[ ! -f "$STANDALONE/apps/web/server.js" ]]; then
  echo "ERROR: Missing standalone server.js" >&2
  exit 1
fi

echo "==> Staging $STAGE"
rm -rf "$STAGE"
mkdir -p "$STAGE/web"
cp -a "$STANDALONE/apps/web/." "$STAGE/web/"
# Standalone trace omits client chunks; without .next/static, /_next/static/* 404 and the UI is unstyled.
mkdir -p "$STAGE/web/.next"
cp -a "$WEB_DIR/.next/static" "$STAGE/web/.next/static"
mkdir -p "$STAGE/web/public"
cp -a "$WEB_DIR/public/." "$STAGE/web/public/"

ITEMS=(
  agent1.py agent2.py llm_qwen.py llm_openai.py
  requirements.txt agent2_section_requirements.json issuer_metadata.json
  prospectus_graph scripts templates
)
for i in "${ITEMS[@]}"; do
  [[ -e "$REPO_ROOT/$i" ]] && cp -a "$REPO_ROOT/$i" "$STAGE/" || echo "WARN: missing $i" >&2
done

mkdir -p "$STAGE/prospectus_kg_output/inputs"
for f in input_schema.json input_schema_crosswalk.json; do
  [[ -f "$REPO_ROOT/prospectus_kg_output/inputs/$f" ]] && cp -a "$REPO_ROOT/prospectus_kg_output/inputs/$f" "$STAGE/prospectus_kg_output/inputs/"
done
[[ -f "$REPO_ROOT/prospectus_kg_output/inputs/_coverage_vs_report.md" ]] && cp -a "$REPO_ROOT/prospectus_kg_output/inputs/_coverage_vs_report.md" "$STAGE/prospectus_kg_output/inputs/"

grep -vE '^(#|$|[[:space:]]*torch)' "$REPO_ROOT/requirements.txt" | grep -v '^[[:space:]]*$' > "$STAGE/requirements-no-torch.txt" || true

echo "==> Downloading Windows Node.js v$NODE_WIN_VER (x64)…"
NODE_ZIP="/tmp/node-win-${NODE_WIN_VER}.zip"
curl -fsSL -o "$NODE_ZIP" "https://nodejs.org/dist/v${NODE_WIN_VER}/node-v${NODE_WIN_VER}-win-x64.zip"
TMPN="$(mktemp -d)"
unzip -q -o "$NODE_ZIP" -d "$TMPN"
mkdir -p "$STAGE/node"
cp -a "$TMPN/node-v${NODE_WIN_VER}-win-x64/." "$STAGE/node/"
rm -rf "$TMPN"

echo "==> Downloading Windows Python embeddable $PY_EMBED_VER (amd64)…"
PY_ZIP="/tmp/py-embed-${PY_EMBED_VER}.zip"
curl -fsSL -o "$PY_ZIP" "https://www.python.org/ftp/python/${PY_EMBED_VER}/python-${PY_EMBED_VER}-embed-amd64.zip"
mkdir -p "$STAGE/python-embed"
unzip -q -o "$PY_ZIP" -d "$STAGE/python-embed"
# Embed distro uses pythonXY._pth (not *.pth); sed both patterns.
for pth in "$STAGE/python-embed/"*._pth "$STAGE/python-embed/"*.pth; do
  [[ -f "$pth" ]] || continue
  sed -i -E 's/^[[:space:]]*#[[:space:]]*import[[:space:]]+site[[:space:]]*$/import site/' "$pth"
done
curl -fsSL -o "$STAGE/python-embed/get-pip.py" "https://bootstrap.pypa.io/get-pip.py"

cp -a "$REPO_ROOT/packaging/windows/start-prospectus-ui.bat" "$STAGE/"
cp -a "$REPO_ROOT/packaging/windows/ensure-python-venv.bat" "$STAGE/"
cp -a "$REPO_ROOT/packaging/windows/Open-Prospectus-UI.cmd" "$STAGE/"

# CMD.exe breaks on LF-only line endings ("'tlocal' is not recognized", "此时不应有 .").
echo "==> Normalizing CRLF on .bat / .cmd …"
for f in "$STAGE/start-prospectus-ui.bat" "$STAGE/ensure-python-venv.bat" "$STAGE/Open-Prospectus-UI.cmd"; do
  [[ -f "$f" ]] || continue
  python3 -c "
import pathlib, sys
p = pathlib.Path(sys.argv[1])
b = p.read_bytes().replace(b'\r\n', b'\n').replace(b'\r', b'\n')
p.write_bytes(b.replace(b'\n', b'\r\n'))
" "$f"
done

cat > "$STAGE/README-Windows.txt" << EOF
Prospectus AI — Windows folder (built on Linux)

Double-click FIRST if you see a flash:  Open-Prospectus-UI.cmd
  (opens a console that stays open so you can read any error)

Otherwise:  start-prospectus-ui.bat

First launch installs Python packages into venv\\ (several minutes).
Then open http://127.0.0.1:3000 in your browser.

Bundled: Node (node\\), Python embed (python-embed\\), Next server (web\\).
EOF

echo "==> Done: $STAGE"
echo "    Users only need this folder — double-click start-prospectus-ui.bat"

if [[ "$SKIP_TAR" != "1" ]]; then
  ARCHIVE="$REPO_ROOT/dist/ProspectusAI-windows-from-linux-$(date +%Y%m%d-%H%M).tar.gz"
  mkdir -p "$REPO_ROOT/dist"
  echo "==> Creating $ARCHIVE"
  tar -czf "$ARCHIVE" -C "$REPO_ROOT/dist" "$(basename "$STAGE")"
  echo "Archive: $ARCHIVE"
fi

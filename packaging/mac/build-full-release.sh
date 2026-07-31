#!/usr/bin/env bash
# Full macOS release: Next standalone + embedded Node + Python venv + agents inside .app + DMG.
# Run on a Mac (Apple Silicon or Intel) with Node + Python 3.10+ for *building only*.
# End users: open the .dmg, drag "Prospectus AI" to Applications, launch from Launchpad.
#
# Usage (repo root):
#   bash packaging/mac/build-full-release.sh
#   npm run pack:mac
#
# Env:
#   NODE           — path to node binary for next build (default: node on PATH)
#   INSTALL_ROOT   — staging folder relative to repo (default: dist/ProspectusAI-mac)
#   NODE_VERSION   — nodejs.org version to embed (default: 20.18.0)
#   NODE_TAR_PATH  — optional local node-v{ver}-darwin-{arch}.tar.gz (skip download)
#   SKIP_DMG       — if 1, build .app only (no .dmg)
#   SKIP_ZIP       — if 1, do not create .zip of the .app folder
#   TORCH_CPU      — if 1 (default), install CPU PyTorch wheels
#   KEEP_PROXY     — if 1, do not unset http(s)_proxy during pip/curl (default: unset)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL_ROOT="${INSTALL_ROOT:-dist/ProspectusAI-mac}"
STAGE="$REPO_ROOT/$INSTALL_ROOT"
DESKTOP_DIR="$REPO_ROOT/platform/desktop"
BUNDLE_DIR="$DESKTOP_DIR/prospectus-bundle"
SKIP_DMG="${SKIP_DMG:-0}"
SKIP_ZIP="${SKIP_ZIP:-1}"
TORCH_CPU="${TORCH_CPU:-1}"
KEEP_PROXY="${KEEP_PROXY:-0}"
NODE_VERSION="${NODE_VERSION:-20.18.0}"

# macOS system proxy breaks pip, curl, npm, and Electron downloads unless bypassed.
apply_no_proxy() {
  if [[ "$KEEP_PROXY" == "1" ]]; then
    return
  fi
  export NO_PROXY='*'
  export no_proxy='*'
  export HTTP_PROXY=
  export HTTPS_PROXY=
  export http_proxy=
  export https_proxy=
  export all_proxy=
  export ALL_PROXY=
}

apply_no_proxy

clear_build_proxies() {
  if [[ "$KEEP_PROXY" == "1" ]]; then
    return
  fi
  unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY 2>/dev/null || true
}

# Conda/base and macOS system proxy settings can break pip (403 via proxy tunnel).
# NO_PROXY=* forces direct PyPI access; --isolated ignores user pip.conf.
run_pip() {
  if [[ "$KEEP_PROXY" == "1" ]]; then
    pip "$@"
    return
  fi
  clear_build_proxies
  NO_PROXY='*' no_proxy='*' \
    HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= all_proxy= ALL_PROXY= \
    pip --isolated "$@"
}

resolve_node() {
  if [[ -n "${NODE:-}" && -x "${NODE}" ]]; then
    echo "$NODE"
    return
  fi
  if command -v node >/dev/null 2>&1; then
    command -v node
    return
  fi
  echo "ERROR: No node binary found. Install Node 20+ or set NODE=/path/to/node" >&2
  exit 1
}

detect_mac_node_arch() {
  local hw
  hw="$(uname -m)"
  case "$hw" in
    arm64|aarch64) echo "arm64" ;;
    x86_64) echo "x64" ;;
    *)
      echo "ERROR: Unsupported macOS architecture: $hw" >&2
      exit 1
      ;;
  esac
}

stage_runtime() {
  local dest="$1"
  echo "==> Staging runtime to $dest"
  rm -rf "$dest"
  mkdir -p "$dest"

  mkdir -p "$dest/web"
  cp -a "$STANDALONE/frontend/web/." "$dest/web/"
  mkdir -p "$dest/web/.next"
  cp -a "$WEB_DIR/.next/static" "$dest/web/.next/static"
  mkdir -p "$dest/web/public"
  cp -a "$WEB_DIR/public/." "$dest/web/public/"
  if [[ -d "$WEB_DIR/prompts" ]]; then
    mkdir -p "$dest/web/prompts"
    cp -a "$WEB_DIR/prompts/." "$dest/web/prompts/"
  fi

  local i src
  for i in "${ITEMS[@]}"; do
    src="$REPO_ROOT/$i"
    if [[ -e "$src" ]]; then
      cp -a "$src" "$dest/$(basename "$i")"
    else
      echo "WARN: missing $src" >&2
    fi
  done

  mkdir -p "$dest/prospectus_kg_output/inputs"
  for f in input_schema.json input_schema_crosswalk.json; do
    src="$REPO_ROOT/prospectus_kg_output/inputs/$f"
    if [[ -f "$src" ]]; then
      cp -a "$src" "$dest/prospectus_kg_output/inputs/"
    else
      echo "WARN: missing $src" >&2
    fi
  done
  if [[ -f "$REPO_ROOT/prospectus_kg_output/inputs/_coverage_vs_report.md" ]]; then
    cp -a "$REPO_ROOT/prospectus_kg_output/inputs/_coverage_vs_report.md" "$dest/prospectus_kg_output/inputs/"
  fi
}

NODE_BIN="$(resolve_node)"
MAC_NODE_ARCH="$(detect_mac_node_arch)"
echo "Repo: $REPO_ROOT"
echo "Using node: $NODE_BIN ($("$NODE_BIN" -v))"
echo "Target macOS Node arch: darwin-$MAC_NODE_ARCH"

WEB_DIR="$REPO_ROOT/frontend/web"
if [[ ! -d "$WEB_DIR/node_modules" ]]; then
  echo "==> Installing frontend dependencies…"
  (cd "$WEB_DIR" && npm ci)
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

ITEMS=(
  ai-module/agent1.py ai-module/agent2.py ai-module/agent2_stream.py
  ai-module/llm_qwen.py ai-module/llm_openai.py ai-module/llm_anthropic.py
  ai-module/llm_providers.py ai-module/llm_sanitize.py ai-module/section_quality.py
  ai-module/requirements.txt ai-module/prospectus_graph ai-module/prompts
  issuer_metadata.json scripts resources/templates
)

stage_runtime "$BUNDLE_DIR"

echo "==> Downloading Node.js v$NODE_VERSION (darwin-$MAC_NODE_ARCH)…"
NODE_DIR="$BUNDLE_DIR/node"
mkdir -p "$NODE_DIR"
NODE_TAR="node-v${NODE_VERSION}-darwin-${MAC_NODE_ARCH}.tar.gz"
clear_build_proxies
if [[ -n "${NODE_TAR_PATH:-}" && -f "$NODE_TAR_PATH" ]]; then
  echo "Using local Node archive: $NODE_TAR_PATH"
  tar -xzf "$NODE_TAR_PATH" -C "$NODE_DIR" --strip-components=1
else
  NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TAR}"
  TMP_NODE="$(mktemp -t prospectus-node.XXXXXX.tar.gz)"
  if [[ "$KEEP_PROXY" == "1" ]]; then
    curl -fsSL -o "$TMP_NODE" "$NODE_URL"
  else
    curl -fsSL --noproxy '*' -o "$TMP_NODE" "$NODE_URL"
  fi
  tar -xzf "$TMP_NODE" -C "$NODE_DIR" --strip-components=1
  rm -f "$TMP_NODE"
fi

if [[ ! -x "$NODE_DIR/bin/node" ]]; then
  echo "ERROR: node binary not found after extracting Node archive." >&2
  exit 1
fi
echo "Embedded Node: $("$NODE_DIR/bin/node" -v)"

echo "==> Creating Python venv + installing dependencies (may take several minutes)…"
if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found on PATH (needed for build)." >&2
  exit 1
fi
python3 -m venv "$BUNDLE_DIR/venv"
# shellcheck disable=SC1091
source "$BUNDLE_DIR/venv/bin/activate"
run_pip install --upgrade pip wheel setuptools

REQ_NOTORCH="$BUNDLE_DIR/requirements-no-torch.txt"
grep -vE '^(#|$|[[:space:]]*torch)' "$REPO_ROOT/ai-module/requirements.txt" | grep -v '^[[:space:]]*$' > "$REQ_NOTORCH" || true

if [[ "$TORCH_CPU" == "1" ]]; then
  run_pip install "torch>=2.0.0"
else
  run_pip install "torch>=2.0.0"
fi
run_pip install -r "$REQ_NOTORCH"
deactivate || true

echo "==> Building Electron .app + DMG…"
mkdir -p "$DESKTOP_DIR/build"
ICON_PNG="$DESKTOP_DIR/build/icon.png"

ensure_mac_icon() {
  local icon="$1"
  local src=""
  for candidate in \
    "$REPO_ROOT/frontend/web/src/app/favicon.ico" \
    "$REPO_ROOT/frontend/web/public/favicon.ico" \
    "$icon"; do
    if [[ -f "$candidate" ]]; then
      src="$candidate"
      break
    fi
  done

  if [[ -z "$src" ]]; then
    echo "WARN: No icon source found; creating placeholder 512x512 icon." >&2
    python3 - <<'PY' "$icon"
import struct, zlib, sys
path = sys.argv[1]
size = 512
row = b"\x00" + b"\x22\x55\x88\xff" * size
raw = row * size
png = (
    b"\x89PNG\r\n\x1a\n"
    + struct.pack(">I", 13) + b"IHDR" + struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    + struct.pack(">I", zlib.crc32(b"IHDR" + struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) & 0xFFFFFFFF)
    + struct.pack(">I", len(raw)) + b"IDAT" + zlib.compress(raw, 9)
    + struct.pack(">I", zlib.crc32(b"IDAT" + zlib.compress(raw, 9)) & 0xFFFFFFFF)
    + struct.pack(">I", 0) + b"IEND" + struct.pack(">I", zlib.crc32(b"IEND") & 0xFFFFFFFF)
)
open(path, "wb").write(png)
PY
    return
  fi

  if [[ "$src" == *.ico ]] && command -v sips >/dev/null 2>&1; then
    sips -s format png "$src" --out "$icon" >/dev/null 2>&1 || cp -f "$src" "$icon"
  elif [[ "$src" != "$icon" ]]; then
    cp -f "$src" "$icon"
  fi

  if command -v sips >/dev/null 2>&1; then
    local w h
    w="$(sips -g pixelWidth "$icon" 2>/dev/null | awk '/pixelWidth/ {print $2}')"
    h="$(sips -g pixelHeight "$icon" 2>/dev/null | awk '/pixelHeight/ {print $2}')"
    if [[ -z "$w" || -z "$h" || "$w" -lt 512 || "$h" -lt 512 ]]; then
      echo "==> Upsizing app icon to 512x512 (electron-builder requirement)…"
      sips -z 512 512 "$icon" --out "$icon" >/dev/null
    fi
  fi
}

ensure_mac_icon "$ICON_PNG"

# Ship the one-click installer/fixer inside the DMG (referenced by
# dmg.contents in electron-builder.mac.json, path relative to platform/desktop).
INSTALL_CMD="$REPO_ROOT/packaging/mac/install-prospectus.command"
cp -f "$INSTALL_CMD" "$DESKTOP_DIR/build/install-prospectus.command"
chmod +x "$DESKTOP_DIR/build/install-prospectus.command"

DESKTOP_RELEASE="$DESKTOP_DIR/release"
rm -rf "$DESKTOP_RELEASE"
(
  cd "$DESKTOP_DIR"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install --no-audit --no-fund
  fi
  if [[ "$SKIP_DMG" == "1" ]]; then
    npx electron-builder --mac dir --"${MAC_NODE_ARCH}" --config "$REPO_ROOT/packaging/mac/electron-builder.mac.json"
  else
    npx electron-builder --mac dmg --"${MAC_NODE_ARCH}" --config "$REPO_ROOT/packaging/mac/electron-builder.mac.json"
  fi
)

ELECTRON_APP=""
for candidate in \
  "$DESKTOP_RELEASE/mac-${MAC_NODE_ARCH}/Prospectus AI.app" \
  "$DESKTOP_RELEASE/mac/Prospectus AI.app"; do
  if [[ -d "$candidate" ]]; then
    ELECTRON_APP="$candidate"
    break
  fi
done
if [[ -z "$ELECTRON_APP" ]]; then
  ELECTRON_APP="$(find "$DESKTOP_RELEASE" -maxdepth 3 -name 'Prospectus AI.app' -type d 2>/dev/null | head -n 1 || true)"
fi
if [[ -z "$ELECTRON_APP" || ! -d "$ELECTRON_APP" ]]; then
  echo "ERROR: Expected Electron app under $DESKTOP_RELEASE" >&2
  exit 1
fi

mkdir -p "$REPO_ROOT/dist"
STAMP="$(date +%Y%m%d-%H%M)"

if [[ "$SKIP_DMG" != "1" ]]; then
  DMG_SRC="$(find "$DESKTOP_RELEASE" -maxdepth 1 -name '*.dmg' -type f 2>/dev/null | head -n 1 || true)"
  if [[ -z "$DMG_SRC" || ! -f "$DMG_SRC" ]]; then
    echo "ERROR: Expected .dmg under $DESKTOP_RELEASE" >&2
    exit 1
  fi
  DMG_OUT="$REPO_ROOT/dist/ProspectusAI-mac-${MAC_NODE_ARCH}-${STAMP}.dmg"
  cp -f "$DMG_SRC" "$DMG_OUT"
  echo ""
  echo "==> DMG ready: $DMG_OUT"
  echo "    Users: open the DMG → drag Prospectus AI to Applications → launch from Applications."
fi

rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -R "$ELECTRON_APP" "$STAGE/"
echo "App bundle: $STAGE/Prospectus AI.app"

cat > "$STAGE/README-Mac.txt" << 'EOF'
Prospectus AI — macOS install (DMG)
===================================

Install (recommended)
---------------------
1. Open the .dmg file
2. Double-click "双击安装 Install.command" inside the DMG window.
   It copies the app to Applications, removes the macOS quarantine flag
   (which otherwise causes a bogus "app is damaged" dialog), and launches the app.
   - If macOS blocks the script: right-click it → Open → Open.
   - On macOS 15+ you may instead need to approve it once under
     System Settings → Privacy & Security → "Open Anyway".
3. In the app, open Model & inference settings to configure Qwen or an OpenAI-compatible API

Manual install (alternative)
----------------------------
1. Drag "Prospectus AI" to the Applications folder
2. The app is not notarized by Apple, so macOS will report it as "damaged".
   Fix it by running in Terminal:
     xattr -cr "/Applications/Prospectus AI.app"
3. Open Prospectus AI from Applications or Launchpad

Your documents and uploads are stored in:
  ~/Library/Application Support/Prospectus AI/

GPU / Apple Silicon
-------------------
This bundle uses CPU PyTorch by default. Cloud API backends work out of the box.

--- 中文简要说明 ---
推荐安装方式：
1. 打开 .dmg
2. 双击窗口里的「双击安装 Install.command」→ 自动安装到「应用程序」、
   解除 macOS 隔离限制（否则会误报「文件已损坏」）并启动应用。
   - 如果脚本被系统拦截：右键该文件 → 打开 → 打开。
   - macOS 15 及以上：如仍被拦截，去「系统设置 → 隐私与安全性」点「仍要打开」。
3. 首次使用请在「Model & inference」里配置 API。

手动安装（备选）：将 app 拖到「应用程序」后，在终端执行：
  xattr -cr "/Applications/Prospectus AI.app"
再从启动台打开。提示「文件已损坏」是因为应用未经 Apple 公证，并非真的损坏。
EOF

if [[ "$SKIP_ZIP" != "1" ]]; then
  ZIP_OUT="$REPO_ROOT/dist/ProspectusAI-mac-${MAC_NODE_ARCH}-${STAMP}.zip"
  echo "==> Creating $ZIP_OUT"
  (
    cd "$STAGE"
    ditto -c -k --sequesterResource --keepParent "Prospectus AI.app" "$(basename "$ZIP_OUT")"
    mv "$(basename "$ZIP_OUT")" "$ZIP_OUT"
  )
  echo "Zip: $ZIP_OUT"
fi

echo ""
echo "==> Done."
if [[ "$SKIP_DMG" != "1" ]]; then
  echo "Ship dist/ProspectusAI-mac-${MAC_NODE_ARCH}-*.dmg to users."
else
  echo "Ship $STAGE/Prospectus AI.app (or enable DMG with SKIP_DMG=0)."
fi

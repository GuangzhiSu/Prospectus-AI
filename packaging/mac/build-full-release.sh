#!/usr/bin/env bash
# Build the thin macOS client. No prompts, agents, model runtime, or issuer data
# are embedded in the .app/DMG; the client loads the hosted HTTPS workspace.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DESKTOP_DIR="$REPO_ROOT/platform/desktop"
DESKTOP_RELEASE="$DESKTOP_DIR/release"
INSTALL_ROOT="${INSTALL_ROOT:-dist/ProspectusAI-mac}"
STAGE="$REPO_ROOT/$INSTALL_ROOT"
SKIP_DMG="${SKIP_DMG:-0}"
SKIP_ZIP="${SKIP_ZIP:-1}"

case "$(uname -m)" in
  arm64|aarch64) MAC_NODE_ARCH="arm64" ;;
  x86_64) MAC_NODE_ARCH="x64" ;;
  *) echo "ERROR: Unsupported macOS architecture: $(uname -m)" >&2; exit 1 ;;
esac

mkdir -p "$DESKTOP_DIR/build" "$REPO_ROOT/dist"
ICON_PNG="$DESKTOP_DIR/build/icon.png"
ICON_SOURCE="$REPO_ROOT/frontend/web/src/app/favicon.ico"
if command -v sips >/dev/null 2>&1; then
  sips -s format png "$ICON_SOURCE" --out "$ICON_PNG" >/dev/null
  sips -z 512 512 "$ICON_PNG" --out "$ICON_PNG" >/dev/null
else
  cp -f "$ICON_SOURCE" "$ICON_PNG"
fi

cp -f "$REPO_ROOT/packaging/mac/install-prospectus.command" \
  "$DESKTOP_DIR/build/install-prospectus.command"
chmod +x "$DESKTOP_DIR/build/install-prospectus.command"

rm -rf "$DESKTOP_RELEASE"
(
  cd "$DESKTOP_DIR"
  if [[ -f package-lock.json ]]; then npm ci; else npm install --no-audit --no-fund; fi
  if [[ "$SKIP_DMG" == "1" ]]; then
    npx electron-builder --mac dir --"$MAC_NODE_ARCH" --config "$REPO_ROOT/packaging/mac/electron-builder.mac.json"
  else
    npx electron-builder --mac dmg --"$MAC_NODE_ARCH" --config "$REPO_ROOT/packaging/mac/electron-builder.mac.json"
  fi
)

ELECTRON_APP="$(find "$DESKTOP_RELEASE" -maxdepth 3 -name 'Prospectus AI.app' -type d | head -n 1)"
if [[ -z "$ELECTRON_APP" ]]; then
  echo "ERROR: Electron app was not created" >&2
  exit 1
fi

ASAR="$ELECTRON_APP/Contents/Resources/app.asar"
ASAR_FILES="$(cd "$DESKTOP_DIR" && npx asar list "$ASAR")"
if grep -Eiq '(prompts?|agent[12]|ai-module|server\.js|\.py$|\.env|model[_-]?weights?)' <<<"$ASAR_FILES"; then
  echo "ERROR: Server-only files found in desktop app.asar" >&2
  grep -Ei '(prompts?|agent[12]|ai-module|server\.js|\.py$|\.env|model[_-]?weights?)' <<<"$ASAR_FILES" >&2
  exit 1
fi

rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -R "$ELECTRON_APP" "$STAGE/"

cat > "$STAGE/README-Mac.txt" <<'EOF'
Prospectus AI — macOS client
============================

This app requires an internet connection and connects to
https://ai-prospectus.com. Prompts, AI agents, model execution, and API
credentials remain on the server and are not installed on this Mac.
EOF

STAMP="$(date +%Y%m%d-%H%M)"
if [[ "$SKIP_DMG" != "1" ]]; then
  DMG_SRC="$(find "$DESKTOP_RELEASE" -maxdepth 1 -name '*.dmg' -type f | head -n 1)"
  DMG_OUT="$REPO_ROOT/dist/ProspectusAI-mac-${MAC_NODE_ARCH}-${STAMP}.dmg"
  cp -f "$DMG_SRC" "$DMG_OUT"
  echo "DMG ready: $DMG_OUT"
fi

if [[ "$SKIP_ZIP" != "1" ]]; then
  ZIP_OUT="$REPO_ROOT/dist/ProspectusAI-mac-${MAC_NODE_ARCH}-${STAMP}.zip"
  ditto -c -k --sequesterRsrc --keepParent "$ELECTRON_APP" "$ZIP_OUT"
  echo "ZIP ready: $ZIP_OUT"
fi

#!/usr/bin/env bash
# Build the thin Linux client. All prompts and model execution stay server-side.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DESKTOP_DIR="$REPO_ROOT/platform/desktop"
DESKTOP_RELEASE="$DESKTOP_DIR/release"
mkdir -p "$DESKTOP_DIR/build" "$REPO_ROOT/dist"
if [[ ! -f "$DESKTOP_DIR/build/icon.png" ]]; then
  echo "ERROR: Missing platform/desktop/build/icon.png" >&2
  exit 1
fi
rm -rf "$DESKTOP_RELEASE"

case "$(uname -m)" in
  x86_64|amd64) LINUX_ARCH="x64" ;;
  aarch64|arm64) LINUX_ARCH="arm64" ;;
  *) echo "ERROR: Unsupported Linux architecture: $(uname -m)" >&2; exit 1 ;;
esac

(
  cd "$DESKTOP_DIR"
  if [[ -f package-lock.json ]]; then npm ci; else npm install --no-audit --no-fund; fi
  npx electron-builder --linux AppImage --"$LINUX_ARCH"
)

ASAR="$DESKTOP_RELEASE/linux-unpacked/resources/app.asar"
ASAR_FILES="$(cd "$DESKTOP_DIR" && npx asar list "$ASAR")"
if grep -Eiq '(prompts?|agent[12]|ai-module|server\.js|\.py$|\.env|model[_-]?weights?)' <<<"$ASAR_FILES"; then
  echo "ERROR: Server-only files found in desktop app.asar" >&2
  grep -Ei '(prompts?|agent[12]|ai-module|server\.js|\.py$|\.env|model[_-]?weights?)' <<<"$ASAR_FILES" >&2
  exit 1
fi

APPIMAGE="$(find "$DESKTOP_RELEASE" -maxdepth 1 -name '*.AppImage' -type f | head -n 1)"
if [[ -z "$APPIMAGE" ]]; then
  echo "ERROR: AppImage was not created" >&2
  exit 1
fi

OUT="$REPO_ROOT/dist/ProspectusAI-linux-${LINUX_ARCH}.AppImage"
cp -f "$APPIMAGE" "$OUT"
chmod +x "$OUT"
echo "AppImage ready: $OUT"

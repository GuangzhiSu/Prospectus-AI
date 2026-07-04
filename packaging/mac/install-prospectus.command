#!/bin/bash
# Prospectus AI - one-click installer / fixer for macOS.
# Ships inside the DMG. Double-click to:
#   1. Copy "Prospectus AI.app" to /Applications (if run from the DMG)
#   2. Remove the quarantine attribute that causes the bogus
#      "app is damaged" Gatekeeper dialog on unsigned apps
#   3. Launch the app
set -u

APP_NAME="Prospectus AI.app"
DEST="/Applications/$APP_NAME"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_APP="$SRC_DIR/$APP_NAME"

echo "=============================================="
echo " Prospectus AI 安装 / 修复工具 (macOS)"
echo " Prospectus AI installer / fixer"
echo "=============================================="
echo ""

fail() {
  echo ""
  echo "[出错 / ERROR] $1"
  echo "请截图此窗口并联系开发者。 / Please screenshot this window and contact the developer."
  echo ""
  read -r -p "按回车键退出 / Press Enter to exit..." _
  exit 1
}

# 1. Copy the app to /Applications when running from the mounted DMG.
if [ -d "$SRC_APP" ] && [ "$SRC_APP" != "$DEST" ]; then
  echo "==> 正在安装到「应用程序」文件夹（可能需要几分钟）…"
  echo "==> Copying app to /Applications (this can take a few minutes)..."
  rm -rf "$DEST" 2>/dev/null
  if ! ditto "$SRC_APP" "$DEST"; then
    fail "无法复制到 /Applications。/ Could not copy the app to /Applications."
  fi
elif [ ! -d "$DEST" ]; then
  fail "没有找到 $APP_NAME。请先把应用拖入「应用程序」，或从 DMG 内运行本脚本。/ $APP_NAME not found. Drag it to Applications first, or run this script from inside the DMG."
fi

# 2. Clear quarantine so Gatekeeper stops reporting the app as "damaged".
echo "==> 正在解除 macOS 隔离限制… / Removing quarantine attribute..."
if ! xattr -cr "$DEST" 2>/dev/null; then
  sudo xattr -cr "$DEST" || fail "无法解除隔离限制。/ Failed to remove quarantine attribute."
fi

# 3. Launch.
echo "==> 正在启动 Prospectus AI… / Launching Prospectus AI..."
open "$DEST" || fail "应用无法启动。/ The app failed to launch."

echo ""
echo "完成！以后可直接从「启动台」或「应用程序」打开。"
echo "Done! You can open the app from Launchpad or Applications from now on."
sleep 3
exit 0

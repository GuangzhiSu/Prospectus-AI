#!/usr/bin/env bash
# Linux/macOS: pack docs + trimmed source only (no Windows Next standalone).
# For a full folder (with application/), run packaging/windows/bundle-release.ps1 on Windows.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE="${REPO_ROOT}/dist/ProspectusAI-SharingBundle"

mkdir -p "$BUNDLE/docs" "$BUNDLE/source"

for f in WINDOWS_INSTALL.md NOTICE_THIRD_PARTY.md; do
  if [[ -f "$REPO_ROOT/docs/$f" ]]; then
    cp -f "$REPO_ROOT/docs/$f" "$BUNDLE/docs/"
  fi
done

rm -rf "$BUNDLE/source"/*
rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='.venv' \
  --exclude='venv' \
  --exclude='uploads' \
  --exclude='rag' \
  --exclude='rag_raw' \
  --exclude='.progress.json' \
  --exclude='agent1_output' \
  --exclude='agent2_output' \
  --exclude='hkex_prospectus' \
  --exclude='prospectus_kg_output' \
  --exclude='apps/web/.next' \
  --exclude='apps/web/uploads' \
  --exclude='apps/web/rag' \
  --exclude='apps/web/rag_raw' \
  --exclude='ipo_prospectus_pipeline/outputs' \
  --exclude='dist' \
  --exclude='.DS_Store' \
  --exclude='~$*' \
  "$REPO_ROOT/" "$BUNDLE/source/"

mkdir -p "$BUNDLE/source/prospectus_kg_output/inputs"
for f in input_schema.json input_schema_crosswalk.json; do
  if [[ -f "$REPO_ROOT/prospectus_kg_output/inputs/$f" ]]; then
    cp -f "$REPO_ROOT/prospectus_kg_output/inputs/$f" "$BUNDLE/source/prospectus_kg_output/inputs/"
  fi
done
if [[ -f "$REPO_ROOT/prospectus_kg_output/inputs/_coverage_vs_report.md" ]]; then
  cp -f "$REPO_ROOT/prospectus_kg_output/inputs/_coverage_vs_report.md" "$BUNDLE/source/prospectus_kg_output/inputs/"
fi

mkdir -p "$BUNDLE/application"
cat > "$BUNDLE/application/此目录需在-Windows-上生成.txt" << 'EOF'
完整可运行程序请在本仓库的 Windows 环境执行：

  powershell -ExecutionPolicy Bypass -File packaging/windows/bundle-release.ps1

生成的 application\ 会包含 Next standalone 与代理脚本。本 Linux 脚本只打包了 docs/ 与 source/。
EOF

cat > "$BUNDLE/README-分发说明.txt" << 'EOF'
Prospectus AI — 分发文件夹说明（Linux 脚本生成）
==================================================

本目录由 packaging/bundle-release.sh 生成，仅包含：
- docs/     安装说明与第三方声明
- source/   精简源码（无 node_modules、无大体积 KG）
- application/ 占位说明 — 不含 Windows 可执行前端

若需要「一个文件夹里既有程序又有源码」发给 Windows 用户：
在 Windows 仓库根目录执行：

  powershell -ExecutionPolicy Bypass -File packaging/windows/bundle-release.ps1

然后将生成的 dist\ProspectusAI-SharingBundle 整夹压缩发送即可。
EOF

echo "Bundle (source + docs only): $BUNDLE"
echo "For full application + source on Windows, run packaging/windows/bundle-release.ps1"

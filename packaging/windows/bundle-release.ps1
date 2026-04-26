# One folder to zip and send: runnable application/ + docs/ + source/ (trimmed) + README.
# Run on Windows from repo root (needs Node + Python same as build.ps1).
#
#   powershell -ExecutionPolicy Bypass -File packaging/windows/bundle-release.ps1
#
# Output (default): dist\ProspectusAI-SharingBundle\

param(
    [string]$BundleRoot = "dist\ProspectusAI-SharingBundle",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$Bundle = Join-Path $RepoRoot $BundleRoot
$AppRel = Join-Path $BundleRoot "application"

New-Item -ItemType Directory -Force -Path $Bundle | Out-Null

if (-not $SkipBuild) {
    & (Join-Path $PSScriptRoot "build.ps1") -InstallRoot $AppRel
} else {
    $AppAbs = Join-Path $RepoRoot $AppRel
    if (-not (Test-Path $AppAbs)) {
        throw "SkipBuild was set but folder is missing: $AppAbs"
    }
}

# --- docs for the recipient ---
$DocDst = Join-Path $Bundle "docs"
New-Item -ItemType Directory -Force -Path $DocDst | Out-Null
foreach ($f in @("WINDOWS_INSTALL.md", "NOTICE_THIRD_PARTY.md")) {
    $p = Join-Path $RepoRoot "docs\$f"
    if (Test-Path $p) { Copy-Item -Force $p $DocDst }
}

# --- trimmed source tree (no node_modules, no huge KG corpus) ---
$SrcDst = Join-Path $Bundle "source"
if (Test-Path $SrcDst) { Remove-Item -Recurse -Force $SrcDst }
New-Item -ItemType Directory -Force -Path $SrcDst | Out-Null

$RoboArgs = @(
    $RepoRoot, $SrcDst,
    "/E", "/MT:8", "/NFL", "/NDL", "/NJH", "/NJS",
    "/XF", "~$*",
    "/XD", ".git", "node_modules", "__pycache__", ".venv", "venv",
    "/XD", "uploads", "rag", "rag_raw", "agent1_output", "agent2_output", "hkex_prospectus", "prospectus_kg_output",
    "/XD", "apps\web\.next", "apps\web\uploads", "apps\web\rag", "apps\web\rag_raw",
    "/XD", "ipo_prospectus_pipeline\outputs", "dist"
)
& robocopy @RoboArgs | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

# Slim schema files under source/ (same as installer)
$KgIn = Join-Path $SrcDst "prospectus_kg_output\inputs"
New-Item -ItemType Directory -Force -Path $KgIn | Out-Null
foreach ($f in @("input_schema.json", "input_schema_crosswalk.json")) {
    $src = Join-Path $RepoRoot "prospectus_kg_output\inputs\$f"
    if (Test-Path $src) { Copy-Item -Force $src (Join-Path $KgIn $f) }
}
$cov = Join-Path $RepoRoot "prospectus_kg_output\inputs\_coverage_vs_report.md"
if (Test-Path $cov) { Copy-Item -Force $cov (Join-Path $KgIn "_coverage_vs_report.md") }

# --- README at bundle root ---
$ReadmePath = Join-Path $Bundle "README-分发说明.txt"
@'
Prospectus AI — 分发文件夹说明
================================

本目录包含三部分，压缩整个文件夹发给对方即可：

1) application\
   Windows 上可直接作为安装根目录使用（内含 Next standalone、agent1/2、slim prospectus_kg_output）。
   仍需按 docs\WINDOWS_INSTALL.md 准备嵌入式 Python venv（或本机 Python + 依赖），未随包附带 venv。

2) docs\
   安装与配置说明（WINDOWS_INSTALL.md）、第三方声明（NOTICE_THIRD_PARTY.md）。请一并交给对方。

3) source\
   源码快照（已排除 node_modules、大体积 KG 语料等）。便于对方审阅或二次开发；日常运行以 application\ 为准。

对方使用步骤（摘要）：
- 解压后阅读 docs\WINDOWS_INSTALL.md
- 配置 application\ 下的 Python 环境与依赖
- 双击 application\start-prospectus-ui.bat（或按文档从安装器释放的等价布局启动）

生成本文件夹：在仓库根目录执行 packaging\windows\bundle-release.ps1
'@ | Set-Content -Path $ReadmePath -Encoding utf8

Write-Host ""
Write-Host "Sharing bundle ready:"
Write-Host "  $Bundle"
Write-Host "Zip the folder ProspectusAI-SharingBundle and send it."

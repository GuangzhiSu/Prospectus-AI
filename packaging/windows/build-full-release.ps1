# Full Windows portable bundle: Next standalone + embedded Node.js (win-x64) + Python venv + agents.
# Run on a Windows x64 machine with Node + Python 3.10+ available for *building only*.
# End users: unzip / copy the output folder, double-click start-prospectus-ui.bat — no separate Node install.
#
# Usage (repo root):
#   powershell -ExecutionPolicy Bypass -File packaging/windows/build-full-release.ps1
#
# Parameters:
#   -InstallRoot       Relative to repo root (default: dist\ProspectusAI)
#   -NodeVersion       nodejs.org version to embed, e.g. 20.18.0
#   -NodeZipPath       Optional local path to node-v{ver}-win-x64.zip (skip download)
#   -SkipZip           If set, do not create dist\ProspectusAI-windows-*.zip
#   -TorchCpu          If $true (default), install CPU PyTorch wheels for portability

param(
    [string]$InstallRoot = "dist\ProspectusAI",
    [string]$NodeVersion = "20.18.0",
    [string]$NodeZipPath = "",
    [switch]$SkipZip,
    [bool]$TorchCpu = $true
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $RepoRoot

Write-Host "Repo: $RepoRoot"

# --- Next.js build ---
Push-Location (Join-Path $RepoRoot "frontend\web")
npm ci
npm run build
if (-not (Test-Path ".next\standalone\frontend\web\server.js")) {
    Pop-Location
    throw "Expected frontend\web\.next\standalone\frontend\web\server.js after next build."
}
Pop-Location

# --- Stage application files ---
$Stage = Join-Path $RepoRoot $InstallRoot
if (Test-Path $Stage) {
    Remove-Item -Recurse -Force $Stage
}
New-Item -ItemType Directory -Force -Path $Stage | Out-Null

Write-Host "Staging to $Stage"
$StandaloneWeb = Join-Path $RepoRoot "frontend\web\.next\standalone\frontend\web"
$WebDir = Join-Path $RepoRoot "frontend\web"
$StageWeb = Join-Path $Stage "web"
New-Item -ItemType Directory -Force -Path $StageWeb | Out-Null
Copy-Item -Recurse -Force (Join-Path $StandaloneWeb "*") $StageWeb
$NextDir = Join-Path $StageWeb ".next"
New-Item -ItemType Directory -Force -Path $NextDir | Out-Null
Copy-Item -Recurse -Force (Join-Path $WebDir ".next\static") (Join-Path $NextDir "static")
$PubDst = Join-Path $StageWeb "public"
New-Item -ItemType Directory -Force -Path $PubDst | Out-Null
Copy-Item -Recurse -Force (Join-Path $WebDir "public\*") $PubDst

$Items = @(
    "ai-module\agent1.py", "ai-module\agent2.py", "ai-module\llm_qwen.py", "ai-module\llm_openai.py",
    "ai-module\llm_anthropic.py", "ai-module\llm_providers.py", "ai-module\llm_sanitize.py", "ai-module\section_quality.py",
    "ai-module\requirements.txt", "ai-module\prospectus_graph",
    "agent2_section_requirements.json", "issuer_metadata.json", "scripts", "resources\templates"
)
foreach ($i in $Items) {
    $src = Join-Path $RepoRoot $i
    if (Test-Path $src) {
        Copy-Item -Recurse -Force $src (Join-Path $Stage (Split-Path -Leaf $i))
    } else {
        Write-Warning "Missing $src"
    }
}

$KgInputs = Join-Path $Stage "prospectus_kg_output\inputs"
New-Item -ItemType Directory -Force -Path $KgInputs | Out-Null
foreach ($f in @("input_schema.json", "input_schema_crosswalk.json")) {
    $src = Join-Path $RepoRoot "prospectus_kg_output\inputs\$f"
    if (Test-Path $src) {
        Copy-Item -Force $src (Join-Path $KgInputs $f)
    } else {
        Write-Warning "Missing $src"
    }
}
$cov = Join-Path $RepoRoot "prospectus_kg_output\inputs\_coverage_vs_report.md"
if (Test-Path $cov) {
    Copy-Item -Force $cov (Join-Path $KgInputs "_coverage_vs_report.md")
}

# --- Embedded Node.js (Windows x64) ---
$NodeDir = Join-Path $Stage "node"
New-Item -ItemType Directory -Force -Path $NodeDir | Out-Null

if ($NodeZipPath -and (Test-Path $NodeZipPath)) {
    $zipFile = (Resolve-Path $NodeZipPath).Path
    Write-Host "Using local Node zip: $zipFile"
} else {
    $zipUrl = "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip"
    $zipFile = Join-Path $env:TEMP "node-v$NodeVersion-win-x64.zip"
    Write-Host "Downloading Node.js v$NodeVersion win-x64..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -UseBasicParsing
}

$extractRoot = Join-Path $env:TEMP "node-extract-$(New-Guid)"
New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null
try {
    Expand-Archive -Path $zipFile -DestinationPath $extractRoot -Force
    $inner = Get-ChildItem -LiteralPath $extractRoot -Directory | Select-Object -First 1
    if (-not $inner) { throw "Unexpected Node zip layout (no top-level folder)." }
    Copy-Item -Recurse -Force (Join-Path $inner.FullName "*") $NodeDir
} finally {
    Remove-Item -Recurse -Force $extractRoot -ErrorAction SilentlyContinue
}

if (-not (Test-Path (Join-Path $NodeDir "node.exe"))) {
    throw "node.exe not found after extracting Node archive."
}

# --- Python venv + pip (CPU PyTorch by default) ---
$venvPy = Join-Path $Stage "venv\Scripts\python.exe"
Write-Host "Creating Python venv (this may take several minutes)..."
if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 -m venv (Join-Path $Stage "venv")
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    & python -m venv (Join-Path $Stage "venv")
} else {
    throw "Python 3 not found on PATH (need py launcher or python for build)."
}

$pip = Join-Path $Stage "venv\Scripts\pip.exe"
& $pip install --upgrade pip wheel setuptools

$reqPath = Join-Path $RepoRoot "ai-module\requirements.txt"
$reqNoTorch = Join-Path $env:TEMP "req-notorch-$([Guid]::NewGuid().ToString('n')).txt"
Get-Content -LiteralPath $reqPath -Encoding UTF8 |
    Where-Object { $_ -notmatch '^\s*#' -and $_ -notmatch '^\s*torch' -and $_.Trim() -ne '' } |
    Set-Content -LiteralPath $reqNoTorch -Encoding UTF8

if ($TorchCpu) {
    & $pip install "torch>=2.0.0" --index-url "https://download.pytorch.org/whl/cpu"
} else {
    & $pip install "torch>=2.0.0"
}
& $pip install -r $reqNoTorch
Copy-Item -Force $reqNoTorch (Join-Path $Stage "requirements-no-torch.txt")
Remove-Item -Force $reqNoTorch -ErrorAction SilentlyContinue

# --- Launcher + readme ---
Copy-Item -Force (Join-Path $PSScriptRoot "start-prospectus-ui.bat") $Stage
Copy-Item -Force (Join-Path $PSScriptRoot "ensure-python-venv.bat") $Stage
Copy-Item -Force (Join-Path $PSScriptRoot "Open-Prospectus-UI.cmd") $Stage
Copy-Item -Force (Join-Path $RepoRoot "frontend\web\src\app\favicon.ico") (Join-Path $Stage "app.ico")

# --- Electron desktop shell ---
$DesktopDir = Join-Path $RepoRoot "platform\desktop"
$DesktopRelease = Join-Path $DesktopDir "release"
if (Test-Path $DesktopRelease) {
    Remove-Item -Recurse -Force $DesktopRelease
}
Copy-Item -Force (Join-Path $RepoRoot "frontend\web\src\app\favicon.ico") (Join-Path $DesktopDir "build\icon.ico")
Push-Location $DesktopDir
if (Test-Path "package-lock.json") {
    npm ci
} else {
    npm install --no-audit --no-fund
}
npm run pack -- --win --x64
Pop-Location

$ElectronUnpacked = Join-Path $DesktopRelease "win-unpacked"
if (-not (Test-Path (Join-Path $ElectronUnpacked "Prospectus AI.exe"))) {
    throw "Expected Electron desktop shell at $ElectronUnpacked\Prospectus AI.exe"
}
Copy-Item -Recurse -Force (Join-Path $ElectronUnpacked "*") $Stage

$readme = @"
Prospectus AI — Windows portable bundle
============================================

No separate Node.js install required: this folder includes node\node.exe.
No separate Python install required for agents: venv\ contains dependencies.

Start
-----
1. Double-click Prospectus AI.exe, or install ProspectusAI-Setup-0.1.0.exe and use the shortcut
2. The desktop window starts the local service and opens the app automatically
3. If needed, use Open-Prospectus-UI.cmd as a browser fallback
4. In the app, open Model & inference settings to configure Qwen or an OpenAI-compatible API

GPU (optional)
--------------
This bundle uses CPU PyTorch by default. For NVIDIA GPU, activate the venv and reinstall CUDA builds
per https://pytorch.org/get-started/locally/

Troubleshooting
---------------
- If Windows SmartScreen warns: click More info -> Run anyway (or sign the app for distribution).
- Antivirus may slow first run while scanning venv and node.

--- 中文简要说明 ---
无需单独安装 Node.js（已包含 node\node.exe）或系统 Python（Agent 使用本目录 venv）。
双击 Prospectus AI.exe 会自动启动本地服务并打开桌面窗口；也可用 Open-Prospectus-UI.cmd 作为浏览器备用入口。
首次请在网页「Model & inference」里配置本地 Qwen 或 OpenAI 兼容 API。
"@
Set-Content -LiteralPath (Join-Path $Stage "README-Windows.txt") -Value $readme -Encoding UTF8

Write-Host ""
Write-Host "Done. Portable folder: $Stage"
Write-Host "End users: double-click Prospectus AI.exe"

if (-not $SkipZip) {
    $distDir = Join-Path $RepoRoot "dist"
    if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }
    $stamp = Get-Date -Format "yyyyMMdd-HHmm"
    $zipOut = Join-Path $distDir "ProspectusAI-windows-x86_64-$stamp.zip"
    Write-Host "Creating zip: $zipOut"
    if (Test-Path $zipOut) { Remove-Item -Force $zipOut }
    Compress-Archive -Path (Join-Path $Stage "*") -DestinationPath $zipOut -CompressionLevel Optimal
    Write-Host "Zip: $zipOut"
}

Pop-Location

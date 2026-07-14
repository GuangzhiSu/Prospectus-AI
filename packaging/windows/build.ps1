# Build artifacts for a Windows installer (run on a Windows machine with Node + Python).
# Stages Next standalone + repo root files so PROSPECTUS_ROOT = install root.
# prospectus_kg_output is slim: only inputs/*.json needed for Agent2 crosswalk (no native_docs, records, structure, etc.).
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File packaging/windows/build.ps1 -InstallRoot "dist\ProspectusAI"

param(
    [string]$InstallRoot = "dist\ProspectusAI"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

Push-Location $RepoRoot

Write-Host "Repo: $RepoRoot"

Push-Location (Join-Path $RepoRoot "frontend\web")
npm ci
npm run build
if (-not (Test-Path ".next\standalone")) {
    throw "frontend/web/.next/standalone missing — check next.config output: standalone"
}
Pop-Location

$Stage = Join-Path $RepoRoot $InstallRoot
New-Item -ItemType Directory -Force -Path $Stage | Out-Null

Write-Host "Staging to $Stage"
$StandaloneWeb = Join-Path $RepoRoot "frontend\web\.next\standalone\frontend\web"
$WebDir = Join-Path $RepoRoot "frontend\web"
if (-not (Test-Path (Join-Path $StandaloneWeb "server.js"))) {
    throw "Missing $StandaloneWeb\server.js — run npm run build in frontend\web first."
}
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
    }
}

# Slim KG bundle: crosswalk + schema only (internal full tree stays out of consumer installs).
$KgStage = Join-Path $Stage "prospectus_kg_output"
$KgInputs = Join-Path $KgStage "inputs"
New-Item -ItemType Directory -Force -Path $KgInputs | Out-Null
$SchemaFiles = @(
    "input_schema.json",
    "input_schema_crosswalk.json"
)
foreach ($f in $SchemaFiles) {
    $src = Join-Path $RepoRoot "prospectus_kg_output\inputs\$f"
    if (Test-Path $src) {
        Copy-Item -Force $src (Join-Path $KgInputs $f)
    } else {
        Write-Warning "Missing $src — Agent2 crosswalk may be incomplete."
    }
}
$cov = Join-Path $RepoRoot "prospectus_kg_output\inputs\_coverage_vs_report.md"
if (Test-Path $cov) {
    Copy-Item -Force $cov (Join-Path $KgInputs "_coverage_vs_report.md")
}

Copy-Item -Force (Join-Path $PSScriptRoot "start-prospectus-ui.bat") $Stage
Copy-Item -Force (Join-Path $PSScriptRoot "ensure-python-venv.bat") $Stage
Copy-Item -Force (Join-Path $PSScriptRoot "Open-Prospectus-UI.cmd") $Stage
Copy-Item -Force (Join-Path $RepoRoot "frontend\web\src\app\favicon.ico") (Join-Path $Stage "app.ico")

Write-Host "Done. PROSPECTUS_ROOT = install folder (agent1.py + slim prospectus_kg_output/inputs for crosswalk)."

Pop-Location

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

Push-Location (Join-Path $RepoRoot "apps\web")
npm ci
npm run build
if (-not (Test-Path ".next\standalone")) {
    throw "apps/web/.next/standalone missing — check next.config output: standalone"
}
Pop-Location

$Stage = Join-Path $RepoRoot $InstallRoot
New-Item -ItemType Directory -Force -Path $Stage | Out-Null

Write-Host "Staging to $Stage"
Copy-Item -Recurse -Force (Join-Path $RepoRoot "apps\web\.next\standalone\*") (Join-Path $Stage "web")

$Items = @(
    "agent1.py", "agent2.py", "llm_qwen.py", "llm_openai.py",
    "requirements.txt", "agent2_section_requirements.json", "issuer_metadata.json",
    "prospectus_graph", "scripts", "templates"
)
foreach ($i in $Items) {
    $src = Join-Path $RepoRoot $i
    if (Test-Path $src) {
        Copy-Item -Recurse -Force $src (Join-Path $Stage $i)
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

Write-Host "Done. PROSPECTUS_ROOT = install folder (agent1.py + slim prospectus_kg_output/inputs for crosswalk)."

Pop-Location

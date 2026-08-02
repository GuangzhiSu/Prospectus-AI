# Build the thin Windows desktop client.
#
# The resulting bundle contains only Electron and main.cjs. Prompts, Python
# agents, model runtimes, issuer data, and API credentials remain server-side.

param(
    [string]$InstallRoot = "dist\ProspectusAI",
    [switch]$SkipZip,
    # Retained for compatibility with older CI/build commands; intentionally unused.
    [string]$NodeVersion = "",
    [string]$NodeZipPath = "",
    [string]$PythonVersion = "",
    [string]$PythonEmbedZipPath = "",
    [string]$GetPipUrl = "",
    [bool]$TorchCpu = $false,
    [switch]$PrebuildVenv
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$Stage = Join-Path $RepoRoot $InstallRoot
$DesktopDir = Join-Path $RepoRoot "platform\desktop"
$DesktopRelease = Join-Path $DesktopDir "release"

Push-Location $RepoRoot
try {
    if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
    if (Test-Path $DesktopRelease) { Remove-Item -Recurse -Force $DesktopRelease }

    New-Item -ItemType Directory -Force -Path (Join-Path $DesktopDir "build") | Out-Null
    Copy-Item -Force `
        (Join-Path $RepoRoot "frontend\web\src\app\favicon.ico") `
        (Join-Path $DesktopDir "build\icon.ico")

    Push-Location $DesktopDir
    try {
        if (Test-Path "package-lock.json") { npm ci } else { npm install --no-audit --no-fund }
        npm run pack -- --win --x64
    } finally {
        Pop-Location
    }

    $ElectronUnpacked = Join-Path $DesktopRelease "win-unpacked"
    $Exe = Join-Path $ElectronUnpacked "Prospectus AI.exe"
    if (-not (Test-Path $Exe)) { throw "Expected thin Electron client at $Exe" }

    $Asar = Join-Path $ElectronUnpacked "resources\app.asar"
    $AsarFiles = & npx --prefix $DesktopDir asar list $Asar
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect Electron app.asar" }
    $Forbidden = $AsarFiles | Where-Object {
        $_ -match '(?i)(prompts?|agent[12]|ai-module|server\.js|\.py$|\.env|model[_-]?weights?)'
    }
    if ($Forbidden) {
        throw "Server-only files found in desktop app.asar: $($Forbidden -join ', ')"
    }

    New-Item -ItemType Directory -Force -Path $Stage | Out-Null
    Copy-Item -Recurse -Force (Join-Path $ElectronUnpacked "*") $Stage
    Copy-Item -Force `
        (Join-Path $RepoRoot "frontend\web\src\app\favicon.ico") `
        (Join-Path $Stage "app.ico")

    $Readme = @"
Prospectus AI — Windows client
================================

This application connects securely to https://ai-prospectus.com.
An internet connection and workspace credentials are required.

Prompts, AI agents, model execution, and API credentials are not installed on
this computer. Documents submitted in the app are sent to the Prospectus AI
server for processing.
"@
    Set-Content -LiteralPath (Join-Path $Stage "README-Windows.txt") -Value $Readme -Encoding UTF8

    Write-Host "Thin client ready: $Stage"

    if (-not $SkipZip) {
        $DistDir = Join-Path $RepoRoot "dist"
        New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
        $ZipOut = Join-Path $DistDir "ProspectusAI-windows-x86_64.zip"
        if (Test-Path $ZipOut) { Remove-Item -Force $ZipOut }
        Compress-Archive -Path (Join-Path $Stage "*") -DestinationPath $ZipOut -CompressionLevel Optimal
        Write-Host "Portable ZIP: $ZipOut"
    }
} finally {
    Pop-Location
}

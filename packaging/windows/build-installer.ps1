# Build a Windows installer for Prospectus AI using Inno Setup 6.
#
# Usage from repo root on Windows:
#   powershell -ExecutionPolicy Bypass -File packaging/windows/build-installer.ps1
#
# This script stages dist\ProspectusAI when needed, then compiles:
#   dist\ProspectusAI-Setup-0.1.2.exe

param(
    [string]$InstallRoot = "dist\ProspectusAI",
    [string]$Version = "0.1.2",
    [string]$InnoCompiler = "",
    [switch]$SkipStage
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $RepoRoot

try {
    $Stage = Join-Path $RepoRoot $InstallRoot
    if (-not $SkipStage -or -not (Test-Path (Join-Path $Stage "Open-Prospectus-UI.cmd"))) {
        Write-Host "Staging Windows app bundle..."
        & (Join-Path $PSScriptRoot "build-full-release.ps1") -InstallRoot $InstallRoot -SkipZip
    }

    if (-not $InnoCompiler) {
        $Candidates = @(
            (Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe"),
            (Join-Path ${env:ProgramFiles} "Inno Setup 6\ISCC.exe")
        )
        $InnoCompiler = ($Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1)
    }
    if (-not $InnoCompiler -or -not (Test-Path $InnoCompiler)) {
        throw "Inno Setup compiler not found. Install Inno Setup 6 or pass -InnoCompiler C:\Path\ISCC.exe"
    }

    $OutputDir = Join-Path $RepoRoot "dist"
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
    $Script = Join-Path $PSScriptRoot "ProspectusAI.iss"

    Write-Host "Compiling installer with $InnoCompiler"
    & $InnoCompiler `
        "/DSourceDir=$Stage" `
        "/DOutputDir=$OutputDir" `
        "/DMyAppVersion=$Version" `
        $Script

    $Installer = Join-Path $OutputDir "ProspectusAI-Setup-$Version.exe"
    if (-not (Test-Path $Installer)) {
        throw "Expected installer was not created: $Installer"
    }
    Write-Host "Installer ready: $Installer"
} finally {
    Pop-Location
}

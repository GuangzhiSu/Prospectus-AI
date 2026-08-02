# Compatibility builder for a recipient-facing folder. The former version
# included a source snapshot (and therefore prompts); this version only stages
# the thin desktop client and public installation documentation.

param(
    [string]$BundleRoot = "dist\ProspectusAI-SharingBundle",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$Bundle = Join-Path $RepoRoot $BundleRoot
$ApplicationRel = Join-Path $BundleRoot "application"
$Application = Join-Path $RepoRoot $ApplicationRel

if (Test-Path $Bundle) { Remove-Item -Recurse -Force $Bundle }
New-Item -ItemType Directory -Force -Path $Bundle | Out-Null

if (-not $SkipBuild) {
    & (Join-Path $PSScriptRoot "build-full-release.ps1") -InstallRoot $ApplicationRel -SkipZip
} elseif (-not (Test-Path (Join-Path $Application "Prospectus AI.exe"))) {
    throw "SkipBuild was set but the thin client is missing: $Application"
}

$Docs = Join-Path $Bundle "docs"
New-Item -ItemType Directory -Force -Path $Docs | Out-Null
foreach ($Name in @("WINDOWS_INSTALL.md", "NOTICE_THIRD_PARTY.md")) {
    $Source = Join-Path $RepoRoot "docs\$Name"
    if (Test-Path $Source) { Copy-Item -Force $Source $Docs }
}

$Readme = @"
Prospectus AI — recipient bundle
=================================

Run application\Prospectus AI.exe. The app requires an internet connection and
workspace credentials. Prompts, agents, model code, provider keys, and source
code are not included; AI processing happens on the protected server.
"@
Set-Content -LiteralPath (Join-Path $Bundle "README.txt") -Value $Readme -Encoding UTF8
Write-Host "Thin-client sharing bundle ready: $Bundle"

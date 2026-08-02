# Compatibility entry point for the former local-runtime staging script.
# Consumer builds are now thin clients; delegate to the canonical builder so
# prompts and model code cannot accidentally be shipped.

param(
    [string]$InstallRoot = "dist\ProspectusAI"
)

$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "build-full-release.ps1") -InstallRoot $InstallRoot -SkipZip

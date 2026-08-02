#!/usr/bin/env bash
# Windows Electron binaries must be produced on Windows. The previous script
# created a local-runtime bundle containing prompts and is intentionally retired.

set -euo pipefail

echo "ERROR: The legacy full Windows runtime bundle has been retired." >&2
echo "Use the Windows release workflow or run packaging/windows/build-full-release.ps1 on Windows." >&2
exit 1

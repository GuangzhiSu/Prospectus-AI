# Windows desktop client

The public Windows installer is a thin Electron client. It connects to the
protected server workspace over HTTPS and does not install prompts, Python
agents, model code, Node.js server code, model weights, or provider API keys on
the user's computer.

## Runtime boundary

- Client: `platform/desktop/main.cjs` and the Electron runtime.
- Server: the hosted Next.js workspace, API routes, Python agents, prompts, and
  model/provider configuration.
- Default server: `https://ai-prospectus.com`.
- Override for staging: launch with `PROSPECTUS_SERVER_URL=https://staging.example.com`.
- Authentication: configure `WORKSPACE_USER` and `WORKSPACE_PASSWORD` on the
  server. Never embed shared API credentials in the installer.

Documents selected in the workspace are uploaded to the configured server for
processing. The desktop client therefore requires an internet connection.

## Build the portable client

On Windows x64 with Node.js 20:

```powershell
powershell -ExecutionPolicy Bypass -File packaging/windows/build-full-release.ps1
```

Outputs:

- `dist\ProspectusAI\` — unpacked thin client.
- `dist\ProspectusAI-windows-x86_64.zip` — portable client archive.

## Build the installer

Install Inno Setup 6, then run:

```powershell
powershell -ExecutionPolicy Bypass -File packaging/windows/build-installer.ps1
```

Output:

- `dist\ProspectusAI-Setup-<version>.exe`

The GitHub Actions workflow `.github/workflows/windows-portable.yml` performs
the same build and can upload both artifacts to a GitHub Release.

## Verify that server assets are absent

After building, inspect `dist\ProspectusAI`. It must not contain any of these:

- `prompts/` or `web/prompts/`
- `agent1.py`, `agent2.py`, or other `ai-module` files
- `python-embed/`, `venv/`, or embedded Node.js
- `.env` files or model-provider API keys

Electron's `app.asar` will still contain `main.cjs`; this is expected. It only
contains navigation and window logic, including the public server URL.

## Signing

Unsigned installers trigger Windows SmartScreen. Use an Authenticode
certificate for public distribution.

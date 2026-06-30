# macOS packaging

Build a **standalone DMG** that users open, drag to Applications, and launch like any Mac app. No separate Node.js or Python install required.

## Quick start (build on a Mac)

From the repo root:

```bash
npm install --prefix frontend/web
npm run pack:mac
```

Or directly:

```bash
bash packaging/mac/build-full-release.sh
```

Output:

- **`dist/ProspectusAI-mac-{arm64|x64}-*.dmg`** — drag-to-Applications installer (default)
- **`dist/ProspectusAI-mac/Prospectus AI.app`** — unpacked app (for local testing)

## What end users do

1. Download and open **`ProspectusAI-mac-*.dmg`**
2. Drag **Prospectus AI** to **Applications**
3. Launch from Applications or Launchpad
4. Configure **Model & inference** in the web UI

If macOS blocks the app (unsigned):

```bash
xattr -cr "/Applications/Prospectus AI.app"
```

Or right-click the app → **Open** → **Open**.

User data (uploads, drafts, progress) is stored in:

`~/Library/Application Support/Prospectus AI/`

## Build errors

### Paths with spaces

The build script quotes all paths. If you see `… is a directory`, update to the latest `packaging/mac/build-full-release.sh`.

### pip proxy / `403 Forbidden`

macOS or conda may route pip through a broken system proxy. The build script sets `NO_PROXY=*` and uses `pip --isolated` by default. Retry:

```bash
npm run pack:mac
```

If you rely on a corporate proxy, set `KEEP_PROXY=1`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INSTALL_ROOT` | `dist/ProspectusAI-mac` | Folder for copied `.app` + readme |
| `NODE_VERSION` | `20.18.0` | Embedded Node.js version |
| `NODE_TAR_PATH` | — | Local Node tarball (skip download) |
| `SKIP_DMG` | `0` | Set to `1` to build `.app` only (no `.dmg`) |
| `SKIP_ZIP` | `1` | Set to `0` to also zip the `.app` |
| `TORCH_CPU` | `1` | CPU PyTorch wheels |
| `KEEP_PROXY` | `0` | Set to `1` to keep http(s)_proxy during pip/curl |

## How the app is structured

Runtime files live **inside** the app bundle:

```
Prospectus AI.app/Contents/Resources/prospectus/
  web/          Next.js server
  node/         Embedded Node.js
  venv/         Python agents
  agent1.py, agent2.py, …
```

Writable files go to Application Support (seeded on first launch).

## Related scripts

- Windows: [`packaging/windows/build-full-release.ps1`](../windows/build-full-release.ps1)
- Linux: [`packaging/linux/build-full-release.sh`](../linux/build-full-release.sh)
- Electron shell: [`platform/desktop/`](../../platform/desktop/)

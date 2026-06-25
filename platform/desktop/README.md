# Prospectus AI - desktop (Electron)

This folder wraps the Next.js app in an **Electron** window and uses your **app icon** (`build/icon.png`).

## Development (browser UI + desktop window)

1. Terminal A — start the web app from repo root:

   ```bash
   npm run dev
   ```

2. Terminal B — install Electron once, then open the shell:

   ```bash
   npm run desktop:install
   npm run desktop:dev
   ```

   The window loads `http://127.0.0.1:3000`. Optional: `PROSPECTUS_ELECTRON_DEVTOOLS=1` to open DevTools.

## Packaged app + shortcuts (Windows)

The normal Windows release path is the repo-level installer script:

```powershell
powershell -ExecutionPolicy Bypass -File packaging/windows/build-installer.ps1
```

That script runs `packaging/windows/build-full-release.ps1`, which:

- builds the Next.js standalone server
- creates the Python runtime/venv for the AI agents
- builds `platform/desktop` with Electron Builder
- copies `Prospectus AI.exe` and its Electron support files into `dist/ProspectusAI/`
- compiles the Inno Setup installer

The installed Start Menu and desktop shortcuts open `Prospectus AI.exe`. The older `Open-Prospectus-UI.cmd` browser launcher remains in the install folder as a fallback.

The Electron executable expects to run next to `agent1.py` and `web/server.js`; the release scripts preserve that layout.

## Linux / macOS

- `npm run dist` in `platform/desktop` can produce `AppImage` or `dmg` when run on those OSes.
- Use the same rule: keep `agent1.py` and `web/` beside the app (matching your platform packaging layout).

## Icon

Replace `build/icon.png` with your branding (square PNG, at least 512x512 recommended for app windows). The Windows release script copies `frontend/web/src/app/favicon.ico` to `build/icon.ico` before packaging.

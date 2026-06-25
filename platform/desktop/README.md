# Prospectus AI — desktop (Electron)

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

1. Build the **full install folder** (Next standalone + Python agents), e.g. on Windows:

   ```powershell
   powershell -ExecutionPolicy Bypass -File packaging/windows/build.ps1
   ```

   This produces something like `dist/ProspectusAI/` with `agent1.py`, `web/server.js`, etc.

2. Build the **installer** (desktop shortcut + Start Menu use your logo):

   ```bash
   cd platform/desktop
   npm install
   npm run dist
   ```

   Output is under `platform/desktop/release/` (e.g. NSIS `.exe` installer on Windows).

3. **Important:** The Electron app expects to run **next to** that full tree. After installing the Electron build:

   - Either install/copy the contents of `dist/ProspectusAI/` into the same directory as the installed `Prospectus AI.exe`, **or**
   - Copy the built `Prospectus AI.exe` (and its Electron companion files from `release/win-unpacked/` if you used `--dir`) **into** `dist/ProspectusAI/` so the same folder contains both `agent1.py` and `web/`.

   The launcher looks for `agent1.py` and `web/server.js` in the **same directory as the executable**.

## Linux / macOS

- `npm run dist` in `platform/desktop` can produce `AppImage` or `dmg` when run on those OSes.
- Use the same rule: keep `agent1.py` and `web/` beside the app (matching your platform packaging layout).

## Icon

Replace `build/icon.png` with your branding (square PNG, at least 512×512 recommended for installers).

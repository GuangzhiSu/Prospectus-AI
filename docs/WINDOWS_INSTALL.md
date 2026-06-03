# Windows install (desktop packaging)

## Windows folder built on your Linux server (for `dist/ProspectusAI`)

From the repo root on Linux:

```bash
npm run pack:windows-dist
```

This fills **`dist/ProspectusAI/`** with **`start-prospectus-ui.bat`**, **`node/`** (Windows Node), **`python-embed/`**, **`web/`**, and agents. End users **double-click `start-prospectus-ui.bat`** (first run installs Python packages into `venv\`, then the server starts). No separate Node.js install.

---

## Download a ready-made portable ZIP from CI (no local Node for end users)

If you do **not** use the Linux script above, note: a **`dist/ProspectusAI` produced only by the older Linux script** (`pack:linux`) is **not** a Windows app (Linux `venv`). For a **Windows double-click** bundle with embedded Node.js and a Windows Python `venv`, use either:

1. **GitHub Actions** (after this workflow is on your default branch): open **Actions → “Windows portable bundle” → Run workflow**. When it finishes, download the artifact **`ProspectusAI-windows-portable`** (contains `ProspectusAI-windows-x86_64-*.zip`). Unzip, then double-click **`start-prospectus-ui.bat`** and open `http://127.0.0.1:3000`.

2. **Build on a Windows x64 PC**:  
   `powershell -ExecutionPolicy Bypass -File packaging/windows/build-full-release.ps1`  
   Output: `dist\ProspectusAI\` and `dist\ProspectusAI-windows-*.zip`.

---

This repo runs as **Next.js + Python**: the web UI spawns `agent1.py` / `agent2.py` on the machine. The recommended consumer layout is:

1. **Installer** (Inno Setup template: [`packaging/windows/ProspectusAI.iss`](../packaging/windows/ProspectusAI.iss)) copies:
   - Next **standalone** output from `apps/web/.next/standalone/`
   - Python **venv** with dependencies from [`requirements.txt`](../requirements.txt) (CUDA or CPU PyTorch wheel chosen at install time)
   - Application files under `app/` (`agent1.py`, `agent2.py`, `llm_qwen.py`, `llm_openai.py`, `prospectus_graph/`, `scripts/`, etc.)

2. **Environment**
   - `PROSPECTUS_ROOT` must point at the folder that contains **`agent1.py` and `prospectus_kg_output/`**. Agent2 loads the crosswalk from **`prospectus_kg_output/inputs/input_schema.json`** and **`input_schema_crosswalk.json`** only. The [`build.ps1`](../packaging/windows/build.ps1) stage copies that **slim** `inputs/` tree — not `native_docs/`, bulk `records/`, `structure/docgraph.json`, or other internal KG pipeline outputs. The **Knowledge Graph** page in the UI needs a full repo-style `prospectus_kg_output` (with `structure/docgraph.json`); it shows a short notice if that file is absent.
   - Launcher: [`packaging/windows/start-prospectus-ui.bat`](../packaging/windows/start-prospectus-ui.bat) (adjust `web\server.js` path to match your `next build` output).

3. **First-run model (split download)**
   - Open **Inference & GPU settings** in the web UI (`/settings`).
   - Click **Download Qwen3.5-4B** or set **Qwen model** to a local folder that already contains Hugging Face files (must include `config.json`).
   - Default download directory: `%LOCALAPPDATA%\ProspectusAI\models\Qwen3.5-4B`.

4. **Offline inference**
   - After download, set `TRANSFORMERS_OFFLINE=1` optionally; the UI saves model path in user settings, which sets `AGENT2_MODEL` / `AGENT1_MODEL` for Python.

5. **Cloud API**
   - In `/settings`, choose a cloud backend: **OpenAI / compatible**, **DeepSeek**, **Qwen (DashScope API)**, or **Anthropic (Claude / Opus)**. Enter the API key, optional base URL (OpenAI-compatible providers), and model id, then **Save** and **Test connection**. Agent1, Agent2, and document chat use the same saved backend (`LLM_PROVIDER` env: `openai`, `deepseek`, `qwen_api`, or `anthropic`).

6. **GPU**
   - Install an NVIDIA driver that matches your **PyTorch CUDA** build. If CUDA is unavailable or the GPU architecture is unsupported, enable **Force CPU** in settings (slow).

7. **Build scripts (on Windows x64)**
   - **All-in-one portable bundle (recommended for end users):** [`packaging/windows/build-full-release.ps1`](../packaging/windows/build-full-release.ps1) — builds Next, stages `web` + agents + slim KG inputs, creates a **Python venv**, downloads and embeds **Node.js win-x64** under `node\`, and copies [`start-prospectus-ui.bat`](../packaging/windows/start-prospectus-ui.bat). Recipients do **not** need to install Node.js separately; they run the `.bat` and open `http://127.0.0.1:3000`. Optional `-SkipZip` to skip creating `dist\ProspectusAI-windows-*.zip`.
   - **Stage only (no venv / no embedded Node):** [`packaging/windows/build.ps1`](../packaging/windows/build.ps1) — for custom installers; you supply Python and Node on target machines yourself.

8. **Development: standalone start**
   - From `apps/web` after `npm run build`:
   - `npm run start:standalone` — if `server.js` path differs, run `node` on the path printed by Next under `.next/standalone/`.

## Disk and memory

- **Qwen3.5-4B**: roughly **8GB+** disk for weights; **8GB+** VRAM recommended for GPU inference (quantization env vars in `llm_qwen.py` may help).
- **PyTorch + dependencies**: several GB in the venv.

## Code signing

Unsigned installers trigger Windows SmartScreen. For public distribution, use an Authenticode certificate.

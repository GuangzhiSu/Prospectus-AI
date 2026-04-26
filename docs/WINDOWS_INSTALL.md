# Windows install (desktop packaging)

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
   - In `/settings`, choose **OpenAI-compatible API** and enter an API key. This sets `LLM_PROVIDER=openai` for Agent2 and Agent1 table summaries. Use a base URL that implements the OpenAI Chat Completions API.

6. **GPU**
   - Install an NVIDIA driver that matches your **PyTorch CUDA** build. If CUDA is unavailable or the GPU architecture is unsupported, enable **Force CPU** in settings (slow).

7. **Build script (on Windows)**
   - [`packaging/windows/build.ps1`](../packaging/windows/build.ps1) — stages `web` + `app` for the installer. You must create and copy a **Python venv** into the stage separately (not automated here).

8. **Development: standalone start**
   - From `apps/web` after `npm run build`:
   - `npm run start:standalone` — if `server.js` path differs, run `node` on the path printed by Next under `.next/standalone/`.

## Disk and memory

- **Qwen3.5-4B**: roughly **8GB+** disk for weights; **8GB+** VRAM recommended for GPU inference (quantization env vars in `llm_qwen.py` may help).
- **PyTorch + dependencies**: several GB in the venv.

## Code signing

Unsigned installers trigger Windows SmartScreen. For public distribution, use an Authenticode certificate.

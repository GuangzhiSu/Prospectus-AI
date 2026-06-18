# Prospectus AI — standalone project

This folder is a **complete, self-contained** copy of Prospectus AI. You can delete everything else in the parent repository and use only this directory.

## What is included

| Component | Path |
|-----------|------|
| AI agents (Agent1, Agent2, LangGraph) | `ai-module/` |
| Web UI + API | `platform-module/web/` |
| Platform orchestration | `platform-module/prospectus_platform/` |
| Contract schemas | `contracts/v1/` |
| Shipped defaults (prompts, KG inputs, sample data) | `bundled/` |
| Runtime workspace (uploads, outputs) | `workspace/` |
| Data sync scripts | `scripts/sync_data.py` |
| Packaging (Windows/Linux) | `packaging/` |
| Desktop shell (Electron) | `platform-module/desktop/` |
| Legacy local LLM service | `platform-module/services/local-llm/` |

## Quick start

```bash
cd modular          # or clone this folder as its own repo
bash setup.sh       # or: npm run setup
npm run dev
```

Open http://localhost:3000

## Environment

After `setup.sh`, edit `platform-module/web/.env.local` if paths differ:

```bash
PROSPECTUS_ROOT=/absolute/path/to/modular/workspace
AGENT1_PYTHON=/absolute/path/to/modular/ai-module/.venv/bin/python
AGENT1_USE_CPU=1
```

## Features (parity with full repo)

- Main workflow: upload → Agent1 → Agent2 → draft → export DOCX
- `/settings` — LLM providers, model download, GPU/CPU
- `/agent1` — standalone Agent1 view
- `/kg-view` — KG explorer (needs full KG via `npm run data:fetch`)
- Legacy `/api/chat` RAG — optional `platform-module/services/local-llm`
- CLI: `./run_full_pipeline.sh`
- Desktop: `npm run desktop:dev` (with `npm run dev` in another terminal)

## Large optional data

PDF corpus and full KG are **not** in git (too large). Fetch when needed:

```bash
source ai-module/.venv/bin/activate
python scripts/sync_data.py fetch --profile kg-dev
```

See `data/manifest.json` and `docs/COLLABORATOR_SETUP.zh-CN.md`.

## Updating (teammates)

```bash
npm run update    # git pull + reinstall deps if needed
```

Never re-download the whole project — use git pull.

## Layout

```text
modular/
├── ai-module/           # AI module (agents, LLM, graph)
├── platform-module/     # Platform module (web, desktop, services)
├── bundled/             # Factory defaults copied into workspace/
├── workspace/           # Live data & outputs (PROSPECTUS_ROOT)
├── contracts/           # Platform ↔ AI JSON contracts
├── scripts/             # sync_data, dev-update, model download
├── packaging/           # Windows/Linux release builds
├── setup.sh
├── package.json
└── README.md
```

Nothing outside this folder is required for development or running the UI.

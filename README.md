# Prospectus AI

Repository for generating Exchange prospectus working drafts from structured source materials.

## Current status

The repo currently contains two document-generation paths:

1. **Main workflow in active use**: `Excel/JSON -> Agent1 -> Agent2 -> Export`
   - Upload `.xlsx` or `.json` files in the web UI
   - `Agent1` extracts and summarizes sheets/data into dual retrieval stores (text chunks + fact store), and groups them into A-H evidence buckets
   - `Agent2` drafts section-by-section sponsor-counsel working drafts using `ai-module/prompts/sections/requirements.json`
   - Export combined draft to Word (.docx) via the web UI
2. **Legacy / optional workflow retained in the repo**: `PDF/DOCX/XLSX -> /api/chat -> rag.ts`
   - This older route still exists for experimentation and local-LLM testing
   - It is not the current homepage's primary workflow

The current `Agent2` output is intentionally **not** a fully complete final filing copy. It produces:

- prospectus-style prose where the source materials support it
- section scaffolding and sub-headings where materials are incomplete
- explicit gaps such as `[Information not provided in the documents]`
- AI work tags such as `[[AI:VERIFY|...]]`, `[[AI:CITE|...]]`, `[[AI:XREF|...]]`, and `[[AI:LPD|...]]`

This makes the output more suitable as a sponsor-counsel working draft than as a final prospectus.

## Repository structure

```text
prospectus-ui/
├── ai-module/                          # Python AI runtime, isolated from the UI/platform code
│   ├── agent1.py                       # Excel/JSON extraction → text_chunks + fact_store
│   ├── agent2.py                       # LangGraph runner for section drafting
│   ├── llm_qwen.py                     # Shared Qwen model loader / inference helpers
│   ├── requirements.txt                # Python dependencies for Agent1/Agent2
│   ├── prospectus_graph/               # LangGraph state, retriever, verifier, graph
│   └── prompts/                        # Unified prompt templates + section requirements SSOT
├── frontend/
│   └── web/                            # Next.js app (UI + current API route adapters)
├── platform/
│   ├── desktop/                        # Electron desktop shell
│   └── services/local-llm/             # Optional FastAPI + Chroma service for legacy route
├── knowledge-module/
│   └── prospectus_docgraph/            # Document graph / structural KG tooling
├── pipeline-module/
│   └── ipo_prospectus_pipeline/        # Standalone IPO prospectus extraction pipeline
├── resources/                          # Templates, prompt packs, canvases, legacy references
├── data/                               # Input Excel (.xlsx) or JSON (.json) for main workflow
├── ai-module/prompts/sections/requirements.json  # Section-by-section working draft instructions (SSOT)
├── run_full_pipeline.sh                # agent1 -> agent2 convenience script
├── docs/
├── README.md
└── .gitignore
```

See `docs/STRUCTURE.md` for additional repository notes, but read it with care because some parts still describe the older RAG-first flow.

## Prerequisites

- **Node.js** 18+ for the web app
- **npm** (or pnpm/yarn)
- **Python** 3.10+ for `ai-module/agent1.py`, `ai-module/agent2.py`, and model inference
- Enough disk space and network access for the first Hugging Face model download

For the **main workflow** (Excel/JSON → Agent1 → Agent2), you do **not** need `OPENAI_API_KEY` or `HF_API_KEY`.

For the **legacy / optional document-RAG workflow**, you may still need:

- `OPENAI_API_KEY` when `RAG_PROVIDER=openai`
- `HF_API_KEY` when `RAG_PROVIDER=hf`
- a running `platform/services/local-llm` server when `RAG_PROVIDER=local`

## User guide: what lives where and how to get it

`git clone` alone does **not** give you everything. Use this table first, then follow the setup steps below.

| Content | Where it lives | How you get it |
|---------|----------------|----------------|
| Application code (`frontend/`, `ai-module/`, `platform/`, `scripts/`, …) | **GitHub** main repo | `git clone git@github.com:GuangzhiSu/Prospectus-AI.git` |
| KG contract JSON (`input_schema*.json`, crosswalk) | **GitHub** main repo | same clone (`prospectus_kg_output/inputs/`) |
| Data manifest + checksums ([`data/manifest.json`](data/manifest.json)) | **GitHub** main repo | same clone |
| PDF corpus `prospectus_corpus/` (~750 MB compressed) | **Codeup LFS** data repo | see [Fetch large files](#fetch-large-files-codeup) below |
| Full KG output `prospectus_kg_output/` (~200 MB compressed) | **Codeup LFS** data repo | same |
| Sample issuer Excel/JSON under `data/` | **Codeup LFS** data repo (`dev-full` bundle) | same |
| Qwen model weights | **Hugging Face** | auto-download on first Agent1/Agent2 run |
| Run outputs `agent1_output/`, `agent2_output/` | local only | generated when you run the pipeline; never commit |

**Current data release:** `published_tag` in [`data/manifest.json`](data/manifest.json) (currently `local-2026-05-20`).

**Team repositories**

| Role | URL |
|------|-----|
| Main code (GitHub) | `git@github.com:GuangzhiSu/Prospectus-AI.git` |
| Large data bundles (Codeup LFS) | `git@codeup.aliyun.com:6a0f36b843d4694d6a535802/prospectus-ui-data.git` |

中文逐步说明（含离线包、常见问题）：**[docs/COLLABORATOR_SETUP.zh-CN.md](docs/COLLABORATOR_SETUP.zh-CN.md)**

English maintainer / return-workflow notes: **[docs/COLLABORATION.md](docs/COLLABORATION.md)**

### Full setup (recommended order)

1. **Clone code and install dependencies** (see [Quick start](#quick-start) below).
2. **Fetch large files** from Codeup (requires Git LFS + Codeup access).
3. **Configure** `frontend/web/.env.local` with your absolute paths.
4. **Run** `npm run dev` from the repo root.

### Fetch large files (Codeup)

Prerequisites: [Git LFS](https://git-lfs.com) installed (`git lfs install`), SSH key added to Codeup, access to the data repo above.

From the **repo root** after `pip install -r ai-module/requirements.txt`:

```bash
source .venv/bin/activate

# Clone/update the LFS data repo (~1.1 GB download)
./scripts/codeup_data_repo.sh init git@codeup.aliyun.com:6a0f36b843d4694d6a535802/prospectus-ui-data.git
./scripts/codeup_data_repo.sh pull
eval "$(./scripts/codeup_data_repo.sh env)"

# Download, verify checksums, and extract into the working tree
python scripts/sync_data.py fetch --profile dev-full
python scripts/sync_data.py verify --profile dev-full
```

Shortcut (same fetch, after env is set): `make data-dev-full`

**Partial profiles** (if you do not need PDFs or full KG):

| Profile | What you get |
|---------|----------------|
| `minimal` | Git-tracked schema/crosswalk only; no download |
| `kg-dev` | KG structure, writing cards, records (no PDF corpus) |
| `dev-full` | Everything: corpus + full KG + sample Excel |

```bash
python scripts/sync_data.py fetch --profile kg-dev
```

**Offline alternative:** maintainer sends `.tar.zst` files; use `./scripts/ingest_data_bundle.sh /path/to/file.tar.zst` (see collaborator doc).

**Verify after setup:** `prospectus_corpus/` has PDFs; `prospectus_kg_output/structure/docgraph.json` exists for `/kg-view`.

## Quick start

### Recommended: run the current main workflow

1. Create a Python virtual environment at the repo root and install Python dependencies:

```bash
cd /path/to/prospectus-ui
python3 -m venv .venv
source .venv/bin/activate
pip install -r ai-module/requirements.txt
```

2. Install web dependencies:

```bash
cd /path/to/prospectus-ui/frontend/web
npm install
```

3. Create `frontend/web/.env.local` with the minimum settings needed by the web API:

```bash
PROSPECTUS_ROOT=/path/to/prospectus-ui
WORKSPACE_ROOT=workspace
WORKSPACE_USER=admin
WORKSPACE_PASSWORD=change-this-password
AGENT1_PYTHON=/path/to/prospectus-ui/.venv/bin/python
AGENT1_MODEL=Qwen/Qwen2.5-3B-Instruct
AGENT1_USE_CPU=1
```

Notes:

- `PROSPECTUS_ROOT` points to the repo root containing `ai-module/`, `frontend/`, and the other code modules
- `WORKSPACE_ROOT` optionally points to the runtime workspace for uploads, inputs, RAG indexes, and generated outputs. Relative values such as `workspace` are resolved under `PROSPECTUS_ROOT`. If unset, the legacy repo-root paths are used.
- `WORKSPACE_PASSWORD` enables Basic Auth for `/workspace` and operational API routes. `WORKSPACE_USER` defaults to `admin` when unset.
- `AI_MODULE_ROOT` optionally overrides the default `PROSPECTUS_ROOT/ai-module` path
- `AGENT1_PYTHON` is used by the web API when it launches both `ai-module/agent1.py` and `ai-module/agent2.py`
- `AGENT1_MODEL` sets the default Qwen model used by the web flow
- `AGENT1_USE_CPU=1` is the safest default when CUDA is unavailable

4. Start the web app from the repo root:

```bash
cd /path/to/prospectus-ui
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) and use the main page:

- upload `.xlsx` or `.json` files
- click **Run Agent1**
- generate sections with **Generate all sections** or **Generate next section**
- use **Export** to download the combined draft as Word (.docx)

6. Review the outputs:

- `agent1_output/` or `$WORKSPACE_ROOT/agent1_output/` for summarized and grouped evidence (`text_chunks.jsonl`, `fact_store.jsonl`, `manifest.json`)
- `agent2_output/section_*.md` or `$WORKSPACE_ROOT/agent2_output/section_*.md` for section drafts
- `agent2_output/all_sections.md` or `$WORKSPACE_ROOT/agent2_output/all_sections.md` for the combined draft

### Run the full pipeline from the command line

Prerequisite: place your input `.xlsx` or `.json` files in `data/`, or in `$WORKSPACE_ROOT/data/` when `WORKSPACE_ROOT` is set.

```bash
cd /path/to/prospectus-ui
source .venv/bin/activate
./run_full_pipeline.sh
```

Examples:

```bash
./run_full_pipeline.sh Summary Definitions
./run_full_pipeline.sh --model Qwen/Qwen2.5-3B-Instruct
```

## Environment variables

### Main workflow variables

| Variable | Used by | Description | Default |
| ---------- | --------- | ------------- | --------- |
| `PROSPECTUS_ROOT` | Web API | Repo root that contains `ai-module/`, `frontend/`, and the other code modules | auto-detect |
| `WORKSPACE_ROOT` | Web API / AI CLI | Optional runtime workspace for `data/`, outputs, uploads, RAG indexes, and KG output | unset (repo root runtime paths) |
| `WORKSPACE_USER` | Vercel middleware / web app | Basic Auth username for `/workspace` and operational API routes | `admin` |
| `WORKSPACE_PASSWORD` | Vercel middleware / web app | Enables Basic Auth for `/workspace` and operational API routes when set | unset (protection disabled) |
| `AI_MODULE_ROOT` | Web API | Optional override for the Python AI module directory | `PROSPECTUS_ROOT/ai-module` |
| `AGENT1_PYTHON` | Web API | Python executable used to launch `ai-module/agent1.py` and `ai-module/agent2.py` | `python3` |
| `AGENT1_MODEL` | Web API | Default Qwen model for Agent1 and Agent2 | `Qwen/Qwen2.5-3B-Instruct` in web API |
| `AGENT1_USE_CPU` | Web API / `ai-module/llm_qwen.py` | Force CPU execution when set to `1` | unset |
| `AGENT1_CUDA_DEVICES` | Web API | Limit execution to specific CUDA device IDs | unset |
| `AGENT1_USE_8BIT` | `ai-module/llm_qwen.py` | Load text model in 8-bit mode when possible | unset |
| `AGENT1_USE_4BIT` | `ai-module/llm_qwen.py` | Load text model in 4-bit mode when possible | unset |

### Legacy / optional RAG variables

| Variable | Description | Default |
| ---------- | ------------- | --------- |
| `RAG_PROVIDER` | `openai` \| `hf` \| `local` for the older `/api/chat` flow | `openai` |
| `OPENAI_API_KEY` | Required when `RAG_PROVIDER=openai` | - |
| `OPENAI_BASE_URL` | Optional custom OpenAI-compatible base URL | - |
| `OPENAI_EMBEDDING_MODEL` | Embedding model for legacy route | `text-embedding-3-small` |
| `OPENAI_CHAT_MODEL` | Chat model for legacy route | `gpt-4o-mini` |
| `HF_API_KEY` | Required when `RAG_PROVIDER=hf` | - |
| `HF_EMBEDDING_MODEL` | Hugging Face embedding model for legacy route | `sentence-transformers/all-MiniLM-L6-v2` |
| `HF_CHAT_MODEL` | Hugging Face chat model for legacy route | `HuggingFaceH4/zephyr-7b-beta` |
| `LOCAL_LLM_URL` | Base URL for `platform/services/local-llm` when `RAG_PROVIDER=local` | `http://127.0.0.1:8000` |

## Public site deployment

The public marketing site is served from `frontend/web`:

- `/` - product introduction
- `/download` - app download / release page
- `/workspace` - protected drafting workspace

For Vercel Hobby, keep serverless `maxDuration` values at or below `300`. The current routes are capped accordingly.

To protect the workspace in Vercel, add environment variables:

```bash
WORKSPACE_USER=admin
WORKSPACE_PASSWORD=<strong password>
```

The middleware protects `/workspace` and operational API routes, while leaving `/`, `/download`, and `/api/download/*` public.

Download buttons currently point to GitHub Releases. The recommended Windows button points to a real installer:

- `ProspectusAI-Setup-0.1.1.exe`
- `ProspectusAI.zip`
- `ProspectusAI-windows-from-linux-20260510-1154.tar.gz`
- `ProspectusAI-linux-x86_64-20260509-0311.tar.gz`

To create the Windows installer locally, run this on a Windows machine with Node.js, Python 3.11, and Inno Setup 6:

```powershell
powershell -ExecutionPolicy Bypass -File packaging/windows/build-installer.ps1
```

To build it in GitHub Actions, run the **Windows release bundle** workflow and enable `upload_to_release`. The workflow creates:

- `dist/ProspectusAI-Setup-0.1.1.exe` - standard installer with Start Menu shortcut, optional desktop shortcut, and Electron desktop window
- `dist/ProspectusAI-windows-x86_64.zip` - portable backup package

The installed app includes **Settings -> Software updates**. It checks the latest GitHub Release and offers the new Windows installer when `frontend/web/src/lib/app-version.ts` is older than the latest release tag. When publishing a new version:

1. Update `APP_VERSION` in `frontend/web/src/lib/app-version.ts`.
2. Create/publish the matching GitHub Release tag.
3. Run the **Windows release bundle** workflow with `release_tag` set to that version and `upload_to_release` enabled.

## Data and runtime paths

### Main workflow

- `data/` - source Excel (`.xlsx`) or JSON (`.json`) files
- `agent1_output/` - `text_chunks.jsonl` (narrative), `fact_store.jsonl` (structured facts), `rag_chunks.jsonl` (backward-compat merged view), `by_section/section_*.jsonl`, and `manifest.json`
- `agent2_output/` - section markdown files (`section_*.md`) and combined draft (`all_sections.md`)

Set `WORKSPACE_ROOT=workspace` to move those runtime paths under `workspace/`:

- `workspace/data/`
- `workspace/agent1_output/`
- `workspace/agent2_output/`
- `workspace/uploads/`
- `workspace/rag/`
- `workspace/rag_raw/`
- `workspace/prospectus_kg_output/`

### Legacy / optional RAG workflow

- `uploads/` - uploaded files
- `rag/` and `rag_raw/` - JSON document indices and raw extracted text
- `.progress.json` - section generation progress for the older `/api/chat` route

These paths are ignored by git where appropriate.

## Agent1

`Agent1` is an Excel and JSON pre-processing step for the main workflow. It:

- extracts text from each Excel sheet and structured data from JSON files
- generates a short English summary per sheet via Qwen
- emits dual retrieval stores: **text_chunks.jsonl** (narrative content for RAG) and **fact_store.jsonl** (structured facts: metrics, periods, values)
- classifies content into A–H buckets using filename/category heuristics
- writes `rag_chunks.jsonl` for backward compatibility with the legacy retriever

Example usage:

```bash
pip install -r ai-module/requirements.txt
python ai-module/agent1.py
python ai-module/agent1.py --model Qwen/Qwen2.5-3B-Instruct
```

Outputs:

- `agent1_output/text_chunks.jsonl` - narrative chunks
- `agent1_output/fact_store.jsonl` - structured facts
- `agent1_output/rag_chunks.jsonl` - merged view (backward compat)
- `agent1_output/by_section/section_*.jsonl`
- `agent1_output/manifest.json` - includes `text_chunk_count`, `fact_count`, `missing_information_requests`, `data_quality_flags`

## Agent2

`Agent2` consumes `Agent1` output and runs a LangGraph pipeline using `ai-module/prompts/sections/requirements.json`. It supports two retrieval modes:

- **Legacy** (when only `rag_chunks.jsonl` exists): Retriever → Section Writer → Verifier → Revision → Assembler
- **Hybrid** (when `text_chunks.jsonl` and/or `fact_store.jsonl` exist): Retriever (semantic + fact filtering) → **Section Planner** → Section Writer → Verifier → Revision → Assembler

The **Section Planner** (Hybrid mode only) prepares an evidence outline before drafting. The **Expected Timetable** section can be rendered from `fact_store` data via `ai-module/prospectus_graph/timetable_template.py`.

Current behavior:

- retrieves evidence through a pluggable retriever (HybridRetriever over `text_chunks` + `fact_store`, or SectionAwareRAGRetriever over `rag_chunks.jsonl`)
- drafts through a dedicated writer agent in sponsor-counsel working draft mode
- writes prospectus-ready prose where evidence exists
- preserves required section structure where evidence is incomplete
- inserts `[Information not provided in the documents]` for unsupported company-specific content
- may insert `[[AI:VERIFY|...]]`, `[[AI:CITE|...]]`, `[[AI:XREF|...]]`, and `[[AI:LPD|...]]`
- reviews each section through a dedicated verifier agent plus deterministic rule checks
- sends failed sections through a revision agent loop before assembly
- avoids promotional language, unqualified forward-looking statements, and explicit or implicit profit forecasts
- appends verification notes when unresolved issues remain

Example usage:

```bash
pip install -r ai-module/requirements.txt
python ai-module/agent2.py --section Summary
python ai-module/agent2.py --section Summary Definitions Glossary
python ai-module/agent2.py --section all
python ai-module/agent2.py --section Summary --model Qwen/Qwen2.5-3B-Instruct
```

Outputs:

- `agent2_output/section_*.md`
- `agent2_output/all_sections.md`

Important: the generated markdown is a **working draft**, not a filing-ready final prospectus.

## Inference backends

Configure in the web UI at **`/settings`** (saved to `~/.config/ProspectusAI/settings.json`):

| UI choice | `LLM_PROVIDER` | Notes |
|-----------|----------------|--------|
| Local Qwen | `qwen_local` | Hugging Face on GPU/CPU (default) |
| OpenAI / compatible | `openai` | ChatGPT, Azure, Ollama, LM Studio, vLLM (`/v1`) |
| DeepSeek API | `deepseek` | `DEEPSEEK_API_KEY` |
| Qwen (DashScope) | `qwen_api` | `DASHSCOPE_API_KEY` (Alibaba cloud) |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` (Claude / Opus) |

Python deps: `pip install openai anthropic` (anthropic only required for Claude). Env vars can also be set manually without the UI.

## Qwen and hardware notes

Local mode: both `Agent1` and `Agent2` use Qwen through Hugging Face `transformers`.

- Default web model: `Qwen/Qwen2.5-3B-Instruct`
- You can run on CPU with `AGENT1_USE_CPU=1`
- You can pin CUDA devices with `AGENT1_CUDA_DEVICES=0` or similar
- Quantized loading is available through `AGENT1_USE_8BIT=1` or `AGENT1_USE_4BIT=1` when supported

Current code is wired for CUDA or CPU execution. Apple MPS is not explicitly configured in `ai-module/llm_qwen.py`, so macOS users should expect CPU execution unless they adapt the model-loading path.

## Legacy / optional local-LLM route

The repo still includes an optional FastAPI service for the older document-RAG flow:

```bash
cd platform/services/local-llm
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Then run the web app with:

```bash
cd frontend/web
RAG_PROVIDER=local npm run dev
```

In this mode, the older `/api/chat` route calls `http://127.0.0.1:8000` for ingest and section drafting.

## Other reference files

- `Guidelines for Writing Prospectus Sections.docx` - older drafting guidance reference
- `Sponsor Counsel Drafting & AI Validation Framework for Exchange Technology-Sector IPO Prospectuses.docx` - sponsor-counsel drafting and validation framework that now informs `Agent2` working-draft behavior
- `Final Project_*.ipynb` - notebooks or experiments

## License

Private / unlicensed unless stated otherwise.

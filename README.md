# Prospectus AI

Repository for generating HKEX prospectus working drafts from structured source materials.

## Current status

The repo currently contains two document-generation paths:

1. **Main workflow in active use**: `Excel/JSON -> Agent1 -> Agent2 -> Export`
   - Upload `.xlsx` or `.json` files in the web UI
   - `Agent1` extracts and summarizes sheets/data into dual retrieval stores (text chunks + fact store), and groups them into A-H evidence buckets
   - `Agent2` drafts section-by-section sponsor-counsel working drafts using `agent2_section_requirements.json`
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
├── apps/
│   └── web/                            # Next.js app (frontend + API routes)
│       ├── src/
│       │   ├── app/
│       │   │   ├── api/                # agent1 (run, upload, files, clear-data, results, section/[id])
│       │   │   │                       # agent2 (run, export/docx, status, clear, draft)
│       │   │   │                       # reset, legacy chat/files/progress
│       │   │   ├── agent1/page.tsx     # Standalone Agent1 UI
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx            # Main Excel -> Agent1 -> Agent2 -> Export UI
│       │   └── lib/
│       │       ├── prospectus-root.ts
│       │       └── rag.ts              # Legacy / optional RAG route
│       ├── prospectus_section_prompts.json
│       ├── package.json
│       └── ...
├── services/
│   └── local-llm/                      # Optional FastAPI + Chroma service for legacy route
├── data/                               # Input Excel (.xlsx) or JSON (.json) for main workflow
├── agent1.py                           # Excel/JSON extraction → text_chunks + fact_store
├── agent2.py                           # LangGraph runner for section drafting
├── llm_qwen.py                         # Shared Qwen model loader / inference helpers
├── agent2_section_requirements.json    # Section-by-section working draft instructions
├── prospectus_graph/                   # LangGraph state, retriever, verifier, graph, timetable_template
├── run_full_pipeline.sh                # agent1 -> agent2 convenience script
├── docs/
├── README.md
└── .gitignore
```

See `docs/STRUCTURE.md` for additional repository notes, but read it with care because some parts still describe the older RAG-first flow.

## Prerequisites

- **Node.js** 18+ for the web app
- **npm** (or pnpm/yarn)
- **Python** 3.10+ for `agent1.py`, `agent2.py`, and model inference
- Enough disk space and network access for the first Hugging Face model download

For the **main workflow** (Excel/JSON → Agent1 → Agent2), you do **not** need `OPENAI_API_KEY` or `HF_API_KEY`.

For the **legacy / optional document-RAG workflow**, you may still need:

- `OPENAI_API_KEY` when `RAG_PROVIDER=openai`
- `HF_API_KEY` when `RAG_PROVIDER=hf`
- a running `services/local-llm` server when `RAG_PROVIDER=local`

## Quick start

### Recommended: run the current main workflow

1. Create a Python virtual environment at the repo root and install Python dependencies:

```bash
cd /path/to/prospectus-ui
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Install web dependencies:

```bash
cd /path/to/prospectus-ui/apps/web
npm install
```

3. Create `apps/web/.env.local` with the minimum settings needed by the web API:

```bash
PROSPECTUS_ROOT=/path/to/prospectus-ui
AGENT1_PYTHON=/path/to/prospectus-ui/.venv/bin/python
AGENT1_MODEL=Qwen/Qwen2.5-3B-Instruct
AGENT1_USE_CPU=1
```

Notes:

- `PROSPECTUS_ROOT` points to the repo root containing `agent1.py`, `agent2.py`, `data/`, `agent1_output/`, and `agent2_output/`
- `AGENT1_PYTHON` is used by the web API when it launches both `agent1.py` and `agent2.py`
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

- `agent1_output/` for summarized and grouped evidence (`text_chunks.jsonl`, `fact_store.jsonl`, `manifest.json`)
- `agent2_output/section_*.md` for section drafts
- `agent2_output/all_sections.md` for the combined draft

### Run the full pipeline from the command line

Prerequisite: place your input `.xlsx` or `.json` files in `data/`.

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
| `PROSPECTUS_ROOT` | Web API | Repo root that contains `agent1.py`, `agent2.py`, `data/`, and output dirs | auto-detect |
| `AGENT1_PYTHON` | Web API | Python executable used to launch `agent1.py` and `agent2.py` | `python3` |
| `AGENT1_MODEL` | Web API | Default Qwen model for Agent1 and Agent2 | `Qwen/Qwen2.5-3B-Instruct` in web API |
| `AGENT1_USE_CPU` | Web API / `llm_qwen.py` | Force CPU execution when set to `1` | unset |
| `AGENT1_CUDA_DEVICES` | Web API | Limit execution to specific CUDA device IDs | unset |
| `AGENT1_USE_8BIT` | `llm_qwen.py` | Load text model in 8-bit mode when possible | unset |
| `AGENT1_USE_4BIT` | `llm_qwen.py` | Load text model in 4-bit mode when possible | unset |

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
| `LOCAL_LLM_URL` | Base URL for `services/local-llm` when `RAG_PROVIDER=local` | `http://127.0.0.1:8000` |

## Data and runtime paths

### Main workflow

- `data/` - source Excel (`.xlsx`) or JSON (`.json`) files
- `agent1_output/` - `text_chunks.jsonl` (narrative), `fact_store.jsonl` (structured facts), `rag_chunks.jsonl` (backward-compat merged view), `by_section/section_*.jsonl`, and `manifest.json`
- `agent2_output/` - section markdown files (`section_*.md`) and combined draft (`all_sections.md`)

### Legacy / optional RAG workflow

- `apps/web/uploads/` - uploaded files
- `apps/web/rag/` - JSON document indices
- `apps/web/.progress.json` - section generation progress for the older `/api/chat` route

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
pip install -r requirements.txt
python agent1.py
python agent1.py --model Qwen/Qwen2.5-3B-Instruct
```

Outputs:

- `agent1_output/text_chunks.jsonl` - narrative chunks
- `agent1_output/fact_store.jsonl` - structured facts
- `agent1_output/rag_chunks.jsonl` - merged view (backward compat)
- `agent1_output/by_section/section_*.jsonl`
- `agent1_output/manifest.json` - includes `text_chunk_count`, `fact_count`, `missing_information_requests`, `data_quality_flags`

## Agent2

`Agent2` consumes `Agent1` output and runs a LangGraph pipeline using `agent2_section_requirements.json`. It supports two retrieval modes:

- **Legacy** (when only `rag_chunks.jsonl` exists): Retriever → Section Writer → Verifier → Revision → Assembler
- **Hybrid** (when `text_chunks.jsonl` and/or `fact_store.jsonl` exist): Retriever (semantic + fact filtering) → **Section Planner** → Section Writer → Verifier → Revision → Assembler

The **Section Planner** (Hybrid mode only) prepares an evidence outline before drafting. The **Expected Timetable** section can be rendered from `fact_store` data via `prospectus_graph/timetable_template.py`.

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
pip install -r requirements.txt
python agent2.py --section Summary
python agent2.py --section Summary Definitions Glossary
python agent2.py --section all
python agent2.py --section Summary --model Qwen/Qwen2.5-3B-Instruct
```

Outputs:

- `agent2_output/section_*.md`
- `agent2_output/all_sections.md`

Important: the generated markdown is a **working draft**, not a filing-ready final prospectus.

## Qwen and hardware notes

Both `Agent1` and `Agent2` use Qwen through Hugging Face `transformers`.

- Default web model: `Qwen/Qwen2.5-3B-Instruct`
- You can run on CPU with `AGENT1_USE_CPU=1`
- You can pin CUDA devices with `AGENT1_CUDA_DEVICES=0` or similar
- Quantized loading is available through `AGENT1_USE_8BIT=1` or `AGENT1_USE_4BIT=1` when supported

Current code is wired for CUDA or CPU execution. Apple MPS is not explicitly configured in `llm_qwen.py`, so macOS users should expect CPU execution unless they adapt the model-loading path.

## Legacy / optional local-LLM route

The repo still includes an optional FastAPI service for the older document-RAG flow:

```bash
cd services/local-llm
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Then run the web app with:

```bash
cd apps/web
RAG_PROVIDER=local npm run dev
```

In this mode, the older `/api/chat` route calls `http://127.0.0.1:8000` for ingest and section drafting.

## Other reference files

- `Guidelines for Writing Prospectus Sections.docx` - older drafting guidance reference
- `Sponsor Counsel Drafting & AI Validation Framework for HKEX Technology-Sector IPO Prospectuses.docx` - sponsor-counsel drafting and validation framework that now informs `Agent2` working-draft behavior
- `Final Project_*.ipynb` - notebooks or experiments

## License

Private / unlicensed unless stated otherwise.

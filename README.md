# Prospectus AI

Repository for generating HKEX prospectus working drafts from structured source materials.

## Current status

The repo currently contains two document-generation paths:

1. **Main workflow in active use**: `Excel -> Agent1 -> Agent2`
   - Upload `.xlsx` files in the web UI
   - `Agent1` extracts and summarizes Excel sheets and groups them into A-H evidence buckets
   - `Agent2` drafts section-by-section sponsor-counsel working drafts using `agent2_section_requirements.json`
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
Prospectus-AI/
├── apps/
│   └── web/                            # Next.js app (frontend + API routes)
│       ├── src/
│       │   ├── app/
│       │   │   ├── api/                # agent1/agent2 APIs + legacy chat/files/progress APIs
│       │   │   ├── agent1/page.tsx
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx            # Main Excel -> Agent1 -> Agent2 UI
│       │   └── lib/
│       │       ├── prospectus-root.ts
│       │       └── rag.ts              # Legacy / optional RAG route
│       ├── prospectus_section_prompts.json
│       ├── package.json
│       └── ...
├── services/
│   └── local-llm/                      # Optional FastAPI + Chroma service for legacy route
├── data/                               # Input Excel files for the main workflow
├── agent1.py                           # Excel extraction, summarization, heuristic routing
├── agent2.py                           # LangGraph runner for section drafting
├── llm_qwen.py                         # Shared Qwen model loader / inference helpers
├── agent2_section_requirements.json    # Section-by-section working draft instructions
├── prospectus_graph/                   # LangGraph state, retriever, verifier, and graph modules
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

For the **main Excel workflow**, you do **not** need `OPENAI_API_KEY` or `HF_API_KEY`.

For the **legacy / optional document-RAG workflow**, you may still need:

- `OPENAI_API_KEY` when `RAG_PROVIDER=openai`
- `HF_API_KEY` when `RAG_PROVIDER=hf`
- a running `services/local-llm` server when `RAG_PROVIDER=local`

## Quick start

### Recommended: run the current main workflow

1. Create a Python virtual environment at the repo root and install Python dependencies:

```bash
cd /path/to/Prospectus-AI
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

1. Install web dependencies:

```bash
cd /path/to/Prospectus-AI/apps/web
npm install
```

1. Create `apps/web/.env.local` with the minimum settings needed by the web API:

```bash
PROSPECTUS_ROOT=/path/to/Prospectus-AI
AGENT1_PYTHON=/path/to/Prospectus-AI/.venv/bin/python
AGENT1_MODEL=Qwen/Qwen2.5-3B-Instruct
AGENT1_USE_CPU=1
```

Notes:

- `PROSPECTUS_ROOT` points to the repo root containing `agent1.py`, `agent2.py`, `data/`, `agent1_output/`, and `agent2_output/`
- `AGENT1_PYTHON` is used by the web API when it launches both `agent1.py` and `agent2.py`
- `AGENT1_MODEL` sets the default Qwen model used by the web flow
- `AGENT1_USE_CPU=1` is the safest default when CUDA is unavailable

1. Start the web app from the repo root:

```bash
cd /path/to/Prospectus-AI
npm run dev
```

1. Open [http://localhost:3000](http://localhost:3000) and use the main page:

- upload `.xlsx` files
- click **Run Agent1**
- then generate sections with **Generate all sections** or **Generate next section**

1. Review the outputs:

- `agent1_output/` for summarized and grouped evidence
- `agent2_output/section_*.md` for section drafts
- `agent2_output/all_sections.md` for the combined draft

### Run the full pipeline from the command line

Prerequisite: place your input `.xlsx` files in `data/`.

```bash
cd /path/to/Prospectus-AI
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

- `data/` - source Excel files
- `agent1_output/` - `rag_chunks.jsonl`, section JSONL files, and `manifest.json`
- `agent2_output/` - section markdown files and combined markdown draft

### Legacy / optional RAG workflow

- `apps/web/uploads/` - uploaded files
- `apps/web/rag/` - JSON document indices
- `apps/web/.progress.json` - section generation progress for the older `/api/chat` route

These paths are ignored by git where appropriate.

## Agent1

`Agent1` is an Excel pre-processing step for the main workflow. It:

- extracts text from each Excel sheet
- generates a short English summary per sheet via Qwen
- classifies files into A-H buckets using filename heuristics
- emits JSONL evidence for `Agent2`

Example usage:

```bash
pip install -r requirements.txt
python agent1.py
python agent1.py --model Qwen/Qwen2.5-3B-Instruct
```

Outputs:

- `agent1_output/rag_chunks.jsonl`
- `agent1_output/by_section/section_*.jsonl`
- `agent1_output/manifest.json`

## Agent2

`Agent2` consumes `Agent1` output and runs a fixed LangGraph pipeline using `agent2_section_requirements.json`.

Current node sequence:

- `Retriever`
- `Section Writer Agent`
- `Verifier Agent`
- `Revision Agent`
- `Assembler`

Planner is intentionally omitted because section requirements are already encoded in configuration.

Current behavior:

- retrieves evidence through a pluggable retriever interface (currently backed by `agent1_output/rag_chunks.jsonl`)
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

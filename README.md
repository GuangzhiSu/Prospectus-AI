# Prospectus UI

Web app to generate a prospectus draft from uploaded PDF/DOCX: upload documents → RAG index → section-by-section draft using section requirements and an LLM.

## Repository structure

```
prospectus-ui/
├── apps/
│   └── web/                    # Next.js app (frontend + API routes)
│       ├── src/
│       │   ├── app/
│       │   │   ├── api/        # Backend: chat, files, progress
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx   # Frontend UI
│       │   └── lib/
│       │       └── rag.ts      # RAG + LLM (OpenAI / HuggingFace / local)
│       ├── prospectus_section_prompts.json   # Section requirements
│       ├── package.json
│       └── ...
├── services/
│   └── local-llm/              # Optional: FastAPI + Chroma + Hugging Face
│       ├── app.py
│       ├── requirements.txt
│       └── README.md
├── docs/                       # Reference / structure notes
├── README.md                   # This file
└── .gitignore
```

- **Frontend**: `apps/web/src/app/page.tsx`, `layout.tsx`, `globals.css`, `public/`
- **Backend (API)**: `apps/web/src/app/api/*` and `apps/web/src/lib/rag.ts`
- **Optional backend service**: `services/local-llm/` (run when using `RAG_PROVIDER=local`)

See [docs/STRUCTURE.md](docs/STRUCTURE.md) for a detailed map of what each part does.

## Prerequisites

- **Node.js** 18+ (for the web app)
- **npm** (or pnpm/yarn)
- For **OpenAI** provider: `OPENAI_API_KEY`
- For **Hugging Face** provider: `HF_API_KEY`
- For **local** provider: Python 3.10+, run `services/local-llm` (see below)

## Quick start

### 1. Run the web app

From the repo root (after one-time install in `apps/web`):

```bash
cd apps/web && npm install
cd ../.. && npm run dev
```

Or from the web app directory:

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Upload PDF/DOCX and click **Generate** to build a section-by-section draft.

### 2. (Optional) Use local LLM instead of OpenAI/HF

```bash
cd services/local-llm
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Then run the web app with:

```bash
cd apps/web
RAG_PROVIDER=local npm run dev
```

The app will call `http://127.0.0.1:8000` for ingest and section drafting.

## Environment (apps/web)

| Variable | Description | Default |
|----------|-------------|---------|
| `RAG_PROVIDER` | `openai` \| `hf` \| `local` | `openai` |
| `OPENAI_API_KEY` | Required when `RAG_PROVIDER=openai` | — |
| `OPENAI_BASE_URL` | Optional custom API base | — |
| `OPENAI_EMBEDDING_MODEL` | Embedding model | `text-embedding-3-small` |
| `OPENAI_CHAT_MODEL` | Chat model | `gpt-4o-mini` |
| `HF_API_KEY` | Required when `RAG_PROVIDER=hf` | — |
| `HF_EMBEDDING_MODEL` | Hugging Face embedding model | `sentence-transformers/all-MiniLM-L6-v2` |
| `HF_CHAT_MODEL` | Hugging Face chat model | `HuggingFaceH4/zephyr-7b-beta` |
| `LOCAL_LLM_URL` | Local LLM base URL when `RAG_PROVIDER=local` | `http://127.0.0.1:8000` |

Create `apps/web/.env.local` and set the variables you need.

## Data and runtime (apps/web)

- **Uploads**: `apps/web/uploads/` (created at runtime)
- **RAG index** (when not using local LLM): `apps/web/rag/` (JSON per document)
- **Progress**: `apps/web/.progress.json` (section generation progress)

These paths are in `.gitignore`.

## Agent1: Excel → RAG-ready materials

Processes all Excel files in `data/` into RAG-ready chunks, classified by prospectus section (A–H). Uses Qwen (Hugging Face) for optional LLM-based classification.

```bash
pip install -r requirements.txt
python agent1.py
# Optional: use Qwen for section classification (instead of filename heuristic)
python agent1.py --classify-with-llm --model Qwen/Qwen2.5-3B-Instruct
```

Output: `agent1_output/rag_chunks.jsonl` and `agent1_output/by_section/section_*.jsonl` for agent2.

## Agent2: RAG → prospectus sections (section-by-section)

Uses agent1 output for RAG and Qwen (Hugging Face) to generate prospectus sections one by one.

```bash
pip install -r requirements.txt
python agent2.py --section A
python agent2.py --section A B D
python agent2.py --section all
# Smaller/faster model
python agent2.py --section A --model Qwen/Qwen2.5-3B-Instruct
```

Output: `agent2_output/section_*.md` and `agent2_output/all_sections.md`.

Both agents use **Qwen via Hugging Face** (Qwen2.5 for text; Qwen2-VL available for multimodal in `llm_qwen.py`).

## Run full pipeline (one command)

```bash
./run_full_pipeline.sh                    # agent1 → agent2 (all sections)
./run_full_pipeline.sh A B D              # Only sections A, B, D
./run_full_pipeline.sh --classify-with-llm   # Use Qwen for agent1 classification
./run_full_pipeline.sh --model Qwen/Qwen2.5-3B-Instruct   # Smaller/faster model
```

Prerequisites: Excel files in `data/`. The script installs deps, runs agent1, then agent2.

## Other files at repo root

- `Guidelines for Writing Prospectus Sections.docx` — reference for section requirements (optional; you can move it to `docs/`).
- `Final Project_*.ipynb` — notebook (optional; can live in `docs/` or be removed from the repo).

## License

Private / unlicensed unless stated otherwise.

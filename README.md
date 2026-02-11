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

## Other files at repo root

- `Guidelines for Writing Prospectus Sections.docx` — reference for section requirements (optional; you can move it to `docs/`).
- `Final Project_*.ipynb` — notebook (optional; can live in `docs/` or be removed from the repo).

## License

Private / unlicensed unless stated otherwise.

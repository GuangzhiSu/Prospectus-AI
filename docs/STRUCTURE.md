# Project structure (detail)

## Top-level modules

| Path | Role |
|------|------|
| `ai-module/` | Agent1/Agent2 Python runtime, LLM providers, Agent2 graph |
| `frontend/web/` | Next.js UI and current HTTP API route adapters |
| `platform/` | Desktop shell and optional local services |
| `knowledge-module/` | `prospectus_docgraph` structural document graph tooling |
| `pipeline-module/` | Standalone IPO prospectus extraction pipeline |
| `resources/` | Templates, prompt packs, canvases, and legacy reference code |

## frontend/web — Next.js application

Single Next.js app that provides both the **frontend** and the **backend API** used for prospectus generation.

### Frontend (UI)

| Path | Role |
|------|------|
| `src/app/page.tsx` | Main page: chat area, file upload, draft Markdown, progress |
| `src/app/layout.tsx` | Root layout, fonts, metadata |
| `src/app/globals.css` | Global styles |
| `public/` | Static assets (favicon, etc.) |

### Backend (API and RAG)

| Path | Role |
|------|------|
| `src/app/api/chat/route.ts` | POST: accept messages + files → save files, build RAG index (or call local-llm ingest), then generate section-by-section draft; return assistant message + draft Markdown |
| `src/app/api/files/route.ts` | GET: list saved files in `uploads/` |
| `src/app/api/progress/route.ts` | GET: read `.progress.json` (completed/total sections) |
| `src/lib/rag.ts` | Document parsing (PDF/DOCX), chunking, embeddings, retrieval, section drafting; supports providers: `openai`, `hf`, `local` |

### Config and data (inside frontend/web)

| Path | Role |
|------|------|
| `prospectus_section_prompts.json` | Section titles and requirements; drives the list of sections to generate |
| `uploads/` | Uploaded PDF/DOCX (runtime) |
| `rag/` | RAG index (JSON per document) when not using local LLM |
| `.progress.json` | Current generation progress (runtime) |

## platform/services/local-llm — Optional Python backend

FastAPI service used when `RAG_PROVIDER=local`. Provides:

- **POST /ingest** — Accept file paths (on server), load PDF/DOCX, split, embed, store in Chroma.
- **POST /draft_section** — Retrieve chunks for a section, call local Hugging Face model, return section text.

Dependencies: LangChain, Chroma, Hugging Face (embeddings + small causal LM). See `platform/services/local-llm/README.md`.

## Flow (high level)

1. User uploads PDF/DOCX in the UI and clicks Generate.
2. **frontend/web** saves files to `uploads/`, then either:
   - **openai/hf**: builds RAG index in `rag/` (via `rag.ts`), or
   - **local**: POSTs file paths to `platform/services/local-llm/ingest`.
3. For each section in `prospectus_section_prompts.json`:
   - **openai/hf**: `rag.ts` retrieves chunks, calls OpenAI/HF to draft the section.
   - **local**: **frontend/web** POSTs to `platform/services/local-llm/draft_section`, which retrieves from Chroma and calls the local model.
4. Progress is written to `.progress.json`; the UI polls `/api/progress`.
5. Assembled draft Markdown is returned and shown in the right panel.

## Summary

- **Frontend**: everything the user sees and interacts with (`page.tsx`, layout, styles, public).
- **Backend**: API routes under `src/app/api/` and RAG/LLM logic in `src/lib/rag.ts`; optional separate backend = `platform/services/local-llm`.

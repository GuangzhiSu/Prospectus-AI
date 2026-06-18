# Local LLM Service

Optional backend for prospectus generation: FastAPI + LangChain + Chroma + Hugging Face (embeddings + small causal LM). Used when `RAG_PROVIDER=local` in the web app.

## Endpoints

- `POST /ingest` — Ingest PDF/DOCX files (paths on server), build Chroma index.
- `POST /draft_section` — Generate one prospectus section given section title, requirements, and optional RAG context.

## Run

From this directory:

```bash
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Web app expects this service at `http://127.0.0.1:8000` (override with `LOCAL_LLM_URL`).

## Env (optional)

- `LOCAL_CHAT_MODEL` — Hugging Face model (default: `TinyLlama/TinyLlama-1.1B-Chat-v1.0`)
- `LOCAL_EMBED_MODEL` — Embedding model (default: `sentence-transformers/all-MiniLM-L6-v2`)
- `LOCAL_VECTOR_DIR` — Chroma persist dir (default: `chroma`)
- `LOCAL_RAW_DIR` — Raw draft output dir (default: `rag_raw`)

# IPO Prospectus Pipeline

Production-style pipeline that converts IPO prospectus PDFs into three levels of structured training datasets using either the **OpenAI API** or a **local Qwen** model (Hugging Face `transformers`).

## Outputs

1. **Section-level dataset** (`section_dataset.jsonl`) — one record per prospectus section with structured facts and full section text.
2. **Subsection-level dataset** (`subsection_dataset.jsonl`) — one record per subsection within key sections.
3. **Data-to-text dataset** (`data_to_text_dataset.jsonl`) — structured facts as input, narrative text as target (for data-to-text / summarization training).

## Requirements

- Python 3.11+
- **OpenAI path**: `OPENAI_API_KEY` (environment or `.env`)
- **Qwen path**: GPU recommended; install `pip install -r requirements-qwen.txt` (adds `transformers`, `torch`, `accelerate`)

## Setup

```bash
cd ipo_prospectus_pipeline
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Optional: local Qwen
pip install -r requirements-qwen.txt
cp .env.example .env
# Edit .env and set OPENAI_API_KEY when using OpenAI
```

## OpenAI vs local Qwen

- **OpenAI** — `llm_provider: openai` in `configs/default.yaml` (default). Native JSON schema / structured output.
- **Local Qwen** — `llm_provider: qwen_local` in `configs/qwen_local.yaml`. Same prompts and JSONL outputs; the model is instructed to emit JSON matching the schema (no OpenAI API key).

**Switch with the shell wrapper** (from `ipo_prospectus_pipeline/`):

```bash
./run_pipeline.sh openai --input ./pdfs --output ./outputs
./run_pipeline.sh qwen --input ./pdfs --output ./outputs_qwen
```

The `qwen` profile sets `QWEN_MODEL` (default [`Qwen/Qwen3.5-27B`](https://huggingface.co/Qwen/Qwen3.5-27B)). To use another checkpoint, set `QWEN_MODEL` before running:

```bash
export QWEN_MODEL="Qwen/Qwen3.5-27B-Instruct"  # example if you prefer an Instruct-tuned variant
./run_pipeline.sh qwen --input ./pdfs --output ./outputs_qwen
```

CPU-only (slow): `export QWEN_USE_CPU=1`. Quantization: `QWEN_USE_4BIT=1` or `QWEN_USE_8BIT=1` (CUDA).

Alternatively: `export IPO_LLM_PROVIDER=qwen_local` and `python -m src.main --config configs/qwen_local.yaml ...`, or `--llm-provider qwen_local` with any config.

## Usage

**Full pipeline** (extract → split sections → subsections → build datasets):

```bash
python -m src.main --input ./pdfs --output ./outputs
```

**Stage-by-stage** (for debugging or resume):

```bash
# 1. Extract text from PDFs only
python -m src.main --input ./pdfs --output ./outputs --stage extract_text

# 2. Split into sections (uses extracted JSON)
python -m src.main --input ./pdfs --output ./outputs --stage split_sections

# 3. Split key sections into subsections
python -m src.main --input ./pdfs --output ./outputs --stage split_subsections

# 4. Build the three JSONL datasets
python -m src.main --input ./pdfs --output ./outputs --stage build_datasets
```

**With config file:**

```bash
python -m src.main --config configs/default.yaml --input ./pdfs --output ./outputs
```

## Configuration

- `configs/default.yaml` — model name, max tokens, temperature, paths, flags.
- Override via CLI: `--input`, `--output`, `--stage`, `--config`.

Key options:

- `save_raw_responses`: save raw API responses under `outputs/raw_responses/`.
- `sections_only` / `subsections_only`: run only section or subsection splitting.
- `batch_size`: chunk size for long sections when calling the API.

## Project Layout

```
ipo_prospectus_pipeline/
├── configs/           # YAML configs
├── prompts/           # Prompt templates (heading normalization, extraction)
├── src/
│   ├── main.py        # CLI entrypoint
│   ├── config.py      # Config loading
│   ├── pdf_extract.py # PDF text + heading extraction
│   ├── section_split.py
│   ├── subsection_split.py
│   ├── openai_client.py
│   ├── qwen_local_client.py
│   ├── client_factory.py
│   ├── llm_protocol.py
│   ├── extraction.py  # Structured extraction with JSON schema
│   ├── datasets.py    # Build section / subsection / data-to-text JSONL
│   └── schemas.py     # Pydantic models and JSON schemas
├── scripts/           # Validation and utilities
├── outputs/           # Default output dir (gitignored)
└── tests/
```

## Checkpointing and resume

- Extracted text per PDF is saved as `outputs/extracted/<doc_id>.json`.
- Section/subsection results are saved under `outputs/sections/` and `outputs/subsections/`.
- The pipeline skips documents that already have outputs for the current stage; re-run to resume.

## Quality checks

Run validation scripts:

```bash
python scripts/validate_datasets.py --output ./outputs
```

Checks: empty sections, duplicate sections, invalid JSON, missing target text, basic hallucination signals, coverage by section type.

## Batch API (future)

The pipeline is designed so that the OpenAI Batch API can be plugged in later for large-scale runs:

- **Single point of change**: All LLM calls go through `src/openai_client.py` (`OpenAIClient.create_response`). No caller (section splitter, extraction, dataset builder) needs to change.
- **Batch integration steps**:
  1. Add a `BatchOpenAIClient` that implements the same interface: `create_response(messages, response_format=..., raw_save_id=...)`.
  2. Instead of calling `client.chat.completions.create()`, serialize each request to the Batch API input format (one JSONL line per request with `custom_id`, `params`).
  3. Submit the job via `client.batches.create()`; poll with `client.batches.retrieve()` until complete.
  4. Download results and parse outputs into the same structures (e.g. `parsed` JSON) that the rest of the pipeline expects; write to the same checkpoint and output paths.
- **Checkpointing**: Existing per-document checkpointing (extracted, sections, subsections) allows re-running only the dataset-build stage with Batch results, or mixing real-time and batch runs.

## License

Internal use.

# Implementation Plan

## Processing order (deterministic first, then LLM)

1. **Deterministic PDF parsing** — `src/pdf_extract.py`: extract page text, heading candidates, table-like blocks; save per-doc JSON. No LLM.
2. **Deterministic section candidate detection** — `src/section_split.py`: use heading candidates and page boundaries to get raw section breakpoints.
3. **LLM normalization** — same module: for each raw heading, call OpenAI with `heading_normalization` prompt to map to canonical section name.
4. **LLM structured extraction** — `src/extraction.py`: for Business, Financial, Risk, Offering, Shareholders sections, call API with JSON schema to get structured facts + evidence.
5. **Dataset assembly** — `src/datasets.py`: build section_dataset.jsonl, subsection_dataset.jsonl, data_to_text_dataset.jsonl from sections, subsections, and extraction results.

## Where to plug in Batch API

- **File**: `src/openai_client.py`
- **Method**: `OpenAIClient.create_response(...)`
- **Approach**: Implement a second client (e.g. `BatchOpenAIClient`) that:
  - Collects all `create_response` calls (messages + response_format) into a batch request file.
  - Submits via `client.batches.create()`.
  - After completion, downloads results and maps `custom_id` back to checkpoint/output keys.
- **Callers**: No changes in `section_split.py`, `extraction.py`, or `datasets.py`; they only depend on the same return shape (`content`, `parsed`, `usage`).

## Checkpointing and resume

| Stage              | Input                | Output                          | Resume rule                    |
|--------------------|----------------------|----------------------------------|--------------------------------|
| extract_text       | `input_folder/*.pdf` | `outputs/extracted/<doc_id>.json`| Skip if extracted JSON exists  |
| split_sections     | extracted JSON       | `outputs/sections/<doc_id>.json` | Skip if section JSON exists   |
| split_subsections  | section JSON         | `outputs/subsections/<doc_id>.json` | Skip if subsection JSON exists |
| build_datasets     | sections + subsections | `outputs/*.jsonl`             | Overwrites JSONL each run     |

## Example commands

```bash
# Full pipeline
python -m src.main --input ./pdfs --output ./outputs

# Stages only
python -m src.main --input ./pdfs --output ./outputs --stage extract_text
python -m src.main --input ./pdfs --output ./outputs --stage split_sections
python -m src.main --input ./pdfs --output ./outputs --stage split_subsections
python -m src.main --input ./pdfs --output ./outputs --stage build_datasets

# With config
python -m src.main --config configs/default.yaml --input ./pdfs --output ./outputs

# Validation
python scripts/validate_datasets.py --output ./outputs
```

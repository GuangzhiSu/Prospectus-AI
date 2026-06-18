# AI Module

Self-contained **AI agents** for Prospectus drafting. Teammates working on model behavior, LangGraph, or retrieval should change code **only inside this folder**.

## Contents

| Path | Role |
|------|------|
| `agent1.py` | Ingest materials → `text_chunks` + `fact_store` |
| `agent2.py` | LangGraph section drafting |
| `agent2_stream.py` | Progress events for streaming UI |
| `llm_*.py` | Model backends (Qwen local, OpenAI, Anthropic, …) |
| `prospectus_graph/` | Retriever, verifier, graph orchestration |
| `prospectus_ai/` | Contract CLI + job runner |

## Contract boundary

The platform module invokes this package with a job JSON file:

```bash
cd modular/ai-module
python -m venv .venv && source .venv/bin/activate
pip install -e .

python -m prospectus_ai validate --job /path/to/ai-job.json
python -m prospectus_ai run --job /path/to/ai-job.json
```

Schemas: [`../contracts/v1/`](../contracts/v1/)

### Platform → AI (inputs via job manifest)

- `materials_dir` — issuer files
- `section_requirements_path` — prompts / section instructions (agent2)
- `kg_inputs_dir` — Schema A + crosswalk JSON (agent2, optional)
- `issuer_metadata_path` — conditional metadata (optional)
- `agent1_output_dir` — prior agent1 artifacts (agent2)

### AI → Platform (outputs)

Written under `outputs.work_dir`:

- Agent1: `manifest.json`, `text_chunks.jsonl`, `fact_store.jsonl`, …
- Agent2: `section_*.md`, `all_sections.md`, bundle artifacts
- Both: `ai-result.json` (status + path index)

## Environment

Same LLM env vars as the legacy repo (`LLM_PROVIDER`, `AGENT1_MODEL`, `AGENT1_USE_CPU`, API keys). The platform module passes these when spawning the CLI.

## Note on legacy root files

Copies in this folder were taken from the repo root at modularization time. Long term, **only this directory** should be edited for agent changes; root-level `agent1.py` / `agent2.py` remain for backward compatibility until the web app migrates fully.

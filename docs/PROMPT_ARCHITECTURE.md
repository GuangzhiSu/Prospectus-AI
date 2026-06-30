# Prompt architecture

This document describes how prompts and section requirements are organized after the unified refactor.

## Single source of truth

| Asset | Path | Used by |
|-------|------|---------|
| Section requirements | [`ai-module/prompts/sections/requirements.json`](../ai-module/prompts/sections/requirements.json) | Agent2, KG Stage 4 merge, legacy export |
| Per-section generation rules | [`ai-module/prompts/sections/generation_rules.json`](../ai-module/prompts/sections/generation_rules.json) | Agent2 `augment_requirements()` |
| Global drafting core | [`ai-module/prompts/core/exchange_drafting.md`](../ai-module/prompts/core/exchange_drafting.md) | Writer, legacy RAG |
| AI tag syntax | [`ai-module/prompts/core/ai_tags.md`](../ai-module/prompts/core/ai_tags.md) | Writer, legacy RAG |
| Agent role templates | [`ai-module/prompts/agents/`](../ai-module/prompts/agents/) | Agent1, Agent2 graph, KG Stage 2 |

Repo-root [`agent2_section_requirements.json`](../agent2_section_requirements.json) remains as a **deprecated fallback** only. Prefer the canonical path under `ai-module/prompts/sections/`.

## Three-layer composition

```text
Layer 1 (global)   core/exchange_drafting.md + core/ai_tags.md
Layer 2 (role)     agents/{planner,writer,verifier,revision}.txt
Layer 3 (dynamic)  augment_requirements() + retrieval context / drafts
```

[`ai-module/prompts/composer.py`](../ai-module/prompts/composer.py) assembles final prompts. [`ai-module/agent2.py`](../ai-module/agent2.py) imports `build_*_prompt` wrappers from the composer.

## Path resolution

[`ai-module/prompts/paths.py`](../ai-module/prompts/paths.py) resolves requirements in order:

1. `AI_PROMPTS_REQUIREMENTS` environment variable
2. `ai-module/prompts/sections/requirements.json`
3. Repo root `agent2_section_requirements.json` (logs deprecation warning)

## Legacy web RAG

The optional PDF/DOCX chat route does **not** run the full Agent2 verifier graph. It uses the same **Layer 1** system prompt as Agent2 via exported files:

```bash
python scripts/export_legacy_section_prompts.py
```

Outputs:

- `frontend/web/prospectus_section_prompts.json` — section list + requirements text
- `frontend/web/prompts/legacy_writer_system.txt` — system prompt for [`rag.ts`](../frontend/web/src/lib/rag.ts)

Re-run the export script after editing `requirements.json`.

## Pipeline extraction

[`pipeline-module/ipo_prospectus_pipeline/src/prompts.py`](../pipeline-module/ipo_prospectus_pipeline/src/prompts.py) loads local extraction templates and injects shared `core_extraction_rules` from the ai-module package.

## Local LLM service

[`platform/services/local-llm/app.py`](../platform/services/local-llm/app.py) calls `compose_legacy_writer()` from the same composer package.

## Maintenance checklist

1. Edit section prose in `ai-module/prompts/sections/requirements.json`.
2. Edit cross-cutting per-section rules in `generation_rules.json`.
3. Edit global constraints in `core/*.md` or agent templates in `agents/*.txt`.
4. Run `python scripts/export_legacy_section_prompts.py` if legacy web RAG is used.
5. Run `pytest tests/test_prompts.py`.

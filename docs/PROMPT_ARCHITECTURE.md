# Prompt architecture

This document describes how prompts and section requirements are organized after the unified refactor.

## Single source of truth

| Asset | Path | Used by |
|-------|------|---------|
| Section requirements | [`ai-module/prompts/sections/requirements.json`](../ai-module/prompts/sections/requirements.json) | Agent2, KG Stage 4 merge, legacy export |
| Legacy generation-rule library | [`ai-module/prompts/sections/generation_rules.json`](../ai-module/prompts/sections/generation_rules.json) | Authoring/reference only; not injected at runtime |
| Legacy corpus/KG style library | [`ai-module/prompts/sections/corpus_style_guides.json`](../ai-module/prompts/sections/corpus_style_guides.json) | Authoring/reference only; not injected at runtime |
| Global drafting core | [`ai-module/prompts/core/exchange_drafting.md`](../ai-module/prompts/core/exchange_drafting.md) | Writer, legacy RAG |
| AI tag syntax | [`ai-module/prompts/core/ai_tags.md`](../ai-module/prompts/core/ai_tags.md) | Writer, legacy RAG |
| Agent role templates | [`ai-module/prompts/agents/`](../ai-module/prompts/agents/) | Agent1, Agent2 graph, KG Stage 2 |

Repo-root [`agent2_section_requirements.json`](../agent2_section_requirements.json) remains as a **deprecated fallback** only. Prefer the canonical path under `ai-module/prompts/sections/`.

## Runtime composition

```text
GlobalPolicy     core/exchange_drafting.md + core/ai_tags.md
SectionSpec      one compact contract compiled from requirements.json
EvidencePacket   retrieved narrative chunks + structured facts
UserInstruction optional modification request
```

[`ai-module/prompts/composer.py`](../ai-module/prompts/composer.py) assembles final prompts. `augment_requirements()` resolves applicable conditions and compiles one SectionSpec. It deliberately does not concatenate the old generation-rule, corpus-style, KG-guidance, and static crosswalk prose blocks. KG assets continue to support retrieval/schema design and provide outline/input-name fallbacks when the maintained SectionSpec lacks them.

The Writer receives one positive drafting recipe and output contract selected by `generation_mode`:

- `controlled_template_fill`: label/slot/value/citation for covers, registries, definitions and tables; no prose padding.
- `evidence_based_drafting`: topic sentence, supported issuer facts, sourced explanation and cross-reference.
- `risk_narrative_drafting`: risk trigger/consequence heading, issuer exposure, failure mechanism and investor impact.
- `legal_checklist_drafting`: rule/term, requirement, issuer relevance, supported status and residual issue.
- `professional_source_assembly_only`: source-to-slot assembly without creating or strengthening professional opinions.

EvidencePacket IDs are converted to machine-parseable citations using the method in `core/exchange_drafting.md`. Missing inputs use one policy only: `[● field name]` for a missing slot, `DATA_MISSING` for absent factual support, and `COUNSEL_INPUT_REQUIRED` for an absent professional judgment. Negated metadata conditions are not activated when the underlying flag was never provided.

## Model-call policy

- Planner: off by default; enable for complex Hybrid sections with `AGENT2_ENABLE_PLANNER=1`, or all Hybrid sections with `all`.
- Writer: one call for normal generated sections.
- Reviewer: deterministic checks always run; an LLM review runs only for high-risk sections or when those checks detect an issue. Set `AGENT2_REVIEW_MODE=all` for legacy behavior or `none` to disable LLM review.
- Revision: at most one call. The revised draft receives deterministic validation only, not a second LLM review.
- Cross-section validation remains in the final output-bundle stage.

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

- `frontend/web/prospectus_section_prompts.json` — section list + compiled runtime SectionSpec for the legacy Web RAG path
- `frontend/web/prompts/legacy_writer_system.txt` — system prompt for [`rag.ts`](../frontend/web/src/lib/rag.ts)

Re-run the export script after editing `requirements.json`.

## Pipeline extraction

[`pipeline-module/ipo_prospectus_pipeline/src/prompts.py`](../pipeline-module/ipo_prospectus_pipeline/src/prompts.py) loads local extraction templates and injects shared `core_extraction_rules` from the ai-module package.

## Local LLM service

[`platform/services/local-llm/app.py`](../platform/services/local-llm/app.py) calls `compose_legacy_writer()` from the same composer package.

## Maintenance checklist

1. Edit section prose in `ai-module/prompts/sections/requirements.json`.
2. Put section-specific controls in the structured fields of that same section entry; do not add another runtime layer.
3. Edit truly global constraints in `core/*.md` or role behavior in `agents/*.txt`.
4. Run `python scripts/export_legacy_section_prompts.py` if legacy web RAG is used.
5. Run `pytest tests/test_prompts.py tests/test_agent2_routing.py`.

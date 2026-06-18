# Contract v1 — Platform ↔ AI Module

These JSON files define the **stable boundary** between modules. The platform module owns prompts, materials, and KG config; the AI module owns agents and model inference.

## Files

| File | Direction | Purpose |
|------|-----------|---------|
| `ai-job.schema.json` | Platform → AI | Job manifest to start agent1 or agent2 |
| `ai-result.schema.json` | AI → Platform | Completion status and output paths |
| `agent1-output-manifest.schema.json` | AI → Platform | Shape of `manifest.json` after agent1 |
| `section-requirements.schema.json` | Platform → AI | Per-section drafting instructions |

## Versioning

- `contract_version` must be `"1.0"` for this folder.
- Breaking changes require a new `contracts/v2/` directory and migration notes.
- The AI module must reject unknown contract versions.

## Agent1 flow

```
Platform                          AI module
────────                          ─────────
materials_dir/*.xlsx|.json   →    agent1 ingest
section_requirements (n/a)        Qwen summarization + chunking
                                  writes work_dir/
                                    text_chunks.jsonl
                                    fact_store.jsonl
                                    manifest.json
                             ←    ai-result.json (status + paths)
```

## Agent2 flow

```
Platform                          AI module
────────                          ─────────
materials_dir                     timetable template context
agent1_output_dir            →    LangGraph draft pipeline
section_requirements_path         verifier + revision
kg_inputs_dir (optional)          section_*.md + all_sections.md
issuer_metadata_path (opt)   ←    ai-result.json
```

## Platform responsibilities

1. Place issuer files in `materials_dir`.
2. Maintain `section_requirements_path` (prompts / structure / KG hints).
3. Optionally provide `kg_inputs_dir` with Schema A + crosswalk JSON.
4. Invoke AI module with an `ai-job.json` conforming to the schema.
5. Read `ai-result.json` and artifact paths for UI / DOCX export.

## AI module responsibilities

1. Validate incoming job against `ai-job.schema.json`.
2. Run agent1 or agent2 without requiring platform code imports.
3. Write outputs only under declared `outputs.work_dir`.
4. Emit `ai-result.json` on success or failure.

See `examples/` for sample job files.

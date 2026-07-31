# `eligibility/` — standalone listing-eligibility diagnostic

A **standalone** program (sibling to prospectus drafting, not dependent on
Agent1 / Agent2 / `ai-module`). Users upload documents; the platform reports
whether they look ready to go public for a chosen market/board and where they
need to improve.

**Positioning:** diagnostic feedback for founders — not a legal determination
and not exchange approval. Soft / hard thresholds may still lack external
professional `human_signoff`.

## Four sections

| # | Package | Role | LLM? |
|---|---|---|---|
| 1 | `extraction/` | Ingest PDF/DOCX/XLSX/JSON; extract quantifiable fields + narrative excerpts | yes (stub-safe offline) |
| 2 | `hard_inspection/` | Compare confirmed quantifiable values to versioned YAML thresholds | **never** |
| 3 | `qualitative/` | Analyze unquantifiable text against substance signals | yes |
| 4 | `feedback/` | Generate readiness + improvement feedback from (2)+(3) | yes |

```
documents / issuer JSON ──► extraction ──► (human confirm) ──► hard_inspection
                     narrative excerpts ───────────────────► qualitative
                                                              │
                         hard report + soft findings ─────────► feedback
```

Mode B (from `update/`): AI-extracted values that feed hard gates stay
`extracted` until confirmed; unconfirmed values are treated as missing inputs.
Deal parameters (offer price, share count, FX, timetable) are **hard-entered**
in the run profile — never invented by the model.

## Statuses (hard engine)

| Status | Meaning |
|---|---|
| `PASS` | value present and meets the threshold |
| `SHORTFALL` | value present but below the threshold |
| `MISSING_INPUT` | value null / absent / not confirmed |
| `INDETERMINATE` | value present but FX (or similar) context missing |
| `NOT_EVALUATED` | authored but not run this phase / qualitative pending |

## Rules

Hard packs: `hard_inspection/rules/*.yaml`  
Soft packs: `qualitative/rules/*.yaml`  

Authoritative multi-market threshold master: `update/update/INPUT_AND_ELIGIBILITY_MASTER_EN.xlsx`.

## Run

```bash
# Hard-only on an issuer JSON (legacy path; 49 regression tests)
PYTHONPATH=eligibility python -m eligibility \
  --in data/sensetime.json \
  --profile profile.json \
  --out eligibility/eligibility/outputs/report.json

# Full pipeline with uploads + feedback (LLM stub if no API key)
PYTHONPATH=eligibility python -m eligibility \
  --in data/sensetime.json \
  --docs path/to/audit.pdf path/to/notes.docx \
  --profile profile.json \
  --market "HKEX Main Board" \
  --feedback \
  --out eligibility/eligibility/outputs/report.json
```

Environment:

| Variable | Effect |
|---|---|
| `LLM_PROVIDER` | Same as drafting: `qwen_local`, `openai`, `deepseek`, `qwen_api`, `anthropic` |
| API key envs | `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` / `DASHSCOPE_API_KEY` / `ANTHROPIC_API_KEY` |
| `AGENT1_MODEL` / `AGENT2_MODEL` | Local Qwen model id (from Settings) |
| `ELIGIBILITY_LLM_STUB=1` | force offline stub (tests / CI) |
| `ELIGIBILITY_AUTO_CONFIRM=1` | auto-confirm extracted quant fields |

Configure providers in the app **Settings → Inference backend** UI (shared with drafting).
## Tests

```bash
PYTHONPATH=eligibility python -m unittest discover -s eligibility/eligibility/tests -p 'test_*.py'
```

Hard path import isolation is enforced by `test_no_llm_in_hard_path.py`.

## Layout

```
eligibility/eligibility/
  extraction/          # section 1
  hard_inspection/     # section 2 (engine, resolver, loader, rules/)
  qualitative/         # section 3
  feedback/            # section 4
  common/              # shared types + standalone LLM client
  pipeline.py          # orchestrator
  bridge.py            # JSON bridge for the Next.js API
  report.py            # hard+qualitative report assembler
  engine.py / loader.py / soft.py   # compatibility shims for existing imports
```

## Webpage & usage note

- Interactive UI: `/diagnostic/workspace` (see frontend Next.js app)
- Brief how-to: [`USAGE.md`](./USAGE.md)
# Eligibility — what we built and how to use it

**Date:** 2026-07-29

## What this is

`eligibility` is a **standalone IPO readiness diagnostic**. It does not depend on the prospectus drafting pipeline (Agent1 / Agent2). Users upload financial / corporate documents (or fill structured fields), choose a market/board, and receive:

1. Per-gate hard statuses (`PASS` / `SHORTFALL` / `MISSING_INPUT` / …) with rule citations  
2. Qualitative substance signals  
3. Plain-language feedback: readiness + what to improve  

This is **diagnostic feedback**, not legal advice or exchange approval.

## What we did in this pass

### 1. Multi-market hard rules
- Exported SSOT CSV from `update/update/INPUT_AND_ELIGIBILITY_MASTER_EN.xlsx` → `thresholds_master_v0.5.csv`
- Encoded **9 new YAML packs** (CN Main/STAR/ChiNext/BSE/CSRC, HKEX GEM + public float, SGX Mainboard/Catalist)
- Re-anchored 18C free-float to **MB 8.08A**; added HK-C-0 trading record and 18A limbs
- Encoder: `scripts/encode_thresholds.py` — regenerate with `python eligibility/eligibility/scripts/encode_thresholds.py`

### 2. Mode B confirmation wiring
- Extraction → human confirm → issuer JSON (`extraction/issuer_builder.py`)
- Unconfirmed values stay out of hard gates (`MISSING_INPUT`)
- Deal params (offer price, FX, timetable) are hard-entered only

### 3. Backend API (Next.js → Python)
- `POST /api/eligibility/upload` — session file upload  
- `POST /api/eligibility/run` — spawn `python -m eligibility.bridge`  
- `GET /api/eligibility/report?sessionId=`  
- `GET /api/eligibility/markets` — market → ruleset map  

### 4. Webpage
- Live workspace: **`/diagnostic/workspace`** (EN) and **`/zh/diagnostic/workspace`** (ZH)
- Upload docs or enter structured fields → select market → **Run diagnostic** → feedback + scorecard
- Architecture marketing page remains at `/diagnostic`

## How to use

### Web (recommended)
```bash
cd frontend/web && npm install && npm run dev
# open http://localhost:3000/diagnostic/workspace
```
1. Choose target market/board  
2. Upload PDF/DOCX/XLSX/JSON **or** fill structured fields  
3. Click **Run diagnostic**  
4. Read feedback, gaps, and hard-gate scorecard  

Optional: configure eligibility’s **own** Inference backend under
`/diagnostic/settings` (saved to `eligibility-settings.json`, separate from
drafting’s `/settings`). Choose Local Qwen, OpenAI, DeepSeek, DashScope, or
Anthropic there.

Without a usable provider (e.g. cloud API selected but no key), LLM stages fall
back to an offline stub; hard gates still run.

### CLI
```bash
PYTHONPATH=eligibility ELIGIBILITY_LLM_STUB=1 python -m eligibility \
  --in path/to/issuer.json \
  --docs path/to/audit.pdf \
  --profile profile.json \
  --market "HKEX Main Board" \
  --feedback \
  --out report.json
```

### Tests
```bash
PYTHONPATH=eligibility python -m unittest discover -s eligibility/eligibility/tests -p 'test_*.py'
```

## Four internal stages

| Stage | Folder | Role |
|---|---|---|
| Extraction | `extraction/` | Read docs; extract numbers + narrative |
| Hard inspection | `hard_inspection/` | Deterministic threshold comparison (no LLM) |
| Qualitative | `qualitative/` | LLM substance signals |
| Feedback | `feedback/` | Readiness + improvement prose |

## Caveats
- Many multi-market gates are authored with `evaluated: false` until fixtures / professional sign-off mature — they appear as `NOT_EVALUATED`
- `human_signoff` remains false on all gates pending sponsor / counsel review
- Frontend eligibility APIs are public (not behind workspace Basic auth) so the diagnostic can be tried without drafting-workspace credentials

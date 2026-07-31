# Reverse-Engineering Issuer Inputs

This note documents the pipeline for inferring realistic issuer input materials
from final published prospectuses.

## Current Finding

The previous Stage 3 extraction was section-field based: it produced one JSON
record per prospectus section. That is useful, but not realistic enough for
Agent1, because actual IPO drafting starts from a data room containing source
documents such as term sheets, accountants' schedules, legal memos, industry
consultant reports, risk registers and use-of-proceeds schedules.

The audit command now measures the gap:

```bash
python scripts/prospectus_kg/audit_reverse_extraction.py \
  --json-out prospectus_kg_output/inputs/_reverse_extraction_audit.json \
  --md-out prospectus_kg_output/inputs/_reverse_extraction_audit.md
```

Latest local audit over 125 prospectuses:

- filled fields: 14,909 / 24,375 (61.2%)
- traceable filled values: 13,940 / 14,909 (93.5%)
- legacy values without page/span: 969
- suspicious "not disclosed" style phrases inside values: 117

## Source Package Layer

Run:

```bash
python scripts/prospectus_kg/build_source_packages.py
```

This writes:

```text
prospectus_kg_output/inputs/source_packages/<doc_id>/source_package.json
prospectus_kg_output/inputs/source_packages/<doc_id>/agent1_input_seed.json
```

Each source package maps final prospectus sections back to likely original
data-room files, for example:

- `offering_term_sheet`
- `expected_timetable_schedule`
- `use_of_proceeds_schedule`
- `industry_consultant_report`
- `business_due_diligence_memo`
- `risk_register`
- `accountants_report_and_mdna`
- `corporate_records_pack`
- `shareholder_register_and_interests`
- `directors_management_questionnaires`
- `legal_regulatory_memos`

The manifest keeps page ranges, extracted fields, missing fields, likely source
document kind, recommended file format and Agent1 domain.

## ChatGPT / OpenAI Re-Extraction

`stage3_extract_v2.py` now supports local Qwen and OpenAI-compatible ChatGPT
providers.

Single-section probe:

```bash
python scripts/prospectus_kg/stage3_extract_v2.py \
  --provider openai \
  --model gpt-4o-mini \
  --only-doc 00020_global_offering_2 \
  --only-section Future_Plans_and_Use_of_Proceeds \
  --no-resume \
  --max-section-chars 6000 \
  --max-tokens 1600
```

Batch re-extract high-value sections:

```bash
python scripts/prospectus_kg/stage3_extract_v2.py \
  --provider openai \
  --model gpt-4o-mini \
  --only-sections Business,Industry_Overview,Financial_Information,Risk_Factors,Future_Plans_and_Use_of_Proceeds \
  --no-resume \
  --max-section-chars 10000 \
  --max-tokens 2200

python scripts/prospectus_kg/build_source_packages.py
python scripts/prospectus_kg/audit_reverse_extraction.py \
  --json-out prospectus_kg_output/inputs/_reverse_extraction_audit.json \
  --md-out prospectus_kg_output/inputs/_reverse_extraction_audit.md
```

The current local `.env.local` OpenAI-compatible key returns `401 invalid_api_key`,
so the ChatGPT path is implemented and probed but needs a valid key before the
full corpus can be re-extracted through that provider.

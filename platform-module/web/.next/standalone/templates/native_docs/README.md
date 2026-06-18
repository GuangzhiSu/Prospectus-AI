# Native-Doc Templates (Phase 1)

Reverse-engineered "DD data room" deliverables produced from
`prospectus_kg_output/inputs/records/*.json` by
[`scripts/prospectus_kg/reverse_engineer_templates.py`](../../scripts/prospectus_kg/reverse_engineer_templates.py).

The templates are **generated as code** (not checked-in binaries) so the
structure stays reviewable. The fill script builds each document from scratch
using `python-docx` / `openpyxl`, then populates placeholders from the record.
Any field whose record value is `null` is rendered as the literal string
`**DATA_MISSING**` and logged under `missing_fields` in the per-doc manifest.

## Phase-1 templates

### 1. `issuer_corporate_info.docx`

| Cell / paragraph           | Record source (Schema B dotted path)                 |
| -------------------------- | ---------------------------------------------------- |
| Issuer name (EN / ZH)      | `record.Corporate_Information.issuer_name_*`         |
| Stock code                 | `record.Cover.stock_code`                            |
| Place of incorporation     | `record.Corporate_Information.place_of_incorporation`|
| Registered office          | `record.Corporate_Information.registered_office`     |
| HQ / principal business    | `record.Corporate_Information.head_office`           |
| Joint company secretaries  | `record.Corporate_Information.company_secretaries`   |
| Auditor                    | `record.Corporate_Information.auditor`               |
| Compliance advisor         | `record.Corporate_Information.compliance_advisor`    |
| Principal banks            | `record.Corporate_Information.principal_banks`       |
| Share registrar (HK)       | `record.Corporate_Information.share_registrar_hk`    |

Maps to Schema A field `issuer.corp.certificate_of_incorporation` + ancillary
issuer-party fields.

### 2. `shareholder_list.xlsx`

| Column                     | Record source                                         |
| -------------------------- | ----------------------------------------------------- |
| Shareholder name           | `record.Substantial_Shareholders.shareholders[].name` |
| Share class                | `record.Substantial_Shareholders.shareholders[].class`|
| Shares held                | `record.Substantial_Shareholders.shareholders[].count`|
| % of issued capital        | `record.Substantial_Shareholders.shareholders[].pct`  |

Maps to Schema A field `issuer.corp.shareholder_register`.

### 3. `financial_model.xlsx`

Multi-sheet skeleton (Income Statement, Balance Sheet, Cash Flow, KPIs) — rows
are empty unless the record carries the matching metric.

| Sheet / Row metric         | Record source                                         |
| -------------------------- | ----------------------------------------------------- |
| IS / Revenue               | `record.Financial_Information.revenue`                |
| IS / COGS                  | `record.Financial_Information.cogs`                   |
| IS / Gross profit          | `record.Financial_Information.gross_profit`           |
| IS / Operating expenses    | `record.Financial_Information.operating_expenses`     |
| IS / Net loss              | `record.Financial_Information.net_loss`               |
| BS / Total assets          | `record.Financial_Information.total_assets`           |
| BS / Total liabilities     | `record.Financial_Information.total_liabilities`      |
| CF / Operating cash flow   | `record.Financial_Information.cash_flow_operating`    |
| CF / Capex                 | `record.Financial_Information.capex`                  |

Maps to Schema A field `prof.accountants.financial_model`.

### 4. `comfort_letter_draft.docx`

One-page skeleton: issuer header + 3-row "Key financials" reference table
sourced from `record.Financial_Information.*` (revenue, gross margin, net
loss across the latest historical period).

Maps to Schema A field `prof.accountants.comfort_letter`.

## Deferred

The additional gating docs (audit report numeric appendix, property valuation
report, M&A agreements, board resolutions) require either (a) schema fields
that are not yet extracted into records or (b) source data the pipeline cannot
reconstruct from the prospectus alone. They are deliberately **not** authored
in phase 1 and are listed under `out_of_scope_fields` in every per-doc manifest.

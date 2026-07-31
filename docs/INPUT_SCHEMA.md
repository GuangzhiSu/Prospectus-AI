# INPUT_SCHEMA — Agent1 Issuer-Input Schema v3 (English)

> Purpose: a single structured input format that can hold **every atomic input item** in `REQUIREMENTS_MATRIX_EN.md`, organized by data domain, with each item tagged by **provenance class** so the pipeline knows who supplies it and how it is stored. This evolves Agent1's current `data.json` format (see `PIPELINE_MAP.md §2`) and is the data-input counterpart to the repo's gating-doc contract `prospectus_kg_output/inputs/input_schema.json` (Schema A).
>
> **Scope of this step: schema design only — no data back-fill.** The sample at the end carries a few illustrative values, not a populated issuer record.

## Inputs this design builds on
1. **`REQUIREMENTS_MATRIX_EN.md`** — the 2,111 atomic input items (types a–e) the schema must be able to hold.
2. **Agent1 current format** (`PIPELINE_MAP.md §2`): top-level JSON object whose keys are *categories* and values are *field objects*; Agent1 recurses, flattening scalars → `fact_store`, object-arrays (with `period`/`date`) → period-keyed facts, long strings / string-arrays → `text_chunks`, `{low,high}` → `price_range`. Output stores: `fact_store.jsonl`, `text_chunks.jsonl`, `rag_chunks.jsonl`.
3. **EN-matrix footer mapping suggestion (starting point):** this matrix is a *subsection-level superset* of Schema A; its **Source** column aligns with Schema A providers (Issuer materials ↔ §1, professional-party deliverables ↔ §2, regulatory framework ↔ §6) and can be machine-mapped to a Schema A `field_id`. We therefore carry **`source`** and **`schema_a_field`** through to every field rather than inventing a parallel provenance taxonomy.

---

## 1. Design principles

1. **Provenance-first.** Every leaf is one of five provenance classes mirroring the matrix's types **(a)/(b)/(c)/(d)/(e)**. The class decides *where and how* it is stored and *whether the issuer supplies it*.
2. **(a) structured, never free text.** Class-(a) facts are plain JSON scalars, scalar arrays, or row-object tables — directly fill-in-the-blank, machine-comparable. No prose.
3. **(b) raw material ≠ generated narrative.** Class-(b) fields hold only **source bullet points / evidence**, never finished paragraphs. The downstream writer agent produces prose; the schema is strictly upstream of it. (This is a clean break from today's behaviour, where Agent1 silently treats any long string as narrative — see §6.)
4. **(e) computed = pipeline-produced, not issuer-supplied.** Class-(e) fields are placeholders with a `formula` and `inputs`; `value` stays `null` until a **compute module** fills it. Issuers/clients never enter these.
5. **(c) external = third-party integration required.** Class-(c) fields (market size/share/rank, etc.) are bindings to an external provider (e.g. **Frost & Sullivan**); `value` is `null` until a third-party data source is connected.
6. **(d) regulatory facts are first-class.** Legal/regulatory facts (laws, Listing Rules, licences, approvals) are structured citations sourced to legal counsel / regulatory framework — not buried in prose.
7. **L3 parallel points → arrays, not fields.** A matrix L3 item that is a *parallel point* under an L2 subsection (one strength, one risk, one note, one regulation) becomes an **array element under the L2 field**, never its own named field. This keeps the schema bounded (~120 field groups) instead of exploding to 1,082 fields.
8. **Output contract preserved.** The schema changes *inputs*; Agent1's output stores keep their record shapes (`fact_store`/`text_chunks`/`rag_chunks`), so Agent2's retrievers are unaffected. Class only changes *routing* and adds `source`/`schema_a_field` to metadata.

---

## 2. The field-value model (`$kind` discriminator)

A leaf field's value is **either** a plain class-(a) value **or** a typed object carrying a `"$kind"`:

| `$kind` | Matrix type | JSON shape (key parts) | Routed to | Issuer-supplied? |
|---|---|---|---|---|
| *(none — plain value)* | **(a)** fact | scalar / `[scalars]` / `[{period, …}]` table | `fact_store` | yes |
| `"narrative"` | **(b)** | `{"$kind":"narrative","points":[{"id","text","evidence":[ref]}],"source"}` | `text_chunks` (from `points`) | yes (raw material) |
| `"external"` | **(c)** | `{"$kind":"external","provider","metric","value":null,"unit","as_of","report_ref","requires_integration":true}` | `external_facts` (new) / `fact_store` once fetched | no — external feed |
| `"regulatory"` | **(d)** | `{"$kind":"regulatory","instrument","citation","authority","effective_date","requirement","source"}` | `fact_store` (tagged regulatory) | via legal counsel |
| `"computed"` | **(e)** | `{"$kind":"computed","formula","inputs":[path…],"unit","value":null,"generated_by":"compute_module"}` | computed at build time | no — pipeline |

Shared optional attributes on any typed object: `source` (controlled vocabulary), `schema_a_field` (Schema A `field_id`, e.g. `prof.industry_consultant.research_report`), `period`, `confidence`, `todo` (e.g. `"verify later"`).

**Controlled `source` vocabulary** (same as the EN matrix): `Issuer·corporate records | Issuer·financials | Issuer·business&ops | Issuer·directors&mgmt | Reporting Accountant | Sponsors | Sponsors' counsel | PRC legal counsel | HK legal counsel | Cayman legal counsel | US legal counsel | Industry consultant (Frost & Sullivan) | Property valuer | Underwriters | Receiving bank·Registrar·CCASS | Independent Financial Adviser | Regulatory framework | Derived`.

> Plain class-(a) values may set a field-level or domain-level `source` via the domain's `"$source_default"`; if absent, default = `Issuer·corporate records`.

---

## 3. Top-level envelope

```jsonc
{
  "schema_version": "agent1-input/3.0",      // reserved: Agent1 skips
  "issuer_id": "<ISSUER_STOCK_CODE>",                     // reserved: skipped
  "language": "en",                           // reserved: skipped
  "source_defaults": { "...": "..." },        // reserved: skipped
  "company_legal_entity": { ... },            // 11 data domains follow
  "financials": { ... },
  "business_products": { ... },
  "customers_suppliers": { ... },
  "rd_ip": { ... },
  "industry_market": { ... },
  "management_governance": { ... },
  "risk_seeds": { ... },
  "offering_use_of_proceeds": { ... },
  "related_party_transactions": { ... },
  "regulatory_legal": { ... }                 // extension beyond the 10 — see §5
}
```

Reserved top-level keys (`schema_version`, `issuer_id`, `language`, `source_defaults`, and any `$`-prefixed key) are **ignored** by Agent1's domain loop.

---

## 4. Domains and field groups

Each domain notes: **← data.json**, **← Schema A anchor**, **← EN chapters**, **Agent1 bucket**. Field groups list the representative shape; repetitive/L3 content uses arrays per §1.7.

### 4.1 `company_legal_entity` — ← `company_profile`,`corporate_structure` · Schema A §1.1 · EN ch.13,16,23,32 · bucket A/E
- `identity` (a): `{legal_name, chinese_name, stock_code, incorporation_jurisdiction, incorporation_date, legal_form, par_value, hq_location, website}`
- `subsidiaries` (a, table): `[{name, jurisdiction, incorporation_date, ownership_pct, principal_business, entity_type}]`
- `reorganization_steps` (a, table): `[{seq, date, action, entities, share_effect}]`
- `share_classes` (a): `[{class, shares_authorized, shares_issued, par_value, votes_per_share}]`
- `dwvr` (a + computed): `{beneficiaries:[{name, class_b_shares}], voting_power_pct: {$kind:"computed", …}}`
- `pre_ipo_investments` (a, table): `[{series, agreement_date, last_payment_date, shares, cost_per_share, implied_valuation, amount_raised}]` + `discount_to_offer` (e)
- `capitalization` (a, table, **structure-row** for the big shareholder×class grid) + `public_float_pct` (e)
- `constitution_summary` (d): array of `{topic, instrument:"Articles/Cayman Companies Act", point}` (Cayman law)

### 4.2 `financials` — ← `financials`,`operating_metrics` · Schema A §1.3, §2 (Reporting Accountant) · EN ch.05,25,30,31 · bucket D
- `income_statement` / `balance_sheet` / `cash_flow` / `changes_in_equity` (a, tables keyed by `period`/`date`), source `Reporting Accountant`+`Issuer·financials`
- `segment_revenue` (a, table) ; `operating_metrics` (a, table: ASP, volumes, project counts)
- `accounting_policies` (d): `[{topic, standard:"HKFRS/IFRS", basis}]`
- `accountants_report` (d/b): `{opinion_basis, independence, review_standards}` (Reporting Accountant)
- `ratios` (e): `{gross_margin, net_margin, current_ratio, gearing, trade_receivable_days, …}` each `{$kind:"computed", formula, inputs}`
- `pro_forma_nta` (e): `{$kind:"computed", formula:"(historical_NTA + net_proceeds)/shares_post", inputs:[…]}`

### 4.3 `business_products` — ← `business`,`products_and_technology` · Schema A §1.2 · EN ch.17 (+05) · bucket A
- `mission_vision` (b narrative): `points:[…]`
- `business_model`, `sales_model`, `production_model`, `quality_control`, `logistics_inventory` (b narrative)
- `product_segments` (a): `[{segment, products:[…]}]`
- `platforms` (b narrative array): `points:[{id, title, text, evidence}]` (<product platform> / <product platform> / <product platform> / <product platform> …)
- `competitive_strengths` (b narrative array) — **each strength = one `points[]` item** (L3→array)
- `strategies` (b narrative array) — each strategy = one item
- `properties` (a, table): `[{location, area, use, tenure}]` (+ `Property valuer` where valued)
- `esg` (b narrative) ; `certifications` (d): `[{name:"ISO/IEC 27001", scope, authority}]`

### 4.4 `customers_suppliers` — ← `customers` · Schema A §1.2 · EN ch.17 · bucket A/D
- `top_customers` / `top_suppliers` (a, **structure-row** tables): `[{rank, code, background, product_or_service, relationship_since, amount, pct_of_revenue_or_cogs, period}]`
- `concentration` (e): `{top5_customer_pct, largest_customer_pct, top5_supplier_pct, …}` computed
- `customer_supplier_overlap` (a/b) ; `material_contracts` (a, table)

### 4.5 `rd_ip` — ← `products_and_technology` · Schema A §1.4(b) · EN ch.17 · bucket A
- `rd` (a): `{team_size, team_start_year, rd_spend_by_period:[{period, amount}]}` ; `rd_focus` (b)
- `technology_architecture` (b narrative array)
- `ip_portfolio` (a): `{patents_total, overseas_patents, trademarks, copyrights, domains}` + `ip_schedules` (a, **structure-row** tables)
- `ip_disputes` (a/d) ; `data_privacy_compliance` (d)

### 4.6 `industry_market` — ← `market`,`competition` · Schema A §2 (industry consultant) / gate.industry · EN ch.14 (+05) · bucket B
> **Almost entirely class-(c) external (Frost & Sullivan).**
- `market_size` (c): `[{$kind:"external", provider:"Frost & Sullivan", metric, value:null, unit, as_of, report_ref}]`
- `market_growth_cagr` (c/e): external base values; CAGR as computed-over-external
- `market_share` / `ranking` (c) ; `competitive_landscape` (c + b): anonymized competitor profiles
- `industry_trends` (b narrative, sourced to F&S) ; `consultant_engagement` (a): `{name, fee, report_date}`

### 4.7 `management_governance` — ← `management`,`shareholders` · Schema A §1.4(a) · EN ch.20,21,22,(33) · bucket F/E
- `directors` (a, table): `[{name, age, role:"ED/NED/INED", appointment_date, bio_points:[…], other_directorships}]` (bio = (b) points)
- `senior_management` (a/b, table) ; `board_committees` (a/d): `[{committee, members, mandate, listing_rule}]`
- `remuneration` (a): `[{period, director, fees, salary, bonus, pension, share_based}]` (Issuer·financials)
- `controlling_shareholders` (a) + `independence` (b narrative: business/management/financial) + `non_competition_undertaking` (a/d)
- `substantial_shareholders` (a, **structure-row** table; SFO Part XV) + interests `pct` (e)
- `share_incentive_schemes` (a): `{plan_name, adopted_date, limit, grants:[…]}`

### 4.8 `risk_seeds` — ← `risk_related_data` · Schema A gate.risk (risk matrix) · EN ch.09 (+05) · bucket C
> The 1,082-style risk granularity lives here as **array items**, not fields.
- `items` (array): `[{ "id":"risk-biz-12", "category":"business|industry|corp_structure|china|wvr|offering", "title", "trigger_facts":[ref…], "regulatory_basis":[ref… or {$kind:"regulatory"}], "seed": {$kind:"narrative","points":[…]} }]`
- Each risk factor = one element; its quantitative hooks reference (a) facts elsewhere, its legal hooks reference (d), its rationale is (b) seed material.

### 4.9 `offering_use_of_proceeds` — ← `ipo_offering`,`shareholders.cornerstone` · Schema A gate.cover · EN ch.01,03,24,26,27,28,29 · bucket H/E
- `offer` (a): `{security_type, total_offer_shares, hk_offer_shares, intl_placing_shares, over_allotment_shares, offer_price:{low,high,mid}, par_value, board_lot, listing_date}`
- `clawback` (a/d): `[{threshold_x, hk_pct}]` ; `stabilization` (b/d)
- `cornerstone_investors` (a, **structure-row** table): `[{name, background, amount, shares_by_price:{…}, pct, lockup}]`
- `underwriting` (a/d): `{underwriters:[…], commission_pct, incentive_fee_pct, agreement_terms, termination_events:[…]}`
- `expected_timetable` (a, table): `[{event, date, time, note}]` (Underwriters / Receiving bank·Registrar·CCASS)
- `how_to_apply` (b/d narrative + a): channels, procedure, allotment principles
- `use_of_proceeds` (a, table): `[{purpose, amount, pct, timeline}]` + `net_proceeds` (e: depends on offer_price×shares − expenses)
- `listing_expenses` (a/e)

### 4.10 `related_party_transactions` — Schema A gate.connected, gate.vie · EN ch.18,19 · bucket G
- `connected_transactions` (a, table): `[{counterparty, nature, amount, annual_cap, period}]` + `cap_ratio` (e) + `lr_treatment` (d: connected-tx classification/exemption, HK legal counsel)
- `contractual_arrangements` (a + d): `{agreements:[{name, parties, key_terms}], vie_rationale:(b), prc_legal_basis:(d), consolidation_impact:(a/e)}`
- `ifa_opinion` (b) (Independent Financial Adviser)

### 4.11 `regulatory_legal` — **EXTENSION beyond the 10 domains** · Schema A §6 / REGULATORY OVERVIEW, WAIVERS · EN ch.10,15 · bucket G
> Added because EN ch.15 (Regulatory Overview, 37 pp) and ch.10 (Waivers) are wholly type-(d) surveys that do not fit cleanly inside the 10 business domains. See §5 for the justification.
- `applicable_regulations` (d, array): `[{instrument, jurisdiction:"PRC/HK/US/Cayman", authority, effective_date, key_requirement, status:"in force|draft", source}]`
- `licenses_permits` (d, table) ; `waivers` (d, array): `[{listing_rule_or_ordinance, reason, approval_status}]`
- `legal_opinions` (d/b): `[{matter, counsel, conclusion}]`

---

## 5. The `regulatory_legal` extension — why an 11th domain
The brief listed 10 domains; none is a natural home for the **standalone regulatory survey** (EN ch.15) or the **waivers/exemptions** (EN ch.10), which are pure type-(d) material spanning *all* business areas. Three options were considered:
- (i) scatter (d) facts into each business domain — loses the cross-cutting regulatory survey and duplicates the same law across domains;
- (ii) drop them — violates completeness (these are whole chapters);
- (iii) **add `regulatory_legal`** — keeps domain-specific licences/approvals attached to their domain *and* gives the cross-cutting regulatory survey a home.

Chosen (iii). Domain-specific regulatory facts (e.g. a telecom licence) may live in their business domain via a `$kind:"regulatory"` field; the economy-wide survey and waivers live in `regulatory_legal`. **Flagging for your confirmation** — if you prefer strictly 10 domains, fold `regulatory_legal.*` into the nearest business domain.

---

## 6. Backward compatibility with Agent1

### Preserved (no change needed)
- **Output contract:** `fact_store.jsonl` / `text_chunks.jsonl` / `rag_chunks.jsonl` record shapes are unchanged; Agent2 retrievers keep working.
- **Class-(a) flattening:** plain scalars, scalar arrays, and `period`/`date`-keyed object-arrays flatten exactly as today (`_extract_facts`), so the *existing* `data.json` (UBTECH) still ingests with zero changes — its 13 categories are simply mapped (see migration table).
- **`{low,high}`** price-range handling still applies to `offer_price`.

### Breaking points (must be addressed before this schema ingests cleanly)
1. **New top-level domain keys** (`company_legal_entity`, …) are absent from Agent1's `JSON_CATEGORY_TO_SECTION`, so every fact would default to bucket **A**.
   → *Fix:* extend `JSON_CATEGORY_TO_SECTION` with the 11 domains → buckets (table below). Low effort, additive.
2. **`$kind` typed objects** would be recursed by `_extract_facts` and emit junk facts (e.g. a fact `metric="formula"`, `value=null`).
   → *Fix:* add a small **`$kind` router** at the top of `_extract_facts`: `narrative`→`text_chunks` (from `points`); `computed`/`external` with `value=null`→emit a **required-input placeholder** record (or skip) instead of a fact; `regulatory`→`fact_store` with `metadata.kind="regulatory"`; plain values→unchanged path.
3. **Explicit (b) split.** Today Agent1 *auto-detects* narrative (any string >200 chars or string-array). New schema makes (b) explicit and forbids finished prose in inputs.
   → *Fix:* when a `$kind:"narrative"` object is present, take `points[].text` as the narrative source; keep the legacy heuristic only for un-tagged strings (back-compat).
4. **Provenance metadata.** `source` / `schema_a_field` / `period` should reach `fact_store`/`text_chunks` `metadata`.
   → *Fix:* thread these into the existing `metadata` dict (additive; Agent2 already tolerates extra metadata keys).
5. **Reserved envelope keys.** `_meta`/`source_defaults` dicts at top level would be ingested.
   → *Fix:* skip keys that are `$`-prefixed or in the reserved set.

### Justification
Breaks #1–#5 are **additive, localized changes to `agent1.py`** (one category-map extension + one `$kind` router) and do **not** alter output formats or Agent2. The payoff is large: (a) provenance separation stops narrative/computed/external values from polluting `fact_store`; (b) computed/external become explicit *gaps* the pipeline can surface (mirrors the matrix's DD-evidence idea); (c) `schema_a_field` gives the long-promised machine link to Schema A gating docs. The legacy `data.json` keeps working, so migration is incremental (run both shapes during transition).

### Migration map (domain → legacy data.json category → Agent1 bucket)
| New domain | Legacy `data.json` category | Bucket |
|---|---|---|
| company_legal_entity | company_profile, corporate_structure | A / E |
| financials | financials, operating_metrics | D |
| business_products | business, products_and_technology | A |
| customers_suppliers | customers | A / D |
| rd_ip | products_and_technology (IP part) | A |
| industry_market | market, competition | B |
| management_governance | management, shareholders | F / E |
| risk_seeds | risk_related_data | C |
| offering_use_of_proceeds | ipo_offering, shareholders.cornerstone | H / E |
| related_party_transactions | *(new)* | G |
| regulatory_legal | *(new)* | G |

---

## 7. Sample instance (illustrative values only — not a back-fill)
A few cells per domain, showing all five `$kind`s. Full file also written to `INPUT_SCHEMA.sample.json`.


_Redacted for GitHub: the value-filled sample is not committed here. See **`INPUT_SCHEMA.sample.json`** (placeholder-only) in this folder; the real instance (`sensetime.json`) lives in the Aliyun Codeup data repo._


---

## 8. What this gives the pipeline
- **One ingestible record** that covers the entire EN matrix, domain-organized, with provenance routing.
- **Explicit gaps:** every `computed`/`external` `value:null` is a known, queryable input gap (compute module / F&S feed), and missing `(a)`/`(d)` fields are DD-evidence gaps — the matrix becomes a live coverage checklist.
- **Schema A linkage:** `schema_a_field` connects each input to the gating-doc contract, enabling the `[[AI: DD evidence needed — <field_id>]]` mechanism Agent2 already understands.
- **Bounded size:** ~11 domains × ~6–10 field groups, with L3 granularity absorbed into arrays — not 1,082 fields.

*Next step (not done here): back-fill this schema from the EN matrix's (a)/(d) items + a compute-module spec for (e) + an F&S binding for (c), to produce a runnable `sensetime.json`.*

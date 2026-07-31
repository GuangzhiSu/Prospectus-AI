# Encode Instruction — Multi-Market Eligibility Packs (for cc)

**To:** cc (developer)
**From:** Yuanjun (reviewed & approved 2026-07-24)
**Data source (single source of truth):** `INPUT_AND_ELIGIBILITY_MASTER_EN.xlsx` v0.5, sheet `3_Thresholds_Master`. Do not take threshold values from this prompt, from the spec, or from memory — only from the workbook. If a row is ambiguous, ask; do not guess.

---

## Task A — Modify one existing pack

`eligibility/rules/hkex_ch18c.yaml` (currently `repo_verified`):
- Re-anchor the free-float gate (`ch18c_minimum_free_float`) from the former 18C-specific rule to **MB LR 8.08A** (workbook rows HK-18C-7 / HK-F-4 / HK-F-5): unrestricted public shares ≥10% of listed shares AND ≥HK$50M, OR ≥HK$600M. The HK$600M value is compatible with the current gate; the **citation and rule structure change** (now an OR-group of two limbs).
- Update `verified_against` / `verified_on` provenance per workbook row; set `effective_from: 2025-08-04`.
- Touch nothing else in the pack. The temporary market-cap override (≤2027-08-31) and the 18C.08 independent price-setting investor gate remain exactly as-is (log D-3).

## Task B — Nine new packs

Create under `eligibility/rules/`, same schema and conventions as the existing packs:

| pack | workbook row prefixes | notes |
|---|---|---|
| `cn_main_board.yaml` | MB-* | SSE+SZSE shared; include red-chip 3.1.4/3.1.5 rows |
| `cn_star.yaml` | ST-* | five standards + 2.1.4 WVR + 2.1.3 red-chip + 科创属性 roll-up (four cumulative indicators, two OR-groups, software exemption, exceptional-alternative leaf) |
| `cn_chinext.yaml` | CX-* | FOUR standards (Std 4 two branches); 2.1.4 WVR has NO profit limb; red-chip + CX-RC-DEF three-limb growth definition + exemption leaf |
| `cn_bse.yaml` | BJ-* | 2.1.2 structural + 2.1.3 four standards; 孰低 basis notes |
| `cn_csrc_preconditions.yaml` | CS-* (excl. CS-BJ-*) | scope: MB/STAR/ChiNext only; Arts.10–13 |
| — BSE preconditions go in `cn_bse.yaml` | CS-BJ-1, CS-BJ-2 | 北交所注册管理办法 Art.9/10/11 |
| `hkex_gem.yaml` | GEM-* | two tests; continuity; 12-month lockup note |
| `hkex_public_float.yaml` | HK-F-* | applies to MB **and** GEM listings with listing documents on/after 2025-08-04; tiered 8.08(1), 8.08A, 8.09(1), shareholder counts, A+H rows |
| `sgx_mainboard.yaml` | SG-* | 210(2) three criteria; 210(3)(a) continuity; 210(4)(d) audit gate; 210(5)(c) governance; tiered 210(1)(a) float; life-science & mineral routes; DCS note |
| `sgx_catalist.yaml` | CAT-* | sponsor_engaged structural gate only; everything else routes to disclosure diagnostics |

Do **not** re-encode HK-S*, HK-8A-*, HK-18A-1..5, HK-18C-1..6/8 rows marked `repo_verified` — they restate existing packs for the cross-market view. Exception: HK-C-0 (trading record) and HK-18A-0/HK-18A-6 are **new** rows to add to the existing `hkex_main_board.yaml` / `hkex_ch18a.yaml`.

## Task C — Schema & semantics (unchanged, enforced)

- Four statuses + `NOT_EVALUATED`; `MISSING_INPUT` ≠ `INDETERMINATE`.
- Every numeric check: `threshold_verified`, `effective_from_verified`, `verified_against` / `verified_on` / `verified_by` — copy from workbook columns. `human_signoff: false` on **every** gate (internal review ≠ engine sign-off).
- `or_group` column → encode as OR-groups (one of the group suffices). Standards are AND-roll-ups of their limbs; boards are OR-roll-ups of standards.
- Rows with `DEFERRED_REVIEW` values → authored leaves with `requires_llm` per context, `evaluated: false`, rendered `NOT_EVALUATED`. No LLM import in the hard path — extend `test_no_llm_in_hard_path.py` to the new packs.
- Rows with `threshold_verified: pending_text_check` (11 remain, e.g. MB-RC-U3): encode with `threshold_verified: false` + `needs_human_verify: true`; where the value cell says TO TRANSCRIBE, author the gate but leave the value null (gate returns `MISSING_INPUT`/`NOT_EVALUATED`), never a guessed number.
- Currency per row (CNY/HKD/SGD); comparisons only after FX resolution, else `INDETERMINATE`.
- The A-share new/old-rule 衔接 (审核委 cutover) mechanism is out of scope this phase — note only.

## Task D — compute_module additions (from workbook sheet 2)

New computed fields, one per rulebook definition, never aliased across markets: `net_profit_regulatory_cn` (+ aggregates/latest/each-year booleans), `pre_tax_profit_ex_nonrecurrent`, `rd_agg_3fy_cn` / `rd_ratio_3fy_cn`, `rd_agg_2fy_cn` / `rd_ratio_2fy_cn`, `rd_agg_2fy_hk` / `rd_ratio_per_fy_hk` (denominator = total operating expenditure), `revenue_aggregate_track_record` / `_2fy` / `_avg_2fy`, `revenue_cagr_3yr` / `revenue_yoy_growth_latest` / `revenue_yoy_growth_each_of_2fy`, `weighted_avg_roe_avg_2fy`, `expected_market_cap_at_listing` (from D-01 × D-02 only), `public_float_pct` variants per market definition, `pe_ratio_at_issue` (**informational only — assert in a test that no gate references it**). Null discipline: any missing input propagates null; no fabrication.

## Task E — Regression & tests (merge-blocking)

1. SenseTime baseline stays **49/49 green** — the new packs must not alter existing behavior.
2. Add fixtures: one synthetic A-share issuer (should PASS ≥1 ChiNext standard and FAIL SSE MB Std 1 by construction), one synthetic SGX issuer (PASS 210(2)(b), FAIL 210(2)(a)).
3. New tests: OR-group semantics; standard/board roll-up logic; `pending_text_check` gates never yield PASS/SHORTFALL; `pe_ratio_at_issue` referenced by zero gates; conditional-override date logic on 18C unchanged.
4. Update `docs/ELIGIBILITY_MODULE.md` verification log from workbook sheet 5 (sections A–D).

## Process

Branch off main; one PR; do not squash the pack additions with the 18C modification (two commits minimum: `modify: 18c free-float re-anchor (8.08A)` and `feat: multi-market packs v1`). Any workbook cell that seems wrong or ambiguous → flag to Yuanjun before encoding, do not correct silently.

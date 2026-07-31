# Eligibility Module — Multi-Market Verification Log

**Data source (single source of truth):** `update/INPUT_AND_ELIGIBILITY_MASTER_EN.xlsx` v0.5,
sheet `3_Thresholds_Master` (189 limb rows across 13 board sections: 156 web-verified /
22 repo-verified / 11 pending_text_check). A CSV snapshot is committed at
`eligibility/thresholds_master_v0.5.csv` so future threshold changes are diffable in review.

**Scope:** 11 boards across three markets — PRC A-shares (SSE Main Board, STAR, ChiNext, BSE),
Hong Kong (Main Board incl. Ch. 8A/18A/18C, GEM), Singapore (SGX Mainboard, Catalist) — plus
PRC red-chip pathways and CSRC/BSE issuance preconditions.

**Sign-off status:** Internal team review of the threshold master completed 2026-07-24 (Yuanjun).
Engine-level `human_signoff` remains **false** on every gate pending external professional
(sponsor / capital-markets lawyer) review — the workbook sign-off is internal only. Numeric
thresholds are checked against primary sources (`threshold_verified: true`); this is independent
of `human_signoff`. Provenance for the multi-market rows: `verified_on: 2026-07-24`,
`verified_by: "claude_web_verification_2026-07-24 (internal review: Yuanjun 2026-07-24)"`.

---

## A. Confirmed against primary / authoritative sources

| id | item | result | source (verified_on 2026-07-24) |
|---|---|---|---|
| A-1 | SSE Main Board 3.1.2 three standards | Verbatim confirmed (2亿/1亿/2亿 or 15亿; 50亿/6亿/2.5亿; 100亿/10亿); 孰低 basis; 预计市值 definition | sse.com.cn notice 2024-04-30 |
| A-2 | ChiNext 2.1.2 — NOW FOUR standards | 2024 values confirmed; 2026-04 revision ADDED Std 4 (30亿+2亿+CAGR30%, or 40亿+2亿+R&D 1亿 & 15%); Std 3 activated for unprofitable issuers 2025-06 | szse.cn 2026 rule PDF (W020260424688875101057) |
| A-3 | STAR 2.1.2 five standards + 2.1.4 WVR | Tiers 10/15/20/30/40亿 unchanged; WVR 100亿 / 50亿+5亿; 科创属性 2024 indicators confirmed | sse.com.cn STAR regulations page |
| A-4 | STAR 1+6 reform | CSRC 科创板意见 2025-06-18: 科创成长层 + Std-5 restart + AI/aerospace/low-altitude; 2026-06-17: AI large models + SSE 15-clause guideline; SII pilot | gov.cn content_7028573 |
| A-5 | BSE 2.1.2 structural + 2.1.3 four standards | Verbatim confirmed incl. NEEQ 12m, net assets 5000万, shareholders 200, float 25%/10%; rule renamed 2025 (试行 dropped) | bse.cn 200010908 / 200018002 / 200025608 |
| A-6 | HKEX GEM 11.12A two tests | Confirmed incl. official worked R&D-ratio example | en-rules.hkex.com.hk guide PDF 1.1A (202405) |
| A-7 | SGX 210(2) three criteria | S$10M (excl. non-recurrent items) effective 2025-10-29; S$150M; S$300M; 210(3)(b) deleted; watch-list abolished; 2026-05-15 amendment did not alter 210(2) values | rulebook.sgx.com/rulebook/210 (live = 15 May 2026 version) |
| A-8 | SGX Catalist | No quantitative admission criteria; sponsor regime | rulebook.sgx.com Catalist Rules |
| A-9 | HKEX initial public float regime (2025-08-04) | 8.08(1) tiers A/B/C; GEM 13.37B same; 8.08A free float; 8.09(1) HK$125M/45M; 300/100 shareholders; A+H 10%-or-HK$3bn | HKEX conclusions cp202412cc (2025-08-01) |
| A-10 | HKEX ongoing public float (2026-01-01) | 25% or Initial Prescribed Threshold; Alternative Threshold HK$1bn AND 10% after 125 trading days | HKEX conclusions cp202508cc (2025-12) |
| A-11 | CSRC issuance preconditions | 《首次公开发行股票注册管理办法》令205号 (2023-02-17) Arts.10-13 verbatim; old pre-registration measures REPEALED | gov.cn gongbao content_5750669 |

## B. Diffs affecting existing repo packs / prior draft

| id | item | result | type |
|---|---|---|---|
| D-1 | 18C free-float gate superseded | Former 18C/18A-specific free-float replaced by MB 8.08A from 2025-08-04; `hkex_ch18c.yaml` HK$600M gate re-anchored (value compatible, citation changed) | **diff — MODIFIED (Task A / commit 1)** |
| D-2 | Flat 25% float stale | Listings on/after 2025-08-04 use tiered 8.08(1); encoded `hkex_public_float.yaml` | diff |
| D-3 | 18C placing carve-out retained | 18C keeps ≥50% independent price-setting investors (18C.08/19C.09); exempt from new 40% placing rule — existing gate valid, provenance untouched | no-change note |
| D-4 | SGX profit basis narrowed | `pre_tax_profit_ex_nonrecurrent` field variant required (210(3)(c) applies to both (a) and (b)) | diff — field def |
| D-5 | SGX 210 amended 2026-05-15 | RESOLVED: live rulebook text = 15 May 2026 version; 210(2) values unchanged | resolved |
| D-6 | BSE rule renamed | Citation strings use 《北京证券交易所股票上市规则》 (no 试行) for post-2025 filings | diff — citation |
| D-7 | ChiNext Std 4 added (2026-04); Std 3 activated (2025-06) | `cn_chinext.yaml` encodes 4 standards + Std-3 industry-scope leaf | diff — new content |

## C. Professional QA pass (2026-07-24) — corrections applied in v0.3

| id | item | result |
|---|---|---|
| Q-1 | SGX Rule 210 full verbatim fetched | Tiered 210(1)(a) float table (25/20/15/12% by S$ mkt cap, 500 holders) + distribution table; 210(3)(a) same-business/same-management continuity limb ADDED; 210(3)(c) non-recurrent exclusion applies to BOTH (a) and (b); 210(4)(d) audit/going-concern hard gate ADDED; 210(5)(c) board-independence gate ADDED; 210(10) DCS note ADDED |
| Q-2 | SGX life-science & mineral routes corrected | Life-science working capital corrected 12 → 18 months (210(8)(e)); mineral/O&G limbs added: QP report ≤ 6 months (210(9)(b)), WC 18 months (210(9)(c)), independent industry director (210(9)(d)) |
| Q-3 | HK 18A rebuilt against official Ch.18A text | Added 18A.03(3) two-FY same-management limb; WC 125%/12m confirmed (18A.03(4)); sophisticated-investor timing (≥6m before, retained at IPO); ADDED 18A.07 gate (public-held ≥ HK$375M ex-cornerstones) — **FLAG:** confirm status vs the 2025-08-04 8.08A replacement of biotech-specific free-float |
| Q-4 | HK MB trading-record limb added | 8.05(1)(a) ≥ 3 FYs was missing from restated rows (added to `hkex_main_board.yaml`, HK-C-0); 8.05A/8.05B shorter-record exceptions out of scope |
| Q-5 | CN float terminology corrected | 沪深/科创/创业 25%/10% relabeled as 公开发行比例 (offering-size condition at IPO), distinct from HK-style ongoing public float |
| Q-6 | Red-chip pathways added | SSE MB 3.1.4/3.1.5, STAR 2.1.3 (+ fast-growth definition), ChiNext 2.1.3; STAR unlisted limbs web-verified; MB/ChiNext listed-red-chip limbs pending_text_check |
| Q-7 | STAR 科创属性 refinements | Software exemption: exempt from patent indicator (iii), R&D ratio ≥ 10% substitutes; exceptional-circumstances alternative leaf (指引 第二条) added |
| Q-8 | CSRC preconditions scope corrected | 令205号 applies to 沪深主板/科创板/创业板 only; BSE has separate issuance measures (CS-BJ-1/2, encoded in `cn_bse.yaml`) |
| Q-9 | BSE 孰低 basis noted on net-profit limbs | 净利润/ROE 以扣非前后孰低为计算依据 |

## D. O-1 transcription closure (2026-07-24) — v0.4

| id | item | result |
|---|---|---|
| Q-10 | ChiNext WVR profit limbs REMOVED | Official 2026 rule PDF 2.1.4 verbatim: 100亿, or 50亿+5亿营收 — NO net-profit limb. Secondary sources were wrong; the `pending_text_check` flag caught this before encode |
| Q-11 | ChiNext red-chip 2.1.3 verbatim | 100亿 / 50亿+5亿 confirmed; fast-growth definition has THREE limbs (5亿→CAGR10%; <5亿→CAGR20%; industry down-cycle → above comparable-company average); R&D-stage & national-strategy red-chips EXEMPT from fast-growth |
| Q-12 | ChiNext basis clause 2.1.5 confirmed | 净利润 扣非孰低; audited; 预计市值 = 发行后总股本 × 发行价格 — verbatim |
| Q-13 | BSE issuance measures transcribed | 《北交所注册管理办法》(2023修订): Art.9 NEEQ 12m; Art.10 four conditions incl. 3-FY no-false-records + unqualified opinions; Art.11 negative list |
| Q-14 | Pre-delivery consistency audit | Programmatic audit: row_id uniqueness OK; no dangling references; all encode-prompt citations resolve; all WV rows carry official URLs. Row-count restated as **189 limb rows + 13 section headers** (was conflated as 202). Final: 189 = 156 WV / 22 RV / 11 PT |

---

## Encode notes (this phase)

- **Roll-up model.** Each board's financial standards are one gate whose requirement is an
  `any_of` over standards (board = OR-of-standards); each standard is an `all_of` of its limbs;
  `or_group` limbs become a nested `any_of`. Structural / precondition / continuity limbs are
  their own gates. Purely qualitative standards (STAR Std 5, 科创属性 exceptional alternative,
  red-chip tech-leadership) are separate `requires_llm` gates rendering `NOT_EVALUATED`, kept out
  of the hard board gate.
- **pending_text_check discipline.** The 11 pending rows retain their provisional numbers but are
  authored `evaluated: false` + `needs_human_verify: true`, so they render `NOT_EVALUATED` and can
  never yield PASS/SHORTFALL (enforced by `test_multi_market.PendingNeverPassOrShortfall`).
- **DEFERRED_REVIEW leaves** carry `requires_llm: true`; no LLM is imported in the hard path
  (`test_no_llm_in_hard_path`, extended to every pack).
- **Computed fields (Task D)** are defined in `docs/INPUT_SCHEMA.sample.json` and implemented in
  `ai-module/compute_module.py` (`REGULATORY_COMPUTED_FIELDS`), one per rulebook definition, never
  aliased across markets, with strict null discipline. `pe_ratio_at_issue` is informational only —
  `test_pe_ratio_not_a_gate` asserts no gate references it.
- **Open items** (workbook sheet 6): SSE MB/STAR listed-red-chip verbatim; SSE 大模型指引; the
  18A.07-vs-8.08A interplay; the SGX 211A citation; plus the standing external professional review
  that will lift `human_signoff`.

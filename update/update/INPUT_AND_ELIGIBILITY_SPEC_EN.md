# ProspectAI — User Input & Multi-Market Eligibility Specification

**Document ID:** INPUT_AND_ELIGIBILITY_SPEC_EN **v1.0**
**Date:** 2026-07-24
**Status:** Internal team review of the threshold master completed 2026-07-24 (Yuanjun). Engine-level `human_signoff` remains **false** on every gate pending external professional (sponsor / capital markets lawyer) review — the workbook sign-off is internal only.
**Single source of truth for all numeric thresholds:** `INPUT_AND_ELIGIBILITY_MASTER_EN.xlsx` (v0.5), sheet `3_Thresholds_Master` (189 limb-level rows across 13 board sections: 156 web-verified against primary sources, 22 repo-verified, 11 pending_text_check). **This document is the narrative/design layer and deliberately does not duplicate limb-level values — duplication invites drift.** Where this spec and the workbook disagree, the workbook governs.
**Scope:** 11 boards across three markets — PRC A-shares (SSE Main Board, STAR, ChiNext, BSE), Hong Kong (Main Board incl. Ch. 8A/18A/18C, GEM), Singapore (SGX Mainboard, Catalist) — plus PRC red-chip pathways and CSRC/BSE issuance preconditions.
**Positioning (unchanged):** The system reconstructs issuer data into diagnostic structure and flags gaps / to-verify items; humans finalize. It never renders a listing verdict, never recommends a venue, and never auto-writes a prospectus. Output = per-gate status (`PASS / SHORTFALL / MISSING_INPUT / INDETERMINATE / NOT_EVALUATED`) + rule citation.

## Changelog v0.1 → v1.0 (all verified against primary sources; see workbook sheet 5 for the full log)

1. **ChiNext now has FOUR standards** (2026-04 revision added Std 4: 30亿+2亿+CAGR30%, or 40亿+2亿+3-yr R&D 1亿 & ≥15%); Std 3 (50亿+3亿) activated for unprofitable issuers in specified industries from 2025-06. ChiNext WVR standards have **no net-profit limb** (verbatim 2.1.4; a secondary-source error to the contrary was caught and removed — log Q-10).
2. **Red-chip pathways added** for SSE MB (3.1.4/3.1.5), STAR (2.1.3), ChiNext (2.1.3), incl. the three-limb "fast revenue growth" definition and the R&D-stage / national-strategy exemption. Critical for the project's likely user base.
3. **HKEX public float regime replaced** (effective 2025-08-04): MB 8.08(1) tiered initial float (25% / higher-of(HK$1.5bn,15%) / higher-of(HK$4.5bn,10%) by expected market value; >HK$45bn case-by-case), same tiers for GEM (13.37B); new 8.08A free-float requirement; **the former 18C/18A-specific free-float rules are superseded** — `hkex_ch18c.yaml`'s HK$600M gate must be re-anchored to 8.08A (value compatible, citation changes). Ongoing-float regime effective 2026-01-01.
4. **HK 18A rebuilt** against official chapter text: added 18A.03(3) two-FY same-management limb and the 18A.07 public-held ≥HK$375M (ex-cornerstone) gate; sophisticated-investor timing (≥6 months pre-listing, retained at IPO); WC 125%/12 months confirmed. 18A.07's status vs the 2025 free-float replacement is a flagged encode-time check.
5. **HK MB trading-record limb** (8.05(1)(a), 3 FYs) added — was missing from the restated rows.
6. **SGX corrected and completed**: profit test S$10M effective 2025-10-29 (excl. non-recurrent items per 210(3)(c), which applies to BOTH (a) and (b)); verbatim tiered 210(1)(a) float table (25/20/15/12% by S$ market cap, 500 holders) + distribution table; 210(3)(a) same-business/same-management 3-yr continuity limb; 210(4)(d) audit-opinion/going-concern hard gate; 210(5)(c) board-independence gate; **life-science working capital corrected 12 → 18 months** (210(8)(e)); mineral/O&G route limbs (QP report ≤6 months, WC 18 months, industry independent director); 210(10) DCS route note.
7. **CN terminology fix**: the 25%/10% condition on 沪深/科创/创业 boards is 公开发行比例 (an offering-size condition at IPO), not an HK-style ongoing public float — separate engine fields.
8. **CSRC scope corrected**: 《首次公开发行股票注册管理办法》(令205号) covers 沪深主板/科创板/创业板 only; BSE's own issuance measures (Art.9/10/11 incl. negative list) transcribed separately.
9. **STAR refinements**: 科创属性 software exemption applies to the patent indicator (R&D ratio ≥10% substitutes); exceptional-circumstances alternative leaf (指引 第二条); "1+6" reform recorded (科创成长层, Std-5 restart + expansion to AI/commercial aerospace/low-altitude economy; 2026-06 AI large models + SSE 15-clause guideline; senior professional institutional investor pilot).
10. **P/E confirmed as a non-gate everywhere** — informational pricing-context field only; must never appear in YAML gates.

## 1. Document upload inventory
Authoritative version: workbook sheet `1_Upload_Inventory` (12 universal documents U-01..U-12, 7 deal parameters D-01..D-07, 9 market-specific items). Design principles unchanged from v0.1: Tier-1 documents make the hard engine computable; deal parameters (offer price, share count, expected market cap, timetable, structure flags, FX convention) are decisions, exist in no document, and must be hard-entered; expected market cap = offer price × post-offering total shares in every market.

## 2. Field dictionary
Authoritative version: workbook sheet `2_Field_Dictionary`. The four definitional traps that must be encoded as distinct fields, never aliased:
- **CN net profit** = lower of before/after non-recurring items (扣非前后孰低), audited (SSE MB 3.1.2 note; ChiNext 2.1.5; BSE basis note) → `net_profit_regulatory_cn`, computed, never extracted.
- **SGX pre-tax profit** excludes non-recurrent/extraordinary items per 210(3)(c) for both profit tests → `pre_tax_profit_ex_nonrecurrent`.
- **R&D ratios have three incompatible definitions**: CN (R&D 投入 / revenue, 3-yr or 2-yr sums), HK/GEM (R&D expenditure / **total operating expenditure**, per-FY), 18C tiers — one computed field per rulebook definition.
- **CN 公开发行比例** vs **HK public float / free float** vs **SGX public-hands %** are three different fields with different numerators, denominators and timing.

## 3. Judgment criteria
Authoritative version: workbook sheet `3_Thresholds_Master` — one row per limb with operator, value, currency, OR-group, rule citation, official URL, effective date, and verification status. Board result = at least one standard with all limbs PASS; OR-group limbs require one of the group; deferred leaves render `NOT_EVALUATED`. Cross-currency comparison without a resolved FX context returns `INDETERMINATE`; the engine never converts silently.

## 4. Input mode design — Mode B (hybrid), adopted
Documents are AI-parsed for historical audited facts (page-anchored, confidence-scored); a form hard-collects deal parameters; every AI-extracted value feeding a hard gate requires one-click human confirmation (`extracted → confirmed → resolved`); unconfirmed inputs render `MISSING_INPUT (pending confirmation)`, never a provisional PASS/SHORTFALL. Rationale (deal parameters exist in no document; extraction confidence ≠ regulatory confidence; provenance chain for professional-facing output; definitional traps need deterministic computation) — full matrix in workbook sheet `4_Input_Mode_Matrix`.

## 5. Engineering
Superseded by the separate encode instruction: `CC_ENCODE_PROMPT_EN.md` (kept separate from the data per the team's prompt-sequencing discipline).

## 6. Open items
Workbook sheet `6_Open_Items` governs. Post-review remainder: 4 narrow transcription items (SSE MB/STAR listed-red-chip verbatim; SSE 大模型指引; 18A.07 vs 8.08A interplay; SGX 211A citation), plus the standing items — 30% concentration practitioner input, external professional review (gates `human_signoff`), CSRC overseas-filing stub build-out.

— End v1.0 —

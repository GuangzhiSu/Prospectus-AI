# Prompt Refinement Summary

This document summarizes the prompt refinements applied to the Prospectus AI project using the requirements from **cursor_hkex_prompt_pack**. The goal was to align Agent1, Agent2, and all section requirements with HKEX sponsor-counsel drafting standards: compliance language, disclosure defensibility, and verifiability.

---

## Source of Requirements

Refinements were driven by:

- **`cursor_hkex_prompt_pack/.cursor/rules/00-hkex-prospectus-core.mdc`** — Core drafting constraints, primary objectives, AI tag schema, regime-sensitive logic, and prompt structure (Role, Objective, Inputs, Non-negotiables, etc.).
- **`cursor_hkex_prompt_pack/.cursor/rules/10-hkex-section-requirements.mdc`** — Detailed section-by-section requirements for each prospectus section.
- **`cursor_hkex_prompt_pack/.cursor/rules/20-hkex-validator.mdc`** — Validation philosophy, severity scale, and banned/controlled language (referenced for tone and constraints).
- **`cursor_hkex_prompt_pack/docs/hkex_prompt_reference.md`** — Condensed reference for prompt design and tag usage.

---

## 1. Agent1 Refinements

**File:** `agent1.py`  
**Function:** `summarize_table_with_qwen()`

### What Changed

| Aspect | Before | After |
|--------|--------|--------|
| **Purpose** | Generic “summarize in 2–4 sentences” | Explicit: RAG-ready summary for HKEX prospectus drafting |
| **Objective** | Implicit | Stated: produce a summary that helps section-writers find relevant evidence |
| **Content focus** | “Key metrics, structure, and data scope” | (1) Key metrics, dates, figures; (2) table structure and meaning of rows/columns; (3) data scope and time period; (4) explicit note if sheet is definitions, lists, timelines, or financial data |
| **Constraints** | “Factual and concise” | Factual, neutral, verifiable; do not interpret, infer, or add information not in the excerpt |

### Rationale

- Aligns Agent1 output with sponsor-counsel use: summaries should support retrieval and verification, not interpretation.
- Reduces risk of the model “filling in” or over-interpreting table content.

---

## 2. Agent2 Global Prompt Refinements

**File:** `agent2.py`  
**Elements:** `HKEX_FORMAT_INSTRUCTION` and `build_prompt()`

### 2.1 `HKEX_FORMAT_INSTRUCTION`

| Addition | Description |
|----------|-------------|
| **Primary objective** | Optimise for (1) compliance language, (2) disclosure defensibility, (3) verifiability under sponsor due-diligence standards. Preserve defensibility over elegance; do not convert possibility into certainty; do not smooth away legal or factual caveats. |
| **Uncontrolled language** | Treat uncontrolled language as a major defect. |
| **Evidence rule** | Do not invent sources, thresholds, definitions, or evidence. |
| **New AI tag** | `[[AI:LOCKED|...]]` — for text that must not be changed without counsel sign-off (per pack tag schema). |
| **Regime-sensitive logic** | If the issuer has WVR, Chapter 18C / Specialist Technology, Pre-Commercial status, internet information services or personal data processing, or VIE/contractual arrangements, follow section requirements for tailored disclosure logic. |
| **Cross-reference and evidence** | Require cross-reference discipline and evidence hooks for claims needing verification. |

### 2.2 `build_prompt()`

| Addition | Description |
|----------|-------------|
| **Role** | Explicit: “You are drafting one prospectus section for a Hong Kong Stock Exchange (HKEX) listing in sponsor-counsel working draft mode.” |
| **Objective** | Produce a conservative, verification-aware working draft; prospectus-ready prose where evidence exists, placeholders and AI tags where support is missing. |
| **Document consistency** | Headings, contents entries, and cross-references must match exactly across the document. |
| **Escalation** | Where human review is needed, state so and add `[[AI:VERIFY|...]]`. Materiality or legal sufficiency judgments must be escalated to sponsor-counsel review. |

---

## 3. Section Requirements Refinements

**File:** `agent2_section_requirements.json`

Each section’s `requirements` text was updated to align with **10-hkex-section-requirements.mdc**. Below is a concise summary by section.

| Section | Main refinements |
|---------|------------------|
| **Expected Timetable** | Exact dates and local times; precision, not marketing tone; cross-references to Structure of the Global Offering and application procedures (How to Apply); severe weather / extreme conditions arrangements. |
| **Contents** | Exact heading list in final order; page mapping; no missing headings; no orphan sections referenced elsewhere but absent here. |
| **Summary** | High-level overview only; balanced factual tone; every numeric claim reconciled to Business or Financial Information; every market claim tagged with `[[AI:CITE|...]]` or omitted; no new risk themes absent from Risk Factors. |
| **Definitions** | Dictionary-style output; exact wording consistency with document-wide usage; remove unnecessary defined terms; jurisdiction definitions used consistently. |
| **Glossary of Technical Terms** | Plain-language explanations; consistency with Business and Regulatory Overview; special cross-reference handling for risk-sensitive terms (e.g. data, privacy, cybersecurity, model training, internet information services). |
| **Forward-Looking Statements** | Legal cautionary tone; examples of forward-looking language; actual results may differ materially; no obligation to update except as required by law; **explicit warning** not to embed unqualified future language elsewhere in the document. |
| **Risk Factors** | Applicant-specific risks; one principal risk per heading; how the risk harms issuer or investors; quantification where possible or explicit statement when not; no mitigation inside the same risk narrative; **grouping by risk type only after** individual risk specificity is preserved. |
| **Waivers and Exemptions** | Per-waiver structure: rule → normal requirement → issuer-specific reason → waiver granted → conditions → investor relevance → **documentary verification hook**. |
| **Information about this Prospectus and the Global Offering** | Reliance-only-on-this-prospectus; no-authorised-other-information; territorial restrictions; currency conversion note where relevant; **no hidden profit-forecast implications**; website-not-part where appropriate. |
| **Directors and Parties** | Exact names and roles; directory style, not narrative; consistency with Underwriting and appendices; **evidence references** to engagement letters or official appointment records. |
| **Corporate Information** | Jurisdiction, registered office, principal place of business; website handling; company secretary / authorised representatives / registrar / stock code as applicable; **evidence hooks** for incorporation and appointment records. |
| **Regulation (Regulatory Overview)** | Laws, licences, approvals, restrictions, compliance status by topic; **data privacy and cybersecurity logic**, **personal-data lifecycle controls**, **material incidents** where relevant; cross-references to Business and Risk Factors. |
| **Industry Overview** | Objective market background only; **clear third-party attribution** for market size, growth, rank, share, forecasts; **defined scope, metric, date, and period** for each sourced statistic; no company promotion disguised as industry analysis. |
| **History, Reorganization, and Corporate Structure** | Chronological history; IPO reorganisation steps; **clean chain-of-title logic**; entity and ownership consistency with Share Capital and Substantial Shareholders; diagram references where relevant. |
| **Business** | Business overview; products/services; business model and monetisation; operations, supply chain, R&D, technology, sales and marketing; IP, properties, employees, compliance, incidents where relevant; **if Pre-Commercial**: explicit support for credible path to commercialisation; **if internet/data-heavy**: operational data-flow disclosure and related controls. |
| **Contractual Arrangements / VIE** | Regulatory reason for the structure; parties and key contracts; control and economic benefit; **enforceability and loss-of-control risks**; consistency with Regulatory Overview and Risk Factors. |
| **Relationship with Controlling Shareholders** | Ownership and influence; independence safeguards; non-competition or conflict-management where applicable; **WVR influence discussion** where relevant. |
| **Connected Transactions** | Identification of connected persons; nature and terms; historical amounts; annual caps; waivers/exemptions; internal controls and monitoring; **cross-check with Financial Information for hidden dependence**. |
| **Directors and Senior Management** | Factual biographies only; roles, experience, qualifications, major prior positions; no hype; **evidence support for awards or qualifications** if mentioned. |
| **Substantial Shareholders** | **LPD-based** shareholding tables; pre- and post-offering positions where relevant; ownership chain transparency; reconciliation with Share Capital. |
| **Share Capital** | Classes of shares; pre- and post-offering capital structure; capitalisation issue; overallotment logic; WVR conversion and cessation logic if applicable; **math reconciliation across the document**. |
| **Financial Information** | **Historical analysis only** unless a formal forecast workflow is engaged; drivers of performance and period-on-period changes; liquidity, capital resources, working capital, debt, accounting judgments; reconciliations for non-IFRS measures; **if Pre-Commercial**: working capital coverage logic. |
| **Future Plans and Use of Proceeds** | Allocation by category; consistency with strategy and business model; **no implied profitability timetable**; **if Pre-Commercial**: alignment with commercialisation path and runway logic. |
| **Underwriting** | Underwriter identities and roles; underwriting commitments; pricing agreement mechanics; **fees and expenses** where available; **lock-ups**; **conditions precedent**; **termination grounds**; **overallotment and stabilisation arrangements**. |
| **Structure of the Global Offering** | Total offering size; HK/international tranche split; reallocation or clawback logic; price-setting logic; completion conditions and refund logic; settlement and trading mechanics; **reciprocal cross-references to application procedures (How to Apply)**. |

---

## 4. Files Modified

| File | Scope of changes |
|------|------------------|
| `agent1.py` | Single prompt in `summarize_table_with_qwen()`. |
| `agent2.py` | `HKEX_FORMAT_INSTRUCTION` and `build_prompt()` (role, objective, consistency, escalation). |
| `agent2_section_requirements.json` | All 24 section entries: role, structure, and controls updated to match the pack. |

No changes were made to:

- `prospectus_graph/` (graph, state, config, retrievers, verifier)
- Web app or API routes
- `llm_qwen.py` or run scripts

---

## 5. Design Principles Applied

1. **Compliance, defensibility, verifiability** — Prompts prioritise these over brevity or style.
2. **Explicit constraints** — “Do not invent”, “use only provided context”, and evidence hooks are stated clearly.
3. **AI tag schema** — `[[AI:LOCKED]]`, `[[AI:VERIFY]]`, `[[AI:CITE]]`, `[[AI:XREF]]`, `[[AI:LPD]]` used consistently as in the pack.
4. **Regime-sensitive disclosure** — WVR, 18C, Pre-Commercial, internet/data, VIE called out where section logic applies.
5. **Escalation** — Materiality and legal sufficiency are for sponsor-counsel review; prompts ask for `[[AI:VERIFY|...]]` instead of the model deciding.
6. **Cross-reference discipline** — Headings, contents, and cross-references must align across the document; section requirements specify when to add `[[AI:XREF|to=...]]`.

---

## 6. Suggested Next Steps

- **Test** — Run Agent1 on sample Excel files and Agent2 for a few sections (e.g. Summary, Risk Factors, Business) and review output against the new requirements.
- **Validator** — Optionally run the pack’s validator rule (`20-hkex-validator.mdc`) over generated drafts to check for banned language, missing citations, and cross-reference issues.
- **Cover / How to Apply** — The pack also describes **Cover / inside front cover** (disclaimers, WVR/18C/Pre-Commercial warnings) and **How to Apply for Hong Kong Offer Shares**. If those sections are added to the pipeline later, their requirements can be taken from `10-hkex-section-requirements.mdc` and added to `agent2_section_requirements.json` and `prospectus_graph/config.py`.

---

*Summary produced from refinements applied using cursor_hkex_prompt_pack. Last updated: March 2025.*

# Section-specific rules (front-loaded for generation)

These rules apply **before** narrative drafting. The model must not violate them; gaps → `DATA_MISSING` or `COUNSEL_INPUT_REQUIRED`, not invented prose.

## Risk Factors
- No mitigation language **inside** the same risk narrative; use `[[AI:XREF|to=Business]]` / `[[AI:XREF|to=Regulation]]` for mitigation elsewhere.

## Forward-Looking Statements
- No specific profit, margin, or dated profitability outlook; generic safe-harbour only unless a formal profit-forecast process applies.

## Contents
- Must support **page numbers** and **appendices** entries; if pagination unknown, mark `DATA_MISSING` per line — do not fabricate page numbers.

## Expected Timetable
- Must include **severe weather / extreme conditions** arrangements if applicable; **cross-reference** Summary-only where required by practice; link to **How to Apply** and **Structure of the Global Offering** when timing depends on offering mechanics.

## Definitions
- **Alphabetical** ordering of defined terms; terms must match usage across the document.

## Glossary of Technical Terms
- **Request for Elaboration (RfE)** style for technical terms only; no duplicate legal definitions from Definitions.

## Future Plans and Use of Proceeds
- Allocation percentages must **sum to 100%** where percentages are used; otherwise flag `COUNSEL_INPUT_REQUIRED`.

## Structure of the Global Offering
- Must **interlock** with **How to Apply** and **Underwriting** (cross-references, consistent mechanics naming).

## Waivers
- **WVR** warning text must follow locked counsel blocks when `is_wr` in issuer metadata.

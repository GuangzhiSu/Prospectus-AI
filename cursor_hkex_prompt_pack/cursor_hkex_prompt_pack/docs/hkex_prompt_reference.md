# Condensed Reference: HKEX Technology-Sector IPO Prospectus Prompt Engineering

This is a distilled, Cursor-friendly reference built from the source framework.

## 1. Core thesis
The drafting system should be optimized from a **sponsor-counsel** perspective, not a generic writing-assistant perspective.

That means every prompt should balance:
- compliance language
- disclosure defensibility
- verifiability

## 2. The main drafting architecture
The source framework treats the following as the most load-bearing disclosure structure:

1. cover / inside-cover disclaimers and special warnings
2. standalone Forward-Looking Statements section
3. Risk Factors section designed to stand on its own and cross-refer elsewhere

This architecture should be preserved in system prompts, section prompts, and validators.

## 3. What usually causes HKEX review friction
The source framework highlights these recurrent failure modes:
- absolute or superlative wording
- promotional tone
- unqualified forward-looking language
- unverifiable market-leadership claims
- weak source trails
- inconsistent cross-references
- numbers that can imply a profit forecast

## 4. Prompt-design principle
Do not merely tell the model to "write well."

Prompt the model to:
- write neutrally
- scope claims precisely
- attach evidence hooks
- force cross-reference discipline
- distinguish automated checks from human legal judgment

## 5. Recommended AI tag system
Use a consistent machine-readable tag set:

- `[[AI:LOCKED|...]]`
- `[[AI:VERIFY|...]]`
- `[[AI:CITE|source=...; scope=...; date=...]]`
- `[[AI:XREF|to=...]]`
- `[[AI:LPD|refresh=...]]`

These tags convert a prose drafting guide into something that is operational for prompt engineering, review, and verification planning.

## 6. Section-level logic that should be hard-wired
The source framework repeatedly treats the following sections as needing explicit prompt rules:

- Cover / Inside Front Cover
- Expected Timetable
- Contents
- Summary
- Definitions
- Glossary of Technical Terms
- Forward-Looking Statements
- Risk Factors
- Waivers and Exemptions
- Information about this Prospectus and the Global Offering
- Directors and Parties Involved in the Global Offering
- Corporate Information
- Regulatory Overview
- Industry Overview
- History / Reorganization / Corporate Structure
- Business
- Contractual Arrangements / VIE
- Relationship with Controlling Shareholders
- Connected Transactions
- Directors and Senior Management
- Substantial Shareholders
- Share Capital
- Financial Information
- Future Plans and Use of Proceeds
- Underwriting
- Structure of the Global Offering
- How to Apply for Hong Kong Offer Shares

## 7. Regime-specific disclosure logic that must not be generic
Prompt logic must branch explicitly if the issuer is:
- a WVR issuer
- a Chapter 18C Specialist Technology Company
- a Pre-Commercial company
- an issuer handling internet information services or personal data at scale
- an issuer using a VIE / contractual arrangement structure

## 8. Validation design
The framework is very clear that a good drafting system needs a separate validation layer.

The validation layer should check:
- required warnings
- section completeness
- forward-looking language control
- implicit profit-forecast risk
- source completeness for rankings and market data
- risk-factor structure
- data-security disclosure completeness
- cross-reference integrity
- LPD refresh items

## 9. Severity model
Use four levels:
- Blocker
- High
- Medium
- Low

The validator should not just say something is wrong. It should say:
- why it matters
- where it appears
- how to fix it
- whether human sponsor-counsel review is needed

## 10. How to split prompts for better maintainability
Do not keep everything inside one giant prompt.

Use separate prompt modules:

### A. Core system prompt
Always-on rules, tone, scope, and escalation logic.

### B. Section writer prompts
Per-section instructions, required inclusions, banned patterns, cross-references.

### C. Validation prompt
Linting and severity-based review.

### D. Optional evidence / verification prompt
Checks `[[AI:VERIFY]]`, `[[AI:CITE]]`, `[[AI:LPD]]`, and unresolved cross-references.

## 11. Best prompt-refinement goal for Cursor
When asking Cursor to improve a prompt, ask it to do all of the following at once:
- reduce verbosity
- preserve legal safeguards
- expose hidden assumptions
- modularize reusable logic
- separate drafting from validation
- identify what must be escalated to human review

## 12. Good final deliverables for a prompt repo
A clean repo structure usually looks like this:

```text
.cursor/
  rules/
    00-core.mdc
    10-sections.mdc
    20-validator.mdc
prompts/
  system_prompt.md
  section_writer.md
  validator.md
docs/
  prompt_reference.md
```

## 13. Final practical takeaway
The source framework is strongest when treated not as a memo to read once, but as a **constraint system**.

That is the key conversion:
- from explanatory prose
- into reusable rules, tags, section logic, and validator logic

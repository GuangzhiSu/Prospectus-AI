# Prompt Refinement Workflows for Cursor

Use these directly in Cursor chat after attaching your existing prompt file.

---

## 1. Refactor a monolithic prompt into modules

```text
Refactor the attached prompt into a modular prompt system for HKEX technology-sector IPO prospectus drafting.

Requirements:
- Preserve all compliance, defensibility, and verifiability safeguards.
- Split the logic into:
  1. core system prompt
  2. section-writer prompt
  3. validator prompt
  4. optional evidence / verification prompt
- Remove redundancy and token bloat.
- Keep sponsor-counsel priorities explicit.
- Do not weaken constraints around forward-looking statements, market-leadership claims, or implicit profit forecasts.
- Surface any places where the current prompt silently assumes legal judgment.

Output format:
1. brief diagnosis of the current prompt
2. proposed module structure
3. rewritten prompts in full
4. risks or open issues requiring human review
```

---

## 2. Compress without losing legal safeguards

```text
Rewrite the attached prompt to make it shorter and cleaner without losing any legally important constraints.

Requirements:
- Preserve all mandatory warnings, validation logic, and escalation rules.
- Convert vague instructions into testable instructions.
- Keep AI tag logic where useful: [[AI:LOCKED]], [[AI:VERIFY]], [[AI:CITE]], [[AI:XREF]], [[AI:LPD]].
- Remove repetition, filler, and duplicative wording.
- Do not make the prompt more permissive.

Return:
1. the compressed prompt
2. a bullet list of what was removed or merged
3. any items you refused to compress because they are load-bearing
```

---

## 3. Turn prose guidance into a validator

```text
Convert the attached drafting guidance into a validator prompt.

Requirements:
- Build a severity-based linting system with Blocker / High / Medium / Low.
- Check for missing warnings, uncontrolled forward-looking language, implicit profit-forecast risk, unsupported rankings or market-share claims, weak risk-factor structure, and broken cross-references.
- Distinguish between issues that can be fixed automatically and issues that require sponsor-counsel review.
- Suggest exact rewrite actions.

Return:
1. validator prompt in full
2. issue taxonomy
3. recommended output schema for validator responses
```

---

## 4. Build a section-writer prompt library

```text
Using the attached material, create a reusable section-writer prompt library for HKEX technology-sector IPO prospectus drafting.

Requirements:
- Create a separate prompt block for each major section.
- For each section include:
  - objective
  - must include
  - must avoid
  - cross-references required
  - verification hooks
  - regime-specific branching logic if relevant
- Keep style factual, neutral, and sponsor-counsel oriented.

Return the library in markdown with one section per heading.
```

---

## 5. Find contradictions and hidden assumptions

```text
Audit the attached prompt for contradictions, ambiguities, and hidden assumptions.

Focus on:
- places where the prompt asks for both brevity and exhaustive legal coverage without prioritization
- places where legal judgment is treated as if it were automatable
- undefined terms such as material, leading, significant, credible, or complete
- places where cross-references or evidence requirements are implied but not operationalized
- instructions that could accidentally permit promotional language or implicit profit forecasts

Return:
1. contradictions
2. ambiguities
3. hidden assumptions
4. exact redline-style fixes
```

---

## 6. Rewrite for lower hallucination risk

```text
Rewrite the attached prompt to reduce hallucination risk.

Requirements:
- Make all required inputs explicit.
- Require the model to distinguish sourced facts, user-provided facts, and unresolved placeholders.
- Add escalation logic for missing evidence, materiality judgments, or unclear legal interpretation.
- Prevent the model from inventing rankings, dates, citations, rule text, or evidence.
- Preserve drafting quality while making uncertainty visible.

Return:
1. rewritten prompt
2. hallucination-risk controls added
3. remaining residual risks
```

---

## 7. Turn the framework into JSON-ready prompt specs

```text
Convert the attached prompt into a structured specification that can later be turned into code.

Use this schema:
- name
- role
- objective
- inputs
- non_negotiables
- process_steps
- banned_patterns
- required_tags
- output_format
- validation_checks
- escalation_conditions

Requirements:
- Do not lose legal or compliance nuance.
- Represent section-specific branching cleanly.
- Preserve severity logic for validation.

Return valid markdown first, then a JSON version.
```

---

## 8. Minimal patch mode

```text
Do not rewrite the entire attached prompt.
Only patch the weakest parts.

Tasks:
- identify the 10 most important defects
- rank them by risk
- propose the smallest possible text edits to fix them
- preserve the rest of the prompt unchanged

Return:
1. ranked defect list
2. minimal patch set
3. revised prompt with only necessary edits
```

---

## 9. Best single-shot instruction for Cursor

```text
You are refining a prompt system for HKEX technology-sector IPO prospectus drafting from a sponsor-counsel perspective.

Your job is to improve structure, reduce ambiguity, and strengthen validation without weakening legal safeguards.

Prioritize:
1. compliance language
2. disclosure defensibility
3. verifiability
4. cross-reference integrity
5. clear escalation to human review when legal judgment is required

Do not allow:
- promotional wording
- unsupported leadership claims
- unqualified forward-looking language
- implicit profit forecasts
- hidden assumptions about evidence or materiality

Refactor the attached prompt accordingly and explain every meaningful change.
```

# Cursor Prompt Pack for HKEX Technology-Sector IPO Prospectus Drafting

This pack converts the source framework into a repo-friendly format for Cursor.

## What is included

- `.cursor/rules/00-hkex-prospectus-core.mdc`
  - Always-on core rule.
  - Keeps Cursor aligned with sponsor-counsel priorities: compliance language, disclosure defensibility, and verifiability.
- `.cursor/rules/10-hkex-section-requirements.mdc`
  - Detailed section-by-section drafting requirements.
  - Keep this as a reference rule; do not make it always-on unless you really want maximum constraint.
- `.cursor/rules/20-hkex-validator.mdc`
  - Validation and linting logic.
  - Best used when Cursor is reviewing, critiquing, or rewriting prompts.
- `docs/hkex_prompt_reference.md`
  - Human-readable condensed reference.
- `prompts/prompt-refinement-workflows.md`
  - Ready-to-paste prompts for asking Cursor to refine your system prompts, section prompts, and validator prompts.

## Suggested usage

### Option A: Lightweight setup
Use only the always-on core rule:

- copy `.cursor/rules/00-hkex-prospectus-core.mdc` into your repo
- keep the other files for manual reference

This is best when you want Cursor to stay aligned without consuming too much context.

### Option B: Full prompt-engineering setup
Copy the entire `.cursor/rules/` folder into your repo.

Use this when you want Cursor to actively help rewrite or lint prompt files.

### Option C: Manual context injection
Do not install the rules. Instead:

- open `docs/hkex_prompt_reference.md`
- paste one of the tasks from `prompts/prompt-refinement-workflows.md`
- attach your existing prompt file and ask Cursor to refactor it

This is best if you want one-off help rather than persistent behavior.

## Recommended workflow for prompt refinement

1. Put your current prompt draft in a file such as `prompts/system_prompt.md`.
2. Ask Cursor to refactor it using one of the prompts from `prompts/prompt-refinement-workflows.md`.
3. Require Cursor to preserve legal/compliance constraints while reducing verbosity and ambiguity.
4. Run the validator rule against the rewritten prompt.
5. Review any items that require sponsor-counsel judgment rather than automatic decisions.

## Design choices used in this pack

This pack intentionally separates:

- **core behavior**: always on
- **section-specific drafting detail**: reference / on demand
- **validation logic**: review / lint mode

That separation keeps the always-on rule compact and avoids unnecessary context bloat.

## Important note

This pack is for **prompt engineering and drafting control**, not for making final legal judgments. If a point depends on materiality, issuer-specific facts, or formal rule interpretation, Cursor should surface it for human review instead of deciding it unilaterally.

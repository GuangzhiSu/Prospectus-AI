# `eligibility/` — listing-eligibility diagnostic

A **diagnostic** tool, not an adjudicator. For each listing pathway it reports
which quantitative criteria are **met / fall short / lack inputs / cannot be
determined**, each tied to a cited rule reference. It **never** decides whether
an issuer can or cannot list and renders **no verdict or recommendation**.

It is a standalone deterministic engine, sibling to `compute_module.py`: it
reads a v3 issuer-input JSON (e.g. `data/sensetime.json`) and writes a report.
It does not modify the input and is not part of the Agent1 / Agent2 generation
path.

## Two physically separated engines

| | Hard engine (`engine.py`) | Soft engine (`soft.py`) |
|---|---|---|
| Decides | quantitative thresholds (profit, revenue, market cap, WVR economic interest, …) | qualitative conditions (suitability, customer/supplier concentration, independence, continuity) |
| Implementation | pure deterministic Python | typed interface + **stubs only** this phase |
| Calls an LLM | **never** | will, once wired; currently returns `NOT_EVALUATED` |

The hard engine never imports the soft engine, and `import eligibility` /
`import eligibility.engine` pull in no LLM or inference library. This is enforced
by `tests/test_no_llm_in_hard_path.py`.

## Statuses

| Status | Meaning |
|---|---|
| `PASS` | converted value present and meets the threshold |
| `SHORTFALL` | converted value present but below the threshold |
| `MISSING_INPUT` | the value itself is null / absent / not resolved upstream |
| `INDETERMINATE` | value present but cannot be compared because the currency conversion is missing |
| `NOT_EVALUATED` | rule authored but intentionally not evaluated this phase (e.g. Chapter 18C) |

`MISSING_INPUT` and `INDETERMINATE` are deliberately distinct: a null field is
not the same as a field that exists but cannot yet be compared. The engine never
fabricates a value and never performs a financial computation — aggregates (e.g.
three-year cash flow) must already exist as resolved fields in the input; if they
do not, the check is `MISSING_INPUT`.

## Rules

Thresholds live in versioned YAML under `rules/`. Each numeric check carries two
independent flags — `threshold_verified` (value checked against the rulebook)
and `effective_from_verified` (date checked) — plus per-check
`verified_against` / `verified_on` / `verified_by` provenance. Every gate also
carries `human_signoff`. **`threshold_verified` is not human sign-off**: it means
"checked against the primary rulebook", never "approved by a qualified human for
client use" (`human_signoff`, which stays `false` on every gate this phase).
24 numeric thresholds were rulebook-checked on 2026-06-29 — Main Board (8.05 ×9 +
the 8.05(2)/(3) management- and ownership-continuity limbs), Chapter 8A (8A.06 ×3
+ the 8A.12 ≥10% economic-interest floor), and Chapter 18C (9, including the
18C.04 R&D period and tiered expenditure-ratio gates); everything else remains
`threshold_verified: false`. See the verification log in
`docs/ELIGIBILITY_MODULE.md`.

A check reads its value from the issuer JSON (`input_path`) or from the
CompanyProfile (`profile_field`, e.g. `management_continuity_years`,
`ownership_continuity_recent_audited_fy`); a null profile field is
`MISSING_INPUT`. The management/ownership-continuity limbs are bright-line HARD
gates (PASS/SHORTFALL/MISSING_INPUT) — they are NOT soft signals.

| File | Scope | Status |
|---|---|---|
| `hkex_main_board.yaml` | Main Board Rule 8.05(1)/(2)/(3) | evaluated, in regression baseline |
| `hkex_ch8a_wvr.yaml` | Chapter 8A weighted voting rights (quantitative subset) | evaluated, in regression baseline |
| `hkex_ch18c.yaml` | Chapter 18C specialist technology | complete but `evaluated: false`, no fixture this phase |
| `hkex_ch18a.yaml` | Chapter 18A biotech | structured stub, `evaluated: false` |
| `csrc_overseas_filing.yaml` | CSRC overseas listing filing | structured stub, `evaluated: false` |
| `qualitative_substance.yaml` | Substantive signal gates (`layer: soft`) | soft layer, `requires_llm`, `evaluated: false` |

### Soft layer (`layer: soft`)

`qualitative_substance.yaml` holds substantive listing gates that are **signals,
not bright-line tests** — customer / supplier concentration, connected-party
independence, competing business, internal-control integrity, equity / WVR /
pre-IPO clarity. Each carries a `trigger_signal`, `severity`, `substantive_concern`,
`rule_ref` + `guidance_ref`, and two provenance flags: `provenance_verified` (the
rule / guidance anchor was checked) and `signal_level_verified` (the trigger level
is a rule, vs a heuristic probe like the 30% concentration level). These are
loaded only via `load_soft_layer()` and surfaced through the soft engine as
flagged `NOT_EVALUATED` findings with severity and provenance — **never a
verdict**; the hard `load_all()` and hard engine never touch them. The signal
probe against issuer data is deferred to when the LLM + retrieval backend is
wired.

Rule 8.04 **suitability** is handled two ways: (1) a `shell_company_pattern` leaf
signal (GL68-13A multi-factor "Target Company" pattern — `requires_llm`,
`evaluated: false`); and (2) a derived **suitability synthesis** in the report
(`suitability_synthesis`) that rolls up the severities of the *triggered*
substantive signals into a `concern_level` (none / elevated / high) — no
independent trigger, no verdict. With signals not evaluated this phase the level
is `not_assessed`.

## Run

```bash
python -m eligibility --in data/sensetime.json \
  --profile profile.json \
  --out eligibility/outputs/report.json \
  --audit eligibility/outputs/audit.json
```

The **run profile** (`--profile`) supplies, as explicit inputs:

```json
{
  "path_vars": {"latest_audited_fy": "FY2020", "prior_fy_1": "FY2019", "prior_fy_2": "FY2018"},
  "fx_rate_to_hkd": {"value": 1.18, "from_currency": "RMB", "as_of_date": "2020-12-31", "source_ref": "..."},
  "intended_application_date": null,
  "expected_listing_date": null
}
```

* `path_vars` tell the rules which period is the latest audited financial year,
  etc., so the rule files stay issuer-agnostic. The engine never guesses the
  latest year.
* `fx_rate_to_hkd` is **never hardcoded**. With it absent, any HK$ gate that
  needs a non-HKD value converted returns `INDETERMINATE`. Expected market cap is
  forward-looking and usually null pre-IPO, so market-cap gates are commonly
  `MISSING_INPUT`/`INDETERMINATE` — that is correct behaviour, not a bug.
* `intended_application_date` / `expected_listing_date` (CompanyProfile dates,
  both nullable) drive **conditional-override thresholds**. The Chapter 18C 2024
  temporary market-cap reduction (commercial 6,000M→4,000M, pre-commercial
  10,000M→8,000M) applies only when both dates fall in the window
  (`intended_application_date ≤ 2027-08-31` and `expected_listing_date ≥
  2024-09-01`). If either date is null the affected market-cap gate is
  `INDETERMINATE` (the engine cannot choose base vs reduced).

The Chapter 18C **R&D expenditure-ratio** gate (Rule 18C.04(2)/(3)) uses a
read-only tiered operator: the tier (15% commercial / 30% / 50% pre-commercial by
revenue band) is selected from `company_type` (profile) and revenue, and the pass
condition is the application-period rule — the tier met for ≥2 of 3 years **and**
on aggregate. The per-year ratios (`rd_ratio_by_year[]`) and `rd_ratio_3y_aggregate`
are resolved inputs; eligibility never computes them. Absent → `MISSING_INPUT`;
present but failing the 2-of-3 / aggregate test → `SHORTFALL`.

**Qualitative gates** carry `requires_llm: true` (Chapter 18C operating history,
Independent Price Setting Investors, Sophisticated Independent Investors). The
hard engine never evaluates these — it routes them to the soft engine
(`NOT_EVALUATED`). A `pending_consultation` marker on a ruleset records a
proposed-but-not-yet-effective change (e.g. the 2026 WVR market-cap review);
current thresholds stay active.

## Data separation

Generated reports and audits go to `eligibility/outputs/`, which is gitignored
(only `.gitkeep` is tracked). Committed tests use `tests/fixtures/synthetic_issuer.json`,
hand-authored with **no real-company data**. Any run over a real issuer input
stays local; nothing under `outputs/` is committed.

## Tests

```bash
python -m unittest discover -s eligibility/tests -p 'test_*.py'
```

The synthetic fixture exercises all four statuses, including one revenue check
that flips from `INDETERMINATE` to `PASS` once an FX rate is supplied.

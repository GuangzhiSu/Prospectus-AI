# Core extraction rules (eligibility — standalone copy)

These rules govern information extraction for listing-eligibility diagnosis.
They mirror the prospectus drafting extraction discipline but do not import
ai-module prompts.

1. **No invention.** Extract only what is explicitly present in the source text.
   If a field is absent, set `value` to null and give a `null_reason`.
2. **Preserve numbers and units.** Do not convert currencies or rescale units
   unless the source already states the conversion. Keep the original unit string.
3. **Provenance.** For every non-null value, include a short `span_preview`
   (≤200 chars) and page / source file when known.
4. **Confidence.** Score 0.0–1.0. Ambiguous or table-inferred values ≤0.7.
5. **Quantifiable vs narrative.** Numeric / boolean / date fields go in
   `quantifiable`. Qualitative claims (industry leadership, competitive
   positioning, technology substance, concentration narratives) go in
   `narrative` as short verbatim or lightly paraphrased excerpts — never as
   invented conclusions.
6. **Deal parameters are never guessed.** Offer price, share count, expected
   market cap, FX convention, listing timetable are decisions. Leave them null
   unless the user supplied them as hard-entered profile inputs.
7. **Terminology.** Keep issuer/accounting terms as written (e.g. 扣非前后孰低,
   profit attributable to owners). Do not alias CN / HK / SG regulatory metrics.

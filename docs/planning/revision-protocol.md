# Revision Protocol

Use this protocol whenever the plan, keyword matrix, DSL rules, or experiment scope should change.

The goal is to allow change without drifting from the original idea in [vision.md](vision.md).

## Steps

1. **Restate the original idea**
   - Quote or paraphrase the frozen idea from `vision.md`.
   - Confirm the proposed change still serves that idea.

2. **Name the change**
   - What is changing?
   - Why now?
   - What problem does it solve?

3. **Classify impact**
   - `vision` — changes the north star (rare; require explicit justification)
   - `decision` — changes an accepted/deferred/rejected item
   - `matrix` — changes allowed/invalid/deferred keyword combinations
   - `dsl` — changes spelling, composition, or IR normalization
   - `corpus` — adds/removes/rewrites examples
   - `experiment` — changes pass/fail or trial method
   - `backlog` — parks an idea without accepting it into v0

4. **Update the decision log**
   - Mark impacted entries in [decision-log.md](decision-log.md).
   - Prefer superseding an entry over silently rewriting history.
   - Record rationale and date.

5. **Update dependent artifacts**
   - Matrix changes → update [keyword-matrix-v0.md](keyword-matrix-v0.md)
   - DSL changes → update [keyword-dsl-v0.md](keyword-dsl-v0.md)
   - Behavior examples → update `examples/v0/`
   - Skill behavior → update `.cursor/skills/lira-keyword-dsl/`

6. **Keep deferred ideas out of v0**
   - If the change expands scope beyond keyword→DSL, either:
     - defer it to the roadmap backlog, or
     - explicitly widen the experiment in [experiment-v0.md](experiment-v0.md) with a written reason.

7. **Do not invent compiler work to rescue unclear DSL**
   - If a keyword composition is ambiguous, fix the DSL/matrix first.
   - Backends remain deferred until the keyword→DSL surface is stable.

## Quick checklist

- [ ] Original idea still holds
- [ ] Decision log updated
- [ ] Matrix / DSL / corpus / skill updated as needed
- [ ] Deferred items stayed deferred unless intentionally promoted
- [ ] Experiment pass/fail still matches the phase goal

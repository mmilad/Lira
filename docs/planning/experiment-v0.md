# Experiment v0 — Keyword → DSL

> Goal: prove a small keyword model can compose into a clear Lira DSL and normalize to IR, exercised through a Cursor skill.

## Hypothesis

If keyword roles, composition rules, and a scoped compatibility matrix are explicit, a producer (here: a Cursor agent using a project skill) can author and review Lira declaration/import forms without inventing extra language or silently accepting illegal combinations.

## In scope

- declaration operations, kinds, modifiers
- import/export keyword composition
- scope rules that change keyword meaning
- DSL spelling → canonical IR normalization
- legal / illegal / boundary example corpus
- project Cursor skill trial

## Out of scope

- TypeScript / Python / PHP backends
- parser / CLI implementation
- full expression and control-flow DSL
- rich type system
- large SLM benchmark suite

## Artifacts

| Artifact | Path |
|---|---|
| Vision | [vision.md](vision.md) |
| Decision log | [decision-log.md](decision-log.md) |
| Keyword matrix | [keyword-matrix-v0.md](keyword-matrix-v0.md) |
| Keyword→DSL spec | [keyword-dsl-v0.md](keyword-dsl-v0.md) |
| Corpus | `examples/v0/` |
| Checker script | `tools/lira_keyword_dsl.mjs` |
| Cursor skill (optional) | `.cursor/skills/lira-keyword-dsl/` |

## Trial method

Primary: reusable script.

```bash
node tools/lira_keyword_dsl.mjs check
node tools/lira_keyword_dsl.mjs review path/to/file.lira
```

1. Author borderline declaration/import cases under `examples/v0/`.
2. Run `check` so legal/illegal + IR expectations are enforced.
3. Use `review` on ad-hoc `.lira` snippets while designing.
4. Where the checker exposes ambiguity, revise matrix/DSL docs via [revision-protocol.md](revision-protocol.md).

Optional: the Cursor skill can still author drafts, but the script is the reusable source of truth.

## Pass / fail

Pass if all are true:

1. Vision and revision docs preserve the original idea.
2. Keyword matrix has no silent `maybe`s on the v0 surface.
3. Keyword→DSL spec shows spelling + IR normalization for covered constructs.
4. Corpus covers main legal/illegal keyword compositions.
5. Project skill authors/reviews examples against those docs without inventing extra language.

## Metrics to note during skill trial

- illegal forms incorrectly accepted
- legal forms incorrectly rejected
- invented keywords / spellings not in the spec
- ambiguous cases that require a new decision-log entry

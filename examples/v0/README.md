# Lira examples v0 — keyword → DSL corpus

Each case directory contains:

| File | Purpose |
|---|---|
| `case.md` | legal/illegal flag, rule references, notes |
| `source.lira` | DSL input |
| `expected.ir.json` | canonical IR when legal |
| `expected.error.json` | rejection reason when illegal |

Rules live in:

- `docs/planning/keyword-matrix-v0.md`
- `docs/planning/keyword-dsl-v0.md`
- `docs/planning/decision-log.md`

## Checker script

Reusable keyword→DSL reviewer (preferred over the Cursor skill for repeatable checks):

```bash
node tools/lira_keyword_dsl.mjs check
node tools/lira_keyword_dsl.mjs review path/to/file.lira
node tools/lira_keyword_dsl.mjs ir path/to/file.lira
```

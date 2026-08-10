---
name: lira-keyword-dsl
description: >-
  Author and review Lira keyword→DSL examples against the frozen keyword
  matrix and executable operations (define/import/export/return/assign/set/call).
  Use when writing or checking .lira files, expanding test/lira_scripts, or
  classifying legal vs illegal Lira compositions.
---

# Lira Keyword → DSL

## Required reading

1. [docs/planning/keyword-matrix-v0.md](../../../docs/planning/keyword-matrix-v0.md)
2. [docs/planning/keyword-dsl-v0.md](../../../docs/planning/keyword-dsl-v0.md)
3. [docs/planning/decision-log.md](../../../docs/planning/decision-log.md)
4. Feature scripts under [test/lira_scripts/features/](../../../test/lira_scripts/features/)

## Hard rules

1. Keep `define` on declarations.
2. Modifier order before kind may vary; IR stores unordered flags.
3. Kind before keyword-shaped identifiers (`constructor` has no separate name).
4. Indentation owns members and callable bodies.
5. `export` only at module scope — never on methods/properties/constructors.
6. Visibility only on type members.
7. `define method` only in class/interface; top-level callables use `define function`.
8. Import `as` binds to the immediately preceding item.
9. Reject matrix `invalid` / `deferred` forms.
10. Prefer explicit `call` / `construct` (no bare `foo()` sugar).
11. Bindings use `variable` / `constant` (not `let`).
12. `interface` methods have no bodies.

## Allowed operations

`module`, `define`, `import`, `export`, `return`, `assign`, `set`, `call`, `if`, `else`

Boolean ops in expressions: `and`, `or`, `not` (not `&&` / `||` / `!`).

## Authoring for the test pipeline

Prefer:

```text
test/lira_scripts/features/<slice>/<name>.lira
```

Then:

```bash
npm run generate
npm test
```

## Output shape

```markdown
Verdict: legal | illegal
Rules: D019, F1
DSL:
```lira
...
```
IR or error:
```json
...
```
```

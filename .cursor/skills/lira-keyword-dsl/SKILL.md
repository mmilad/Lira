---
name: lira-keyword-dsl
description: >-
  Author and review Lira v0 keyword→DSL examples against the frozen keyword
  matrix and composition rules. Use when writing or checking .lira declaration
  or import forms, expanding examples/v0, normalizing to canonical IR, or
  classifying legal vs illegal Lira keyword compositions.
---

# Lira Keyword → DSL v0

## When to use

Use this skill for Lira **declarations, modifiers, imports/exports, and scope** in the v0 keyword experiment. Do not invent backends, parsers, expression language, or deferred constructs.

## Required reading

Read these before generating or judging examples:

1. [docs/planning/keyword-matrix-v0.md](../../../docs/planning/keyword-matrix-v0.md)
2. [docs/planning/keyword-dsl-v0.md](../../../docs/planning/keyword-dsl-v0.md)
3. [docs/planning/decision-log.md](../../../docs/planning/decision-log.md)
4. Matching cases under [examples/v0/](../../../examples/v0/)

Vision / revision context if scope is unclear:

- [docs/planning/vision.md](../../../docs/planning/vision.md)
- [docs/planning/revision-protocol.md](../../../docs/planning/revision-protocol.md)
- [docs/planning/experiment-v0.md](../../../docs/planning/experiment-v0.md)

## Hard rules

1. Keep `define` on declarations.
2. Modifier order before kind may vary; IR stores unordered flags.
3. Kind must appear before a keyword-shaped identifier.
4. Indentation owns children; siblings are not nested by adjacency.
5. `export` only at module/exportable scope — never on methods/properties.
6. Visibility (`public` / `protected` / `private`) only on class members.
7. `define method` only inside a class; top-level callables use `define function`.
8. Import `as` binds only to the immediately preceding item.
9. Reject matrix `invalid` and `deferred` forms — never silently accept deferred sugar.
10. Do not invent keywords, synonyms, braces, default import/export, or `interface`/`contract` in v0.

## Authoring workflow

When asked to generate Lira:

1. Stay inside the v0 keyword surface.
2. Emit `module` + `define` / `import` / `export` forms only as specified.
3. Provide:
   - `.lira` source
   - legal / illegal verdict
   - rule ids (`D00x` and/or matrix cell)
   - expected IR JSON if legal, or explicit rejection if illegal
4. Prefer adding cases under `examples/v0/{declarations,modifiers,imports-exports,scope,illegal}/<case-name>/` using:
   - `case.md`
   - `source.lira`
   - `expected.ir.json` or `expected.error.json`

## Review workflow

When asked to review Lira:

1. Classify each form as legal or illegal against the matrix.
2. Quote the rule that decides it.
3. If legal, show normalized IR (modifiers as flags, imports as item lists).
4. If illegal/deferred, refuse and say why.
5. If docs conflict or a case is ambiguous, stop inventing — propose a decision-log update via the revision protocol.

## Output shape

```markdown
Verdict: legal | illegal

Rules: D003, matrix export/class

DSL:
```lira
...
```

IR or error:
```json
...
```
```

## Non-goals

- TypeScript / Python / PHP emission
- Parser or CLI implementation
- Full expressions, control flow, or type system design
- Expanding the forever keyword matrix beyond v0 without revision protocol

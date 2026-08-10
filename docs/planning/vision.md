# Lira Vision

> Status: frozen for the keyword→DSL experiment. Change only via [revision-protocol.md](revision-protocol.md).

## Original idea

Lira separates **program intent** from **target syntax**.

```text
producer (human / AI / tool)
  → constrained Lira representation
  → canonical IR
  → deterministic backends (later)
  → TypeScript / Python / ...
```

A producer should express semantic structure. Compiler backends own target-language syntax. That split is the project’s reason to exist.

## Problem

Direct AI code generation mixes two jobs:

1. deciding what the program should do;
2. producing correct syntax for a target language.

Mixing them makes validation, translation, debugging, and repair harder — especially for smaller models.

## What must not be compromised

1. **Semantic core first** — canonical IR is the compatibility boundary, not textual sugar.
2. **No silent semantic loss** — unsupported meaning must fail closed, not quietly degrade.
3. **Small surface** — prefer a constrained vocabulary over covering every target-language feature.
4. **Traceability** — meaningful nodes should be addressable for diagnostics and later repair.
5. **Language independence** — target syntax must not leak into the portable core.

## Current phase (v0 keyword→DSL)

Prove that a small **keyword model** can compose into a clear **DSL surface** and normalize to IR.

In scope:

- declaration keywords and kinds
- modifiers and valid combinations
- scope rules that affect keyword meaning
- import/export keyword composition
- DSL spelling → canonical IR normalization

Out of scope for this phase:

- backends / transpilers / CLI
- parser implementation
- full expression and control-flow language
- rich type system
- large SLM benchmarks

## Success criteria for this phase

1. Vision and revision docs keep the original idea intact.
2. The v0 keyword matrix has no silent `maybe`s.
3. The keyword→DSL spec shows spelling and IR normalization for covered constructs.
4. The example corpus covers main legal and illegal keyword compositions.
5. A project Cursor skill can author/review examples against those docs without inventing extra language.

## Non-goals (general)

- Recreating TypeScript’s type system
- Supporting every feature of every target language in the portable core
- Optimizing for resemblance to existing languages over reliable semantic generation

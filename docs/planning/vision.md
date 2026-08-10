# Lira Vision

> Status: the core idea is frozen. Change the north-star principles only via [revision-protocol.md](revision-protocol.md); the "current phase" section tracks where implementation actually is.

## Original idea

Lira separates **program intent** from **target syntax**.

```text
producer (human / AI / tool)
  → constrained Lira representation
  → canonical IR
  → deterministic backends
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
6. **Module as the unit** — `module` is the portable compilation/identity boundary; backends map it into each language’s module/package story.
7. **API forced by few backends** — at most three initial transpilers define the compiler backend API; do not grow targets before the contract is real.

## Portability stance

Perfect “any language” coverage is impossible. Lira still aims at a **generic semantic description** rich enough that the same IR can drive multiple targets.

Enrichment is driven by what those first backends need in common — not by copying any one language. Constructs that cannot be preserved honestly stay `unsupported` (or deferred), never silently weakened.

## Where we are now

The initial keyword→DSL v0 experiment **passed**: a small keyword model composes into a clear DSL surface and normalizes to canonical IR, enforced by a checker and a project Cursor skill.

Since then the surface has grown into a small **executable DSL** and early backends have landed:

- a parser + validator (`tools/lira_keyword_dsl.mjs`) producing canonical IR;
- an executable feature set F1–F15 (signatures/return, bindings, expressions, calls/construct, members, constructors, interfaces, operators, `if`/`else`, collections, `for`-in, nullable types, `throw`);
- deterministic **TypeScript and Python emitters** (`tools/emitters.mjs`);
- a committed-golden test pipeline (`.lira` → IR → target source) via `npm run generate` / `npm test`.

The transpilers are intentionally early. The current north star is a **minimal runnable proof-of-concept app**: one Lira source compiled to TypeScript and Python that actually executes with matching observable behavior. See [roadmap.md](roadmap.md) for the milestones.

## Still out of scope (for now)

- a runnable module/import resolution + program entry point *(next milestone)*
- rich type system beyond the small portable set
- `while` / `try`-`catch` / pattern matching / comprehensions
- a public compiler API package and packaged CLI (currently pipeline-internal)
- large SLM benchmarks

## Success criteria (updated)

1. Vision and revision docs keep the original idea intact.
2. The keyword matrix has no silent `maybe`s on the covered surface.
3. The keyword→DSL spec shows spelling and IR normalization for every covered construct.
4. The example corpus covers the main legal and illegal keyword compositions.
5. The project Cursor skill authors/reviews examples against the docs without inventing extra language.
6. New constructs enter only feature-by-feature, each with a decision-log entry, target-mapping row, and golden tests.

## Non-goals (general)

- Recreating TypeScript’s type system
- Supporting every feature of every target language in the portable core
- Optimizing for resemblance to existing languages over reliable semantic generation

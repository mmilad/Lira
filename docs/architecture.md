# Architecture

> Status: early design notes. The pipeline below now exists in an early form under `tools/`; the formal, packaged compiler API is still future. Component sections mark what is implemented vs planned.

Lira separates semantic program representation from target-language syntax.

## Implementation status (early)

| Component | Where | Status |
|---|---|---|
| Parser + scope resolver | `tools/lira_keyword_dsl.mjs` | implemented (keyword→DSL + F1–F15) |
| Canonical IR | produced by the parser; shape in [keyword-dsl-v0.md](planning/keyword-dsl-v0.md) | implemented (v0) |
| Validator | `tools/lira_keyword_dsl.mjs` (matrix + scope rules) | implemented (v0) |
| Emitters (backends) | `tools/emitters.mjs` | early: TypeScript + Python |
| Test pipeline (goldens) | `tools/lira_pipeline.mjs` | implemented |
| Source map / node-ID traceability | — | planned |
| Packaged `compile()` API + CLI | — | planned |

Emitted source is not yet a runnable program; see [planning/roadmap.md](planning/roadmap.md) for the path to a proof-of-concept app.

## Pipeline

```text
producer (human / AI / tool)
            ↓
        Lira source
            ↓
          parser
            ↓
       canonical IR
            ↓
        validation
            ↓
     compiler backend
            ↓
      generated code
```

A producer should not need to know the syntax rules of the target language. It should only express program structure and behavior that Lira understands.

## Core components

### Parser

Converts the human/AI-friendly Lira representation into a canonical machine representation. Implemented in `tools/lira_keyword_dsl.mjs`, which builds a scope tree from indentation and normalizes declarations/expressions/statements into IR.

### Canonical IR

The stable semantic model shared by all backends. This is the most important compatibility boundary in the project.

### Validator

Rejects invalid or unsupported combinations before a backend generates source code.

### Compiler backend

Maps canonical Lira operations into a target language. Backends may apply language-specific rules while preserving the same program intent.

Initial strategy: **at most three backends** so the shared backend API is designed against real diversity, not one language’s habits. Candidate first set: TypeScript, Python, PHP.

Current state: two emitters exist in `tools/emitters.mjs` (TypeScript and Python). They run inside the golden test pipeline rather than behind a formal `compile()` package yet. PHP is deferred until it has a column in [target-mapping.md](planning/target-mapping.md).

### Module boundary

`module` in Lira is semantic, not TypeScript/ESM syntax. It names a portable unit of declarations + imports/exports. Each backend decides file layout, package exports, and naming conventions while preserving the same public API intent.

### Target mapping

Cross-language type/member concepts are recorded in [planning/target-mapping.md](planning/target-mapping.md) with mapping strength (`exact` / `compatible` / `unsupported`). Emitters must not invent mappings missing from that table.

### Source map

Tracks which generated source ranges originate from which Lira operations. This should make compiler and runtime errors traceable back to the semantic representation.

## Backend API sketch (partly landed)

Today the emitters are plain functions in `tools/emitters.mjs` selected by target, driven by `tools/lira_pipeline.mjs`. They already consume canonical IR only (never raw `.lira` text). What is still missing is the formal, packaged contract every backend should eventually share:

```text
compile(ir, options) -> { files, diagnostics, sourceMap }
```

- input is **canonical IR only** (never raw `.lira` text) — already true
- options may include target profile / strictness — planned
- diagnostics must refer to IR node IDs — planned (needs node-ID traceability)
- unsupported portable constructs fail closed in strict mode — partly (validator rejects; emitters do not yet emit diagnostics)

The formal interface will be written as the emitters harden — capped at three targets until that API stabilizes.

## Design principles

1. Keep the semantic core small.
2. Prefer explicit operations over target-language syntax leakage.
3. Do not model every feature of every language in v0.
4. Backend-specific features should not silently corrupt language independence.
5. Every meaningful IR node should be addressable so that errors and patches can refer to it.
6. Validation should happen before code generation whenever possible.
7. Enrich IR from multi-backend pressure, not from a single target’s wishlist.
8. Cap initial backends at three until the API is proven.

## Open questions

- How should Lira `module` / import / export map across ESM, Python packages, and PHP autoloading? *(now the top blocker for a runnable app — emitted imports are not yet valid target modules)*
- What is the minimal useful type system?
- Which further control-flow constructs belong in the portable core? *(v0 has `if`/`else`, `for`-in, `throw`; `while`/`try`-`catch`/`match` still deferred)*
- How should language-specific extensions / profiles work?
- Should the external Lira syntax be text, JSON, or both?
- What guarantees should compiler backends provide about semantic equivalence? *(the roadmap proposes runtime parity tests as an empirical guarantee)*
- What mapping format should connect generated code back to Lira node IDs?
- What is the exact `compile(ir, options)` interface for the first three backends?

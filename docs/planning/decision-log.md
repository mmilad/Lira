# Decision Log

Format:

- **Status**: `accepted` | `rejected` | `deferred` | `superseded`
- **Scope**: usually `v0`
- **Date**: ISO date
- **Decision** / **Rationale** / **Follow-up**

---

## D001 — Canonical IR is the contract

- **Status**: accepted
- **Scope**: v0
- **Date**: 2026-08-10
- **Decision**: Canonical IR is the compatibility boundary. Textual `.lira` is one frontend.
- **Rationale**: Backends and tools must not depend on source spelling or modifier order.
- **Follow-up**: Parser and backends consume IR later; not in this phase.

## D002 — Keep `define` as declaration operation

- **Status**: accepted
- **Scope**: v0
- **Date**: 2026-08-10
- **Decision**: Declarations use `define` (`define class User`).
- **Rationale**: Gives producers a strong operation token and keeps declarations structurally similar.
- **Follow-up**: May revisit with SLM measurements later; aesthetics alone are not enough to remove it.

## D003 — Flexible modifier order, normalized IR

- **Status**: accepted
- **Scope**: v0
- **Date**: 2026-08-10
- **Decision**: Source may accept flexible descriptor order before the kind/name; IR stores unordered semantic flags.
- **Rationale**: Forgiving input for producers; strict output for tools.
- **Follow-up**: Formatter may later rewrite to one canonical source order.

## D004 — Kind before identifier

- **Status**: accepted
- **Scope**: v0
- **Date**: 2026-08-10
- **Decision**: Declaration kind must be known before a bare keyword-shaped token can become the identifier.
- **Rationale**: Prevents ambiguity such as `define export method` where `export` could be modifier or name.
- **Follow-up**: Escaped identifiers deferred until a real ambiguity forces them.

## D005 — Indentation owns children

- **Status**: accepted
- **Scope**: v0
- **Date**: 2026-08-10
- **Decision**: Child ownership is structural via indentation. Adjacent declarations are siblings unless indented.
- **Rationale**: Scope must not be inferred from “previous declaration stays open.”
- **Follow-up**: Braces / `end` blocks deferred.

## D006 — `export` is module-scope semantics

- **Status**: accepted
- **Scope**: v0
- **Date**: 2026-08-10
- **Decision**: `export` means the declaration belongs to the module public API. Valid only in exportable/module scope.
- **Rationale**: Class members use visibility, not module export. `export` is not “emit the word export.”
- **Follow-up**: Default export semantics deferred.

## D007 — Visibility is member-scope only

- **Status**: accepted
- **Scope**: v0
- **Date**: 2026-08-10
- **Decision**: `public` / `protected` / `private` are valid only on members inside a type scope.
- **Rationale**: One generic scope rule beats a giant keyword-pair table.
- **Follow-up**: Backend strength of mapping (`exact` / `compatible` / etc.) comes later.

## D008 — Import aliases bind to previous item

- **Status**: accepted
- **Scope**: v0
- **Date**: 2026-08-10
- **Decision**: `as` binds only to the immediately preceding import item unless an explicit group/namespace form is used.
- **Rationale**: Removes ambiguity in `import a, b, c as x from "pkg"`.
- **Follow-up**: Namespace import uses `import all from "pkg" as x`.

## D009 — Method vs function via scope

- **Status**: accepted
- **Scope**: v0
- **Date**: 2026-08-10
- **Decision**: `define method` is valid only inside a type scope. Top-level callables use `define function`. Loose top-level `method` is invalid.
- **Rationale**: Keeps producer intent explicit while still using scope for ownership.
- **Follow-up**: Canonical IR may still use a shared callable shape with a scope field later.

## D010 — Keyword matrix has no silent maybes

- **Status**: accepted
- **Scope**: v0
- **Date**: 2026-08-10
- **Decision**: Every v0 kind×modifier cell is `allowed`, `invalid`, or `deferred`.
- **Rationale**: Validator and skill need hard rules.
- **Follow-up**: Expand only through revision protocol.

## D011 — Backends deferred

- **Status**: accepted
- **Scope**: v0
- **Date**: 2026-08-10
- **Decision**: No TypeScript/Python/PHP transpiler work in this phase.
- **Rationale**: Keyword→DSL clarity first; compilers must not invent missing semantics.
- **Follow-up**: Resume after corpus + skill trial stabilize the surface.

## D012 — Interface / contract naming

- **Status**: deferred
- **Scope**: post-v0
- **Date**: 2026-08-10
- **Decision**: Not part of keyword→DSL v0 surface.
- **Rationale**: Focus declarations on `class`, callables, properties, bindings first.
- **Follow-up**: Reopen when portable type contracts are needed.

## D013 — Default import/export

- **Status**: deferred
- **Scope**: post-v0
- **Date**: 2026-08-10
- **Decision**: Default import/export not in portable v0 core yet.
- **Rationale**: Targets disagree; named exports are enough for the keyword experiment.
- **Follow-up**: Document as extension or later core after named forms stabilize.

## D014 — Escaped identifiers

- **Status**: deferred
- **Scope**: post-v0
- **Date**: 2026-08-10
- **Decision**: No backtick / `name` escape hatch in v0.
- **Rationale**: Kind-before-name should make escapes rare.
- **Follow-up**: Add only if real ambiguity appears in corpus/skill trial.

## D015 — Expression and control-flow completeness

- **Status**: deferred
- **Scope**: post-v0
- **Date**: 2026-08-10
- **Decision**: Full expression/operator/control-flow DSL is outside this experiment.
- **Rationale**: v0 force is keywords→DSL for declarations and imports.
- **Follow-up**: Roadmap phases 3–6.

## D016 — `module` is the portable unit

- **Status**: accepted
- **Scope**: project
- **Date**: 2026-08-10
- **Decision**: Keep `module` as a first-class semantic boundary in DSL and IR. It is not TypeScript/ESM syntax; backends map it into each target’s module/package model.
- **Rationale**: Cross-language compilation needs a stable ownership/export unit. Examples like `module demo` are the start of that contract, not decoration.
- **Follow-up**: Document per-backend mapping notes when the first transpilers land (file layout, public exports, naming).

## D017 — Max three initial transpilers to define the API

- **Status**: superseded
- **Scope**: project
- **Date**: 2026-08-10
- **Decision**: Build at most three initial backends — TypeScript, Python, PHP — to force a shared `compile(ir, options)` API.
- **Rationale**: Superseded by D018 — prefer committed idempotent test pipeline over a product backend API for now.
- **Follow-up**: See D018.

## D018 — Committed idempotent test pipeline

- **Status**: accepted
- **Scope**: project
- **Date**: 2026-08-10
- **Decision**: Use `test/lira_scripts/**/*.lira` → `test/lira_dsl/<name>.json` → `test/lira_output/<target>/**/<name>.<ext>` with committed goldens. `npm run generate` writes; `npm test` re-runs and diffs. No SLM loop required; logic must stay idempotent. Initial emit targets: `ts` and `py` (PHP later if needed).
- **Rationale**: Retestability matters more than a formal backend package right now. Multi-target emit still pressures portable IR without inventing a product API early.
- **Follow-up**: Grow scripts under `test/lira_scripts/`; keep illegal keyword cases in `examples/v0/illegal/`.

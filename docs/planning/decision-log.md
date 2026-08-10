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

- **Status**: superseded
- **Scope**: v0
- **Date**: 2026-08-10
- **Decision**: No TypeScript/Python/PHP transpiler work in this phase.
- **Rationale**: Keyword→DSL clarity first; compilers must not invent missing semantics.
- **Follow-up**: Superseded by **D018** — after the corpus + skill trial stabilized the surface, TypeScript and Python emitters landed in the golden test pipeline. Emitters must still follow [target-mapping.md](target-mapping.md) and never invent missing semantics.

## D012 — Interface / contract naming

- **Status**: superseded
- **Scope**: post-v0
- **Date**: 2026-08-10
- **Decision**: Not part of keyword→DSL v0 surface.
- **Rationale**: Superseded by D019 (`interface` promoted).
- **Follow-up**: See D019.

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

- **Status**: superseded
- **Scope**: post-v0
- **Date**: 2026-08-10
- **Decision**: Full expression/operator/control-flow DSL is outside this experiment.
- **Rationale**: Partial supersession by D019–D025 (mini expression + call/return). Full control-flow still deferred.
- **Follow-up**: `if`/loops/try remain out of scope.

## D019 — F1 Callable signatures + return

- **Status**: accepted
- **Scope**: executable-dsl
- **Date**: 2026-08-10
- **Decision**: Functions/methods support `(name: type)` params, optional `-> type`, and body `return` / `return <expr>`.
- **Rationale**: First executable slice for the test pipeline.
- **Follow-up**: Tests under `test/lira_scripts/shared/features/f1_return/`.

## D020 — F2 variable / constant + assign

- **Status**: accepted
- **Scope**: executable-dsl
- **Date**: 2026-08-10
- **Decision**: Keep `variable` / `constant` keywords. Init with `= <expr>`. `assign name = <expr>` rebinds variables (semantic intent; Python does not enforce const).
- **Rationale**: Avoid “let-like” wording; emit TS `let`/`const`.
- **Follow-up**: Soft enforcement of assign-to-constant can tighten later.

## D021 — F3 mini expressions

- **Status**: accepted
- **Scope**: executable-dsl
- **Date**: 2026-08-10
- **Decision**: Expressions are literals, name refs, and member chains (`a.b.c`). No operators yet.
- **Rationale**: Enough for returns, inits, and call args.
- **Follow-up**: Operators later.

## D022 — F4 call / construct

- **Status**: accepted
- **Scope**: executable-dsl
- **Date**: 2026-08-10
- **Decision**: Explicit `call callee(args)` statements and `construct Type(args)` expressions. Callee may be `obj.method`.
- **Rationale**: No bare `foo()` sugar; keeps IR unambiguous.
- **Follow-up**: Feature tests in `f4_call_construct`.

## D023 — F5 member completeness

- **Status**: accepted
- **Scope**: executable-dsl
- **Date**: 2026-08-10
- **Decision**: Public/private/static combinations on methods/properties; property defaults via `= <expr>`.
- **Rationale**: Hardens class member surface already started in keyword v0.
- **Follow-up**: Matrix cells remain authoritative.

## D024 — F6 constructor

- **Status**: accepted
- **Scope**: executable-dsl
- **Date**: 2026-08-10
- **Decision**: `define constructor(params)` only inside class; body may `set this.x = ...` and `return`. Emit TS `constructor` / Python `__init__`.
- **Rationale**: Explicit construction, not inferred `new`.
- **Follow-up**: Feature tests in `f6_constructor`.

## D025 — F7 interface

- **Status**: accepted
- **Scope**: executable-dsl
- **Date**: 2026-08-10
- **Decision**: `define interface` with method members (no bodies). Classes may `implements`. Emit TS `interface` / Python `Protocol`.
- **Rationale**: Needed for portable ports (e.g. NoteStore). Supersedes D012.
- **Follow-up**: Feature tests in `f7_interface`; notes_app uses interface store.

## D026 — Target mapping table

- **Status**: accepted
- **Scope**: project
- **Date**: 2026-08-10
- **Decision**: Maintain [target-mapping.md](target-mapping.md) as the contract for Lira→TS/Python mappings with strength `exact` / `compatible` / `unsupported`. Emitters must follow the table; new type concepts need a row before emit.
- **Rationale**: Concepts like `interface`, `constant`, and `private` vary by language; documenting strength beats pretending equivalence.
- **Follow-up**: Add a PHP column only when a third emitter is introduced.

## D027 — F9 operators

- **Status**: accepted
- **Scope**: executable-dsl
- **Date**: 2026-08-10
- **Decision**: Portable ops: `* /`, `+ -`, comparisons, `and`/`or`/`not`, unary `-`. No `===`, no `&&`/`||` spellings in Lira.
- **Rationale**: Language-neutral keywords; TS emitter maps boolean ops to symbols.
- **Follow-up**: `test/lira_scripts/shared/features/f9_operators/`.

## D028 — F10 if / else

- **Status**: accepted
- **Scope**: executable-dsl
- **Date**: 2026-08-10
- **Decision**: `if <expr>` / optional `else` with indentation bodies. No `else if` sugar; nest instead. Only inside callable (or nested if) bodies.
- **Rationale**: Minimal control flow for real app logic in the pipeline.
- **Follow-up**: `test/lira_scripts/shared/features/f10_if/`; assign-to-constant rejected in parser.

## D029 — F12 collections (list / map / index)

- **Status**: accepted
- **Scope**: executable-dsl
- **Date**: 2026-08-10
- **Decision**: Portable containers use `list[T]` / `map[K, V]` types; literals `list(...)` and empty `map()`; index get/set via `a[i]`. Emit TS `T[]` / `Record<K,V>` and Python `list[T]` / `dict[K,V]`. No map-entry sugar or nested maps in v1. Expression keywords `list`/`map` remain valid as member names after `.`.
- **Rationale**: Notes-style apps need real collections without adopting target-specific spellings in source.
- **Follow-up**: `test/lira_scripts/shared/features/f12_collections/`; mapping rows in [target-mapping.md](target-mapping.md).

## D030 — F13 for-in

- **Status**: accepted
- **Scope**: executable-dsl
- **Date**: 2026-08-10
- **Decision**: `for name in <expr>` with indentation body; IR `{ op: "for", name, iterable, body }`. Emit TS `for (const name of …)` / Python `for name in …`. Illegal at module top level. No `while` / `break` / `continue` in this slice.
- **Rationale**: Iteration is the missing piece after collections for portable service logic.
- **Follow-up**: `test/lira_scripts/shared/features/f13_for/`; illegal case `examples/v0/illegal/for-outside-callable/`.

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
- **Follow-up**: Grow scripts under `test/lira_scripts/`; keep illegal keyword cases in `examples/v0/illegal/`. Superseded in layout detail by D031 (scope folders).

## D032 — F14 nullable types (`T?`)

- **Status**: accepted
- **Scope**: executable-dsl
- **Date**: 2026-08-11
- **Decision**: Trailing `?` marks nullable types as `{ kind: "nullable", inner }`. Emit TS `T | null` / Python `T | None`. Null checks use `== null` / `!= null`. This is not general union syntax.
- **Rationale**: Honest “absent” values for `get`/`load` without opening the full union design surface.
- **Follow-up**: `test/lira_scripts/shared/features/f14_nullable/`; notes_app `NoteStore.get -> Note?`.

## D033 — F15 throw

- **Status**: accepted
- **Scope**: executable-dsl
- **Date**: 2026-08-11
- **Decision**: `throw <string>` in callable/nested bodies. IR `{ op: "throw", value }`. Emit TS `throw new Error(...)` / Python `raise Exception(...)`. Illegal at module top level. No `try`/`catch` in this slice.
- **Rationale**: Fail-closed portable error for missing entities and invalid input.
- **Follow-up**: `test/lira_scripts/shared/features/f15_throw/`; illegal `examples/v0/illegal/throw-outside-callable/`.

## D031 — Script target scopes (folders)

- **Status**: accepted
- **Scope**: project
- **Date**: 2026-08-11
- **Decision**: Scripts live under `test/lira_scripts/{shared,ts,py}/…`. Scope selects emit targets (`shared` → all languages; `ts`/`py` → that language only). Goldens strip the scope segment (`shared/xy.lira` → `lira_dsl/xy.json` + `lira_output/{ts,py}/xy.*`). Post-scope paths must be unique across scopes. Keyword correctness is an authoring rule, not a pipeline gate.
- **Rationale**: Some demos cannot be portable (e.g. target-native map/reduce patterns); scopes keep the pipeline honest without inventing a shared/ tree under dsl/output.
- **Follow-up**: Add further language folders when emitters land; optional later probe of “which languages can emit this script.”

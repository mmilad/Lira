# Lira Roadmap

> Original principle: **settle semantics before locking in implementation.** That still holds for *new* constructs — but the core parser, IR, validator, and two emitters now exist, so this roadmap tracks where we are and drives toward the next north star: a **minimal runnable proof-of-concept app**.

## North star

One Lira program, compiled by deterministic backends into **TypeScript and Python**, that actually **runs** and produces the **same observable output** in both targets. Reaching that proves the core thesis end-to-end (intent → IR → multiple runnable languages) and gives every future feature a concrete, runtime-verified home.

The app itself stays deliberately small (the existing `test/lira_scripts/shared/notes_app/` sketch is the natural candidate: create/list/get notes). Features are added only when the PoC app needs them.

## Where we are now

The semantics-first exploration (phases below) is largely done, and implementation has landed ahead of the original "Phase 10":

| Area | Status | Where |
|---|---|---|
| Declaration model (kinds, modifiers, order, visibility, export) | done (v0) | `lira_keyword_dsl.mjs`, [keyword-matrix-v0.md](keyword-matrix-v0.md) |
| Module model (import/alias/namespace/export) | done (v0) | [keyword-dsl-v0.md](keyword-dsl-v0.md) |
| Values, expressions, calls, construction | done (F3, F4) | executable DSL |
| Binding and mutation (`variable`/`constant`/`assign`/`set`) | done (F2) | executable DSL |
| Functions, methods, constructors, interfaces | done (F1, F5–F7) | executable DSL |
| Control flow (`if`/`else`, `for`-in, `throw`) | partial | F10, F13, F15 |
| Types (string/number/boolean/null, nullable, `list`/`map`, named) | partial | F12, F14, [target-mapping.md](target-mapping.md) |
| Parser + validator | implemented | `tools/lira_keyword_dsl.mjs` |
| Canonical IR | implemented (v0) | parser output |
| Backends / transpilers | early: TypeScript + Python | `tools/emitters.mjs` |
| Golden test pipeline | implemented | `tools/lira_pipeline.mjs` |
| Portability policy (strengths, fail-closed) | partial | validator rejects; emitters don't yet emit diagnostics |
| Traceability (node IDs, source maps) | not started | — |
| Packaged `compile()` API + CLI | not started | — |
| SLM experiment | not started | — |

### Known gaps that block a *runnable* app

These are the concrete blockers, observed in current emitter output:

1. **Module/import resolution is not real.** Python emits `from "./models" import Note` (invalid Python — should be `from .models import Note`); TypeScript emits `import { Note } from "./models"` without a resolvable specifier. Emitted files don't yet form a runnable module graph.
2. **No entry point / runner.** Nothing calls the top-level functions; there is no `main` and no per-target runnable entry file.
3. **No observable output primitive.** There is no portable `print`/log, so two targets can't be compared at runtime.
4. **`async` return types are wrong in TS.** `async load(): Note` should be `Promise<Note>` (Python's `async def` is already correct).
5. **Emit is only diffed as text**, never compiled or executed, so "it looks right" is the only current guarantee.

## Path to the proof-of-concept app

Ordered milestones. Each keeps the existing discipline: a decision-log entry, a [target-mapping.md](target-mapping.md) row when a construct is new, and golden tests.

### M1 — Emit valid, compilable modules
- Decide and document `module` → file mapping per target (D016 follow-up): relative Python imports (`from .models import Note`), TypeScript specifiers (and whether `.js` extensions are emitted).
- Fix `async` callables to emit `Promise<T>` in TypeScript.
- Add a **compile gate** to the pipeline: type-check/parse the emitted output (e.g. `tsc --noEmit` for TS, `python -m py_compile` or `mypy` for Python) so "compiles" becomes a tested property, not an assumption.

### M2 — Program entry + observable output
- Add a portable way to mark an entry point (e.g. a designated `main` function) and emit a runnable entry file per target.
- Add one portable output primitive (candidate: `call print(expr)` → `console.log` / `print`) with a decision-log entry and target-mapping row. This is the minimum needed to observe behavior.

### M3 — Runtime parity harness
- Extend the pipeline to **build and run** the emitted TypeScript (Node) and Python for the PoC app, capture stdout, and assert the two produce identical observable output.
- This upgrades the guarantee from "golden source" to "golden behavior" and directly validates the north star.

### M4 — Feature fill, driven by the app
- Add only what the notes PoC actually needs, in small slices with tests. Likely candidates, in rough priority: confirm number/boolean literal coverage and string handling; then evaluate whether the app needs `while`, `break`/`continue`, or `try`/`catch` (each still deferred — promote via the revision protocol only if the app requires it).
- Resist scope creep: if the app doesn't need a construct, it stays deferred.

### M5 — Packaged compiler API + CLI
- Extract a stable `compile(ir, options) -> { files, diagnostics }` from the emitters and wrap it in a small `lira` CLI (`lira compile <file> --target ts|py`) so the PoC builds outside the test harness. Cap targets at three until the API is proven (TypeScript, Python, then PHP with its own mapping column).

### M6 — Traceability (supports later repair)
- Attach stable node IDs to IR and emit a source map (IR node → generated range). Not required to *run* the PoC, but it is the foundation for diagnostics and semantic repair, so it comes right after the app runs.

## Later — SLM experiment

Once the compiler path is trustworthy and the PoC app runs, revisit the original research question by comparing direct SLM code generation against `prompt → SLM → Lira → deterministic compiler`.

Measure: valid program rate, semantic task success, parser vs compiler errors, repair attempts and success, tokens generated, latency, and performance by model size. This can support or disprove the research claim behind Lira.

---

## Appendix — original semantics-first phases (reference)

The project was designed from the canonical semantic model outward. These phases guided the work above and are kept for reference; most are now reflected in the decision log.

- **Phase 0 — Define the contract.** Lira is a language-independent semantic representation and compilation interface for humans, tools, and models. Canonical IR is the compatibility boundary; backends consume IR, never raw `.lira` text (D001).
- **Phase 1 — Declaration model.** `define`, kinds, modifiers, ordering, valid combinations, visibility, inheritance, export (D002–D010).
- **Phase 2 — Module model.** Imports, aliasing, namespace, export operation vs modifier (D008, D013).
- **Phase 3 — Values, expressions, calls.** Literals, refs, member/index access, calls, construction, operators (D021, D022, D027, D029).
- **Phase 4 — Binding and mutation.** Declaration vs init vs rebind vs property/index mutation; `variable`/`constant`/`assign`/`set` (D020, D024).
- **Phase 5 — Functions and methods.** Params, returns, async, static, visibility, abstract, constructors (D019, D023, D024).
- **Phase 6 — Control flow.** Smallest useful set: `if`/`else`, iteration, `return`, `throw` (D028, D030, D033). `while`/`try`-`catch`/`match` intentionally delayed.
- **Phase 7 — Type system.** Start small: string/number/boolean/null/optional, collections, named types, return types (F12, F14). Avoid recreating TypeScript's type system.
- **Phase 8 — Portability policy.** Every backend feature is `exact` / `compatible` / (later `emulated`) / `unsupported`; prefer correctness over successful compilation ([target-mapping.md](target-mapping.md), D026).
- **Phase 9 — Traceability and diagnostics.** Stable node IDs and source-to-IR / IR-to-source mappings (see M6).
- **Phase 10 — First implementation.** Node/JavaScript host; parser, IR, validator, shared backend surface, first backends — **already underway** (see M1–M5).
- **Phase 11 — SLM experiment.** See "Later" above.

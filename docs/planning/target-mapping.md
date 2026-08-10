# Target Mapping — Lira → TypeScript / Python

> Status: working contract for the test-pipeline emitters.
> Change via [revision-protocol.md](revision-protocol.md). Related: [decision-log.md](decision-log.md), [keyword-matrix-v0.md](keyword-matrix-v0.md).

Lira concepts are **portable semantic intents**, not TypeScript or Python keywords.
Emitters choose the closest honest mapping. Silent degradation is not allowed.

## Strength legend

| Strength | Meaning |
|---|---|
| `exact` | Target has a direct equivalent that preserves the intent |
| `compatible` | Target mapping is usable and conventional, with known semantic gaps |
| `unsupported` | Must fail compilation / validation — do not emit a fake equivalent |

Default mode for the pipeline: prefer `exact` / `compatible`. Anything `unsupported` must not be generated quietly.

## Types and type declarations

| Lira | TypeScript | Python | Strength | Notes |
|---|---|---|---|---|
| `string` | `string` | `str` | exact | |
| `number` | `number` | `float` | compatible | Python has `int`/`float`; Lira `number` maps to `float` for now |
| `boolean` | `boolean` | `bool` | exact | |
| `null` | `null` | `None` | compatible | Nullability models differ |
| named type (`Note`) | `Note` | `Note` | exact | Same identifier; module/import rules still apply |
| `interface` | `interface` | `typing.Protocol` | compatible | Structural in both; Python Protocols are opt-in typing |
| `class` | `class` | `class` | exact | |
| `abstract` class | `abstract class` | `abc.ABC` | compatible | |
| abstract method | `abstract …` | `@abstractmethod` | compatible | Inside `interface`, Python uses Protocol method stubs without ABC |
| `implements X` | `implements X` | base list `(X, …)` | compatible | Python uses inheritance/Protocol subclassing, not a separate keyword |
| `extends X` | `extends X` | base list `(X, …)` | compatible | Single inheritance assumed in early Lira |

### Intentionally not in portable core yet

| Concept | Status | Why |
|---|---|---|
| union types | unsupported | Targets disagree heavily |
| generics | unsupported | Large design surface |
| tuples / maps | unsupported | Need dedicated IR first |
| `any` | deferred | Too easy to launder untyped code |
| TypeScript `type` aliases | unsupported as Lira kind | Use `interface` or named class for now |
| Python `TypedDict` / dataclasses | unsupported as Lira kind | Backend profile territory, not core IR |

## Members, visibility, binding

| Lira | TypeScript | Python | Strength | Notes |
|---|---|---|---|---|
| `public` member | `public` / default | ordinary name | compatible | Python has no true public keyword |
| `private` member | `private` | leading `_name` later, or plain name today | compatible | Current emitter keeps the name; enforcement differs |
| `protected` member | `protected` | conventional `_name` | compatible | Weak in Python |
| `static` method/property | `static` | `@staticmethod` / class attr | compatible | |
| `readonly` property | `readonly` | annotation only / no enforce | compatible | Intent only on Python |
| `variable` | `let` | assignment | compatible | Rebindable binding intent |
| `constant` | `const` | assignment | compatible | Python does not enforce immutability |
| `assign` | `=` on `let` | `=` | compatible | Assign-to-constant should be invalid in Lira even if Python couldn’t enforce it |
| `property` default (`= expr`) | field initializer | class attribute default | compatible | |

## Callables and construction

| Lira | TypeScript | Python | Strength | Notes |
|---|---|---|---|---|
| `function` | `function` | `def` | exact | |
| `method` | method | method | exact | |
| `constructor` | `constructor` | `__init__` | exact | |
| `return` | `return` | `return` | exact | |
| `call x.y(a)` | `x.y(a)` | `x.y(a)` | exact | Explicit `call` in Lira source only |
| `construct T(a)` | `new T(a)` | `T(a)` | exact | |
| `set this.x = v` | `this.x = v` | `self.x = v` | exact | `this` → `self` in Python |
| `async` function/method | `async` | `async def` | exact | |
| `+ - * /` | same | same | exact | |
| `== != < <= > >=` | same | same | exact | |
| `and` / `or` / `not` | `&&` / `\|\|` / `!` | `and` / `or` / `not` | exact | Lira keeps keyword forms |
| `if` / `else` | `if` / `else` | `if` / `else` | exact | Indentation blocks in Lira |

## Modules and exports

| Lira | TypeScript | Python | Strength | Notes |
|---|---|---|---|---|
| `module name` | file/module comment + ESM file | file module | compatible | Lira `module` is the portable unit (D016) |
| `import A from "x"` | `import { A } from "x"` | `from "x" import A` | compatible | String source is opaque path/id for now |
| `import A as B from "x"` | `import { A as B } from "x"` | `from "x" import A as B` | exact | |
| `import all from "x" as ns` | `import * as ns from "x"` | `import "x" as ns` (approx) | compatible | Python packaging differs |
| `export` on define | `export` keyword | comment / package export policy | compatible | Meaning: public module API |
| `export Name` op | `export { Name }` | comment listing exports | compatible | |

## Emitter policy

1. Map from this table only — do not invent ad-hoc synonyms per file.
2. If a new Lira construct has no row, add the row (and a decision-log entry) before emitting.
3. Prefer failing the pipeline over emitting misleading code.
4. Strength `compatible` is OK for v0 tests; document the gap in the Notes column.
5. PHP (or a third target) must get its own column before it is added to `tools/emitters.mjs`.

## How to extend

When adding a type feature:

1. Name the **Lira semantic intent**
2. Fill TS + Python cells and strength
3. Add parser/IR + `test/lira_scripts/features/...`
4. `npm run generate && npm test`
5. Record the decision in [decision-log.md](decision-log.md)

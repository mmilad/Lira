# Keyword Matrix v0

> Status: frozen for the keyword→DSL experiment. Change via [revision-protocol.md](revision-protocol.md).
>
> Every cell is `allowed`, `invalid`, or `deferred`. No silent maybes.

Related: [keyword-dsl-v0.md](keyword-dsl-v0.md), [decision-log.md](decision-log.md)

## Legend

| Value | Meaning |
|---|---|
| `allowed` | Valid in v0 when scope notes are satisfied |
| `invalid` | Must be rejected by validation / skill review |
| `deferred` | Intentionally out of v0; do not accept silently |

## Kind × modifier matrix

| Modifier \ Kind | module | class | interface | function | method | constructor | property | variable | constant |
|---|---|---|---|---|---|---|---|---|---|
| `export` | invalid | allowed* | allowed* | allowed* | invalid | invalid | invalid | allowed* | allowed* |
| `abstract` | invalid | allowed | invalid | invalid | allowed† | invalid | invalid | invalid | invalid |
| `static` | invalid | invalid | invalid | invalid | allowed | invalid | allowed | deferred | deferred |
| `async` | invalid | invalid | invalid | allowed | allowed | invalid | invalid | invalid | invalid |
| `public` | invalid | invalid | invalid | invalid | allowed‡ | allowed‡ | allowed‡ | invalid | invalid |
| `protected` | invalid | invalid | invalid | invalid | allowed‡ | allowed‡ | allowed‡ | invalid | invalid |
| `private` | invalid | invalid | invalid | invalid | allowed‡ | allowed‡ | allowed‡ | invalid | invalid |
| `readonly` | invalid | invalid | invalid | invalid | invalid | invalid | allowed | allowed | invalid |

### Notes

- `*` `export` only at module / exportable scope (D006).
- `†` `abstract` method only inside an `abstract` class, or bodyless methods inside `interface` (F7).
- `‡` visibility only in member scope inside a type (D007).
- `module` itself is not declared with `define module` modifiers in v0; see DSL spec.
- `constant` is already immutable; `readonly constant` is invalid redundancy.
- Top-level `method` is invalid; use `function` (D009).
- `constructor` only inside `class` (F6).

## Scope validity rules

| Keyword / role | Valid scopes | Invalid scopes |
|---|---|---|
| `export` | module | class / method / function body |
| `public` / `protected` / `private` | class/interface member | module top-level, nested blocks |
| `define class` / `define interface` | module | inside class (nested deferred) |
| `define function` | module | inside class (use `method`) |
| `define method` | class or interface | module top-level |
| `define constructor` | class | module, interface |
| `define property` | class | module top-level |
| `define variable` / `define constant` | module or callable body | n/a |
| `return` / `assign` / `set` / `call` | callable body | module top-level |
| `abstract` on class | module | member |
| `static` | class member callable/property | module top-level function |

## Composition rules (non-matrix)

1. **Descriptor order** may vary before the kind; IR normalizes flags (D003).
2. **Kind before name** is required before keyword-shaped identifiers (D004).
3. **Indentation owns children** (D005).
4. **Import `as`** binds to the immediately preceding item (D008).
5. **Relations** (`extends`, `implements`, `from`, `as`) are not freely reorderable relative to their subjects.

## Import / export operation surface

These are operations, not declaration modifiers:

| Form | Status | Notes |
|---|---|---|
| `import Name from "src"` | allowed | named import |
| `import Name as Alias from "src"` | allowed | alias binds to `Name` |
| `import A, B, C as X from "src"` | allowed | only `C` → `X` |
| `import A as X, B as Y from "src"` | allowed | per-item aliases |
| `import all from "src" as NS` | allowed | namespace / module object |
| `import default from "src" as X` | deferred | D013 |
| `export Name` | allowed | re-export / export binding of local name |
| `export Name from "src"` | deferred | dedicated re-export sugar later |
| `export default ...` | deferred | D013 |

## Illegal combinations worth rejecting explicitly

- `export` on `method` / `property`
- `abstract variable` / `abstract constant` / `abstract function`
- `async class` / `async property`
- `static class` / `static module`
- `private` / `protected` / `public` on module-level `function` / `class` / `variable`
- top-level `define method`
- `define method` with `export`
- non-abstract class containing `abstract method`

## Deferred outside this matrix

- `interface` / `contract`
- `default` modifier
- `final`, `override`, `optional`
- nested classes
- escaped identifiers
- brace / `end` block syntax

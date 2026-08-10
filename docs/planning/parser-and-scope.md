# Parser, Scope and Contextual Keywords

> Status: these rules are now **implemented** in `tools/lira_keyword_dsl.mjs` (indentation-owned scope, kind-before-name, contextual keywords, alias-binds-to-previous). Kept as the design rationale; the parser is the source of truth, and resolved answers live in [decision-log.md](decision-log.md).

This document captures several language-design rules that are more fundamental than the final keyword list.

## 1. Scope is structural, not inferred from previous declarations

Indentation determines ownership.

```lira
define class User
define method getName
```

means two sibling top-level declarations:

- a `User` class
- a loose `getName` callable/function

By contrast:

```lira
define class User
    define method getName
```

means `getName` belongs to `User`.

A declaration does not implicitly remain "open" just because it appeared immediately before another declaration. Child ownership must be explicit through indentation/block structure.

### Consequence

The parser should build a scope tree first and resolve declaration meaning inside that scope.

Conceptually:

```text
module
├─ class User
└─ function getName
```

versus:

```text
module
└─ class User
   └─ method getName
```

## 2. Some declaration kinds may resolve according to scope

Lira should consider whether words such as `method` describe semantic intent rather than target syntax.

For example:

```lira
define method getName
```

at module scope may normalize to a callable/function declaration, while the same declaration inside a class normalizes to a method/member callable.

This is a design choice, not yet a fixed rule. The important goal is to avoid forcing a producer to memorize unnecessary distinctions when scope already supplies the missing information.

Potential canonical form:

```json
{
  "kind": "callable",
  "name": "getName",
  "scope": "module"
}
```

or:

```json
{
  "kind": "callable",
  "name": "getName",
  "scope": "class"
}
```

The backend then emits a function or method as appropriate.

## 3. Keywords should be contextual, not globally reserved

A word may be a keyword in one parser position and an identifier in another.

Example:

```lira
define export method getName
```

Here `export` is a modifier.

But:

```lira
define method export
```

Here `export` is the declaration name.

The text of a token alone must therefore not determine its role. Parser state determines whether the next token is expected to be a modifier, kind, relation, value, or identifier.

## 4. Completely free keyword order conflicts with keyword-shaped identifiers

This is an important ambiguity.

If all tokens are allowed in any order, this declaration:

```lira
define export method
```

cannot always tell us whether `export` is:

- a modifier and the declaration is still missing a name, or
- the method name and `method` is a kind that appeared later.

Therefore Lira likely needs one small ordering invariant even if modifier order remains flexible.

### Proposed invariant

**Declaration descriptors may appear in any order before the identifier, but the declaration kind must be known before a bare keyword-shaped token can safely become the identifier.**

Examples:

```lira
define export abstract class User
```

```lira
define abstract export class User
```

Both are equivalent.

```lira
define class export
```

means a class named `export` because after `class` the parser can enter the identifier slot.

This gives us contextual keywords without requiring a huge global reserved-word list.

### Alternative escape hatch

If later grammar becomes genuinely ambiguous, an explicit identifier escape could exist:

```lira
define method `export`
```

or:

```lira
define method name export
```

The goal should be to make this rare rather than mandatory.

## 5. Modifier order can remain free

Within the declaration header, descriptor order should usually not matter:

```lira
define export abstract class User
```

```lira
define abstract export class User
```

Both can normalize to:

```json
{
  "kind": "class",
  "name": "User",
  "modifiers": ["abstract", "export"]
}
```

The canonical IR should remove superficial source ordering where ordering has no semantic meaning.

## 6. Relations and arguments are not freely reorderable

Lira should distinguish unordered descriptors from bound relations.

Example:

```lira
import a, b, c as x from "pkg"
```

should mean:

```text
a -> a
b -> b
c -> x
```

because `as x` binds to the immediately preceding import item.

For namespace/module import:

```lira
import all from "pkg" as x
```

means the imported module/namespace is bound as `x`.

General rule:

> Modifier ordering may be flexible. Relationships and argument binding must be explicit and deterministic.

## 7. Scope should eliminate many invalid keyword combinations naturally

Lira should avoid documenting a giant matrix of `keyword A may be combined with keyword B only in context C` where ordinary program structure can answer the question.

For example, `export` should primarily mean:

> expose this declaration from its containing module/public module API.

At module scope:

```lira
define export class User
```

is meaningful.

```lira
define export const user
```

is also meaningful.

Inside a class:

```lira
define class User
    define export method getName
```

should normally be invalid because class members are not module exports. Member visibility is a separate concept (`public`, `private`, `protected`).

This should fall out of one generic scope rule rather than a bespoke rule for every declaration kind:

```text
export is valid only for declarations owned by an exportable/module scope
```

That gives the validator a small number of composable semantic constraints rather than a large keyword-pair table.

## 8. `export` is semantic, not target syntax

`export` does not mean "emit the word export".

It means that a declaration belongs to the public API of the containing Lira module.

Examples:

```lira
define export class User
```

```lira
define export const user
```

A TypeScript backend may emit an `export` keyword. A Python or PHP backend may realize the same module-public intent through different conventions, file/module structure, metadata, or generated package exports.

## 9. `private` is also semantic, not lexical syntax

The intended Lira meaning should be something like:

> this member is not part of the externally accessible API of its owning type/object abstraction.

Different targets may implement that guarantee differently.

TypeScript and PHP have explicit member visibility syntax. Python traditionally relies on naming conventions and name mangling rather than enforcing exactly the same access-control model.

Therefore a backend may need to report the strength of the mapping:

```text
exact
compatible
best-effort
unsupported
```

This is preferable to silently pretending every target has identical semantics.

## 10. Target profiles may eventually specialize neutral semantic kinds

Lira should avoid automatically interpreting a generic `class` as a framework-specific construct.

For example, Python `class User` should normally compile to a normal Python class, not silently become a Pydantic model.

If Lira later introduces a semantic concept such as `model`, a target profile could map it differently:

```text
python            -> dataclass / plain class policy
python+pydantic   -> BaseModel
php               -> class / DTO policy
typescript        -> interface/class/type policy
```

The semantic intent belongs in Lira; framework choice belongs in backend configuration/profile unless the source explicitly asks for it.

## 11. Open questions

1. Should top-level `define method foo` normalize to `function foo`, or should `method` be invalid outside a type scope?
2. Is `callable` a useful canonical IR kind even if the text syntax exposes `function` and `method`?
3. Must a declaration `kind` always appear before its identifier?
4. Do we want escaped identifiers such as backticks from v0, or only add them when a real ambiguity appears?
5. Should indentation be the only child-scope syntax, or should braces/explicit `end` blocks also be supported eventually?
6. How should `export default`/single-primary-export semantics be represented, if at all?
7. Should visibility (`public`, `private`, `protected`) be restricted to member scopes by one generic rule?
8. Should backend semantic degradation be a compile error by default, or configurable as warning/best-effort?

# Keyword → DSL v0

> Status: frozen for the keyword→DSL experiment. Change via [revision-protocol.md](revision-protocol.md).
>
> Centerpiece: how keywords compose into textual Lira and normalize to canonical IR.

Related: [keyword-matrix-v0.md](keyword-matrix-v0.md), [decision-log.md](decision-log.md), [parser-and-scope.md](parser-and-scope.md), [target-mapping.md](target-mapping.md)

## Mental model

```text
[operation] [modifiers...] [kind] [name] [relations...]
```

Roles:

| Role | Examples | IR fate |
|---|---|---|
| operation | `define`, `import`, `export` | node kind / operation field |
| modifier | `export`, `abstract`, `static`, `async`, visibility, `readonly` | unordered flags |
| kind | `class`, `function`, `method`, `property`, `variable`, `constant` | declaration kind |
| relation | `extends`, `implements`, `from`, `as` | structured fields bound to subjects |

## Universal composition rules

1. Keep `define` for declarations (D002).
2. Modifier order before the kind may vary; IR normalizes flags (D003).
3. Kind must appear before a keyword-shaped identifier (D004).
4. Indentation owns children (D005).
5. Reject matrix-invalid combinations; do not invent synonyms.

Canonical modifier flag object (alphabetical keys in docs/examples):

```json
{
  "abstract": false,
  "async": false,
  "export": false,
  "private": false,
  "protected": false,
  "public": false,
  "readonly": false,
  "static": false
}
```

Examples below omit `false` flags for brevity.

---

## Module header

### DSL

```lira
module hello
```

### Rules

- One module header per file in v0.
- No modifiers on `module`.
- Children are indented under later declarations, not under `module` itself; `module` names the file/unit.

### IR

```json
{
  "id": "mod_hello",
  "op": "module",
  "name": "hello"
}
```

---

## Declarations with `define`

### Class

DSL:

```lira
define class User

define export class User

define export abstract class Repository

define abstract export class Repository
```

The last two are equivalent.

IR (normalized for `define export abstract class Repository`):

```json
{
  "id": "decl_Repository",
  "op": "define",
  "kind": "class",
  "name": "Repository",
  "modifiers": {
    "abstract": true,
    "export": true
  },
  "extends": null,
  "implements": [],
  "members": []
}
```

Relations:

```lira
define class Admin extends User

define class Service implements Persistable

define class Admin extends User implements Auditable, Persistable
```

IR excerpt:

```json
{
  "kind": "class",
  "name": "Admin",
  "extends": "User",
  "implements": ["Auditable", "Persistable"]
}
```

Illegal:

```lira
define async class User
define static class User
define private class User
```

### Function (module scope)

DSL:

```lira
define function greet

define export function greet

define export async function load
```

IR:

```json
{
  "id": "decl_greet",
  "op": "define",
  "kind": "function",
  "name": "greet",
  "modifiers": {
    "export": true
  },
  "params": [],
  "body": []
}
```

Illegal:

```lira
define method greet
define private function greet
define abstract function greet
```

### Method (class scope)

DSL:

```lira
define export abstract class Repository
  define abstract method save

  define private method normalize

  define static async method create
```

IR member excerpt:

```json
{
  "id": "decl_save",
  "op": "define",
  "kind": "method",
  "name": "save",
  "modifiers": {
    "abstract": true
  },
  "params": [],
  "body": null
}
```

Rules:

- `define method` only inside a class (D009).
- `abstract method` only inside `abstract class`; `body` must be `null`.
- `export` on methods is invalid.

### Property

DSL:

```lira
define class User
  define property name

  define private readonly property id

  define static property count
```

IR:

```json
{
  "id": "decl_id",
  "op": "define",
  "kind": "property",
  "name": "id",
  "modifiers": {
    "private": true,
    "readonly": true
  }
}
```

### Variable / constant

DSL:

```lira
define variable count

define export constant MAX

define class Counter
  define readonly variable total
```

IR:

```json
{
  "id": "decl_MAX",
  "op": "define",
  "kind": "constant",
  "name": "MAX",
  "modifiers": {
    "export": true
  }
}
```

Illegal:

```lira
define readonly constant MAX
define abstract variable x
define private variable x
```

(`private variable` at module scope is invalid; member fields should use `property` in v0.)

---

## Keyword-shaped identifiers

Allowed because kind appears before the name:

```lira
define class export

define method export
```

(Second form only inside a class.)

Ambiguous / illegal without kind-before-name resolution:

```lira
define export method
```

This is incomplete: `export` is a modifier and the method name is missing. Not a method named `export`.

---

## Imports

### Named and aliases

```lira
import User from "./models"

import User as U from "./models"

import a, b, c as x from "pkg"

import a as x, b as y from "pkg"
```

Normalized IR for mixed aliases:

```json
{
  "id": "imp_1",
  "op": "import",
  "source": "pkg",
  "style": "named",
  "items": [
    { "name": "a", "alias": null },
    { "name": "b", "alias": null },
    { "name": "c", "alias": "x" }
  ]
}
```

### Namespace

```lira
import all from "pkg" as utils
```

```json
{
  "id": "imp_2",
  "op": "import",
  "source": "pkg",
  "style": "namespace",
  "alias": "utils"
}
```

### Deferred

```lira
import default from "pkg" as x
export a from "pkg"
```

---

## Export operation vs export modifier

Two related forms:

1. **Modifier** on define: `define export class User`
2. **operation** listing locals: `export User`

Export operation IR:

```json
{
  "id": "exp_1",
  "op": "export",
  "items": [
    { "name": "User", "alias": null }
  ]
}
```

`export User as U` is allowed; alias binds to preceding item only.

---

## Scope tree examples

Sibling declarations:

```lira
define class User
define function greet
```

```text
module
├─ class User
└─ function greet
```

Owned method:

```lira
define class User
  define method getName
```

```text
module
└─ class User
   └─ method getName
```

Illegal ownership guess: never treat an unindented `define method` as inside the previous class.

---

## Normalization checklist

When converting DSL → IR:

1. Parse operation.
2. Collect modifiers until kind.
3. Read kind, then name.
4. Parse relations (`extends` / `implements` / `from` / `as`) with fixed binding rules.
5. Attach indented children.
6. Validate against [keyword-matrix-v0.md](keyword-matrix-v0.md).
7. Emit IR with unordered modifier flags and stable `id`s.

---

## Executable surface (F1–F7)

### Signatures + return

```lira
define export function greet(name: string) -> string
  return name
```

### Bindings

```lira
define constant label = "hi"
define variable count = 1
assign count = 2
```

### Expressions

Literals, refs, member chains (`note.title`). Also `construct Type(args)` and call-shaped expressions.

### Call / construct

```lira
define variable user = construct User("Ada")
call user.greet(other.name)
```

### Property types

```lira
define public property name: string
define public property name: string = "anon"
```

Omit the type when unknown; emitters must not invent `unknown`/`any`.

### Constructor + set

```lira
define constructor(name: string)
  set this.name = name
```

### Interface

```lira
define export interface Greeter
  define method greet(name: string) -> string
```

### Operators + if

```lira
define variable sum = a + b * 2
if sum >= 10 and not false
  return sum
else
  return a - b
```

Precedence: `* /` → `+ -` → comparisons → `and` → `or`. Unary: `not`, `-`.

## Intentionally still out of scope

- default import/export
- nested classes
- escaped identifiers
- brace/`end` blocks as alternative to indentation
- `while` / `for` / `match` / `else if` sugar
- bitwise ops, `===`

Do not invent spellings for out-of-scope forms; extend via revision protocol + feature tests.

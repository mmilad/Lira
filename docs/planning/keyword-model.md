# Keyword and Composition Model

> Status: planning draft. This document is intentionally question-heavy.

Lira should avoid copying the grammar of any one target language. The external language needs to be easy for humans and small language models to produce while mapping into a strict canonical IR.

The central design question is not only **which keywords exist**, but **how keywords compose**.

## 1. Proposed mental model

Instead of inventing a unique keyword for every construct, split statements into semantic roles:

```text
[operation] [modifiers...] [kind] [subject] [details...]
```

Examples:

```text
define class User

define abstract class Repository

export define class User

define export class User

import User from "./user"
```

This gives Lira a small vocabulary that can be composed rather than a very large vocabulary of special cases.

The exact accepted word order is still undecided.

## 2. Candidate keyword categories

### Operations

Operations describe what happens.

Candidate v0 operations:

- `define`
- `import`
- `export`
- `assign`
- `call`
- `return`
- `throw`
- `construct`
- `set`
- `get`
- `delete`
- `branch`
- `loop`

Questions:

- Is `define` useful, or is `class User` already clear enough?
- Should `construct User` and `new User` both exist?
- Is `set x = y` better for models than bare `x = y`?
- Should `export` be an operation, a modifier, or both at source level but normalized to one IR field?

### Declaration kinds

Kinds describe what is being declared.

Candidate v0 kinds:

- `module`
- `class`
- `interface`
- `function`
- `method`
- `property`
- `variable`
- `constant`
- `parameter`
- `type`
- `enum`

Possible later kinds:

- `trait`
- `mixin`
- `record`
- `struct`
- `namespace`
- `annotation`
- `decorator`

Question: should Lira expose concepts such as `interface` directly even when some targets have no equivalent, or represent them as a more abstract capability such as `contract`?

### Declaration modifiers

Candidate modifiers:

- `export`
- `default`
- `abstract`
- `final`
- `static`
- `async`
- `public`
- `protected`
- `private`
- `readonly`
- `optional`
- `override`

These should not automatically become target-language syntax. They should become semantic flags in the canonical IR and each backend must decide whether the target supports them, can emulate them, or must reject them.

Example canonical shape:

```json
{
  "kind": "class",
  "name": "Repository",
  "modifiers": {
    "export": true,
    "abstract": true
  }
}
```

This is preferable to encoding `export abstract class` as one indivisible construct.

## 3. Composition should normalize

Lira source may eventually permit more than one human-friendly spelling while normalizing them into exactly the same IR.

For example, these could potentially mean the same thing:

```text
export define abstract class Repository

define export abstract class Repository

define abstract export class Repository
```

All could normalize to:

```json
{
  "operation": "define",
  "kind": "class",
  "name": "Repository",
  "export": true,
  "abstract": true
}
```

### Major design question

Should Lira be:

**A. Strict source grammar**

Only one canonical order is valid.

```text
export abstract class Repository
```

Advantages:

- trivial parser
- predictable formatting
- smaller training surface
- fewer ambiguous cases

Disadvantages:

- producer must learn exact grammar

**B. Flexible source grammar, strict IR**

Several equivalent orders are accepted and normalized.

Advantages:

- easier natural generation
- potentially more forgiving for small models

Disadvantages:

- parser complexity
- ambiguity risk
- larger surface to test

Current leaning: **strict canonical output, optionally tolerant input**. A formatter could always rewrite accepted input to one canonical form.

## 4. Multi-item operations need explicit scoping

A major source of ambiguity is applying one modifier or alias to multiple subjects.

For example:

```text
import a, b, c as x from "pkg"
```

This is ambiguous without a rule. It could mean:

1. import `a`, `b`, and `c`, with only `c` renamed to `x`;
2. import a grouped object containing `a`, `b`, `c` as `x`;
3. import each of `a`, `b`, `c` under some transformation related to `x`.

Lira should not infer this.

### Proposed rule

**Aliases bind only to the immediately preceding item unless grouping is explicit.**

```text
import a, b, c as x from "pkg"
```

would mean:

```text
a -> a
b -> b
c -> x
```

To alias each item independently:

```text
import a as x, b as y, c as z from "pkg"
```

To bind a group under one namespace/object alias, use an explicit group form rather than overloading `as`:

```text
import all from "pkg" as x
```

or, if selective grouping becomes a real requirement:

```text
import group(a, b, c) from "pkg" as x
```

The second form should only exist if it maps cleanly to the canonical IR and useful target behavior.

## 5. Export composition

Consider:

```text
define and export class User
```

Natural language makes sense, but `and` may be unnecessary grammar.

Potential canonical source forms:

```text
export class User
```

or

```text
define export class User
```

Canonical IR should simply record both facts:

```json
{
  "kind": "class",
  "name": "User",
  "export": true
}
```

### Question: do we need `define` at all?

Compare:

```text
define class User
export define class User
```

with:

```text
class User
export class User
```

Removing `define` reduces tokens and grammar. Keeping it may make operation classification easier for small models and semantic routing.

This should be benchmarked instead of decided by aesthetics alone.

## 6. Abstract declarations

Example:

```text
define abstract class Repository
```

Potential canonical representation:

```json
{
  "kind": "class",
  "name": "Repository",
  "abstract": true
}
```

Open questions:

- Can individual methods be abstract?
- Can an abstract method have a body?
- What should a backend do if the target language has no native abstract classes?
- Should unsupported semantics fail compilation, degrade with a warning, or be emulated?

Default principle: **never silently erase semantic constraints**.

## 7. Keyword combinations should have compatibility rules

Not every modifier makes sense with every kind.

Examples:

```text
abstract variable x        # probably invalid
async class User           # probably invalid
static module foo          # probably invalid
readonly property id       # valid candidate
abstract method save       # valid candidate
export function parse      # valid candidate
```

The canonical specification should eventually include a compatibility matrix rather than spreading these checks through individual backends.

Conceptually:

| Modifier | class | method | function | property | variable |
|---|---:|---:|---:|---:|---:|
| export | yes | maybe | yes | maybe | yes |
| abstract | yes | yes | no | maybe | no |
| async | no | yes | yes | no | no |
| static | no? | yes | no? | yes | maybe |
| readonly | no | no | no | yes | yes |

Every `maybe` above is intentionally unresolved.

## 8. Avoid syntax sugar in the canonical IR

Source syntax may include conveniences, but the canonical IR should not.

Example source:

```text
export abstract class Repository
```

should become separate semantic properties rather than an `ExportAbstractClass` node.

Likewise:

```text
import a as x, b from "pkg"
```

should become an explicit collection:

```json
{
  "kind": "import",
  "source": "pkg",
  "items": [
    { "name": "a", "alias": "x" },
    { "name": "b", "alias": null }
  ]
}
```

This separation is important for language backends and error mapping.

## 9. Candidate v0 vocabulary

A deliberately small first vocabulary could be:

### Declarations

```text
module
class
interface
function
method
property
variable
constant
parameter
```

### Modifiers

```text
export
abstract
static
async
public
protected
private
readonly
optional
```

### Modules

```text
import
from
as
export
```

### Execution

```text
call
construct
assign
return
throw
```

### Control flow

```text
if
else
for
while
try
catch
finally
```

### Relations / structure

```text
extends
implements
returns
with
```

This is not a proposed frozen keyword list. It is a starting inventory for discussion.

## 10. Questions that should be answered before implementation

1. Is `define` required, optional, or removed?
2. Are modifiers order-sensitive in source syntax?
3. Is `export` syntactically a modifier, an operation, or both?
4. Does aliasing always bind to exactly one import item?
5. Do we support namespace imports separately from named imports?
6. Do we model default imports/exports as semantic concepts?
7. Does Lira expose `interface`, `trait`, `struct`, etc., or abstract them into fewer universal concepts?
8. What happens when a target cannot preserve a requested semantic modifier?
9. Which visibility modifiers belong in the portable core?
10. Are unsupported modifier/kind combinations parse errors or validation errors?
11. Should source syntax allow synonyms (`fn` / `function`) or exactly one spelling?
12. Should boolean modifiers use keywords or annotations/attributes?
13. Can modifiers appear after declarations, or only before them?
14. How are grouped operations scoped without relying on punctuation tricks?
15. Is minimizing token count more important than making statements read naturally?

These questions should be settled against concrete cross-language examples rather than in isolation.

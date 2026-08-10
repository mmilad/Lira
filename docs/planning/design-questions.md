# Lira Language Design Questions

> This file is a decision backlog, not a specification.

The goal is to make unresolved semantic questions explicit before implementation locks them in.

## A. Declaration grammar

### A1. Do declarations need `define`?

Candidates:

```text
define class User
```

```text
class User
```

Possible reason to keep `define`: it gives an SLM a strong operation token and keeps declarations structurally similar.

Possible reason to remove it: it is redundant and increases token count everywhere.

### A2. What is the canonical modifier order?

Possible canonical form:

```text
export public abstract class Repository
```

Questions:

- visibility before semantic modifiers?
- `export` always first?
- `static` before `async` for methods?
- should parser accept non-canonical order and formatter normalize it?

### A3. Do declaration modifiers belong before or after the kind?

```text
abstract class Repository
```

vs.

```text
class Repository abstract
```

Prefix form is familiar to many languages, but suffix form can simplify some natural-language composition.

## B. Imports and exports

### B1. Named import alias binding

Proposed rule:

```text
import a, b, c as x from "pkg"
```

means only `c` becomes `x`.

Question: should this form be legal at all, or should mixed aliased/unaliased imports require explicit grouping such as:

```text
import { a, b, c as x } from "pkg"
```

Even if braces are not part of final Lira syntax, explicit collection boundaries may eliminate ambiguity.

### B2. Namespace import

Need a semantic distinction between:

```text
import all from "pkg" as x
```

and

```text
import default from "pkg" as x
```

and

```text
import a as x from "pkg"
```

These are not the same operation in many module systems.

### B3. Re-export

How should Lira represent:

```text
export a from "pkg"
```

without first importing `a` into local scope?

Possible semantic operations:

- import + export two-step
- dedicated re-export node
- export declaration with external source

### B4. `default` export

Is `default` important enough for the portable core?

Targets differ significantly here.

Possible policy:

- model it explicitly;
- model only named exports in core;
- support default export as backend extension.

## C. Type and declaration concepts

### C1. `interface` vs `contract`

Should Lira expose familiar source-language concepts:

```text
interface UserRepository
```

or a neutral concept:

```text
contract UserRepository
```

A neutral concept may map better across languages, but unfamiliar vocabulary may be harder for models and users.

### C2. `class`, `struct`, `record`

Are these separate semantic concepts, or should Lira have one `data`/`object` declaration with capabilities?

Questions:

- value vs reference semantics matter;
- mutability matters;
- constructor semantics differ;
- inheritance support differs.

Collapsing them too aggressively could destroy important semantics.

### C3. Abstract methods

```text
abstract method save(user: User) returns void
```

Questions:

- only valid inside abstract class?
- valid inside interfaces/contracts?
- may it declare visibility?
- may it declare `async`?

### C4. Static members

Should `static` mean target-language static storage/dispatch, or a more general class-level member concept?

## D. Functions and calls

### D1. Function vs method

Should the producer explicitly distinguish:

```text
function parse
method save
```

or should placement determine the difference?

Explicit `method` is redundant inside a class but may reduce parser/AI ambiguity.

### D2. Named arguments

Should Lira model named arguments independently of target-language support?

```text
call createUser(name: "Ada", active: true)
```

If the target language lacks named arguments, can the backend safely reorder them from signature metadata?

### D3. Calls vs construction

Keep distinct:

```text
call User(...)
construct User(...)
```

or infer constructor use from type context?

Explicit distinction is safer for a semantic IR.

## E. Assignment and mutation

### E1. `assign` vs `set`

Potential distinction:

```text
assign x = 1
set user.name = "Ada"
```

Could mean:

- `assign`: bind/rebind a variable;
- `set`: mutate a property/index.

This may be semantically valuable across languages.

### E2. Immutable bindings

Should declaration intent be:

```text
variable x
constant x
```

or:

```text
let x
const x
```

or modifier based:

```text
readonly variable x
```

## F. Control flow

### F1. Generic loop vs concrete loops

Possible semantic core:

```text
for item in items
while condition
```

Alternative: one generic loop node with strategies.

Concrete loops are easier to read and generate; generic nodes may map better internally.

### F2. Pattern matching

Do we need `match`/`switch` in v0 or can nested conditions cover early examples?

### F3. Exceptions

Do `try`, `catch`, `finally`, and `throw` belong in portable core despite languages with different error models?

## G. Unsupported target semantics

This is one of the most important policy decisions.

Suppose Lira requests:

```text
protected abstract method save
```

and a target cannot represent one property faithfully.

Backend behavior options:

1. **error** — refuse to compile;
2. **warning + degrade** — generate closest equivalent;
3. **emulate** — generate helper code/runtime checks;
4. **configurable strictness**.

Recommended default for early Lira: **strict error on semantic loss**. Silent degradation would make cross-language compilation untrustworthy.

## H. Canonical IR vs source syntax

A key architectural decision:

```text
Lira source syntax ≠ Lira canonical IR
```

The source format can be ergonomic or tolerant. The canonical IR must be explicit and unambiguous.

Example source:

```text
export abstract class Repository
```

Canonical IR:

```json
{
  "node": "declaration",
  "kind": "class",
  "name": "Repository",
  "modifiers": ["export", "abstract"]
}
```

This gives us freedom to evolve textual syntax without forcing compiler backends to parse it.

## I. Questions to benchmark with SLMs

Some grammar choices should be measured rather than argued about.

Candidate experiments:

- `define class User` vs `class User`
- explicit `call foo` vs `foo()`-like syntax
- fixed modifier order vs tolerant order
- `construct User` vs `new User`
- explicit `method` inside class vs contextual function declaration
- verbose `returns string` vs symbolic `-> string`
- punctuation-heavy grouping vs keyword-heavy grouping

Measure at least:

- valid parse rate;
- semantic correctness;
- repair success after parser feedback;
- output token count;
- errors per construct;
- performance by model size.

The language should optimize for **reliable semantic generation**, not simply resemble existing programming languages.

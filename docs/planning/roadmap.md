# Lira Planning Roadmap

> Goal: settle semantics before implementation.

Lira should be designed from the canonical semantic model outward. The textual DSL, parser, API and language backends should follow after the important semantic decisions are explicit.

## Phase 0 — Define the contract

### 0.1 Decide what Lira is

Target definition:

> Lira is a language-independent semantic representation and compilation interface intended for humans, tools and language models.

Clarify:

- Is textual `.lira` syntax a primary product or just one frontend?
- Is JSON/API input equally important?
- Is AI generation a core requirement or only a motivating use case?
- Is strict semantic portability more important than covering every target-language feature?

### 0.2 Separate source syntax from canonical IR

Decide early that:

```text
producer syntax
     ↓
canonical IR
     ↓
backend
```

Compiler backends should consume canonical IR, never raw Lira source text.

## Phase 1 — Declaration model

Resolve before anything else:

1. `define` or no `define`;
2. declaration kinds;
3. modifier model;
4. modifier ordering;
5. valid modifier/kind combinations;
6. visibility model;
7. inheritance/contracts;
8. export semantics.

Minimum test declarations:

```text
class User
export class User
abstract class Repository
export abstract class Repository
class Admin extends User
class Service implements Contract
```

Expected result of Phase 1: canonical JSON examples for each declaration.

## Phase 2 — Module model

Resolve imports before implementing a parser because aliasing and grouping affect grammar heavily.

Test cases:

```text
import a from "pkg"
import a as x from "pkg"
import a, b, c from "pkg"
import a, b, c as x from "pkg"
import a as x, b as y from "pkg"
import all from "pkg" as x
import default from "pkg" as x
export a
export a from "pkg"
```

For every case document:

- whether syntax is legal;
- exact canonical IR;
- TypeScript mapping;
- Python mapping;
- PHP mapping or explicit unsupported status.

## Phase 3 — Values, expressions and calls

Decide:

- literals;
- references;
- property access;
- index access;
- calls;
- construction;
- operators;
- arguments;
- named arguments.

Key principle: avoid relying on target-specific parsing conventions.

## Phase 4 — Binding and mutation

Define exact semantic difference among:

- declaration;
- initialization;
- assignment/rebinding;
- property mutation;
- immutable binding;
- mutable binding.

Test cases should intentionally expose differences between TypeScript, Python and PHP.

## Phase 5 — Functions and methods

Resolve:

- function vs method;
- parameters;
- return values;
- async;
- static;
- visibility;
- abstract methods;
- optional/default parameters;
- variadic parameters.

Do not add advanced generics yet unless required by test programs.

## Phase 6 — Control flow

Add only the smallest useful set:

- `if` / `else`;
- iteration;
- `while`;
- `return`;
- `throw`;
- `try` / `catch` if retained in portable core.

Delay pattern matching, generators and target-specific control flow.

## Phase 7 — Type system

Only after real examples reveal what is required.

Start with:

- string;
- number;
- boolean;
- null/optional;
- arrays/collections;
- named types;
- function return type.

Then ask whether Lira needs:

- union types;
- generics;
- tuples;
- maps/dictionaries;
- callable types;
- structural typing.

Avoid recreating TypeScript's type system accidentally.

## Phase 8 — Portability policy

Every backend feature should fall into one category:

- `native` — semantic construct maps directly;
- `emulated` — backend can preserve meaning using generated support code;
- `degraded` — only allowed under explicit non-strict mode;
- `unsupported` — compilation error.

Default v0 mode should prefer correctness over successful compilation.

## Phase 9 — Traceability and diagnostics

Before optimizing AI repair, establish:

- stable node IDs;
- source-to-IR mappings;
- IR-to-generated-source mappings;
- backend diagnostics;
- reverse mapping of compiler errors.

Target diagnostic chain:

```text
Lira source location
        ↕
canonical IR node ID
        ↕
generated source location
        ↕
target compiler/runtime diagnostic
```

## Phase 10 — First implementation

Only now choose implementation technology (**Node/TypeScript** preferred for the compiler host).

Minimum prototype:

1. textual parser or JSON input;
2. canonical IR schema;
3. validator;
4. shared backend API (`compile(ir, options) -> files/diagnostics/sourceMap`);
5. at most **three** initial backends to pressure that API — planned: TypeScript, Python, PHP;
6. source mapping with IR node IDs;
7. CLI wrapper over the same API.

Do not add a fourth target until the three-backend API feels stable. `module` remains the portable unit each backend must map honestly.

## Phase 11 — SLM experiment

Compare:

### Direct generation

```text
prompt → SLM → TypeScript/Python
```

### Lira generation

```text
prompt → SLM → Lira → deterministic compiler
```

Measure:

- valid program rate;
- semantic task success;
- parser errors;
- compiler errors;
- repair attempts;
- repair success;
- tokens generated by model;
- latency;
- performance by model size.

This experiment can later support or disprove the research claim behind Lira.

# Recommended next design session

Do **only declarations + imports/exports** first.

Produce around 20 intentionally awkward examples and force each one into exact semantics. Important cases include:

```text
export abstract class Repository
import a, b, c as x from "pkg"
import a as x, b, c as y from "pkg"
export a, b as c
export a from "pkg"
abstract static method create
private abstract method save
async abstract method load
class A extends B implements C, D
```

If any statement can be read in two reasonable ways, Lira needs either stricter syntax or explicit grouping.

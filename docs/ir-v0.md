# Lira IR v0 — Draft

> This is a discussion draft, not a compatibility promise. Much of the candidate surface below is now **implemented**: structure (`module`/`import`/`class`/`interface`/`function`/`method`/`property`/`variable`/`constant`), expressions (literals, refs, member/index access, calls, construction, unary/binary ops), and statements (`assign`/`set`, expression/`call`, `return`, `if`/`else`, `for`-in, `throw`). Still candidates only: `while`, `try`/`catch`, and richer types. The concrete IR shape the parser emits is shown in [planning/keyword-dsl-v0.md](planning/keyword-dsl-v0.md).

The purpose of v0 is to discover the smallest semantic surface that can express useful programs across multiple target languages.

## Candidate primitives

### Structure

- `module`
- `import`
- `class`
- `function`
- `method`
- `parameter`
- `variable`

### Expressions

- literal values
- variable references
- property access
- function/method calls
- object construction
- unary operations
- binary operations

### Statements

- assignment
- expression statement
- return
- conditional
- loop
- throw
- try/catch

### Types

Initial portable candidates:

- `string`
- `number`
- `boolean`
- `null`
- `any`
- named/user-defined types
- arrays/lists
- optional values

The type system should remain deliberately smaller than TypeScript, Python typing, PHP types, Rust types, etc. Backends may need to degrade or enrich representations depending on target capabilities.

## Identity and traceability

Every semantic node should be able to carry a stable ID.

Conceptually:

```text
@id(op_17)
call validate_name(name)
```

A compiler backend can then emit mapping metadata such as:

```text
op_17 -> generated.ts:42:1-42:28
```

This allows a compiler/runtime diagnostic to be translated back to the Lira operation responsible for the generated code.

## Repair model

Instead of regenerating an entire source file, tooling should eventually be able to express semantic patches against stable node IDs.

Conceptually:

```text
patch op_17
  argument 0 = normalized_name
```

The exact patch format is intentionally undefined for now.

## What v0 should prove

Before expanding the IR, Lira should demonstrate that the same non-trivial program can be represented once and compiled into at least two substantially different target languages while retaining useful error/source mapping.

The first implementation should optimize for learning rather than completeness.

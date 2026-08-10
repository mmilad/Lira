# Architecture

> Status: early design notes. Nothing in this document is stable yet.

Lira separates semantic program representation from target-language syntax.

## Pipeline

```text
producer (human / AI / tool)
            ↓
        Lira source
            ↓
          parser
            ↓
       canonical IR
            ↓
        validation
            ↓
     compiler backend
            ↓
      generated code
```

A producer should not need to know the syntax rules of the target language. It should only express program structure and behavior that Lira understands.

## Core components

### Parser

Converts the human/AI-friendly Lira representation into a canonical machine representation.

### Canonical IR

The stable semantic model shared by all backends. This is the most important compatibility boundary in the project.

### Validator

Rejects invalid or unsupported combinations before a backend generates source code.

### Compiler backend

Maps canonical Lira operations into a target language. Backends may apply language-specific rules while preserving the same program intent.

### Source map

Tracks which generated source ranges originate from which Lira operations. This should make compiler and runtime errors traceable back to the semantic representation.

## Design principles

1. Keep the semantic core small.
2. Prefer explicit operations over target-language syntax leakage.
3. Do not model every feature of every language in v0.
4. Backend-specific features should not silently corrupt language independence.
5. Every meaningful IR node should be addressable so that errors and patches can refer to it.
6. Validation should happen before code generation whenever possible.

## Open questions

- What is the minimal useful type system?
- How should imports/modules be represented across incompatible module systems?
- Which control-flow constructs belong in the portable core?
- How should language-specific extensions work?
- Should the external Lira syntax be text, JSON, or both?
- What guarantees should compiler backends provide about semantic equivalence?
- What mapping format should connect generated code back to Lira node IDs?

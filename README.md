# Lira

**Language Independent Representation API**

Lira is an open-source experiment for representing program intent in a small, language-independent intermediate representation (IR) and compiling that representation into real source code.

```text
Natural language / AI / tooling
            ↓
          Lira IR
            ↓
     deterministic compiler
      ↙        ↓        ↘
TypeScript   Python     PHP   ...custom
```

## Why Lira?

Direct AI code generation mixes two different jobs:

1. deciding what the program should do;
2. producing correct syntax for a target language.

Lira separates those concerns. A model or tool produces a constrained semantic representation. Deterministic compiler backends then turn that representation into target-language code.

The long-term goal is to make code generation easier to validate, translate, debug and repair — especially for smaller language models.

## Core ideas

- **Language independent** — one representation can target multiple languages.
- **Deterministic backends** — syntax belongs to compiler backends, not the model.
- **Small-model friendly** — models operate on a smaller semantic surface.
- **Traceable** — generated code can map back to the Lira operation that produced it.
- **Repairable** — errors can be mapped back to semantic operations instead of rewriting whole files.
- **Extensible** — custom target-language backends should be pluggable.

## Example

An early Lira representation may look roughly like this:

```lira
module user_service

import User from "./models"

class UserService
  method create(name: string) -> User
    user = new User(name)
    return user
```

The exact syntax and semantic model are **not stable yet**. The first milestone is to define the smallest useful IR before committing to implementation details.

## Planned architecture

```text
                ┌───────────────┐
                │   Lira input  │
                └───────┬───────┘
                        │
                ┌───────▼───────┐
                │ Parser / API  │
                └───────┬───────┘
                        │
                ┌───────▼───────┐
                │ Canonical IR  │
                └───────┬───────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼───────┐ ┌─────▼──────┐ ┌─────▼─────┐
│ TypeScript    │ │ Python     │ │ PHP       │
│ backend       │ │ backend    │ │ backend   │
└───────────────┘ └────────────┘ └───────────┘
```

## Repository layout

```text
Lira/
├─ docs/                 design notes and IR specification
│  └─ planning/          vision, decisions, keyword→DSL v0
├─ examples/
│  └─ v0/                keyword composition corpus
├─ .cursor/skills/       project Cursor skills
└─ README.md
```

## Current experiment

Keyword → DSL v0: freeze how declaration/import keywords compose into `.lira` and normalize to IR. No transpilers yet.

Start here:

- [docs/planning/vision.md](docs/planning/vision.md)
- [docs/planning/experiment-v0.md](docs/planning/experiment-v0.md)
- [docs/planning/keyword-dsl-v0.md](docs/planning/keyword-dsl-v0.md)
- [docs/planning/keyword-matrix-v0.md](docs/planning/keyword-matrix-v0.md)
- Checker: `node tools/lira_keyword_dsl.mjs check`
- Optional Cursor skill: `.cursor/skills/lira-keyword-dsl/`

## Status

**Experimental / pre-alpha.**

The project is defining its keyword→DSL surface before compilers. Compatibility is not guaranteed yet.

## License

MIT

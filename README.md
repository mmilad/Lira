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

The exact syntax and semantic model are still evolving. A canonical IR and early TypeScript/Python emitters already exist; the surface grows feature-by-feature (see the [decision log](docs/planning/decision-log.md)) rather than committing to a full language up front.

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

## Current state

The keyword→DSL v0 surface is frozen and has grown into a small **executable DSL** (features F1–F15: signatures, bindings, expressions, calls, members, constructors, interfaces, operators, `if`/`else`, collections, `for`-in, nullable types, `throw`).

Early **transpilers exist**: deterministic TypeScript and Python emitters run over the canonical IR. A committed-golden test pipeline parses `.lira` → IR → target source so regressions are caught by diff.

```text
.lira  →  parser + validator  →  canonical IR  →  { TypeScript, Python } emitters
```

Everything is still early: the emitted source is not yet a runnable program (module/import resolution, an entry point, and runtime output are the next milestones). See the [roadmap](docs/planning/roadmap.md) for the path toward a minimal proof-of-concept app.

Start here:

- [docs/planning/vision.md](docs/planning/vision.md) — north star
- [docs/planning/roadmap.md](docs/planning/roadmap.md) — status and next steps toward a PoC app
- [docs/planning/keyword-dsl-v0.md](docs/planning/keyword-dsl-v0.md) — DSL spelling + IR normalization (incl. executable surface)
- [docs/planning/keyword-matrix-v0.md](docs/planning/keyword-matrix-v0.md) — allowed/invalid keyword combinations
- [docs/planning/target-mapping.md](docs/planning/target-mapping.md) — Lira → TS/Python mapping contract
- [docs/planning/decision-log.md](docs/planning/decision-log.md) — accepted decisions (D001–D033)
- Checker: `node tools/lira_keyword_dsl.mjs check`
- Test pipeline: `npm run generate` then `npm test` (see [test/README.md](test/README.md))
- Optional Cursor skill: `.cursor/skills/lira-keyword-dsl/`

## Status

**Experimental / pre-alpha.**

The keyword→DSL surface and canonical IR are the stable-ish core; the TypeScript and Python emitters are early and evolving. Compatibility is not guaranteed yet.

## License

MIT

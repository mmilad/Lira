# Registry v0

> Status: design foundation / migration in progress. The existing parser remains authoritative until the migration is complete.

## Purpose

Lira should be forgiving at the vocabulary layer without duplicating semantics per target language. The registry therefore describes Lira concepts once and attaches spellings, semantic roles, compatibility metadata and target support to those concepts.

The registry is declarative. Keyword-specific executable handlers are intentionally excluded.

## Decisions

### One concept entry, not one entry per target

A Lira concept has one registry entry:

```json
{
  "id": "modifier.export",
  "semantic": "export",
  "role": "modifier",
  "preferred": "export",
  "aliases": ["exported"],
  "targets": {
    "ts": "native",
    "py": "mapped"
  }
}
```

Target metadata describes whether the semantic concept can be represented. It does **not** define emitted syntax.

### Preferred spellings and aliases

- `preferred` is the spelling shown to guided producers/LLMs.
- `aliases` are tolerated spellings accepted by vocabulary resolution.
- aliases must normalize to the exact same semantic concept.
- preferred-vocabulary queries return only preferred spellings by default.

This is deliberate: aliases can later be tested as emergent behavior without explicitly teaching them to the model.

### Target support

Initial support states:

- `native` — target language has a close/direct representation.
- `mapped` — Lira can preserve the intended semantic through a target-specific mapping.
- `unsupported` — the target cannot preserve the semantic sufficiently.
- `deferred` — support is intentionally undecided/not implemented yet.

Emitters remain responsible for *how* a `mapped` or `native` semantic is rendered.

### Semantic roles

Registry entries are grouped by role rather than stored as a single undocumented keyword bag:

- `kind`
- `modifier`
- `operation`
- `relation`

More roles may appear only when a concrete language feature requires them.

### Capabilities

Capabilities are used sparingly to describe reusable compatibility properties, for example:

- `exportable`
- `abstractable`
- `visible`
- `staticable`
- `asyncable`
- `readonlyable`
- `member_container`

They are not intended to encode the full grammar as a second language.

### Scope

Structural compatibility remains explicit where useful. A concept may declare valid scopes such as:

```text
module
class
interface
function
method
constructor
if_then
if_else
for_body
```

Indentation continues to determine ownership/scope in textual Lira.

## Vocabulary queries for models

The long-term producer API should not dump the full language specification into an LLM context. It should query only vocabulary relevant to the current state.

Conceptually:

```js
preferredVocabulary({
  target: "py",
  scope: "class"
})
```

returns preferred words only.

Later this can become more context-aware by including the current operation, selected modifiers and declaration kind, but v0 intentionally avoids building a next-token state machine.

## Migration strategy

The registry is being introduced in two slices.

### Slice 1 — registry foundation

- add declarative registry
- add registry self-validation
- copy existing modifier compatibility without changing semantics
- document preferred/alias/target behavior
- do not enable new DSL spellings yet

### Slice 2 — parser migration

- derive `KINDS`, `MODIFIERS`, visibility groups and compatibility from the registry
- resolve aliases generically before parsing semantics
- remove duplicated keyword/matrix constants from the parser
- keep all existing corpus and pipeline goldens unchanged
- add focused alias cases only after parity is proven

## Non-goals for this refactor

- no new DSL constructs
- no PHP emitter
- no source maps
- no target-specific keyword registry copies
- no per-keyword resolver callbacks
- no grammar-guided next-token engine yet

## Success criterion

The migration is successful when the existing parser/corpus/pipeline behavior is unchanged while vocabulary, aliases and compatibility are centrally declared and queryable for future LLM guidance.

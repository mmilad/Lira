# Registry v0

> Status: Slice 2 complete. The parser/validator consumes registry runtime views for kinds, modifiers, visibility, scope classifications, and the modifier compatibility matrix. Aliases remain registered but dormant (Slice 3).

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

Aliases are registered but are **not enabled as new parser syntax during the structural refactor**. Alias parsing is a separate experiment after parity.

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

## Runtime views

`tools/lira_registry_runtime.mjs` derives the Set/table shapes used by the current parser design:

```text
KIND_WORDS
MODIFIER_WORDS
VISIBILITY_WORDS
MEMBER_KINDS
MODULE_ONLY_KINDS
CALLABLE_KINDS
BODY_OWNER_SCOPES
MODIFIER_MATRIX
```

`tools/lira_keyword_dsl.mjs` imports these views rather than maintaining a second copy of the semantic tables. Expression operators and other low-level parse mechanics stay parser-local.

A parity guard in `lira_registry_check.mjs` asserts that the derived Sets and the full modifier matrix (including the `module` column) still match the frozen v0 surface. When the language intentionally changes, that guard should be updated in the same change as the design decision.

## Vocabulary queries for models

The producer side should not dump the full language specification into an LLM context. `tools/lira_vocabulary.mjs` exposes a deliberately small contextual query that returns **preferred spellings only**.

Conceptually:

```js
getVocabulary({
  target: "py",
  scope: "class",
  role: "modifier",
  kind: "method",
  usedModifiers: ["private"]
})
```

The query currently filters:

- target support
- scope
- semantic role
- selected declaration kind / required capability
- already-used modifiers
- mutually exclusive modifier groups such as visibility

It is intentionally **not** a next-token grammar/state machine.

## Migration strategy

### Slice 1 — registry foundation — complete

- declarative registry added
- registry self-validation added
- existing modifier compatibility copied without changing semantics
- preferred/alias/target behavior documented
- parser-compatible runtime views derived from registry
- contextual preferred-vocabulary query added
- registry/parity checks included in the default test command
- no new DSL spelling enabled

### Slice 2 — parser migration — complete

- parser-local `KINDS`, `MODIFIERS`, visibility sets and compatibility matrix replaced with imports from `lira_registry_runtime.mjs`
- preferred spellings only; aliases not enabled as parser syntax
- duplicated keyword/matrix constants removed from the parser
- existing corpus and pipeline goldens unchanged
- parser/corpus/pipeline parity verified
- matrix parity check strengthened to deep-equal the full v0 table

### Slice 3 — alias experiment — only after parity

- add generic vocabulary resolution at the parser boundary
- normalize aliases to preferred/semantic concepts before semantic parsing
- add focused alias corpus cases
- do not expose aliases through guided vocabulary
- measure whether producers/models use aliases without being taught them

## Non-goals for this refactor

- no new DSL constructs
- no PHP emitter
- no source maps
- no target-specific keyword registry copies
- no per-keyword resolver callbacks
- no grammar-guided next-token engine yet

## Success criterion

Slice 1–2 succeed when parser/corpus/pipeline behavior stays unchanged while vocabulary, aliases and compatibility are centrally declared and queryable for future LLM guidance. Slice 3 then measures alias tolerance without expanding guided vocabulary.

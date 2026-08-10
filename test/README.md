# Lira test pipeline

Committed goldens — regenerate, then retest. Idempotent by design.

```text
test/lira_scripts/<scope>/<rel>.lira
        ↓ parse
test/lira_dsl/<rel>.json
        ↓ emit
test/lira_output/<target>/<rel>.<ext>
```

## Script scopes

First path segment under `lira_scripts/` is the **scope**:

| Scope | Emits to |
|---|---|
| `shared` | every language (`ts`, `py`, …) |
| `ts` | TypeScript only |
| `py` | Python only |

Goldens **strip the scope segment** (flat paths). Post-scope `<rel>` must be unique across scopes.

When writing scripts, use keywords that fit the scope (`shared` = portable surface). The pipeline does not reject “wrong-scope” keywords.

```bash
npm run generate   # write/update committed dsl + output
npm test           # re-parse/re-emit and diff against committed files
```

Only **legal** `.lira` scripts belong here. Illegal keyword cases stay under `examples/v0/illegal/`.

Portable feature slices live under `test/lira_scripts/shared/features/`. Language-local demos go under `test/lira_scripts/ts/` or `…/py/`. Runnable apps: `shared/notes_app/` and `shared/api_service/` (runtime stdout parity checked in `npm test`).

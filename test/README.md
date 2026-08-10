# Lira test pipeline

Committed goldens — regenerate, then retest. Idempotent by design.

```text
test/lira_scripts/**/*.lira
        ↓ parse
test/lira_dsl/<name>.json
        ↓ emit
test/lira_output/ts/<name>.ts
test/lira_output/py/<name>.py
```

```bash
npm run generate   # write/update committed dsl + output
npm test           # re-parse/re-emit and diff against committed files
```

Only **legal** `.lira` scripts belong here. Illegal keyword cases stay under `examples/v0/illegal/`.

Feature slices live under `test/lira_scripts/features/f1_return` … `f7_interface`. The `notes_app/` folder is the end-to-end structural+executable sketch.

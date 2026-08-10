# Notes app (executable keyword DSL)

Runnable portable app: models, store interface, in-memory store, service, and `main` entry.

```bash
npm run generate
npm test
```

Runtime parity (TS + Python stdout match) is verified automatically in `npm test`.

Expected stdout:

```text
notes: starting
hello
hello
```

Outputs land in `test/lira_dsl/notes_app/` and `test/lira_output/{ts,py}/notes_app/`.

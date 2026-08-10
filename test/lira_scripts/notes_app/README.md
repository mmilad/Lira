# Notes app (keyword→DSL sketch)

Small portable app shape authored with the `lira-keyword-dsl` rules.
Structure only for now — no expression/control-flow bodies in v0.

## Modules

| Script | Module | Role |
|---|---|---|
| `models.lira` | `notes_models` | `Note` entity |
| `store.lira` | `notes_store` | abstract persistence port |
| `service.lira` | `notes_service` | application service |
| `main.lira` | `notes_main` | entry helpers / constants |

## Cross-language test idea

Same scripts → committed IR under `test/lira_dsl/notes_app/` → emitted `ts` + `py` under `test/lira_output/`.
When method bodies exist later, behavior tests can target each emit namespace; today the pipeline proves structural idempotency.

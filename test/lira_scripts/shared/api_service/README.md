# API service (executable keyword DSL)

Portable REST-style service layer: models, store interface, in-memory store, API service with routing, and a runnable `main`.

```bash
npm run generate
npm test
```

Expected stdout (TS and Python must match):

```text
api: starting user-service
ok
alice
bob
alice
alice
alice
bob
```

Outputs land in `test/lira_dsl/api_service/` and `test/lira_output/{ts,py}/api_service/`.

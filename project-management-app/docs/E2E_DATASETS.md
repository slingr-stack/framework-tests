# E2E Dataset Strategy

This app's E2E tests use dataset-backed setup for specs that depend on pre-seeded records.

## Goals

- Centralize reusable datasets.
- Make dataset selection configurable.
- Allow automated reset and load of data before specific specs via the isolated runner.
- Prevent cross-spec shared-state coupling for seed-dependent specs.

## Files

- `frontend/tests/e2e/datasets/profiles.json`
- `frontend/tests/e2e/datasets/spec-datasets.json`
- `frontend/tests/e2e/datasets/dataset-manager.ts` (TS wrapper for spec imports)
- `frontend/tests/e2e/framework/dataset-manager.cjs`
- `frontend/tests/e2e/run-isolated.cjs`

## How It Works

Dataset reset/load is **opt-in** and operates in two modes:

### 1. Default runner (`npm run test:e2e`)
The standard Playwright run with 4 workers. **No automatic dataset reset is performed.** Specs that rely on seeded records (`bulk-actions`, `bulk-assign-to-me`, `table-selection`, `summary-view`, `task-assignee-details`) assume the baseline dataset is already loaded. Run `npx drumr ds mainDs load default` once before this mode.

### 2. Isolated runner (opt-in, `run-isolated.cjs`)
The runner enumerates specs (or a selected spec), and **before each spec**:
   1. `npx drumr ds mainDs reset`
   2. `npx drumr ds mainDs load <dataset>`

The spec is then executed with `--workers=1` to keep resets sequential and safe on a shared backend.

This gives deterministic, repeatable data state per spec at the cost of longer total run time.

## Commands

Keep current command behavior unchanged:

```bash
npm run test:e2e
```

Run full isolated suite with dataset reset/load per spec (opt-in):

```bash
node frontend/tests/e2e/run-isolated.cjs
```

Run one spec with isolated dataset setup (opt-in):

```bash
node frontend/tests/e2e/run-isolated.cjs --spec=tasks-crud.spec.ts
```

Run isolated mode with extra Playwright args (opt-in):

```bash
node frontend/tests/e2e/run-isolated.cjs --spec=tasks-crud.spec.ts --headed
```

## Adding or Reusing Datasets

1. Add a profile in `profiles.json`.
2. Map spec files to profile names in `spec-datasets.json`.
3. Create/adjust corresponding dataset files under backend datasource datasets.

## Notes

- Keep baseline data in `backend/src/config/data-sources/datasets/mainDs/default` unless a dedicated profile is needed.
- If a spec requires special baseline records, create a dedicated dataset profile and map the spec to it.

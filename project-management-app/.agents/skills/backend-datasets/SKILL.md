---
name: backend-datasets
description: Authors and loads Drumr backend datasets. Use when a task involves creating JSONL dataset files (manually or via a custom script), loading with `drumr ds <datasource> load [dataset]`, or includeModels/excludeModels filtering, with datasets stored under backend/src/dataSets/<idDataSource>/<dataset-name>/.
---

# Backend datasets

## When to use

This skill defines the standard Drumr workflow for dataset authoring and loading.

Use this skill when the user asks to:

- Create or update dataset JSONL files manually or via a project-specific script
- Load datasets through CLI (`drumr ds <datasource> load [dataset]`)
- Include or exclude specific models during dataset loading

## What this skill covers

It provides:

1. Exact dataset structure and file conventions
2. Step-by-step workflow for authoring and loading datasets
3. Concrete JSONL examples
4. Validation loop guidance (validate, fix, re-run)
5. Guardrails for `--includeModels` and `--excludeModels`
6. AppFile fixture rules for `__path` and dataset-backed test bootstrap

## Multi-skill routing

- Use [backend-files](../backend-files/SKILL.md) when the task also defines the concrete `File extends AppFile` model, file reference fields, or file permissions.
- Use [testing-integration](../testing-integration/SKILL.md) when the task is specifically about `initTestContext({ dataSet })` or integration-test lifecycle.
- Use [cli-commands](../cli-commands/SKILL.md) when the task needs broader `drumr ds` command coverage beyond dataset loading.

## Dataset structure (required)

Path convention:

```text
backend/src/dataSets/<idDataSource>/<dataset-name>/ModelName.jsonl
```

Rules:

1. `<idDataSource>` is the datasource segment used in dataset grouping.
2. `<dataset-name>` identifies scenario scope (for example: `default`, `qa-smoke`, `demo`).
3. `ModelName.jsonl` must match the target `@DataModel` name.
4. File content must be JSONL (one JSON object per line, no array wrapper).
5. Each object must match `@DataModel` field names and value types.
6. Reference fields should be represented as string IDs in dataset records.

Datasource datasets live under the app backend using the datasource id as the grouping folder:

```text
src/dataSets/<datasource-id>/<dataset>/
  ModelName.jsonl
  AnotherModel.jsonl
  datasetOptions.json
```

From the app root, the same location is:

```text
backend/src/dataSets/<datasource-id>/<dataset>/
```

Example:

```text
src/dataSets/postgres-db/test-loading/
  User.jsonl
  Project.jsonl
  Task.jsonl
  File.jsonl
```

- Use the datasource id as the folder name, for example `postgres-db` or `mainDs`.
- The same dataset layout is used by both the CLI loader and backend test bootstrap (`initTestContext({ dataSet })`).
- Use dataset names such as `default` for shared seed data and `test-*` for automated test fixtures.
- `datasetOptions.json` may define default `includeModels` and `excludeModels` filters.
- CLI filter flags override `datasetOptions.json`.
- If both filters are still present after merging file defaults and CLI input, the loader keeps `includeModels` and ignores `excludeModels` with a warning.

## AppFile records and `__path`

For concrete file models that extend `AppFile`, dataset records may include the reserved metadata field `__path` to point at a binary fixture.

Use the concrete model file name in the dataset folder, for example `File.jsonl`, not `AppFile.jsonl`.

Every file record must satisfy the concrete model contract, including inherited `AppFile` fields such as `id`, `name`, `size`, and `contentType`.

```json
{
  "id": "44444444-4444-4444-8444-444444444444",
  "name": "sample.pdf",
  "size": 24576,
  "contentType": "application/pdf",
  "__path": "../../tests/integration/files/sample.pdf"
}
```

- `__path` is dataset-loader metadata, not a datasource/model field.
- `__path` must be a non-empty relative path; absolute paths are rejected.
- The path is resolved relative to the JSONL file that declares it.
- `AppFile` records that use `__path` must declare an `id` so the loader knows the storage target.
- The loader strips `__path` before `fromJSON()` and copies the file to `process.env.STORAGE_PATH ?? 'files'` only after the record is saved successfully.
- If `__path` is omitted, the loader looks for a fallback fixture named by file id under `backend/files/` and `docs/files/`.
- Dataset binaries can live next to the dataset or anywhere else under the app, as long as `__path` stays relative to the JSONL file.

## Workflow 1: author dataset files

Dataset JSONL files are created by the developer. The right approach depends on the dataset:

- **Manual authoring or via Copilot** — for small or scenario-specific datasets, write the JSONL records directly (or ask Copilot to write them). Copilot can generate a handful of coherent records in one pass and the result is immediately reviewable.
- **Script-based generation** — for large or frequently regenerated datasets (cities, states, lookup tables, etc.), write a project-specific `generate.ts` script using `@faker-js/faker` or any other data library. Run the script manually whenever the data needs to be refreshed. Keeping the script in the repo makes it repeatable without overwriting any manual fixes.

Choose whichever approach fits the dataset size and change frequency. There is no enforced process — the developer decides.

### Authoring checklist

```text
Dataset Authoring Checklist:
- [ ] Step 1: Create dataset folder (backend/src/dataSets/<idDataSource>/<dataset-name>/)
- [ ] Step 2: Create one ModelName.jsonl per model
- [ ] Step 3: Write or generate JSONL records
- [ ] Step 4: Validate data against @DataModel fields and types
- [ ] Step 5: Validate references point to valid IDs in related model files
- [ ] Step 6: For file records, validate __path values and AppFile fields
```

### Example prompts for Copilot authoring

> Generate `backend/src/dataSets/mainDs/default/Project.jsonl` with 10 JSONL records (one JSON object per line) matching the `Project` `@DataModel`, including valid owner string references from `User.jsonl`.

> Generate `backend/src/dataSets/mainDs/default/File.jsonl` with 3 JSONL records for the concrete `File extends AppFile` model. Include required `AppFile` fields (`id`, `name`, `size`, `contentType`) and relative `__path` values that point to existing binaries from this dataset folder.

> Write a `generate.ts` script using `@faker-js/faker` that outputs `User.jsonl` and `Project.jsonl` under `backend/src/dataSets/mainDs/default/` with 50 coherent records each. Run with `npx tsx generate.ts`.

## Workflow 2: load datasets with CLI

Use this workflow for bootstrap, seed flows, or test setup.

Copy this checklist and execute it in order:

```text
Dataset Load Workflow:
- [ ] Step 1: Ensure app infrastructure is running (docker compose)
- [ ] Step 2: Select dataset name
- [ ] Step 3: Run `drumr ds <datasource> load [dataset]`
- [ ] Step 4: Apply include/exclude flags if needed
- [ ] Step 5: Validate loaded data
- [ ] Step 6: Repeat with corrections if needed
```

1. Ensure the target app database is up.

Start the app infrastructure with Docker Compose before loading datasets. You can use:

```bash
drumr infra:up
```

or the app's Docker Compose command.

2. Choose the target dataset name.
3. Run:

   ```bash
   drumr ds <datasource> load <dataset-name>
   ```

4. Optionally apply model filters with CLI flags (`--includeModels` or `--excludeModels`).
5. Handle load errors with explicit messages.
6. Validate expected records are available.

If error messages are insufficient, retry with `--verbose` to expose model filtering, discovered files, and detailed load diagnostics.

### Agent diagnostic checklist (when load fails)

1. Re-run with detailed logs: `drumr ds <datasource> load <dataset-name> --verbose`
2. Verify dataset path and files exist: `ls -la backend/src/dataSets/<idDataSource>/<dataset-name>/`
3. Confirm JSONL file names match model names: `find backend/src/dataSets/<idDataSource>/<dataset-name> -maxdepth 1 -name "*.jsonl"`
4. If the dataset includes file records, verify each `__path` target exists: `rg '"__path"' backend/src/dataSets/<idDataSource>/<dataset-name>`
5. Validate include/exclude usage (never both): `drumr ds <datasource> load <dataset-name> --includeModels=User,Project --verbose`
6. If infra/connectivity is the issue: `drumr infra:up && drumr ds <datasource> load <dataset-name> --verbose`

If loading fails due to pre-existing data conflicts, consider reset only as a last resort and only after explicit user approval:

```bash
drumr ds <datasource> reset
drumr ds <datasource> load <dataset-name>
```

Warning: `drumr ds <datasource> reset` is destructive for datasource infrastructure. It stops/removes datasource containers and removes associated Docker volumes, which may delete persisted data. Never run it automatically.

Examples:

```bash
# Load default dataset
drumr ds <datasource> load

# Load explicit dataset
drumr ds <datasource> load <dataset-name>

# Include specific models only
drumr ds <datasource> load <dataset-name> --includeModels=User,Project

# Exclude models
drumr ds <datasource> load <dataset-name> --excludeModels=AuditLog
```

## Model filters: include and exclude

CLI flags `--includeModels` and `--excludeModels` are mutually exclusive.

- `--includeModels`: load only the listed model files.
- `--excludeModels`: load all model files except the listed ones.
- Never pass both flags in the same `drumr ds ... load` command.
- `datasetOptions.json` may provide default filters before CLI flags are applied.
- CLI flags override `datasetOptions.json`.
- If both filters remain after merging defaults and CLI input, loader keeps `includeModels` and drops `excludeModels` with a warning.

Valid include example:

```bash
drumr ds <datasource> load <dataset-name> --includeModels=User,Project
```

Valid exclude example:

```bash
drumr ds <datasource> load <dataset-name> --excludeModels=AuditLog
```

Invalid example (do not use):

```bash
drumr ds <datasource> load <dataset-name> --includeModels=User --excludeModels=Project
```

Validation rule:

If both CLI flags are provided in one command, the command fails before loading starts.

## Common loading issues

### Existing data conflicts

A frequent cause of load errors is existing records in the datasource (for example duplicated unique values, stale references, or state from a previous dataset).

Recommended sequence when this happens:

1. Review the load error and confirm it is data-state related.
2. Request explicit user approval before any reset operation.
3. Reset datasource infrastructure (destructive, last resort):

```bash
drumr ds <datasource> reset
```

4. Load dataset again:

```bash
drumr ds <datasource> load <dataset-name>
```

Important:

- Do not reset by default in every flow.
- Reset is situational and should be used only when previous data is the likely cause of load failure.
- Reset must be the final fallback step after non-destructive checks.
- Reset requires explicit user acceptance before execution.
- Before considering reset, always run non-destructive diagnostics (`--verbose`, path/file checks, include/exclude validation, infra check).

### Infrastructure not running

Another frequent cause of load failures is that the target app database/infrastructure is down.

Typical fix:

```bash
drumr infra:up
drumr ds <datasource> load <dataset-name>
```

If your app uses a custom Docker Compose flow, run that app-specific compose command first, then retry dataset load.

## Concrete examples

Example `backend/src/dataSets/mainDs/default/User.jsonl`:

```json
{"id":"u-001","firstName":"Ava","lastName":"Miller","email":"ava.miller@example.com","status":"active"}
{"id":"u-002","firstName":"Noah","lastName":"Davis","email":"noah.davis@example.com","status":"active"}
```

Example `backend/src/dataSets/mainDs/default/Project.jsonl`:

```json
{"id":"p-001","name":"Website Redesign","status":"active","owner":"u-001"}
{"id":"p-002","name":"CRM Migration","status":"planning","owner":"u-002"}
```

Example `backend/src/dataSets/mainDs/default/Task.jsonl`:

```json
{"id":"t-001","title":"Create wireframes","status":"todo","project":"p-001","assignee":"u-001"}
{"id":"t-002","title":"Prepare migration plan","status":"in_progress","project":"p-002","assignee":"u-002"}
```

Example `backend/src/dataSets/mainDs/default/File.jsonl`:

```json
{"id":"44444444-4444-4444-8444-444444444444","name":"sample.pdf","size":24576,"contentType":"application/pdf","__path":"../../tests/integration/files/sample.pdf"}
{"id":"55555555-5555-4555-8555-555555555555","name":"diagram.png","size":16384,"contentType":"image/png","__path":"./files/diagram.png"}
```

## Usage notes

1. Keep dataset names scenario-oriented (`default`, `qa-smoke`, `demo-sales`).
2. Keep IDs and references consistent across model files.
3. Prefer realistic business data over placeholder strings.
4. Keep one model per JSONL file to simplify review and diffs.
5. Regenerate or update datasets after relevant `@DataModel` changes.
6. Validate datasets by loading them in a controlled setup flow.
7. Use exactly one filtering strategy per load call.
8. Prefer datasource file basename for `<datasource>` (for example `mainDs`).
9. Ensure Docker Compose infrastructure for the target app is running before `drumr ds ... load`.
10. Do not generate framework-managed fields (like `createdAt`, `updatedAt`, or `__version`) in JSONL unless explicitly required for strict time-travel mocking.
11. For file datasets, keep binaries under stable app paths and use relative `__path` values so the dataset moves cleanly with the repo.
12. Prefer concrete file-model names and fields from the app contract; dataset files should never be named `AppFile.jsonl`.

## Prompting notes

When asking an agent to generate dataset files:

1. Always specify the full target path (`backend/src/dataSets/<idDataSource>/<dataset-name>/ModelName.jsonl`).
2. Always require JSONL format (one JSON object per line; no array root).
3. Always mention the target `@DataModel` fields and expected types.
4. Ask for coherent string-ID references to existing IDs in related model files.
5. Request either `includeModels` or `excludeModels` examples, never both in one call.
6. Never generate system fields (`createdAt`, `updatedAt`, `__version`) in JSONL output; let the framework handle them during ingestion.
7. For file datasets, require concrete file-model fields (`id`, `name`, `size`, `contentType`) and relative `__path` values.
8. For large or frequently refreshed datasets, ask the agent to write a `generate.ts` script (using `@faker-js/faker`) instead of inline JSONL — this keeps the data reproducible and avoids noisy diffs.

## Related skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | If dataset content must align with model decorators, validations, conditional required fields, or field semantics. | This skill defines dataset workflows but does not define full model contracts and validation rules. |
| [backend-datasources](../backend-datasources/SKILL.md) | If dataset load failures involve datasource configuration, connection settings, transactions, or datasource implementation behavior. | This skill explains dataset loading flow but not datasource runtime/config internals. |
| [backend-files](../backend-files/SKILL.md) | If the dataset includes file models, file references, upload/download permissions, or storage configuration. | This skill explains dataset ingestion for binaries, not the concrete file model and file-permission architecture. |
| [testing-integration](../testing-integration/SKILL.md) | If the task is specifically about `initTestContext({ dataSet })`, backend test lifecycle, or assertions around dataset-backed integration tests. | This skill explains dataset structure and loading conventions, but not full integration-test bootstrap, cleanup, or assertion patterns. |
| [cli-commands](../cli-commands/SKILL.md) | If the task requires exact CLI syntax/options for `drumr ds`, related infrastructure commands, or command-level troubleshooting. | This skill documents dataset guidance, not the full CLI command surface and operational flags. |

## Completion checklist

- [ ] Dataset files follow `backend/src/dataSets/<idDataSource>/<dataset-name>/ModelName.jsonl`
- [ ] Every dataset file is valid JSONL (one JSON object per line)
- [ ] Objects match target `@DataModel` field contracts
- [ ] File datasets include required concrete file-model fields and valid relative `__path` values when binaries are needed
- [ ] Target app Docker Compose infrastructure is running
- [ ] `drumr ds <datasource> load [dataset]` is used for loading
- [ ] If filtering is used, only one of `includeModels` / `excludeModels` is present

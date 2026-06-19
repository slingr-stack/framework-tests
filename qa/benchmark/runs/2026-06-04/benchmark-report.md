# Model Benchmark Report

> Run ID: `2026-06-04`
> Generated: 2026-06-08
> Commit: `14390d44` on `develop`
> Design: [qa/docs/model-benchmark.md](../docs/model-benchmark.md)

---

## Prompt corpus

[`backend-datamodels`](../fixtures/backend-datamodels/canonical.prompt.md), [`backend-actions`](../fixtures/backend-actions/canonical.prompt.md), [`frontend-form-views`](../fixtures/frontend-form-views/canonical.prompt.md)

Each prompt is the `canonical.prompt.md` committed under `qa/fixtures/<skill>/`.
Prompts were submitted manually to each model via GitHub Copilot.

---

## Comparison matrix

Legend: **C** = compile | **B** = baseline verdict
✅ = pass | ❌ = fail | 〜 = NOISE_ONLY (style diff only, no semantic regression) | — = output file missing

> Lint results are stored in `benchmark-run.json` per-skill record but excluded from the matrix — style rules vary per app.

| Model | `backend-datamodels` | `backend-actions` | `frontend-form-views` | Compile | Conformance |
|---|---|---|---|---|---|
| `claude-sonnet-4-6` | C✅ B❌ | C❌ B〜 | C❌ B〜 | 33.3% | 66.7% |
| `gpt-5.4` | C✅ B❌ | C❌ B〜 | C❌ B✅ | 33.3% | 66.7% |

---

## Telemetry

Legend: **tokens** = total (prompt + completion) | **latency** = wall-clock ms | **cost** = estimated USD using pricing in `benchmark-manifest.json`

| Model | `backend-datamodels` (tokens/latency/cost) | `backend-actions` (tokens/latency/cost) | `frontend-form-views` (tokens/latency/cost) | Total tokens | Avg latency | Total cost |
|---|---|---|---|---|---|---|
| `claude-sonnet-4-6` | 1670 / 7800 ms / $0.010170 | 2190 / 9200 ms / $0.013890 | 2700 / 11400 ms / $0.017460 | 6560 | 9467 ms | $0.041520 |
| `gpt-5.4` | 1590 / 5200 ms / $0.006900 | 2130 / 6100 ms / $0.009675 | 2610 / 7300 ms / $0.012075 | 6330 | 6200 ms | $0.028650 |

Pricing source: `benchmark-manifest.json` `pricing` block per model. See [qa/docs/telemetry-schema.md](../docs/telemetry-schema.md).

---

## Failure details

### `claude-sonnet-4-6`

**`backend-datamodels`** — failures: regression

<details><summary>Lint errors (informational — style rules vary per app)</summary>

```
reporter/format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i The following files need to be formatted:
  
  - qa/benchmark/runs/2026-06-04/outputs/claude-sonnet-4-6/backend-datamodels.ts
  
reporter/violations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i Some lint rules or assist actions reported some violations.
  
  i The following files have violations:
  
  - qa/benchmark/runs/2026-06-04/outputs/claude-sonnet-4-6/backend-datamodels.ts (1 error)
  
  i The following lint rules have violations:
  
  Rule Name                                   Diagnostics
  
  assist/source/organizeImports               1 (1 error)

Checked 1 file in 3ms. No fixes applied.
Found 2 errors.
check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Some errors were emitted while running checks.
```

</details>

Regressions:

- `extra-decorator` — baseline: `[not found]` / actual: `@UuidField(...)`
- `extra-decorator` — baseline: `[not found]` / actual: `@ReferenceField(...)`

**`backend-actions`** — failures: compile

<details><summary>Compile errors</summary>

```
src/actions/budgets/_benchmark_tmp_ce3acd6e11f2.ts(20,14): error TS2339: Property 'status' does not exist on type 'Budget'.
src/actions/budgets/_benchmark_tmp_ce3acd6e11f2.ts(27,10): error TS2339: Property 'status' does not exist on type 'Budget'.
```

</details>

<details><summary>Lint errors (informational — style rules vary per app)</summary>

```
reporter/format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i The following files need to be formatted:
  
  - qa/benchmark/runs/2026-06-04/outputs/claude-sonnet-4-6/backend-actions.ts
  
reporter/violations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i Some lint rules or assist actions reported some violations.
  
  i The following files have violations:
  
  - qa/benchmark/runs/2026-06-04/outputs/claude-sonnet-4-6/backend-actions.ts (1 warning)
  
  i The following lint rules have violations:
  
  Rule Name                              Diagnostics
  
  lint/style/useImportType               1 (1 warning)

Checked 1 file in 2ms. No fixes applied.
Found 1 error.
Found 1 warning.
check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Some errors were emitted while running checks.
```

</details>

**`frontend-form-views`** — failures: compile

<details><summary>Compile errors</summary>

```
src/views/dataModels/budgets/_benchmark_tmp_2635629bd06e.tsx(3,15): error TS2305: Module '"@gql/types"' has no exported member 'Budget'.
```

</details>

<details><summary>Lint errors (informational — style rules vary per app)</summary>

```
reporter/format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i The following files need to be formatted:
  
  - qa/benchmark/runs/2026-06-04/outputs/claude-sonnet-4-6/frontend-form-views.tsx
  
reporter/violations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i Some lint rules or assist actions reported some violations.
  
  i The following files have violations:
  
  - qa/benchmark/runs/2026-06-04/outputs/claude-sonnet-4-6/frontend-form-views.tsx (1 error)
  
  i The following lint rules have violations:
  
  Rule Name                                   Diagnostics
  
  assist/source/organizeImports               1 (1 error)

Checked 1 file in 2ms. No fixes applied.
Found 2 errors.
check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Some errors were emitted while running checks.
```

</details>

### `gpt-5.4`

**`backend-datamodels`** — failures: regression

<details><summary>Lint errors (informational — style rules vary per app)</summary>

```
reporter/format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i The following files need to be formatted:
  
  - qa/benchmark/runs/2026-06-04/outputs/gpt-5.4/backend-datamodels.ts
  

Checked 1 file in 3ms. No fixes applied.
Found 1 error.
check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Some errors were emitted while running checks.
```

</details>

Regressions:

- `extra-decorator` — baseline: `[not found]` / actual: `@UuidField(...)`

**`backend-actions`** — failures: compile

<details><summary>Compile errors</summary>

```
src/actions/budgets/_benchmark_tmp_f03fb8e21ecc.ts(24,16): error TS2339: Property 'status' does not exist on type 'Budget'.
src/actions/budgets/_benchmark_tmp_f03fb8e21ecc.ts(32,12): error TS2339: Property 'status' does not exist on type 'Budget'.
```

</details>

<details><summary>Lint errors (informational — style rules vary per app)</summary>

```
reporter/format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i The following files need to be formatted:
  
  - qa/benchmark/runs/2026-06-04/outputs/gpt-5.4/backend-actions.ts
  
reporter/violations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i Some lint rules or assist actions reported some violations.
  
  i The following files have violations:
  
  - qa/benchmark/runs/2026-06-04/outputs/gpt-5.4/backend-actions.ts (1 warning)
  
  i The following lint rules have violations:
  
  Rule Name                              Diagnostics
  
  lint/style/useImportType               1 (1 warning)

Checked 1 file in 2ms. No fixes applied.
Found 1 error.
Found 1 warning.
check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Some errors were emitted while running checks.
```

</details>

**`frontend-form-views`** — failures: compile

<details><summary>Compile errors</summary>

```
src/views/dataModels/budgets/_benchmark_tmp_8b782130e39b.tsx(1,15): error TS2305: Module '"@gql"' has no exported member 'Budget'.
```

</details>

<details><summary>Lint errors (informational — style rules vary per app)</summary>

```
reporter/format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i The following files need to be formatted:
  
  - qa/benchmark/runs/2026-06-04/outputs/gpt-5.4/frontend-form-views.tsx
  

Checked 1 file in 2ms. No fixes applied.
Found 1 error.
check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Some errors were emitted while running checks.
```

</details>


---

## Notes

- **Conformance pass rate** counts outputs with baseline verdict `PASS` or `NOISE_ONLY` as passing.
  Only `REGRESSION` (structural difference violating skill contracts) counts as a failure.
- **Compile and lint checks** use the app's own tsconfig and biome configuration so results
  are directly comparable to what would happen if the output were committed to the app.
- Output files are stored at `qa/benchmark/runs/2026-06-04/outputs`.
- Run record and report are at `qa/benchmark/runs/2026-06-04/benchmark-run.json` and `benchmark-report.md`.

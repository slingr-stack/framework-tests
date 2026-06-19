# Model Benchmark

Cross-model evaluation layer for the canonical prompt corpus. Runs the same
prompts against multiple LLM models and compares compile, lint, and conformance
pass rates.

Design rationale and deferred decisions: [qa/docs/model-benchmark.md](../docs/model-benchmark.md)
Operational context: [qa/docs/process-manual.md](../docs/process-manual.md)

---

## How to run a benchmark

### 1. Create a run directory

```bash
RUN=2026-06-04   # use any identifier, a date works well
mkdir -p qa/benchmark/runs/$RUN/outputs/claude-sonnet-4-6
mkdir -p qa/benchmark/runs/$RUN/outputs/gpt-5.4
```

### 2. Generate model outputs

For each skill listed in `benchmark-manifest.json`, open the corresponding
`qa/fixtures/<skill>/canonical.prompt.md` in a **new Copilot Chat session**,
switch the model selector to the target model, and submit the prompt as-is —
the `#file:` reference at the top loads the relevant skill so the model has
framework context. Save the raw code output:

> **Important — use the Chat panel, not inline chat.**
> `#file:` references are only resolved in the VS Code Chat panel
> (Activity Bar speech-bubble icon, or `⌘⌥I` on macOS / `Ctrl+Alt+I` on Windows).
> Inline chat (`⌘I`) and quick chat do not resolve them, so the model would
> generate without framework context and produce unusable output.
> Start a fresh session for each prompt (the `+` icon in the Chat panel) so
> prior conversation history does not bias the output.

```
# claude-sonnet-4-6
qa/benchmark/runs/$RUN/outputs/claude-sonnet-4-6/backend-datamodels.ts
qa/benchmark/runs/$RUN/outputs/claude-sonnet-4-6/backend-actions.ts
qa/benchmark/runs/$RUN/outputs/claude-sonnet-4-6/frontend-form-views.tsx

# gpt-5.4
qa/benchmark/runs/$RUN/outputs/gpt-5.4/backend-datamodels.ts
qa/benchmark/runs/$RUN/outputs/gpt-5.4/backend-actions.ts
qa/benchmark/runs/$RUN/outputs/gpt-5.4/frontend-form-views.tsx
```

### 3. Evaluate

```bash
pnpm run benchmark:run -- --run=$RUN
```

Optionally scope to one model or one skill:

```bash
pnpm run benchmark:run -- --run=$RUN --model=gpt-5.4
pnpm run benchmark:run -- --run=$RUN --skill=backend-datamodels
```

### 4. Record telemetry (optional but recommended)

Telemetry captures token usage, latency, and estimated cost per generation.
Because generation is currently manual, these values must also be filled in manually
from the Copilot response metadata.

```bash
cp qa/benchmark/telemetry-template.json qa/benchmark/runs/$RUN/benchmark-telemetry.json
# edit the file and fill in promptTokens, completionTokens, latencyMs per entry
```

Re-run the benchmark after saving the sidecar — the runner reads it automatically:

```bash
pnpm run benchmark:run -- --run=$RUN
```

See [qa/docs/telemetry-schema.md](../docs/telemetry-schema.md) for field definitions,
validation rules, and how estimated cost is computed from `benchmark-manifest.json` pricing.

### 5. Generate the comparison report

```bash
pnpm run benchmark:compare -- --run=$RUN
```

Compare multiple runs side-by-side (trend analysis):

```bash
pnpm run benchmark:compare -- --run=2026-06-04,2026-06-10
```

### 6. Review results

- `qa/benchmark/runs/$RUN/benchmark-run.json` — machine-readable matrix with per-model pass rates, failure index, and optional telemetry section.
- `qa/benchmark/runs/$RUN/benchmark-report.md` — human-readable markdown table with correctness matrix and telemetry summary (when available).
- `qa/benchmark/runs/$RUN/benchmark-comparison-report.md` — consolidated report comparing models on quality and efficiency, with per-skill recommendations.

### 7. Commit

Commit the run directory (outputs + `benchmark-run.json` + `benchmark-report.md` + `benchmark-comparison-report.md` + `benchmark-telemetry.json` if filled in) together so the results are reviewable.

---

## What each check does

| Check | How it works | What it catches |
|---|---|---|
| **Compile** | Copies the output file into the app's `src/<targetDir>/` under a temp name, runs `tsc --noEmit` on the full project, filters errors to the temp file only, then removes it. | Wrong types, missing or incorrect imports, bad method signatures, invalid decorator options. |
| **Lint** | Runs `biome check` against the output file from the app layer directory so the layer's `biome.json` is resolved. Uses the locally installed binary. | Import order, formatting, `useImportType`, and any other Biome rules active in that layer. |
| **Baseline** | Delegates to `scripts/compare-generation-baseline.js`: normalizes both files (strips comments, collapses whitespace, sorts imports) then diffs. | Structural regressions: wrong decorator, wrong base class, banned imports from wrapped libraries, missing required options. Verdict is `PASS`, `NOISE_ONLY` (style only), or `REGRESSION`. |

The **conformance pass rate** in the matrix counts `PASS` and `NOISE_ONLY` as
passing — only `REGRESSION` is a failure.

---

## Directory layout

```
qa/benchmark/
  README.md                    ← this file
  benchmark-manifest.json      ← models + skills declaration (includes per-model pricing)
  telemetry-template.json      ← copy to runs/<runId>/ and fill in per-run token data
  runs/
    <runId>/
      benchmark-run.json                ← machine-readable matrix (+ telemetry when available)
      benchmark-report.md               ← human-readable correctness + telemetry table
      benchmark-comparison-report.md    ← consolidated quality vs efficiency comparison
      benchmark-telemetry.json          ← optional token/latency sidecar (filled in manually)
      outputs/
        <model>/               ← model-generated files saved manually
```

The canonical prompts and reference baselines live outside this directory:

```
qa/fixtures/
  <skill>/
    canonical.prompt.md   ← the prompt submitted to each model (includes #file: skill reference)
    baseline.ts[x]        ← the reference output produced by the pilot model (claude-sonnet-4-5)
                             used by the baseline comparison check
    meta.json             ← records the pilot model, date, compile/lint status, and notes
```

The `baseline.ts[x]` file is the **comparison target**: model outputs are diffed
against it to produce the `PASS / NOISE_ONLY / REGRESSION` verdict. It is not
expected to be updated on every run — only when the skill contract itself changes.

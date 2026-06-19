# Model Benchmark — Design and Decision Record

> Covers the cross-model benchmarking layer introduced by the Stage 2 Generation
> Integrity initiative.
> Related action points: `qa/docs/qa-action-points.md`
> Related process: `qa/docs/process-manual.md`

---

## Purpose

The conformance suite (Dimension 4) tells us whether generated code follows skill
contracts, but it does not tell us *which model* produced the output or whether
failures are model-specific.

The benchmark layer fills this gap: it runs the same canonical prompt corpus
against multiple models and compares compile, lint, and conformance pass rates.
This makes model drift observable independently of skill changes.

---

## Scope — what this covers

| In scope | Out of scope |
|---|---|
| Canonical prompts for `backend-datamodels`, `backend-actions`, `frontend-form-views` | Adversarial prompts (see § Roadmap) |
| Manual model generation + automated evaluation | Automated LLM API calls in CI (see § Roadmap) |
| Compile, lint, and baseline-comparison checks | Full SR-* Jest conformance re-run per model output |

---

## Model selection

| Model | Role | Rationale |
|---|---|---|
| `claude-sonnet-4-6` | Intra-vendor reference | Successor to `claude-sonnet-4-5`, which produced all pilot fixtures in `qa/fixtures/*/meta.json`. Running the same prompts against 4.6 surfaces drift between minor versions of the same model family. |
| `gpt-5.4` | Cross-vendor challenger | Flagship GPT model available via GitHub Copilot. Provides a cross-vendor data point alongside the Anthropic reference. |

> **Note on `gpt-4o`:** originally planned as the challenger, but not available in the team's Copilot subscription. `gpt-5.4` was substituted. Update this table if the available model set changes.

Adding more models later only requires placing their outputs in the correct directory
and re-running the evaluation script — no schema changes needed.

---

## Prompt corpus

Only **canonical prompts** are used in the initial benchmark. Each is the existing
`canonical.prompt.md` already committed under `qa/fixtures/<skill>/`.

Canonical prompts are well-formed, correct requests. They test whether a model
follows the skill instructions when given a clean scenario — they do not test
resistance to misleading instructions (that is adversarial scope, see § Roadmap).

### Fixture directory contents

Each skill directory under `qa/fixtures/` contains three files:

| File | Purpose |
|---|---|
| `canonical.prompt.md` | The prompt submitted to each model. Starts with `#file:<skill>/SKILL.md` so the model has framework context. This is what gets copy-pasted into a fresh Copilot Chat session. |
| `baseline.ts[x]` | The reference output produced by the pilot run (`claude-sonnet-4-5`, 2026-05-26). The baseline comparison check diffs every model output against this file to produce a `PASS / NOISE_ONLY / REGRESSION` verdict. Only updated when the skill contract changes. |
| `meta.json` | Records the pilot model, generation date, compile and lint status of the baseline, and human notes. Fields: `skill`, `date`, `model`, `prompt`, `baseline`, `compileStatus`, `lintStatus`, `notes`. |

---

## Invocation strategy — manual generation, automated evaluation

Model outputs are produced **manually**: a developer takes each `canonical.prompt.md`,
submits it to the target model in GitHub Copilot (switching the model selector),
and saves the output as a file in the benchmark output directory.

The benchmark script then evaluates those files automatically. It never calls an
LLM API. This keeps the benchmark free of API keys, rate limits, and provider
accounts, and matches how the team already uses Copilot day-to-day.

---

## Evaluation approach

Each model output is evaluated with three checks, in order:

1. **Compile** — `tsc --noEmit` against the app's tsconfig. Pass = file type-checks.
2. **Lint** — `biome check` on the output file. Pass = no errors.
3. **Baseline comparison** — `scripts/compare-generation-baseline.js` comparing the
   output against the committed baseline for that skill. Verdict is one of:
   - `PASS` — output matches the baseline (after noise normalization).
   - `NOISE_ONLY` — only formatting/style differences; no semantic drift.
   - `REGRESSION` — structural difference that violates skill contracts (wrong
     decorator, wrong base class, banned import, etc.).

`compare-generation-baseline.js` was chosen over re-running the SR-* Jest specs
because it is already file-path-agnostic: it accepts `--actual=<path>` and works
on any file, not just committed sources. The SR-* specs are tightly coupled to the
app's committed source tree and would require significant refactoring to point at
temporary benchmark outputs.

---

## Output structure

```
qa/benchmark/
  benchmark-manifest.json          # declares models + skills for the run
  runs/
    <runId>/                        # one directory per benchmark run
      outputs/
        <model>/
          backend-datamodels.ts     # model-generated output, saved manually
          backend-actions.ts
          frontend-form-views.tsx
      benchmark-run.json            # machine-readable comparison matrix
      benchmark-report.md           # human-readable markdown table
```

### benchmark-run.json schema

```json
{
  "runId": "<sha8>-<timestamp>",
  "timestamp": "<ISO 8601>",
  "commit": "<full git SHA>",
  "branch": "<branch name>",
  "promptCorpus": ["backend-datamodels", "backend-actions", "frontend-form-views"],
  "models": ["claude-sonnet-4-5", "gpt-4o"],
  "results": {
    "<model>": {
      "<skill>": {
        "outputFile": "qa/benchmark/runs/<runId>/outputs/<model>/<skill>.ts",
        "compilePass": true,
        "lintPass": true,
        "baselineVerdict": "PASS | NOISE_ONLY | REGRESSION",
        "failureTypes": []
      }
    }
  },
  "matrix": {
    "<model>": {
      "compilePassRate": 100,
      "lintPassRate": 100,
      "conformancePassRate": 100
    }
  }
}
```

`conformancePassRate` in the matrix counts outputs whose `baselineVerdict` is
`PASS` or `NOISE_ONLY` (semantic match) as passing; `REGRESSION` as failing.

---

## Roadmap — what this deliberately defers

### Adversarial prompts

Adversarial prompts are designed to elicit wrong code (e.g. "use TypeORM's `@Entity`
directly"). They test model resistance to misleading instructions and are a separate
concern from the correctness measured by canonical prompts. They are out of scope
for the initial benchmark and should be added in a follow-up ticket once the
evaluation pipeline is stable.

### Automated LLM generation in CI

The current invocation model is manual: a developer switches the model in Copilot
and saves the output. A future iteration could automate this step by calling the
OpenAI or Anthropic API directly from the benchmark script, parameterized by
`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` env vars in CI.

This was deferred for the following reasons:
- The acceptance criteria do not require CI automation.
- Adding API calls to a script introduces provider accounts, rate limits, and
  cost tracking — infrastructure concerns that should be scoped separately.
- The evaluation pipeline (which is the complex part) is fully testable without it.

When this step is implemented, the script should accept a `--generate` flag that
triggers API calls and writes outputs before the evaluation phase runs.

### SR-* conformance per model output

The SR-* Jest specs assert structural correctness against the app's committed source
tree. Pointing them at benchmark outputs would require making the source directory
configurable via an env var and re-running the full Jest suite per model — a larger
change than the current scope warrants.

If the baseline comparison check (`REGRESSION` verdict) proves insufficient for
catching model-specific drift, extracting the conformance assertions into a
file-path-agnostic callable module is the right next step.

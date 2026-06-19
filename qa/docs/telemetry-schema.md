# Benchmark Telemetry Schema

Defines the optional telemetry sidecar that can accompany a benchmark run.
When present, `run-model-benchmark.js` merges it into `benchmark-run.json` and
includes efficiency columns in `benchmark-report.md`.

Related: [qa/docs/model-benchmark.md](model-benchmark.md)

---

## Purpose

The main benchmark run (`benchmark-run.json`) captures correctness outcomes
(compile, lint, baseline verdict). Telemetry extends that record with operational
LLM metrics: token consumption, response latency, and estimated cost.

Together, the two datasets enable decisions that balance output quality against
resource efficiency — for example, choosing a cheaper model whose conformance rate
is acceptably close to a more expensive one.

---

## How to provide telemetry

Because generation is currently manual (developers copy-paste prompts into Copilot
and save the output), token counts and latency must also be recorded manually.
Most LLM providers and IDE extensions surface these values in the generation
response or the activity log.

### 1. Copy the template

```bash
cp qa/benchmark/telemetry-template.json qa/benchmark/runs/<runId>/benchmark-telemetry.json
```

### 2. Fill in one entry per (model, skill) pair

Populate every field documented in the schema section below.
Leave `promptTokens`, `completionTokens`, or `latencyMs` as `null` when the
value is not available from the generation UI — the runner will skip that metric
but still persist the rest.

### 3. Run the benchmark as normal

```bash
pnpm run benchmark:run -- --run=<runId>
```

When `benchmark-telemetry.json` is present, the runner reads it automatically,
validates structure, computes derived fields (`totalTokens`, `estimatedCostUsd`),
and writes everything into `benchmark-run.json` under `telemetry` and
`telemetryMatrix`.

### 4. When generation is automated

A future `--generate` flag will call LLM APIs directly and write the sidecar
automatically. When that step is implemented, this manual process becomes optional.

---

## File location

```
qa/benchmark/runs/<runId>/benchmark-telemetry.json
```

---

## Schema

### Top-level object

| Field | Type | Required | Description |
|---|---|---|---|
| `$schema` | string | no | Schema URI for IDE validation (optional) |
| `runId` | string | yes | Must match the run directory name |
| `entries` | Entry[] | yes | One entry per (model, skill) generation |

### Entry object

| Field | Type | Required | Description |
|---|---|---|---|
| `modelId` | string | yes | Must match a `models[].id` in `benchmark-manifest.json` |
| `skillId` | string | yes | Must match a `skills[].name` in `benchmark-manifest.json` |
| `promptId` | string | yes | Identifies which prompt was used. Use `"canonical"` for the `canonical.prompt.md` fixture |
| `timestamp` | string | yes | ISO 8601 datetime of the generation request |
| `promptTokens` | integer \| null | yes | Number of tokens in the input prompt. Null if unavailable |
| `completionTokens` | integer \| null | yes | Number of tokens in the model's response. Null if unavailable |
| `latencyMs` | integer \| null | yes | Wall-clock time from request to first token (or full response), in milliseconds. Null if unavailable |

### Derived fields (computed by the runner, not stored in the sidecar)

| Field | Formula |
|---|---|
| `totalTokens` | `promptTokens + completionTokens` (null when either input is null) |
| `estimatedCostUsd` | `(promptTokens / 1_000_000 × inputPrice) + (completionTokens / 1_000_000 × outputPrice)` using the `pricing` block in `benchmark-manifest.json`. Null when tokens are null or pricing is unavailable. |

---

## Example

```json
{
  "runId": "2026-06-04",
  "entries": [
    {
      "modelId": "claude-sonnet-4-6",
      "skillId": "backend-datamodels",
      "promptId": "canonical",
      "timestamp": "2026-06-04T10:12:00.000Z",
      "promptTokens": 1240,
      "completionTokens": 430,
      "latencyMs": 7800
    },
    {
      "modelId": "claude-sonnet-4-6",
      "skillId": "backend-actions",
      "promptId": "canonical",
      "timestamp": "2026-06-04T10:18:00.000Z",
      "promptTokens": 1580,
      "completionTokens": 610,
      "latencyMs": 9200
    },
    {
      "modelId": "claude-sonnet-4-6",
      "skillId": "frontend-form-views",
      "promptId": "canonical",
      "timestamp": "2026-06-04T10:25:00.000Z",
      "promptTokens": 1920,
      "completionTokens": 780,
      "latencyMs": 11400
    },
    {
      "modelId": "gpt-5.4",
      "skillId": "backend-datamodels",
      "promptId": "canonical",
      "timestamp": "2026-06-04T11:05:00.000Z",
      "promptTokens": 1200,
      "completionTokens": 390,
      "latencyMs": 5200
    },
    {
      "modelId": "gpt-5.4",
      "skillId": "backend-actions",
      "promptId": "canonical",
      "timestamp": "2026-06-04T11:12:00.000Z",
      "promptTokens": 1550,
      "completionTokens": 580,
      "latencyMs": 6100
    },
    {
      "modelId": "gpt-5.4",
      "skillId": "frontend-form-views",
      "promptId": "canonical",
      "timestamp": "2026-06-04T11:18:00.000Z",
      "promptTokens": 1870,
      "completionTokens": 740,
      "latencyMs": 7300
    }
  ]
}
```

---

## Output in benchmark-run.json

When a valid sidecar is found, `benchmark-run.json` gains two extra top-level keys:

### `telemetry`

Nested map of `modelId → skillId → TelemetryRecord`:

```json
{
  "telemetry": {
    "claude-sonnet-4-6": {
      "backend-datamodels": {
        "promptId": "canonical",
        "timestamp": "2026-06-04T10:12:00.000Z",
        "promptTokens": 1240,
        "completionTokens": 430,
        "totalTokens": 1670,
        "latencyMs": 7800,
        "estimatedCostUsd": 0.010242
      }
    }
  }
}
```

### `telemetryMatrix`

Aggregated totals and averages per model:

```json
{
  "telemetryMatrix": {
    "claude-sonnet-4-6": {
      "skillsCovered": 3,
      "totalPromptTokens": 4740,
      "totalCompletionTokens": 1820,
      "totalTokens": 6560,
      "avgLatencyMs": 9467,
      "totalEstimatedCostUsd": 0.04146
    }
  }
}
```

---

## Pricing source

Per-model prices are stored in `benchmark-manifest.json` under each model's
`pricing` block. Update the `inputPricePerMillionTokens` and
`outputPricePerMillionTokens` fields when provider pricing changes.

---

## Validation rules enforced by the runner

1. `runId` in the sidecar must match the `--run` argument.
2. Each entry's `modelId` must appear in the manifest.
3. Each entry's `skillId` must appear in the manifest.
4. Duplicate `(modelId, skillId)` pairs are rejected — only one entry per pair
   is meaningful for a canonical prompt run.
5. Entries for models or skills filtered out by `--model` / `--skill` are silently
   skipped (not treated as errors).

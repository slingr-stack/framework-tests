# Benchmark Comparison Report

> Runs: `2026-06-04`
> Generated: 2026-06-08
> Commit: `14390d44` on `develop`
> Design: [qa/docs/model-benchmark.md](../docs/model-benchmark.md)
> Telemetry schema: [qa/docs/telemetry-schema.md](../docs/telemetry-schema.md)

---

## Executive summary

**Run:** `2026-06-04` · **Commit:** `14390d44` on `develop`
**Models evaluated:** `claude-sonnet-4-6`, `gpt-5.4`
**Skills evaluated:** `backend-datamodels`, `backend-actions`, `frontend-form-views`
**Telemetry available:** yes

**Overall recommendation:** `gpt-5.4` (quality score 50/100, lower total cost on tie)

**Per-skill recommendations:**

| Skill | Recommended model | Reason |
|---|---|---|
| `backend-datamodels` | `gpt-5.4` | quality score 50/100, lower cost on tie |
| `backend-actions` | `gpt-5.4` | quality score 50/100, lower cost on tie |
| `frontend-form-views` | `gpt-5.4` | quality score 50/100, lower cost on tie |

---

## Quality vs efficiency matrix

Quality score formula: compile × 50% + conformance × 50% (lint excluded — style rules differ per app)

| Model | Compile | Conformance | Quality score | Total tokens | Avg latency | Total cost |
|---|---|---|---|---|---|---|
| `claude-sonnet-4-6` | 33.3% | 66.7% | 50/100 | 6560 | 9467 ms | $0.041520 |
| `gpt-5.4` | 33.3% | 66.7% | 50/100 | 6330 | 6200 ms | $0.028650 |

---

## Trade-off analysis

**Quality scores are equal** (50/100) across all evaluated models.
**Cost leader:** `gpt-5.4` ($0.028650 total for 3 skills) — recommended when quality is equal.

---

## Per-skill breakdown

### `backend-datamodels`

| Model | Compile | Baseline | Failures | Prompt tokens | Completion tokens | Total tokens | Latency | Est. cost |
|---|---|---|---|---|---|---|---|---|
| `claude-sonnet-4-6` | ✅ | ❌ REGRESSION | regression | 1240 | 430 | 1670 | 7800 ms | $0.010170 |
| `gpt-5.4` | ✅ | ❌ REGRESSION | regression | 1200 | 390 | 1590 | 5200 ms | $0.006900 |

**Regressions in `claude-sonnet-4-6`:**
- `extra-decorator` — baseline: `[not found]` / actual: `@UuidField(...)`
- `extra-decorator` — baseline: `[not found]` / actual: `@ReferenceField(...)`
**Regressions in `gpt-5.4`:**
- `extra-decorator` — baseline: `[not found]` / actual: `@UuidField(...)`

### `backend-actions`

| Model | Compile | Baseline | Failures | Prompt tokens | Completion tokens | Total tokens | Latency | Est. cost |
|---|---|---|---|---|---|---|---|---|
| `claude-sonnet-4-6` | ❌ | 〜 NOISE_ONLY | compile | 1580 | 610 | 2190 | 9200 ms | $0.013890 |
| `gpt-5.4` | ❌ | 〜 NOISE_ONLY | compile | 1550 | 580 | 2130 | 6100 ms | $0.009675 |

### `frontend-form-views`

| Model | Compile | Baseline | Failures | Prompt tokens | Completion tokens | Total tokens | Latency | Est. cost |
|---|---|---|---|---|---|---|---|---|
| `claude-sonnet-4-6` | ❌ | 〜 NOISE_ONLY | compile | 1920 | 780 | 2700 | 11400 ms | $0.017460 |
| `gpt-5.4` | ❌ | ✅ PASS | compile | 1870 | 740 | 2610 | 7300 ms | $0.012075 |

---

## How to reproduce

```bash
# Re-run the benchmark evaluation for the primary run
pnpm run benchmark:run -- --run=2026-06-04

# Re-generate this comparison report
pnpm run benchmark:compare -- --run=2026-06-04
```

---

## Notes

- **Quality score** combines compile (50%) and conformance (50%) pass rates.
  Lint is excluded — each app may enforce different style rules, making lint rates incomparable across projects.
  It is a single comparable number per model per run — not a replacement for the raw metrics.
- **Conformance** counts `PASS` and `NOISE_ONLY` baseline verdicts as passing.
  Only `REGRESSION` (structural violation of skill contracts) counts as failure.
- **Estimated cost** is computed from token counts using per-model pricing in
  `benchmark-manifest.json`. Update pricing blocks when provider rates change.
- Run this script after `pnpm run benchmark:run` to get the latest comparison data.

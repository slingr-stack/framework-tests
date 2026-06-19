---
name: backend-datasets-conformance
description: >
  SR-* conformance agent for the backend-datasets skill.
  Runs, updates, and interprets backend-datasets.skill-conformance.spec.ts.
  Delegates to skill-conformance-generator for full scaffold regeneration.
tools:
  - read_file
  - file_search
  - grep_search
  - replace_string_in_file
  - run_in_terminal
---

# backend-datasets Conformance Agent

**Skill:** `core/skills/backend-datasets/SKILL.md`
**Spec:** `apps/project-management-app/backend/tests/unit/skill-conformance/backend-datasets.skill-conformance.spec.ts`
**Score:** 93.3 (optional, threshold 65 ✅)
**Tests:** 21 passing, 0 todos

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='backend-datasets.skill-conformance' \
  --no-coverage --verbose
```

## Fixtures

| Fixture | Role |
|---|---|
| `backend/src/config/data-sources/datasets/mainDs/default/` | Canonical dataset: `User.jsonl`, `Project.jsonl`, `Address.jsonl`, `ProjectReport.jsonl`, `File.jsonl` + `datasetOptions.json` with `includeModels` |
| `backend/src/config/data-sources/datasets/mainDs/test-loading/` | `File.jsonl` with `__path` relative paths + `id` declared; `Project.jsonl`; `datasetOptions.json` |
| `backend/src/config/data-sources/datasets/mainDs/index-test/` | Minimal 3-model dataset: `User.jsonl`, `Project.jsonl`, `Task.jsonl` |

## Note: This skill is file-structure/content based

Unlike code-based skill specs, this spec:
- Parses `.jsonl` files directly (not TypeScript source text)
- Validates JSONL line-by-line format (no array wrapper, valid JSON per line)
- Checks `datasetOptions.json` filter exclusivity rules
- Verifies `__path` metadata in AppFile records

## SR-* contract summary

| SR-* | Rules enforced |
|---|---|
| SR-1 | Dataset path: `mainDs/<dataset>/ModelName.jsonl`; one model per JSONL file; `datasetOptions.json` co-exists |
| SR-2 | JSONL format (one JSON object per line, no `[` array wrapper); each record is non-empty object; AppFile `__path` records declare `id`; `__path` is relative not absolute |
| SR-3 | `datasetOptions.json` `includeModels` is array of non-empty strings; `includeModels` and `excludeModels` not both non-empty simultaneously |
| SR-4 | Adversarial scan — no array wrapper in any JSONL; all lines are valid JSON; no absolute `__path`; no `datasetOptions` has both filters non-empty; no empty JSONL files |

## Raise score checklist

- Add test that verifies `__path` resolves to an existing fixture file on disk (relative to the JSONL file's directory) → closes `__path` path-resolution gap → R 2→3 → 100
- Alternatively: add test that every model in `includeModels` has a corresponding `.jsonl` file in the same dataset directory

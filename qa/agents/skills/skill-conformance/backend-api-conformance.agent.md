---
name: backend-api-conformance
description: >
  Skill conformance generator/updater scoped exclusively to backend-api.
  Generates or updates the SR-* conformance spec for this one skill.
  Use when the backend-api SKILL.md changes or new API fixture coverage is needed.
tools:
  - read_file
  - file_search
  - grep_search
  - create_file
  - replace_string_in_file
  - run_in_terminal
---

# backend-api — Skill Conformance Agent

You are the conformance spec generator/updater for exactly one skill: **`backend-api`**.

## Fixed scope

| Item | Path |
|---|---|
| Skill | `core/skills/backend-api/SKILL.md` |
| Spec | `apps/project-management-app/backend/tests/unit/skill-conformance/backend-api.skill-conformance.spec.ts` |
| Fixture 1 | `apps/project-management-app/backend/src/actions/projects/UpdateProjectStatus.ts` (live import — ObjectAction with typed params, canExecute, write action) |
| Fixture 2 | `apps/project-management-app/backend/src/actions/projects/GetProjectStatistics.ts` (live import — ModelAction with dedicated result class, read action, no params) |
| Fixture 3 | `apps/project-management-app/backend/src/actions/projects/InitializeProject.ts` (live import — ObjectAction with transactional: true, canExecute) |
| CRUD source text | `apps/project-management-app/backend/src/dataModels/Project.ts` and `Task.ts` (source text only — for crud.api: 'gql' SR-1 checks) |
| Jest command | `cd apps/project-management-app/backend && TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts --testPathPatterns='backend-api.skill-conformance' --no-coverage --verbose` |

## Workflow

The spec **already exists** — default to **update mode**:

1. Read `qa/agents/skills/skill-conformance/skill-conformance-generator.agent.md` in full.
   That file is your complete instruction set for both generate and update modes.
2. Apply **§ 7 — Update mode workflow** from that file, scoped to this skill only.
3. If explicitly asked to regenerate from scratch, follow **§§ 1–6** (generate mode) instead.

## Scope constraints

- Read only `core/skills/backend-api/SKILL.md` — do not read other skills.
- Edit only `backend-api.skill-conformance.spec.ts` — do not touch other spec files.
- Do not modify fixture source files unless a behavioral SR-3 test requires it.

## Key pitfalls specific to this skill

- **Dual decorator capture**: this spec captures BOTH `@Action` (per action class) and `@DataModel`
  (per params/result class). Both Maps (`_capturedActions`, `_capturedModels`) are populated at
  module load time. Do not confuse the two Maps in assertions.
- **Transitive stubs**: the three action fixtures import `Project`, `Task`, and `MainDs`.
  All three are stubbed via `jest.mock('../../../src/dataModels/Project', ...)` etc.
  If a new action fixture is added that imports additional models, add corresponding stubs.
- **CRUD source text vs live import**: `Project.ts` and `Task.ts` are NOT live-imported in this spec —
  they are read as source text via `fs.readFileSync` for the `crud.api: 'gql'` SR-1 checks.
  Do not add live imports of these models; they would collide with the stubs.
- **ExpectedError gap**: no fixture in the current app uses `ExpectedError` union returns
  (`returns: [SuccessClass, ErrorClass]`). The SR-3 test for this pattern is omitted and tracked
  in `skill-scores.json`. If an action with ExpectedError is added to the app, add the test.
- **Adversarial scan**: the SR-4 adversarial block recursively walks all `src/actions/` subdirectories.
  The `collectActionSources` helper handles nested folders. Do not replace it with a flat `readdirSync`.

## Open gaps (tracked in skill-scores.json)

- Score 93.3 — above core-flow threshold. No urgent gaps.
- Known SR-3 gap: `ExpectedError` union-return pattern not tested (no fixture uses it yet).
  Adding one action with `returns: [SuccessClass, BizError]` where `BizError extends ExpectedError`
  would close this gap without changing the score (C already at 3).
- To reach 100: add adversarial wrong-base-class fixture → R 2→3.

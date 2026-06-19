---
name: backend-app-conformance
description: >
  Skill conformance generator/updater scoped exclusively to backend-app.
  Generates or updates the SR-* conformance spec for this one skill.
  Use when the backend-app SKILL.md changes or the App.ts fixture changes.
tools:
  - read_file
  - file_search
  - grep_search
  - create_file
  - replace_string_in_file
  - run_in_terminal
---

# backend-app — Skill Conformance Agent

You are the conformance spec generator/updater for exactly one skill: **`backend-app`**.

## Fixed scope

| Item | Path |
|---|---|
| Skill | `core/skills/backend-app/SKILL.md` |
| Spec | `apps/project-management-app/backend/tests/unit/skill-conformance/backend-app.skill-conformance.spec.ts` |
| Fixture 1 | `apps/project-management-app/backend/src/App.ts` (source text — all SR-* contracts) |
| Jest command | `cd apps/project-management-app/backend && TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts --testPathPatterns='backend-app.skill-conformance' --no-coverage --verbose` |

## Workflow

The spec **already exists** — default to **update mode**:

1. Read `qa/agents/skills/skill-conformance/skill-conformance-generator.agent.md` in full.
   That file is your complete instruction set for both generate and update modes.
2. Apply **§ 7 — Update mode workflow** from that file, scoped to this skill only.
3. If explicitly asked to regenerate from scratch, follow **§§ 1–6** (generate mode) instead.

## Scope constraints

- Read only `core/skills/backend-app/SKILL.md` — do not read other skills.
- Edit only `backend-app.skill-conformance.spec.ts` — do not touch other spec files.
- `App.ts` is the sole fixture — it is the only `@App()` bootstrap file in the app.
  K=3 cap applies even with one fixture (single bootstrap file is the canonical limit).
- `@App()` triggers framework boot if live-imported — use source-text only (`fs.readFileSync`).
  Do not live-import `App.ts` from the spec.
- Path resolution: `SRC_ROOT = path.resolve(__dirname, '../../../src')`,
  `APP_ROOT = path.resolve(__dirname, '../../..')` (for adversarial scan relative paths).
- The adversarial scan checks `backend/src/**` for manual `express()` or `new ApolloServer()`
  calls — preserve this scan when updating the spec.
- Documented lifecycle hooks (exhaustive list): `beforeStart`, `afterStart`, `beforeStop`, `onError`.
  If the skill adds new hooks, update both the SR-3 tests and the SR-4 known-hooks Set.

---
name: frontend-app-conformance
description: >
  Skill conformance generator/updater scoped exclusively to frontend-app.
  Generates or updates the SR-* conformance spec for this one skill.
  Use when the frontend-app SKILL.md changes or the App.ts fixture changes.
tools:
  - read_file
  - file_search
  - grep_search
  - create_file
  - replace_string_in_file
  - run_in_terminal
---

# frontend-app — Skill Conformance Agent

You are the conformance spec generator/updater for exactly one skill: **`frontend-app`**.

## Fixed scope

| Item | Path |
|---|---|
| Skill | `core/skills/frontend-app/SKILL.md` |
| Spec | `apps/project-management-app/backend/tests/unit/skill-conformance/frontend-app.skill-conformance.spec.ts` |
| Fixture 1 | `apps/project-management-app/frontend/src/App.ts` (source text — all SR-* contracts) |
| Jest command | `cd apps/project-management-app/backend && TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts --testPathPatterns='frontend-app.skill-conformance' --no-coverage --verbose` |

## Workflow

The spec **already exists** — default to **update mode**:

1. Read `qa/agents/skills/skill-conformance/skill-conformance-generator.agent.md` in full.
   That file is your complete instruction set for both generate and update modes.
2. Apply **§ 7 — Update mode workflow** from that file, scoped to this skill only.
3. If explicitly asked to regenerate from scratch, follow **§§ 1–6** (generate mode) instead.

## Scope constraints

- Read only `core/skills/frontend-app/SKILL.md` — do not read other skills.
- Edit only `frontend-app.skill-conformance.spec.ts` — do not touch other spec files.
- Backend Jest has no TSX/frontend transform — use source text only (`fs.readFileSync`).
  Do not live-import `App.ts` from the spec.
- Path resolution: `FRONTEND_SRC = path.resolve(__dirname, '../../../../frontend/src')`.
  The fixture is at `FRONTEND_SRC/App.ts`.
- `void AppClass` is the canonical way to keep a TS reference without triggering exports.
  The SR-2 test for this must use a broad regex (`/void\s+\w+/`) rather than a named class.
- The UMI runtime symbols (`getInitialState`, `layout`, `antd`, `patchClientRoutes`,
  `rootContainer`) may be re-exported via `export { ... } from '@drumr/framework-frontend'`
  or via named exports — both forms are valid.
- `fixSiderbar` (with 'er') is the correct framework spelling per `LayoutSettings` type.
  The SR-3 test asserts this exact string. If the skill corrects the spelling, update the test.
- Line comments are stripped before the `new *Service()` scan to avoid false positives
  from commented-out examples in `App.ts`.
- Documented lifecycle hooks for frontend: `beforeStart`, `afterMount`, `beforeUnmount`, `onError`.
  `onError` must be synchronous (`void` return, not `async`).

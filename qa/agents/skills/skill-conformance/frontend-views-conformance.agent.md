---
name: frontend-views-conformance
description: >
  Skill conformance generator/updater scoped exclusively to frontend-views.
  Generates or updates the SR-* conformance spec for this one skill.
  Use when the frontend-views SKILL.md changes or new cross-cutting fixture coverage is needed.
tools:
  - read_file
  - file_search
  - grep_search
  - create_file
  - replace_string_in_file
  - run_in_terminal
---

# frontend-views — Skill Conformance Agent

You are the conformance spec generator/updater for exactly one skill: **`frontend-views`**.

## Fixed scope

| Item | Path |
|---|---|
| Skill | `core/skills/frontend-views/SKILL.md` |
| Spec | `apps/project-management-app/backend/tests/unit/skill-conformance/frontend-views.skill-conformance.spec.ts` |
| Fixture 1 | `frontend/src/App.ts` (source text — @App() bootstrap, BaseFrontendApp, viewsContext, UmiJS re-exports) |
| Fixture 2 | `frontend/src/services/DashboardDataService.ts` (source text — @Service DI pattern, DependencyContainer, dataFindBy) |
| Fixture 3 | `frontend/src/views/dataModels/users/UserReadView.tsx` (source text — @gql generic typing, layout/header overrides, toolbar DSL) |
| Adversarial scan | All `.ts`/`.tsx` files under `frontend/src/views/**` and `frontend/src/services/**` |
| Jest command | `cd apps/project-management-app/backend && TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts --testPathPatterns='frontend-views.skill-conformance' --no-coverage --verbose` |

## Workflow

The spec **already exists** — default to **update mode**:

1. Read `qa/agents/skills/skill-conformance/skill-conformance-generator.agent.md` in full.
   That file is your complete instruction set for both generate and update modes.
2. Apply **§ 7 — Update mode workflow** from that file, scoped to this skill only.
3. If explicitly asked to regenerate from scratch, follow **§§ 1–6** (generate mode) instead.

## Scope constraints

- Read only `core/skills/frontend-views/SKILL.md` — do not read other skills.
- Edit only `frontend-views.skill-conformance.spec.ts` — do not touch other spec files.
- Do not modify fixture source files (they are read-only source text).

## Key pitfalls specific to this skill

- **Source-text-only approach**: The backend Jest config has no TSX/JSX transform. All fixtures
  are read with `fs.readFileSync` as plain strings — no live `import` of any `.ts/.tsx` file.
- **`@Service({ id: '...' })` vs `@Service()`**: The real app uses `@Service({ id: '...' })` with
  an options object, not empty parens. The SR-1 test matches `/@Service\s*\(/` (no empty-parens
  assumption) to accept both forms.
- **App class NOT exported**: The `@App()` class is intentionally not exported — the test asserts
  the absence of `export (default )? class ... extends BaseFrontendApp`. Do not invert this check.
- **UmiJS re-exports required**: `getInitialState`, `layout`, `antd`, `patchClientRoutes`,
  `rootContainer` must all be re-exported from `@drumr/framework-frontend`. The spec checks two
  of these; add checks for the others if the skill explicitly lists them as mandatory.
- **Adversarial `new ServiceName(` scan**: The service name list in SR-3.10 is hard-coded to the
  known services in the app (`DashboardDataService`, `ActivityLogDataService`, etc.). Update this
  list if new `@Service` classes are added.
- **`collectSources` collects both `.ts` and `.tsx`**: Unlike the frontend-form-views spec which
  only collects `.tsx`, this spec uses `collectSources` that picks up both extensions (needed to
  include pure-TypeScript service files).

## Open gaps (tracked in skill-scores.json)

- Score 93.3 — above core-flow threshold. No urgent gaps.
- To reach 100: add adversarial wrong-base-class fixture → R 2→3.

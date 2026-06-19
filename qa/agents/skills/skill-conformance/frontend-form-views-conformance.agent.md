---
name: frontend-form-views-conformance
description: >
  Skill conformance generator/updater scoped exclusively to frontend-form-views.
  Generates or updates the SR-* conformance spec for this one skill.
  Use when the frontend-form-views SKILL.md changes or new form-view fixture coverage is needed.
tools:
  - read_file
  - file_search
  - grep_search
  - create_file
  - replace_string_in_file
  - run_in_terminal
---

# frontend-form-views — Skill Conformance Agent

You are the conformance spec generator/updater for exactly one skill: **`frontend-form-views`**.

## Fixed scope

| Item | Path |
|---|---|
| Skill | `core/skills/frontend-form-views/SKILL.md` |
| Spec | `apps/project-management-app/backend/tests/unit/skill-conformance/frontend-form-views.skill-conformance.spec.ts` |
| Primary fixture 1 | `frontend/src/views/dataModels/tasks/TaskCreateView.tsx` (source text — @CreateView, beforeCreate, afterCreated, onRenderForm, App.resolve) |
| Primary fixture 2 | `frontend/src/views/dataModels/tasks/TaskEditView.tsx` (source text — @EditView, beforeSave, onSave/super.onSave, afterSaved, getFormValue, onRefresh, onRenderForm, onRender/super.onRender) |
| Primary fixture 3 | `frontend/src/views/dataModels/tasks/TaskReadView.tsx` (source text — @ReadView, afterActionExecution, refreshData, nestedCustomView, breadcrumb as ReactElement) |
| Secondary fixture 4 | `frontend/src/views/dataModels/projects/ProjectCreateView.tsx` (source text — refreshMode auto, breadcrumb string array) |
| Secondary fixture 5 | `frontend/src/views/dataModels/projects/ProjectEditView.tsx` (source text — refreshTriggers) |
| Secondary fixture 6 | `frontend/src/views/dataModels/projects/ProjectReadView.tsx` (source text — isUiField type guard, formLayout custom) |
| Adversarial scan | All `.tsx` files under `frontend/src/views/**` via `collectTsxSources()` helper |
| Jest command | `cd apps/project-management-app/backend && TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts --testPathPatterns='frontend-form-views.skill-conformance' --no-coverage --verbose` |

## Workflow

The spec **already exists** — default to **update mode**:

1. Read `qa/agents/skills/skill-conformance/skill-conformance-generator.agent.md` in full.
   That file is your complete instruction set for both generate and update modes.
2. Apply **§ 7 — Update mode workflow** from that file, scoped to this skill only.
3. If explicitly asked to regenerate from scratch, follow **§§ 1–6** (generate mode) instead.

## Scope constraints

- Read only `core/skills/frontend-form-views/SKILL.md` — do not read other skills.
- Edit only `frontend-form-views.skill-conformance.spec.ts` — do not touch other spec files.
- Do not modify fixture source files (they are read-only source text; the spec reads them as strings).

## Key pitfalls specific to this skill

- **Source-text-only approach**: The backend Jest config has no TSX/JSX transform. All six fixture
  files are read with `fs.readFileSync` as plain strings — no live `import` of any `.tsx` file.
  Do not add a live `import` of any frontend fixture; it will fail to compile.
- **TypeScript optional-typed class field regex**: Fixture fields like
  `override formLayout?: FormViewLayout = 'custom'` require a regex that skips the type annotation.
  Use `/formLayout[^;]*'custom'/` rather than `/formLayout\s*[?:=]+[^=]*'custom'/` — the latter
  fails because `[^=]` stops at the `=` in the assignment.
- **Adversarial scan helper**: `collectTsxSources(dir)` recursively walks a directory and returns
  the source text of every `.tsx` file. Do not replace it with a flat `readdirSync` — the views
  folder has nested subdirectories (tasks/, projects/, users/, reports/, etc.).
- **nestedViews on ReadView only**: The `nestedViews` property is documented as ReadView-only.
  The SR-1 tests assert Create/Edit do NOT have `override nestedViews`. Preserve this.
- **onRender vs onRenderForm distinction**: `onRender()` wraps content outside the form pipeline
  and must call `super.onRender()`. `onRenderForm()` is for the field layout inside the form.
  Both are tested independently.

## Open gaps (tracked in skill-scores.json)

- Score 100.0 — maximum score achieved. No urgent gaps.
- SR-5 (relation fields in create flows) added: no raw-ID inputs, DataField for reference fields,
  adversarial scans for raw-ID anti-patterns. R raised from 2→3.

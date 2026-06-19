---
name: frontend-action-views-conformance
description: >
  SR-* conformance agent for the frontend-action-views skill.
  Runs, updates, and interprets frontend-action-views.skill-conformance.spec.ts.
  Delegates to skill-conformance-generator for full scaffold regeneration.
tools:
  - read_file
  - file_search
  - grep_search
  - replace_string_in_file
  - run_in_terminal
---

# frontend-action-views Conformance Agent

**Skill:** `core/skills/frontend-action-views/SKILL.md`
**Spec:** `apps/project-management-app/backend/tests/unit/skill-conformance/frontend-action-views.skill-conformance.spec.ts`
**Score:** 93.3 (supporting, threshold 75 ✅)
**Tests:** 31 passing, 0 todos

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='frontend-action-views.skill-conformance' \
  --no-coverage --verbose
```

## Fixtures

| Fixture | Role |
|---|---|
| `frontend/src/views/globalActions/GetDashboardSummaryView.tsx` | GlobalAction; `@ActionView({action})`, `formLayout:'custom'`, `refreshMode:'custom'`, `onLoad()` with `await super.onLoad()` first + `this.initialData`, `onRefresh()` + `this.app.message.warning()`, `onRenderForm()` + `DataField` |
| `frontend/src/views/dataModels/projects/actions/UpdateProjectStatusView.tsx` | ObjectAction full lifecycle: `onLoad()` + `await super.onLoad()`, `beforeExecute()` returns `Promise<boolean>` + `return false`, `onExecute()` + `await super.onExecute()`, `afterExecuted(response: ActionResponse)` + `this.app.message.*` |
| `frontend/src/views/dataModels/tasks/actions/AssignTaskView.tsx` | Minimal ObjectAction; `ActionViewComponent<void, Task>` generics; `await super.onLoad()`; `this.targetObject` access; `refreshMode:'auto'` |
| `frontend/src/views/dataModels/tasks/actions/CompleteTaskView.tsx` | ObjectAction with typed generics `ActionViewComponent<CompleteTaskParamsUi, Task>`; `formLayout:'custom'`; `onRenderForm(context: DataFormContextValue<Task>)`; `DataField` |

## SR-* contract summary

| SR-* | Rules enforced |
|---|---|
| SR-1 | `ActionView`/`ActionViewComponent` from `@drumr/framework-frontend`; `@ActionView({ action })` only (no `model` key — invalid) |
| SR-2 | `extends ActionViewComponent` (with or without typed generics); `formLayout:'custom'` paired with `onRenderForm()`; `refreshMode:'custom'` paired with `onRefresh()`; `override layout =` assignment |
| SR-3 | `await super.onLoad()` FIRST before `this.initialData`; `beforeExecute()` returns `Promise<boolean>` (not void); `onExecute()` calls `await super.onExecute()`; `afterExecuted()` uses `this.app.message.*`; `onRefresh()` uses `this.app.message.warning()`; `DataField` for param fields in `onRenderForm()` |
| SR-4 | Adversarial scan of all `views/` — no `model` key in `@ActionView`; all `@ActionView` files import from framework; `super.onLoad()` before `this.initialData`; `DataField` imported when `onRenderForm` present; `beforeExecute()` uses `return false` not `throw` |

## Known regex lesson

Multi-line `afterExecuted` signatures have a trailing comma:
```typescript
protected override async afterExecuted(
    response: ActionResponse,   // ← trailing comma breaks closing-paren match
  ): Promise<void> {
```
Fix: check method declaration and parameter type independently:
```typescript
expect(src).toMatch(/protected override async afterExecuted\s*\(/);
expect(src).toMatch(/response\s*:\s*ActionResponse/);
```

## Raise score checklist

- Add `ActionResponse` import-value (not just type-import) fixture → closes SR-1 import-completeness gap
- Add `onParamsChange(prevParams, newParams)` fixture → covers route-change-without-remount → R 2→3 → 100
- Both require no code changes — new fixture files or additional test assertions on existing files suffice

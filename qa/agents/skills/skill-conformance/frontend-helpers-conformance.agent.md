---
name: frontend-helpers-conformance
description: >
  SR-* conformance agent for the frontend-helpers skill.
  Runs, updates, and interprets frontend-helpers.skill-conformance.spec.ts.
  Delegates to skill-conformance-generator for full scaffold regeneration.
tools:
  - read_file
  - file_search
  - grep_search
  - replace_string_in_file
  - run_in_terminal
---

# frontend-helpers Conformance Agent

**Skill:** `core/skills/frontend-helpers/SKILL.md`
**Spec:** `apps/project-management-app/backend/tests/unit/skill-conformance/frontend-helpers.skill-conformance.spec.ts`
**Score:** 93.3 (supporting, threshold 75 ✅)
**Tests:** 25 passing + 1 todo

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='frontend-helpers.skill-conformance' \
  --no-coverage --verbose
```

## Fixtures

| Fixture | Role |
|---|---|
| `frontend/src/components/formFooterHelpers.tsx` | `closeView` from framework; `closeView({ cancelled: true })` return-data contract |
| `frontend/src/views/dataModels/tasks/TaskTableView.tsx` | `openView` + `toolbar` from framework; `toolbar.objectAction`, `toolbar.view` with `elementId`+`label` |
| `frontend/src/views/dataModels/projects/ProjectTableView.tsx` | `toolbar` from framework; `toolbar.modelAction`, `toolbar.dropdown`, `toolbar.globalAction` |
| `frontend/src/services/DashboardDataService.ts` | `dataFindBy` from framework; `.paginate()` chained on every list query |
| `frontend/src/services/GraphQLClientService.ts` | `getAuthStorageKeys` from framework; `tokenKey` via destructuring, not hardcoded |

## SR-* contract summary

| SR-* | Rules enforced |
|---|---|
| SR-1 | `closeView`/`openView`/`toolbar`/`dataFindBy`/`getAuthStorageKeys` all from `@drumr/framework-frontend` |
| SR-2 | Valid toolbar DSL methods: `.objectAction`/`.view`/`.modelAction`/`.dropdown`/`.globalAction`; `toolbar.view` always has `elementId`+`label` |
| SR-3 | `closeView({cancelled:true})` return-data pattern; `openView()` not `router.push`; every `dataFindBy` chains `.paginate()`; `dataFindBy` (not `uiFindBy`) for plain values in services; `getAuthStorageKeys()` for tokenKey (not hardcoded) |
| SR-4 | No imports of non-exported helpers: `isReferenceObject`, `uiRefresh`, `workflowCancel`, `buildReferenceFindByDocument`, `isArrayField`, `getApiBaseUrl`; no `toolbar.group`/`menu.action` invalid API names |

## Known gaps (it.todo)

- `ProjectReadView.tsx` defines a local `isUiField()` type guard instead of importing the exported `isUiField` from `@drumr/framework-frontend`. Pre-existing deviation — fix by importing from framework.

## Key implementation note

**Regex pitfall**: `getAuthStorageKeys()` returns an object with `tokenKey`. The app uses destructuring `const { tokenKey } = getAuthStorageKeys()`, not property access `.tokenKey`. Check for `\btokenKey\b` (word boundary), not `\.tokenKey`.

## Raise score checklist

- Fix `ProjectReadView.tsx` to use `isUiField` from `@drumr/framework-frontend` instead of local type guard → closes `it.todo`, no score change
- Add adversarial fixture for forbidden `toolbar.group()` or `menu.action()` usage → R 2→3 → 100
- Add `extractData`/`isUiObject` usage fixture (currently no app file uses these) → K stays 3, C improves coverage

# frontend-components Conformance Agent

**Skill under test:** `core/skills/frontend-components/SKILL.md`  
(+ `form-components.md`, `data-field-components.md`, `action-button-components.md`, `page-components.md`)  
**Spec file:** `apps/project-management-app/backend/tests/unit/skill-conformance/frontend-components.skill-conformance.spec.ts`  
**SkillScore:** 93.3 (C=3, K=3, D=3, R=2) — core-flow ✅

---

## Fixtures

| Fixture | Approach | SR-* coverage |
|---------|----------|---------------|
| `frontend/src/views/dataModels/tasks/TaskEstimateView.tsx` | Source text | SR-1 (DataForm/toolbar/DataFormRef from framework), SR-2 (isNewObject, onChange mutate in-place, formRef=, toolbar.objectAction+objectFormRef), SR-3 (afterExecution callback) |
| `frontend/src/views/dataModels/tasks/helpers/taskFormLayout.tsx` | Source text | SR-1 (DataForm/DataField/UiMode from framework), SR-2 (id=, mode=read, queryContext with UiMode.Read + named view, fieldNames={[...]}), SR-3 (DataField with explicit name+options+value+errors) |
| `frontend/src/components/formFooterHelpers.tsx` | Source text | SR-1 (closeView from framework), SR-3 (closeView({cancelled:}) not raw navigate), SR-4 (no antd Form) |
| `frontend/src/views/custom/ErrorPagesTestView.tsx` | Source text | SR-1 (NotFoundPage/PermissionDeniedPage/InternalErrorPage/MaintenancePage/GlobalActionButton from framework), SR-3 (page components as direct JSX) |
| `frontend/src/views/dataModels/projects/ProjectReadView.tsx` | Source text | SR-3 (DataComponent with options=, isUiField type guard) |
| Adversarial scan | All `.tsx`/`.ts` files in `frontend/src/views/` | SR-4 (no custom error page, no antd Table replacing DataTable, no tsyringe, no core/frontend path) |

---

## SR-* Summary

### SR-1 — Import and component contracts
- `DataForm`, `DataField`, `DataComponent` imported from `@drumr/framework-frontend`
- `DataFormRef` (type) imported from `@drumr/framework-frontend`
- `toolbar` imported from `@drumr/framework-frontend`
- Page components (`NotFoundPage`, `PermissionDeniedPage`, `InternalErrorPage`, `MaintenancePage`) from framework
- `GlobalActionButton` from framework
- `closeView` from framework
- `UiMode` from framework (used in `queryContext.mode`)

### SR-2 — DataForm structural contracts
- `model=` prop present on every `<DataForm`
- `isNewObject={true}` for non-persistent/new objects
- `mode="read"` for embedded read-only sub-forms
- `id=` prop on read-only sub-forms (triggers auto-fetch)
- `DataFormRef` created with `React.createRef<DataFormRef>()`
- `onChange` mutates `currentObject` in-place (`Object.assign`) so toolbar closures stay fresh
- `formRef={this.form}` prop (not `form=`)
- `queryContext` with `mode: UiMode.Read` and `view: { name: '...' }` for named-view context
- `fieldNames={[...]}` to restrict fetched fields (JSX curly syntax)
- `toolbar.objectAction` uses `objectFormRef` for non-persistent object passing

### SR-3 — Behavioral contracts
- `DataField` outside `DataForm` has explicit `name=`, `options=`, `value=`, `errors=`
- `DataComponent` rendered with `options=` (read-only display mode)
- `isUiField()` type guard used before accessing `.options` on unknown response shapes
- Page components rendered as direct JSX (not wrapped in custom components)
- `closeView({ cancelled: ... })` used (not `window.history.back()` or `navigate(-1)`)
- `toolbar.objectAction` includes `afterExecution` callback for result handling

### SR-4 — Forbidden patterns
- No `antd` `Form` import for data-form replacement
- No `antd` `Table` import for data-table replacement (known violation: `DashboardView.tsx` tracked)
- No custom `NotFoundPage` / `PermissionDeniedPage` component definitions
- No `tsyringe` direct import in view files
- No `core/frontend` internal path imports

---

## Known gaps (it.todo)

| Gap | File | Description |
|-----|------|-------------|
| GlobalActionButton afterExecuted | `ErrorPagesTestView.tsx` | Usage is for permission-denied simulation (no result handler needed). afterExecuted required when used for business logic. |
| antd Table direct import | `frontend/src/views/custom/DashboardView.tsx` | Imports `Table` from `antd` instead of `DataTable` from `@drumr/framework-frontend`. Pre-existing violation. |

---

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='frontend-components.skill-conformance' \
  --no-coverage --verbose
```

> **After updating the spec:** run `pnpm run test:skill-conformance:ci -- --skill=frontend-components` then `pnpm run scores:update` to update `skill-scores.json` and the report. Do not edit `skill-scores.json` directly.

---

## Regex lessons

- **JSX attribute arrays**: `fieldNames={['a', 'b']}` has `{` before `[` — use `/fieldNames\s*=\s*\{?\s*\[/` not `/fieldNames\s*=\s*\[/`
- Same applies to any JSX array prop — the value is always wrapped in `{...}` in JSX
- Boolean JSX props: `isNewObject={true}` — use `/isNewObject\s*=\s*\{true\}/`
- String JSX props: `mode="read"` — use `/mode\s*=\s*["']read["']/`

---

## To raise score to 100

- Close `DashboardView.tsx` antd Table todo → update adversarial scan to `toHaveLength(0)` → R improvement
- Close `ErrorPagesTestView.tsx` afterExecuted todo (or add a fixture with result-handling GlobalActionButton)
- Add full adversarial suite (fixture that deliberately violates SR-4 rules) → R 2→3 → score 100

---
name: frontend-views
description: >
  General guide for all Drumr Framework frontend views. Covers the component decision table, route registration via app.registerRoutes(), header/toolbar/UI-API concepts that apply to every view kind, and links to the specialized skill files for TableView, FormViews (Create/Edit/Read), ActionView, and CustomView.


metadata:
  applies-to:
    - core/frontend/src/pages/
---

applyTo:

- '**/frontend/src/**/views/**/*.tsx'
- '**/frontend/src/**/views/**/*.ts'
- '**/frontend/src/app.tsx'
- '**/frontend/src/app.ts'
- '**/frontend/src/config/appDefaults.ts'
- '**/frontend/src/config/routing.ts'

---

# Frontend views — general guide

> This file covers concepts shared by **all** view kinds. Detailed patterns for each view type live in the specialized skill files:
>
> | View type                             | Skill file                                                 |
> | ------------------------------------- | ---------------------------------------------------------- |
> | `TableView`                           | [frontend-table-views](../frontend-table-views/SKILL.md)   |
> | `CreateView` / `EditView` / `ReadView`| [frontend-form-views](../frontend-form-views/SKILL.md)     |
> | `ActionView`                          | [frontend-action-views](../frontend-action-views/SKILL.md) |
> | `CustomView`                          | [frontend-custom-views](../frontend-custom-views/SKILL.md) |

---

## Purpose & role

A **view** is a React function component that maps a browser route or modal to a backend `@DataModel` or `@Action`. Views never re-implement CRUD plumbing; they configure metadata via props, pick a layout in the route config, and delegate field rendering to the framework's UI primitives.

```
Browser route / modal  (registered via app.registerRoutes in config/routing.ts)
        |
        v
+--------------------+
|     View fn        |  <- TableView | ReadView | EditView |
|  [props/callbacks] |     CreateView | ActionView | CustomViews
|  [header/toolbar]  |     Props replace lifecycle hooks (beforeSave, onExecuted, …)
+--------------------+
        |
        v
+--------------------+
|  DataForm /        |  <- Framework-provided — reads UI API, renders
|  DataTable /       |     fields, dispatches save/refresh
|  DataField         |
+--------------------+
        |
        v
   Backend UI API  (e.g. ProjectUiFindById, TaskUiFindBy, UiGetDashboardSummary)
```

Views are **not** the place for business logic, custom data fetching, or hand-rolled forms. They configure; `DataForm`, `DataTable`, and the toolbar DSL do the work.

> **Note**: Custom views are plain React function components. Use them for free-form dashboards, wizards, and other pages that don't map cleanly to a model. The view kinds (`TableView`, `EditView`, `CreateView`, `ReadView`, `ActionView`) are provided framework functional components.

---

## When to pick which view component

| Need | Component | Skill |
| --- | --- | --- |
| Paginated list of records with CRUD toolbar | `TableView` | [frontend-table-views](../frontend-table-views/SKILL.md) |
| Form that creates a new record | `CreateView` | [frontend-form-views](../frontend-form-views/SKILL.md) |
| Form that edits an existing record | `EditView` | [frontend-form-views](../frontend-form-views/SKILL.md) |
| Read-only record details + nested related views | `ReadView` | [frontend-form-views](../frontend-form-views/SKILL.md) |
| Param/confirmation form for a `GlobalAction`/`ModelAction`/`ObjectAction` | `ActionView` | [frontend-action-views](../frontend-action-views/SKILL.md) |
| Free-form page (dashboards, wizards, reports) | Custom View | [frontend-custom-views](../frontend-custom-views/SKILL.md) |
| App shell, menu registration, and layout composition | `app.registerLayout(...)` + route `layout` assignment | [frontend-layout](../frontend-layout/SKILL.md) |

> **Rule**: If a `@DataModel` exists for the data on the page, prefer the matching model-bound functional component. Reach for custom views only when no model maps cleanly to the layout.

---

## Core building blocks

### Bootstrap and routing

The frontend app calls explicit registration functions inside `app.ts` as part of configuration composition. Config modules export named functions; `config/appConfig.ts` triggers them.

```typescript
// frontend/src/app.ts
import '../generated/gql';

import { app } from '@drumr/framework-frontend';
import runtime from './app.runtime';
import { configureApp } from './config/appConfig';

configureApp(app);

export default runtime;
export { getInitialState, layout, antd, patchClientRoutes, rootContainer } from './app.runtime';
```

```typescript
// frontend/src/config/appConfig.ts
import type { AppRegistry } from '@drumr/framework-frontend';
import { registerAppDefaults } from './appDefaults';
import { registerRoutes } from './routing';

export function configureApp(app: AppRegistry) {
  registerAppDefaults(app);
  registerRoutes(app);
}
```

```typescript
// frontend/src/app.runtime.ts
import type { AppRuntimeExports } from '@drumr/framework-frontend';
import {
  antd,
  getInitialState,
  layout,
  patchClientRoutes,
  rootContainer,
} from '@drumr/framework-frontend';

const runtime: AppRuntimeExports = {
  getInitialState,
  layout,
  antd,
  patchClientRoutes,
  rootContainer,
};

export default runtime;
export { getInitialState, layout, antd, patchClientRoutes, rootContainer };
```

```typescript
// frontend/src/config/appDefaults.ts
import enUS from 'antd/locale/en_US';
import type { AppRegistry } from '@drumr/framework-frontend';
import { mainLayout } from './layouts/mainLayout';

export function registerAppDefaults(app: AppRegistry) {
  app.registerDefaults({
    appName: 'Tasky',
    appVersion: '1.0.0',
    defaultLayout: mainLayout,
    layoutSettings: { logo: '/logo.svg', navTheme: 'light', fixedHeader: false, fixSiderbar: true },
    locale: enUS,
  });
}
```

> **Rule**: Keep one bootstrap owner in `app.ts`. It should call `configureApp(app)` once, then default-export and re-export the runtime symbols from `app.runtime.ts`.

### Route registration via `app.registerRoutes()`

All view function components are registered in `config/routing.ts` via `app.registerRoutes()`. Route entries select the path, view, and optional layout. Layout definitions own menu registration.

```typescript
// config/routing.ts
import type { AppRegistry } from '@drumr/framework-frontend';
import { formLayout } from './layouts/formLayout';
import TaskTableView from '../tasks/views/TaskTableView';
import TaskCreateView from '../tasks/views/TaskCreateView';
import TaskEditView from '../tasks/views/TaskEditView';
import TaskReadView from '../tasks/views/TaskReadView';

export function registerRoutes(app: AppRegistry) {
  app.registerRoutes([
    { path: '/tasks', view: TaskTableView },
    { path: '/tasks/new',       view: TaskCreateView, layout: formLayout },
    { path: '/tasks/:id/edit',  view: TaskEditView,   layout: formLayout },
    { path: '/tasks/:id/view',  view: TaskReadView },
  ]);
}
```

### Generic typing

Always use the matching generated GraphQL type from `@gql` / `@gql/types` as the generic parameter. Never hand-roll an interface for the model:

```typescript
import type { Project, Task, User } from '@gql/types';

<TableView<Project> model="Project" ... />
<EditView<Task>    model="Task"    id={id} ... />
<ReadView<User>   model="User"    id={id} ... />
```

> **Rule**: All `TableView`, `EditView`, `CreateView`, `ReadView`, `ActionView` and custom views are functional components registered via `app.registerRoutes()`.

### View props summary

Prop-based configuration summary:

| Prop / config             | Where it applies             | What it controls                                          |
| ------------------------- | ---------------------------- | --------------------------------------------------------- |
| `header`                  | every view component         | Title, subTitle, breadcrumb, toolbar                      |
| `layout` (route config)   | every route                  | Layout component to wrap the view in                      |
| `menu` (route config)     | every route                  | Registration in left/top menus                            |
| `fields`                  | form views                   | `string[]` — which fields to include                      |
| `refreshMode`             | form + action views          | `'auto'` `'custom'` `'none'`                              |
| `refreshTriggers`         | `refreshMode: 'auto'`        | `string[]` — only refresh on these field changes          |
| `options` / `columns`     | `TableView`                  | Columns, pagination, selection, toolbars                  |
| `hideHeader`              | `TableView`                  | Suppress header (for embedded use)                        |
| `children`                | form + action views          | Custom form body replacing auto-rendered fields           |
| `initialData`             | `ActionView`, `CreateView`   | Pre-fill values before render                             |
| `deleteFallbackPath`      | `ReadView`                   | Navigation path after a delete action                     |
| `beforeSave` / `onSaved`  | `EditView`, `CreateView`     | Save guard and post-save callback                         |
| `beforeExecute` / `onExecuted` | `ActionView`            | Execute guard and post-execute callback                   |
| `onActionExecuted`        | `ReadView`                   | Post-action callback (after framework defaults fire)      |

---

## Header configuration

`header` applies to all view kinds. Properties accept static values or dynamic functions evaluated at render time.

```typescript
// On a functional view component (prop):
<ReadView<Project>
  model="Project"
  id={id}
  header={{
    title: (project: Project | null) => project?.name ?? 'Project',  // static or dynamic
    subTitle: 'Manage and track all projects',
    breadcrumb: [{ label: 'Projects', to: '/projects' }, { label: 'Edit' }],
    toolbar: toolbar<Project>(),
  }}
/>
```

**Breadcrumb shapes** — five valid forms (`BreadcrumbValue` has 4 resolved shapes; `BreadcrumbInput` adds the function variant):

```typescript
breadcrumb: 'Projects';                                                        // single string
breadcrumb: ['Projects', 'New'];                                               // string array — non-clickable
breadcrumb: [{ label: 'Projects', to: '/projects' }, { label: 'Edit' }];      // links
breadcrumb: <Space size={4}><CheckSquareOutlined /> <Tag>Tasks</Tag></Space>;  // ReactElement
breadcrumb: (): BreadcrumbValue => [/* dynamic — re-evaluated each render */];
```

---

## Toolbar DSL

The toolbar DSL is available on all view kinds via `header.toolbar`, `tableOptions.rowToolbar`, and `tableOptions.tableToolbar`.

### Modal header toolbar behaviour

When a view is rendered inside a modal, the framework automatically manages the modal header toolbar using `header.toolbar`:

- **View has a footer** → modal header shows **no** toolbar (buttons are already in the footer — default for form views like `EditView`, `CreateView`, `ReadView`, `ActionView`)
- **View has no footer** → `header.toolbar` is used in the modal header, but the `refresh` button is automatically stripped (ViewModal renders its own reload icon via `refetch` registration)

No extra configuration is needed — set `header.toolbar` once and the framework does the right thing in both page and modal contexts.

### Recent refactor patterns to keep

- `ActionView` modal primary actions belong in the modal footer, not the header toolbar.
- For read details screens, prefer `<NestedTabs>` + `<NestedView>` over ad-hoc tabs/card wrappers.
- `NestedView` should infer parent context from `DataForm` when available. Only pass `parentModel` and `parentId` when rendering outside form context.

```typescript
import { toolbar, menu } from '@drumr/framework-frontend';

// Auto CRUD variants
toolbar<Project>();                              // auto CRUD for the model
toolbar<Project>({ exclude: ['GetStats'] });     // auto CRUD minus listed action names
toolbar<Project>({ exclude: 'crud' });           // all actions EXCEPT create/read/update/delete
toolbar<Task>({ actions: 'crud' });              // CRUD only (no custom actions)
toolbar<Task>({ container: 'modal' });           // open all CRUD in modal (ideal for rowToolbar)

// Individual action buttons
toolbar.modelAction('GetStats', { label: 'Stats' });
toolbar.globalAction('GetDashboardSummary', { includeUiMetadata: true });
toolbar.objectAction('UpdateStatus', { params: { status: 'active' }, confirmationModal: false });
toolbar.view({ view: TaskEstimateView, label: 'Estimate', container: 'pageContent' });
toolbar.action({ id: 'BulkX', action: 'BulkX', container: 'modal', modalPosition: 'center' });
toolbar.refreshAction();
toolbar.customAction({ elementId: 'foo', label: 'Foo', handler: async () => {/*...*/} });
toolbar.dropdown({
  elementId: 'manage',
  label: 'Manage',
  menu: menu({ items: [menu.editAction(), menu.divider(), menu.deleteAction()] }),
});

// toolbar.options() — build a ToolbarOptions object for inline use inside custom methods
toolbar.options({ buttons: [toolbar.objectAction('UpdateStatus', { ... })] });
```

> **Prefer `toolbar.view()` over `toolbar.customAction()` when the goal is to open another view.** `toolbar.view()` is type-safe (accepts a view class reference), handles `container`, `modalSize`, `modalPosition`, and `params` declaratively, and tracks navigation history correctly. `toolbar.customAction()` is for arbitrary imperative side-effects (local state changes, third-party calls, etc.) that do not involve opening a Drumr view.

```typescript
// ✅ PREFERRED — open a view declaratively with toolbar.view()
toolbar.view<Task>({
  elementId: 'viewAssigneeDetails',
  view: UserReadView,
  label: 'Assignee details',
  container: 'modal',
  modalPosition: 'right',
  visible: record => Boolean(record?.assignee?.id),
  params: record => ({ id: record?.assignee?.id }),
}),

// ❌ AVOID — using customAction just to call openView() manually
toolbar.customAction({
  elementId: 'viewAssigneeDetails',
  label: 'Assignee details',
  handler: async (record) => openView(UserReadView, { container: 'modal', params: { id: record?.assignee?.id } }),
}),
```

---

## UI API binding

Each `@DataModel` and exposed action has **two GraphQL surfaces**:

| Surface | Operations | Returns |
| --- | --- | --- |
| **Data API** | `ProjectFindById`, `TaskFindBy`, `TaskCreate`, … | Plain record data |
| **UI API** | `ProjectUiFindById`, `TaskUiFindBy`, `UiGetX`, … | Same data **plus** `uiFields` — per-field metadata bundle (label, options, value, errors, visibility) |

`ReadView`, `EditView`, `CreateView`, and `ActionView` automatically call the UI API. `<DataForm>` reads `uiFields` and renders the correct component per field in the correct context (`read` vs `write`).

### Four binding patterns

1. **Implicit** — pass `fields` (or omit for all fields); the framework fetches and renders automatically.
2. **`includeUiMetadata: true`** on a toolbar action — hydrate a `<DataForm uiFields={...} />` in a modal with the action result.
3. **Standalone `<DataForm>`** — embed a model-bound form inside another view, a panel, or a non-persistent submission flow.
4. **Custom `children`** — render `<DataField name="fieldName" />` inside a view's `children` for custom grid control.

```typescript
// Implicit — EditView auto-fetches the UI API
<EditView model="Project" id={id} fields={['name', 'status', 'manager']} />
```

```typescript
// Standalone DataForm — read mode, no submit, embedded in another view
<DataForm
  model="Project"
  id={projectId}
  fields={['name', 'code', 'manager']}
  showActions={false}
  refreshMode="none"
  queryContext={{ mode: UiMode.Read, view: { name: 'TaskDetails' } }}
/>
```

> **Rule**: Every field must be rendered through `<DataField>` (write context) or `<DataComponent>` (read context). Bypassing them strips validation, dirty-state tracking, and write-context rendering.

---

## Building blocks reference

### Framework primitives — use these, never recreate

| Primitive | Use when |
| --- | --- |
| `<DataForm>` | Render a model- or action-bound form (read or write). Standalone or embedded. |
| `<DataField>` | Render a single field from `uiFields` inside a custom write-mode layout. |
| `<DataComponent>` | Render a single read-mode field value from `uiFields`. |
| `<DataTable>` | Render a model-bound paginated table inside a custom free-form view. |
| `<Toolbar>` + `toolbar.*` | Build typed action toolbars. |
| `menu.*` | Compose dropdown / sub-menu items inside toolbars and layouts. |
| `<NestedTabs>` | Standard read-view nested tabs wrapper with card styling. |
| `<NestedView>` | Render a related-records table or custom view panel inside a ReadView. |
| `openView` / `closeView` | Programmatic navigation — respects `container`, `modalSize`, `modalPosition`. |
| `dataAction` / `dataFindBy` / `deleteById` | Typed query-builders for direct GraphQL operations. |

### Services

```typescript
import { getGraphQLClient } from '@drumr/framework-frontend';

export class CustomContextService {
  public selectedAuditId: string | null = null;
}

let _instance: CustomContextService | undefined;
export function getCustomContextService(): CustomContextService {
  return (_instance ??= new CustomContextService());
}

// Use anywhere (including inside functional view components)
const ctx = getCustomContextService();
```

For reactive cross-component state, use React providers registered via `app.registerProviders(...)` — see the frontend-services skill.

### Shared UI helpers

Co-locate small helpers under `frontend/src/shared/`:

- `breadcrumbs.ts` — typed `(): BreadcrumbValue` builders for context-aware breadcrumbs.
- `components/MenuItemWithCounter.tsx` — counter labels for left menus.
- `components/formFooterHelpers.tsx` — reusable Cancel/Submit button blocks for modal footers.

These are plain React/TS helpers — never decorated.

---

## Best practices

### Do

- Use `EditView`, `CreateView`, `ReadView`, `TableView`, `ActionView` as plain React function components — no decorators, no base classes.
- Register all routes in `config/routing.ts` via `app.registerRoutes()`. Set `layout` and `menu` in the route definition, not inside the view function.
- Type the model generic from `@gql` / `@gql/types`; never inline a hand-written interface.
- Use `getApp().message`, `getApp().modal`, `getApp().notification` for user feedback. If feedback is purely local to a rendered component, `App.useApp()` is valid.
- Open companion views with `openView(View, { container, modalSize, modalPosition, params, queryParams })`.
- Resolve singletons with the module getter function (e.g. `getMyService()`) — never `new` them directly in views.
- Pick layout per route: use `formLayout` for create/edit/action flows, then default layout or a dedicated `viewLayout` for read and table views as needed.
- Use `<NestedView kind="table">` inside `ReadView` to embed related-records tables scoped to the parent.
- Keep CRUD alias actions (`menu.editAction()`, `menu.deleteAction()`) inside a toolbar context that provides object id (for example `ReadView`, row toolbar, or selected table rows).

### Don't

- Don't add decorators to your components (`@EditView`, `@CreateView`, `@ReadView`, `@TableView`, `@ActionView`, `@CustomView`) — decorators have been removed.
- Don't import `*ViewComponent` base classes — they have been removed. Views should be basic functional components.
- Don't add `@injectable()` to a view — not needed for functional components.
- Don't import from `tsyringe` directly — use `@drumr/framework-frontend` exports exclusively.
- Don't render a model field with a raw Ant Design component when `<DataField>` / `<DataComponent>` exists.
- Don't build menus with raw Ant `<Menu>`/`<Menu.Item>` — always use the `menu.*` DSL.
- Don't open a modal by manipulating routes — use `openView(View, { container: 'modal' })`.
- Don't declare `layout` or `menu` as props on a functional view — those belong in the route config.
- Don't nest an extra `DataForm` without `id` inside a `ReadView`; it can shadow form context and break object-action id resolution.

---

## Caveats

> **`closeView()` auto-call**: `EditView`/`CreateView` call `closeView()` automatically when `onSaved` is **omitted**. When `onSaved` is provided, `closeView()` is NOT called — navigate explicitly if needed. Same pattern applies to `ActionView` and `onExecuted`.

> **`beforeSave` / `beforeExecute`**: Return `false` to cancel — never throw inside these callbacks.

> **Modal vs page content**: `container: 'modal'` opens modal chrome. `container: 'pageContent'` navigates by URL. `container: 'current'` replaces the current container. Combine `modalSize` / `modalPosition` only with `container: 'modal'`.

> **Generated GraphQL types**: All `@gql` imports come from generated code under `frontend/generated/`. Re-run codegen after any backend model or action change.

---

## File structure

```
frontend/
  src/
    app.ts                                 <- calls configureApp(app); re-exports app.runtime.ts
    app.runtime.ts                         <- Umi runtime exports (getInitialState, layout, antd, …)
    config/
      appConfig.ts                         <- configureApp(app) composes register* calls
      appDefaults.ts                       <- exports registerAppDefaults(app) — calls app.registerDefaults()
      routing.ts                           <- exports registerRoutes(app) — calls app.registerRoutes()
      providers/
        appProviders.tsx                   <- exports registerProviders(app) — calls app.registerProviders()
      layouts/
        mainLayout.tsx                     <- app.registerLayout('main', ...) — global shell (mix nav, fixed width)
        formLayout.tsx                     <- app.registerLayout('form', ...) — narrower form chrome
        viewLayout.tsx                     <- app.registerLayout('view', ...) — fluid read views
    <domain>/                              <- one folder per business domain (for example projects/, tasks/)
      views/
        <Model>TableView.tsx               <- TableView
        <Model>ReadView.tsx                <- ReadView
        <Model>CreateView.tsx              <- CreateView
        <Model>EditView.tsx                <- EditView
        helpers/
          <model>FormLayout.tsx            <- shared renderForm helpers (no decorators)
        actions/
          <ActionName>View.tsx             <- ActionView (object or model action)
      services/
        <Name>Service.ts                   <- domain-scoped frontend service helpers
    dashboard/                             <- custom/free-form views domain
      views/
        DashboardView.tsx                  <- Functional custom view
        SummaryView.tsx
    global/                                <- dedicated domain for global-action views
      views/
        <ActionName>View.tsx               <- ActionView (global action)
    shared/
      components/
        formFooterHelpers.tsx              <- plain React, no decorators
      breadcrumbs.ts
      <Name>Service.ts                     <- truly cross-domain singleton helpers
  generated/
    gql/                                   <- generated GraphQL types — never edit by hand
```

### Domain-based organization rules

- **One folder per business domain**: `projects/`, `tasks/`, `users/`, `reports/`, `dashboard/`, `activityLog/`, `global/`.
- **Views always inside `<domain>/views/`** — never at `src/views/` root.
- **Services co-located with their domain**: `<domain>/services/<Name>Service.ts`.
- **Truly cross-domain helpers** go in `shared/` (e.g., `GraphQLClientService`, `formFooterHelpers`).
- **Global action views** go in `global/views/`.
- **Layout files use camelCase + `.tsx`** when they use JSX; use `.ts` otherwise.
- **Route configuration** lives in `config/routing.ts` (`app.registerRoutes()`); views are imported by domain path.
- **`appDefaults.ts`** exports `registerAppDefaults(app)` which calls `app.registerDefaults({ defaultLayout: mainLayout, ... })`.

---

## Related skills

- [Form Views (Create / Edit / Read)](../frontend-form-views/SKILL.md) — `CreateView`, `EditView`, `ReadView`
- [Table Views](../frontend-table-views/SKILL.md) — `TableView`, columns, row/table toolbars
- [Action Views](../frontend-action-views/SKILL.md) — `ActionView`, param forms, callbacks
- [Custom Views](../frontend-custom-views/SKILL.md) — Custom Views _(separate issue)_
- [Backend: Data Models](../backend-datamodels/SKILL.md) — source of `uiFields` metadata
- [Backend: Actions](../backend-actions/SKILL.md) — what `ActionView` binds to
- [Backend: Auth](../backend-auth/SKILL.md) — visibility rules in `uiFields`

### When to switch

| Associated Skill | When to use | Why the current info is not enough |
| --- | --- | --- |
| [frontend-layout](../frontend-layout/SKILL.md) | If view registration must be integrated with global shell, menus, and navigation modes. | This skill covers shared view concepts, not full layout architecture configuration. |
| [frontend-services](../frontend-services/SKILL.md) | If view orchestration needs dedicated dependency-injected service layers. | This skill references DI usage but not full service design and replacement practices. |
| [frontend-api](../frontend-api/SKILL.md) | If view lifecycle requires explicit typed operation-builder calls and error handling. | This skill discusses integration points but not exhaustive API construction rules. |
| [backend-datamodels](../backend-datamodels/SKILL.md) | If view model bindings depend on backend model schema or field semantics changes. | This skill is frontend-oriented and does not define backend model contracts. |
| [frontend-notifications](../frontend-notifications/SKILL.md) | If the request is primarily about feedback UX (`getApp()`, `App.useApp()`, confirmations, toasts, notifications). | This skill references view architecture broadly, but notification APIs and guardrails are intentionally centralized elsewhere. |

---
name: frontend-components
description: >
  Essential skill for Drumr Framework frontend. Covers the runtime UI component system — DataForm, DataTable, DataField, Toolbar, ActionButtons, Pages, Workflow UI, and layout shell components. Prevents importing raw Ant Design components when a framework wrapper exists.


user-invocable: true
metadata:
  applies-to:
    - core/frontend/src/components/
---

# Frontend skill: components

## Scope

Drumr applications use a **component pipeline** where backend metadata drives frontend rendering. The framework provides a set of React components that:

1. **Resolve field rendering** automatically from backend UI API metadata
2. **Orchestrate CRUD operations** (forms, tables, toolbars) without hand-rolled boilerplate
3. **Handle system concerns** (error pages, authentication, workflow progress) out of the box

This skill covers the components under `core/frontend/src/components/` — the building blocks that views, layouts, and custom pages compose together.

### When to use this skill

- Understanding which framework component to use for a UI need
- Embedding a `DataForm` or `DataTable` in a custom view
- Configuring toolbar buttons and action execution
- Working with workflow progress UI
- Understanding the field resolution pipeline

### When NOT to use this skill

- Choosing which JSX field component renders each model field (read/write) — see [frontend-field-components](../frontend-field-components/SKILL.md)
- The data model field-config mechanism (`app.registerDataModel()`, `labelField`, default views) — see [frontend-datamodels](../frontend-datamodels/SKILL.md). Field types like `@MoneyField`, `@ChoiceField` are backend decorators (schema) — see [backend-datamodels](../backend-datamodels/SKILL.md)
- Building class-based views (see [frontend-views](../frontend-views/SKILL.md))
- Configuring layouts and navigation (see [frontend-layout](../frontend-layout/SKILL.md))

---

## Architecture overview

```
+-----------------------------------------------------------+
|                     Application Layer                     |
|   @TableView, @ReadView, @CreateView, @CustomView, etc.   |
+-----------------------------+-----------------------------+
                              | uses
+-----------------------------v-----------------------------+
|                     Component Layer                       |
|                                                           |
|   +-----------+  +-----------+  +---------+  +---------+  |
|   | DataForm  |  | DataTable |  | Toolbar |  |  Pages  |  |
|   +-----+-----+  +-----------+  +----+----+  +---------+  |
|         |                            |                    |
|   +-----v-----+               +------v---------------+    |
|   | DataField |               | ActionButtons        |    |
|   +-----+-----+               | WorkflowUI           |    |
|         |                     +----------+-----------+    |
|   +-----v------------------+             |               |
|   |   Field Components     |             |               |
|   +------------------------+             |               |
+--------------------------------+---------+---------------+
                                 | built on
+--------------------------------v--------------------------+
|                       Hooks Layer                         |
|                                                           |
|   useDataForm   useDataTable   useActionButton            |
|   useActionView                useDataForm                |
|   (internal: useActionExecution, useActionViewExecution)  |
+-----------------------------+-----------------------------+
                              | queries
+-----------------------------v-----------------------------+
|               Backend UI API (GraphQL)                    |
|   UiFindById, UiFindBy, UiCreate, UiUpdate, UiRefresh     |
+-----------------------------------------------------------+
```

The **Hooks Layer** is also the primary extension point for app developers:
`useActionButton` and `useActionView` are fully public and allow building custom action surfaces without using the pre-built button or toolbar components.

---

## Component families

Each component family has its own detailed reference file.

### 1 · Forms — `DataForm`

The core form rendering component. Automatically renders all fields for a model, handles data loading, field refresh, validation, and submission. Used internally by `@CreateView`, `@EditView`, `@ReadView`, and `@ActionView`. Direct usage is for embedded forms in custom views.

**Full reference**: [form-components.md](./form-components.md)

### 2 · Tables — `DataTable`

Feature-rich data grid with dynamic columns, filtering, sorting, pagination, selection, and toolbar integration. Used internally by `@TableView`. Direct usage is for embedded tables in custom views.

When you need the same table state to drive multiple renderers, or when a custom
view needs framework-managed filtering/sorting/pagination without always
rendering `DataTable`, use `useDataTable` and pass the returned controller to
`DataTable` through the `controller` prop. Detailed hook guidance lives in
[frontend-hooks](../frontend-hooks/SKILL.md).

Use `filters` for persistent/static where-clause constraints that should always apply. Use `initialFilterState` when you want those constraints to appear as preloaded user-visible filters in the QueryFilter UI. `initialFilterState` uses the same static GraphQL-style filter object accepted by `filters`.
For multi-row selection, bulk actions (`bulk: true`) appear in the toolbar as long as they exist on each selected record. `canExecute=false` on individual records does not hide the button — it means "skip this record at runtime". Use `visible` in the UI config to conditionally hide a bulk action button.

**Full reference**: [table-components.md](./table-components.md)

### 3 · Fields — `DataField` & `DataComponent`

- **`DataField`**: Name-based field renderer that must run inside a `FormProvider` (`DataForm` or `useDataForm().FormProvider`). It resolves the concrete input or label from backend metadata and current form state.
- **`DataComponent`**: Value-only renderer for tables, cards, and summaries. It can read from form context by `name` or work standalone from a `{ value, options }` payload. Use `modelName` in standalone mode when frontend defaults should apply.
- **Frontend defaults**: model-level defaults registered through `defineDataModelDefaults` are merged into form-context metadata automatically and can also be applied in standalone `DataComponent` mode with `modelName`.
- **Dynamic frontend defaults**: when a field default callback depends on other form values, declare `dependsOn` on that default entry so `DataField` metadata can update from the specific dependencies instead of subscribing to the whole form instance.
- **Nested array item labels**: when an array field uses `List` with a nested wrapper such as `CompositionAccordion`, `CompositionCard`, or `CompositionPanel`, the nested `label` callback is evaluated against the plain item values in both read and write flows, including backend refresh responses.
- **Registry behavior**: re-registering `defineDataModelDefaults` from the same owner replaces the previous snapshot so HMR and side-effect module re-evaluation stay safe; a different owner registering the same model name still throws.
- **Metadata precedence**: field metadata exposed to `DataField`/`DataComponent` is already merged. Explicit backend `ui.field.label` values take precedence, while backend auto-generated labels remain overridable by frontend defaults.

When a custom renderer is driven by `useDataTable`, keep `controller.rows` as plain model data and use `controller.getUiRecord(record)` only when you need the enriched UI-field shape for metadata-aware rendering. Typical pattern:

```tsx
const uiRecord = controller.getUiRecord(record);
return uiRecord?.status ? (
  <DataComponent options={uiRecord.status} />
) : (
  <span>{record.status ?? '-'}</span>
);
```

**Full reference**: [data-field-components.md](./data-field-components.md)

### 4 · Toolbar — `toolbar` namespace

Unified API for declaring action buttons, navigation, dropdowns, and menus. Serves as both a function (`toolbar<T>()`) and a namespace (`toolbar.objectAction()`, `toolbar.dropdown()`, etc.). Used in `tableToolbar`, `rowToolbar`, and `header.toolbar`.

**Full reference**: [toolbar-components.md](./toolbar-components.md)

### 4 · Action buttons

Standalone React components for executing backend actions with parameter collection, confirmation modals, and post-execution callbacks. Includes `ObjectActionButton`, `ModelActionButton`, `GlobalActionButton`, and `WorkflowActionButton`. These components use the internal `useActionExecution` strategy engine.

For a fully custom rendering surface, use the public headless hooks `useActionButton` and `useActionView` directly (see [frontend-hooks](../frontend-hooks/SKILL.md)).

**Full reference**: [action-button-components.md](./action-button-components.md)

### 5 · Pages

Pre-built full-page screens for system states: `LoginPage`, `NotFoundPage`, `PermissionDeniedPage`, `InternalErrorPage`, `MaintenancePage`, `WorkflowManagementPage`. Rendered automatically by the framework.

**Full reference**: [page-components.md](./page-components.md)

### 6 · Workflow UI

Real-time progress and notification components for long-running backend workflows: `WorkflowInlineProgress` (modal-inline progress) and `WorkflowNotificationCenter` (navbar notification badge).

**Full reference**: [workflow-components.md](./workflow-components.md)

### 7 · Header & navigation

Internal components for the header area: `HeaderDropdown`, `AvatarDropdown`, `RightContent`. Configured via the layout system, not used directly.

**Full reference**: [header-navigation-components.md](./header-navigation-components.md)

### 9 · Shared utilities

Internal hooks and engines (`useActionExecution`, `useActionViewExecution`) used by action buttons, toolbar, and the public `useActionButton`/`useActionView` hooks. Not consumed directly by app code.

**Full reference**: [shared-components.md](./shared-components.md)

---

## Related skills (other folders)

These component domains have their own dedicated skill folders:

| Domain | Skill | Description |
| --- | --- | --- |
| Data model field UI | [frontend-datamodels](../frontend-datamodels/SKILL.md) | Declaring which of these components renders each model field (read/write) via `app.registerDataModel()` |
| Layouts | [frontend-layout](../frontend-layout/SKILL.md) | `@Layout()` decorator, BaseLayout, navigation, menus |
| Views (general) | [frontend-views](../frontend-views/SKILL.md) | Shared view concepts, decorator decision table |
| Table views | [frontend-table-views](../frontend-table-views/SKILL.md) | `@TableView` class-based configuration |
| Form views | [frontend-form-views](../frontend-form-views/SKILL.md) | `@CreateView`, `@EditView`, `@ReadView` |
| Action views | [frontend-action-views](../frontend-action-views/SKILL.md) | `@ActionView` for action parameter forms |
| Custom views | [frontend-custom-views](../frontend-custom-views/SKILL.md) | `@CustomView` free-form pages |
| Hooks | [frontend-hooks](../frontend-hooks/SKILL.md) | `useDataTable` and other headless state patterns for custom views |
| Frontend services | [frontend-services](../frontend-services/SKILL.md) | DI, GraphQL client, navigation |
| Frontend API | [frontend-api](../frontend-api/SKILL.md) | UI API queries and mutations |
| Frontend tech stack | [frontend-tech-stack](../frontend-tech-stack/SKILL.md) | React, Ant Design, Apollo Client |

---

## Quick-reference: when to use what

| Need | Component | Skill file |
| --- | --- | --- |
| Render a form for a model | `DataForm` | [form-components.md](./form-components.md) |
| Render a data table | `DataTable` + `dataTable.options()` | [table-components.md](./table-components.md) |
| Drive table state without always rendering `DataTable` | `useDataTable` | [frontend-hooks](../frontend-hooks/SKILL.md) |
| Render individual fields inside `DataForm` or `FormProvider` | `DataField` | [data-field-components.md](./data-field-components.md) |
| Display a field value read-only (table/card) | `DataComponent` | [data-field-components.md](./data-field-components.md) |
| Add action buttons to a view | `toolbar.objectAction()`, `toolbar.modelAction()` | [toolbar-components.md](./toolbar-components.md) |
| Execute an action from custom JSX | `ObjectActionButton`, `GlobalActionButton` | [action-button-components.md](./action-button-components.md) |
| Show workflow progress | `WorkflowInlineProgress` (auto via toolbar) | [workflow-components.md](./workflow-components.md) |
| Embed a read-only related record | `<DataForm model="X" id={id} queryContext={{ mode: UiMode.Read }} />` | [form-components.md](./form-components.md) |
| Configure field appearance | JSX field component in `app.registerDataModel()` field config | [frontend-field-components](../frontend-field-components/SKILL.md) |
| Create a layout with menus | `@Layout()` + `BaseLayout` | [frontend-layout](../frontend-layout/SKILL.md) |

---

## Component-to-API relationship

Framework components (`DataForm`, `DataTable`) manage their own GraphQL calls internally. You do NOT wire them with Apollo Client or `uiFindBy`/`uiFindById` builders.

| Component | API calls it manages automatically | What you configure |
| --- | --- | --- |
| `DataTable` | `{Model}UiFindBy` for each page load, re-query on filter/sort/pagination change | `model` name, `columns`, `filters`, `pagination.pageSize`, toolbar |
| `DataForm` (with `id`) | Existing-object UI fetch on mount, backend refreshes through the resolved `useDataForm()` controller, and submit/update on save | `model`, `id`, `queryContext`, optional `fields` |
| `DataForm` (`isNewObject`) | New-object metadata/bootstrap query when the form owns its controller, then create-style submit on save | `model`, `isNewObject`, optional `fields` or external `dataFormHook` |
| `DataForm` (`uiFields`) | No fetch; renders from preloaded UI metadata only | `uiFields`, optional `model`, optional `children` |

**When to use `frontend-api` builders alongside components:**

- Implementing a sidebar or card that shows aggregated counts using `dataFindBy`.
- Pre-loading a reference value for `initialData` before rendering a form.
- Executing a `dataAction` or `uiAction` programmatically in a button `onClick` outside a toolbar.
- Fetching a list of records in a `@CustomView` that does NOT embed `DataTable`.

**When NOT to use `frontend-api` builders:**

- Do NOT manually call `uiFindBy` to feed data into a `DataTable`. `DataTable` manages its own query.
- Do NOT manually call `uiFindById` to feed data into a `DataForm`. `DataForm` fetches via its `id` prop.
- Do NOT call `uiCreate` / `uiUpdate` to submit a `DataForm`. The form handles submission internally.

---

## Common pitfalls

1. **Do not render raw Ant Design `<Form>` or `<Table>`** — use `DataForm` / `DataTable`. The framework handles field resolution, validation, refresh, and pagination.
2. **Do not import action button components when toolbar works** — `toolbar.objectAction()` is the preferred declarative API.
3. **Use `DataField` only inside the form pipeline** — inside a `DataForm`, field rendering is automatic unless you pass `children`. When you need manual placement, render `<DataField name="..." />` inside that form context. For standalone display from a raw UI field payload, use `DataComponent` instead.
4. **Do not create custom error pages** — the framework provides `NotFoundPage`, `PermissionDeniedPage`, etc.
5. **Do not import `HeaderDropdown` or `Footer` directly** — configure via `app.registerLayout()`.
6. **Field appearance is configured with JSX field components** — `<TextInput />`, `<MoneyLabel />`, etc. are frontend components assigned in `app.registerDataModel()` field config (see [frontend-field-components](../frontend-field-components/SKILL.md)).

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [frontend-views](../frontend-views/SKILL.md) | If you need the shared view conventions, decorator decision table, or header/toolbar standards that apply across all view types. | This skill covers component APIs but not how views are structured, decorated, or registered. |
| [frontend-table-views](../frontend-table-views/SKILL.md) | If configuring a `@TableView` that uses `DataTable` with columns, filters, pagination, and row actions. | This skill documents the DataTable component but not the class-based TableView configuration layer. |
| [frontend-form-views](../frontend-form-views/SKILL.md) | If configuring `@CreateView`, `@EditView`, or `@ReadView` that use `DataForm` internally. | This skill documents the DataForm component but not the form-view decorators and lifecycle hooks. |
| [frontend-action-views](../frontend-action-views/SKILL.md) | If building an `@ActionView` that collects action parameters via a form. | This skill documents action button components but not the ActionView class and its parameter-binding lifecycle. |
| [frontend-custom-views](../frontend-custom-views/SKILL.md) | If embedding `DataForm`, `DataTable`, or action buttons inside a free-form custom page. | This skill documents component usage but not the CustomViewComponent lifecycle, routing, or ViewContainer patterns. |
| [frontend-hooks](../frontend-hooks/SKILL.md) | If the task is primarily about `useDataTable`, controller-driven tables, shared table/list state, or custom table loaders. | This skill covers component rendering, not the headless hook contract behind controller-driven table state. |
| [frontend-field-components](../frontend-field-components/SKILL.md) | If choosing which JSX field component renders a model field (input type, label format) per read/write context. | This skill covers runtime renderers; the per-type field component catalog lives there. |
| [frontend-layout](../frontend-layout/SKILL.md) | If configuring the app shell, menus, or navigation around these components. | This skill covers in-page components but not the layout configuration or BaseLayout contract. |
| [frontend-services](../frontend-services/SKILL.md) | If components need DI-injected services for GraphQL, navigation, or custom business logic. | This skill covers component rendering but not the service layer architecture or dependency injection patterns. |
| [frontend-notifications](../frontend-notifications/SKILL.md) | If component interactions require canonical confirmation dialogs, toast messages, or app-level notifications. | This skill explains component APIs, but notification patterns and guardrails are centralized in a dedicated skill. |


---
name: frontend-hooks
description: >
  Essential skill for Drumr frontend hooks. Covers `useDataForm` as the
  headless React/TanStack controller behind `DataForm`, `useDataTable` for
  headless table controllers and shared list state, and unified API hooks
  (`useApi*`) for raw or rich GraphQL operations selected via
  `format?: 'data' | 'rich'`.
metadata:
  applies-to:
    - core/frontend/src/hooks/
    - core/frontend/src/hooks/dataForm/
    - core/frontend/src/hooks/dataForm/DataFormContext.tsx
    - core/frontend/src/components/forms/DataForm.tsx
    - core/frontend/src/components/tables/
---

# Frontend skill: hooks

## Scope

Frontend hooks in Drumr encapsulate framework-aware state that can be reused by
multiple React components and layouts while preserving framework behavior.

This skill covers four groups:

1. **`useDataForm`** — headless React/TanStack form controller for single-model
  forms, composable multi-model forms, and custom layouts.
2. **`useDataTable`** — headless table controller consumed by `DataTable` and
  custom table/list renderers.
3. **Unified API hooks** (`useApi*`) — GraphQL operations wrapping
  `${Model}FindById`, `${Model}FindBy`, `${Model}Create`, `${Model}Update`,
  `${Model}DeleteById`, `${Model}Refresh`, and action operations. Omit
  `format` for raw values or pass `format: 'rich'` for `{ value, options,
  errors }` wrappers.
4. **Action hooks** (`useActionButton`, `useActionView`) — headless controllers
   for executing model/object/global actions. `useActionButton` is the
   component-agnostic action button controller (state + execution strategy +
   optional inline form); `useActionView` is the view-oriented controller
   (title, render mode, toolbar, enriched result, and Apollo refresh
   coordination) behind the `ActionView` component.

For `useDataForm`, treat `core/frontend/src/hooks/dataForm/useDataForm.types.ts`
as the current source of truth. Older renderer-agnostic port/adaptor docs are
historical and do not describe the current public API.

Per-field metadata returned by `getFieldMeta()` is already the final merged
shape for the active form context. Frontend defaults are applied while building
that metadata; callers should not rely on backend label provenance flags.
Explicit backend `ui.field.label` values win, while auto-generated backend
labels can still be overridden by frontend defaults.

When frontend defaults use instance-aware callbacks such as `visible`,
`editable`, `label`, `helpMessage`, or an instance-aware `context` matcher,
prefer declaring `dependsOn` in the default entry so the form can re-evaluate
that field metadata only when the relevant form values change.

### When to use this skill

- Implementing or reviewing `useDataForm` or `useDataTable`
- Building composable forms that combine fields from multiple models
- Creating custom form layouts with framework validation and renderer-managed refresh behavior
- Sharing form state via `FormProvider` / `useDataFormContext()`
- Building a `@CustomView` that needs form or table state without always
  rendering a `DataForm` or `DataTable`
- Sharing the same rows, filters, sorting, or pagination between `DataTable`,
  `ProList`, cards, or custom JSX
- Wiring custom `loadData`, `refresh`, or `paginate` handlers
- Rendering metadata-aware values with `controller.getUiRecord(record)` and
  `DataComponent`
- Passing a controller into `DataTable` through the `controller` prop
- Fetching or mutating records directly in a custom view using Data API or
  Meta API hooks

### When NOT to use this skill

- Standard CRUD form screens that should stay as plain `@EditView` / `@CreateView`
- Simple embedded forms that only need `DataForm` with its built-in state
- Standard CRUD list screens that should stay as plain `@TableView`
- Simple embedded tables that only need `DataTable` with its built-in state
- Do not import deep-path internal hooks from `hooks/dataForm/` or `hooks/`; the public controller hooks are `useDataForm` and `useDataTable`.

## Decision guide

| Need | Prefer |
| --- | --- |
| Standard model edit screen | `@EditView` / `@CreateView` |
| Embedded form with built-in behavior only | `DataForm` |
| Composable multi-model form | `useDataForm` |
| Custom form layout with framework validation | `useDataForm` + `FormProvider` |
| Standard model list screen | `@TableView` |
| Embedded table with built-in behavior only | `DataTable` |
| Shared controller across multiple renderers | `useDataTable` |
| Custom data source with framework filtering/sorting/pagination semantics | `useDataTable` |
| Need direct form-fetch internals | Not public; use `useDataForm` or `useApiFindById` / `useApiRefresh` with `format: 'rich'` |
| Fetch raw field values from the backend | `useApiFindById` / `useApiFindBy` |
| Create or update records with raw values | `useApiCreate` / `useApiUpdate` |
| Execute a backend action and get raw results | `useApiAction` |
| Fetch records with per-field UI metadata (options, errors, layout) | `useApiFindById` / `useApiFindBy` with `format: 'rich'` |
| Create or update records within a UI form context | `useApiCreate` / `useApiUpdate` with `format: 'rich'` |
| Re-evaluate form metadata after a field change | `useApiRefresh` |
| Execute a UI-aware action returning metadata-enriched results | `useApiAction` with `format: 'rich'` |
| Headless action button with state (custom button/menu/CTA) | `useActionButton` |
| View-oriented action controller (title/toolbar/result/refresh) | `useActionView` |

## Unified API hooks (`useApi*`)

Unified API hooks live in `core/frontend/src/hooks/api/` and are exported from
`@drumr/framework-frontend`.

### Common patterns

- Query hooks (`useApiFindById`, `useApiFindBy`) run automatically when
  mounted. Pass `null`/`undefined` as `id` to skip.
- Mutation hooks (`useApiCreate`, `useApiUpdate`, `useApiDelete`,
  `useApiRefresh`, `useApiAction`) are lazy.
- All hooks accept `fetchPolicy?: WatchQueryFetchPolicy` (default `'network-only'`).
- Pass `fields` as a typed `FieldsSpec<T>` to select only the fields you need.
  Always memoize inline object literals to prevent infinite re-render loops.
- `useApiFindBy` supports cursor-based pagination via `fetchMore()`. Pass
  `first: null` to fetch all records without a page-size limit.
- Omit `format` or use `format: 'data'` for raw values.
- Pass `format: 'rich'` when caller needs `{ value, options, errors }` wrappers.
- `useApiRefresh` is rich-only and always sends sanitized `RequestContextInput`.

### `useApiFindById`

```tsx
const { data, loading, error, refetch } = useApiFindById<Task>('Task', taskId, {
  fields: { id: true, name: true, status: true },
});
```

### `useApiFindBy`

```tsx
const { data, loading, pageInfo, fetchMore, refetch } = useApiFindBy<Task>('Task', {
  where: { status: { eq: 'active' } },
  orderBy: { createdAt: 'DESC' },
  first: 10,
  fields: { id: true, name: true },
});
```

### `useApiCreate` / `useApiUpdate`

```tsx
const { execute, loading, error, reset } = useApiCreate<Task, TaskCreateInput>('Task');
const task = await execute({ name: 'New Task' });

const { execute: update } = useApiUpdate<Task, TaskUpdateInput>('Task');
const updated = await update({ id: taskId, name: 'Renamed' });
```

### `useApiDelete`

```tsx
const { execute, loading } = useApiDelete('Task');
const deleted = await execute(taskId);
```

### `useApiAction`

```tsx
const { execute, data, loading } = useApiAction<Task>('AssignTask', {
  fields: { id: true, assignee: true },
});
const result = await execute({ id: taskId, params: { assigneeId: 'user-1' } });
```

### Rich mode

```tsx
const { data } = useApiFindById<TaskUi>('Task', taskId, {
  format: 'rich',
  fields: { id: true, name: true, status: true },
});

const { execute: refresh } = useApiRefresh<TaskUi>('Task', {
  fields: { id: true, name: true, status: true },
});
await refresh({ id: taskId, data: values, oldData: previousValues });

const { execute: assign } = useApiAction<TaskUi>('AssignTask', {
  format: 'rich',
  fields: { id: true, assignee: true },
});
await assign({ id: taskId, params: { assigneeId: 'user-1' } });
```

Rich mode differences:

- Results carry `{ value, options, errors }` wrappers.
- Find hooks use unified `${Model}FindById` and `${Model}FindBy` names with `format: rich` on query.
- Create and update still use one combined `input` payload.
- Only `useApiAction` and `useApiRefresh` send request context.
- `useApiAction.execute()` may be called with no input for variable-less global actions.

## Detailed references

- [useDataForm.md](./useDataForm.md) — headless form hook and `DataFormContext`
- [useDataTable.md](./useDataTable.md) — headless table hook
- [useActionButton.md](./useActionButton.md) — headless action button controller
- [useActionView.md](./useActionView.md) — view-oriented action controller behind `ActionView`

## Choice metadata for custom renderers

When a custom renderer reads field metadata from `useDataFormField()` / `getFieldMeta()`, choice fields should prefer `meta.possibleValues` as the primary source for option labels.

- `meta.possibleValues` is normalized by the hook layer from the backend metadata.
- Normalization merges explicit choice arrays (`possibleValues` / `values`) with label-oriented metadata such as `valueNames` and `valueMetadata`.
- Custom renderers should not reimplement their own label lookup from `typeOptions` unless they need extra presentation-only metadata such as descriptions or colors.

## Reference values in form state

`useDataForm()` normalizes relationship/reference field values to primitive ids in form state.

- Loaded records may still include `_displayValue` in the backend `uiFields` metadata and in reference option queries.
- `useDataFormField()` values, `useDataForm().values`, and `useDataFormContext().getValue(name)` should be treated as `string | number` for single references and arrays of ids for multi-reference fields.
- Custom renderers should keep labels in their option sources and write only the selected id back through `change()`.

## Deterministic built-in JSX compilation in defaults

The defaults merge path used by `useDataForm` (`DataModelFieldDefault` and `ActionParamFieldDefault`) includes deterministic JSX normalization for built-in field components.

- If defaults use a canonical object spec (`component: { id: 'choice.dropdown', options: { ... } }`), behavior is unchanged.
- If defaults use a built-in JSX element (`component: <ChoiceDropdown ... />`), the hook normalizes it to the equivalent canonical component specification when mapping is deterministic.
- Unknown JSX elements remain as `customComponent` and are rendered through the custom component path.
- Backend `ui.component.id` always takes precedence over frontend defaults.

Currently covered deterministic built-ins:

- Text/email/html/uuid/longText
- Boolean
- Single choice variants (`choice.label`, `choice.dropdown`, `choice.box`)
- Date/datetime/time
- File
- Single reference variants (`relationship.label`, `relationship.dropdown`, `relationship.box`)
- Explicit numeric label/input variants resolved by field data type (`integer|number|decimal|money`)

Out of scope in this normalization layer:

- Generic numeric component aliases (`number`, `integer`, `decimal`, `money`)
- Multiple choice/reference variants when JSX type alone is not sufficient
- Non-JSX convenience aliases

## Related skills

- [frontend-components](../frontend-components/SKILL.md) — `DataForm`, `DataForm`, `DataTable`, `DataField`, `DataComponent`
- [frontend-form-views](../frontend-form-views/SKILL.md) — declarative `@EditView` / `@CreateView` / `@ReadView` usage
- [frontend-table-views](../frontend-table-views/SKILL.md) — declarative `@TableView` usage
- [frontend-action-views](../frontend-action-views/SKILL.md) — `@ActionView` and action params forms
- [frontend-custom-views](../frontend-custom-views/SKILL.md) — full-page custom view lifecycle and routing
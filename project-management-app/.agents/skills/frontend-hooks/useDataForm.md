# useDataForm

> Part of the [frontend-hooks](./SKILL.md) skill.

---

## Purpose

`useDataForm` is the headless React controller behind Drumr's `DataForm`.
It manages object fetching, manual refresh, submit execution, backend metadata,
field errors, and array field operations for a single model object.

It is independent from Ant Design, but it is **not** a fully renderer-neutral
port. The current public API still exposes:

- TanStack Form through `form`
- React context through `FormProvider`
- per-field subscriptions through `useDataFormField()` or `useField({ form, name })`

Use it when you need to:

- build a custom form layout around Drumr-managed state
- compose multiple model forms in the same view or wizard
- share a single form controller across several React components
- intercept submit or refresh behavior with `onSubmit` / `onRefresh`
- drive `DataForm` explicitly through the `dataFormHook` prop

Prefer `DataForm` when you want the ready-made renderer, notifications, and
`refreshTrigger` wiring.

---

## Core patterns

### Use `DataForm` as the renderer

```tsx
import { DataForm, useDataForm } from '@drumr/framework-frontend';

function TaskEditScreen({ taskId }: { taskId: string }) {
  const dataForm = useDataForm({
    model: 'Task',
    id: taskId,
    onSubmitSuccess: () => navigate.back(),
  });

  return (
    <DataForm
      dataFormHook={dataForm}
      refreshMode="auto"
      refreshTrigger={['status', 'assignee']}
    />
  );
}
```

### Build a custom renderer

```tsx
import {
  useDataForm,
  useDataFormField,
} from '@drumr/framework-frontend';

function ProjectEditor({ projectId }: { projectId: string }) {
  const dataForm = useDataForm({
    model: 'Project',
    id: projectId,
    onSubmitSuccess: () => navigate.back(),
  });
  const { FormProvider, formState, submit } = dataForm;

  if (formState.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <FormProvider>
      <TitleField />
      <button type="button" onClick={() => void submit()}>
        Save
      </button>
    </FormProvider>
  );
}

function TitleField() {
  const field = useDataFormField('title');

  return (
    <label>
      <span>{field.meta.label}</span>
      <input
        value={String(field.value ?? '')}
        onChange={(e) => field.change(e.target.value)}
        disabled={field.meta.readOnly}
      />
      {field.meta.errors.map((error) => (
        <small key={error.message}>{error.message}</small>
      ))}
    </label>
  );
}
```

Custom renderers must call `refresh()` themselves or recreate their own
trigger behavior. The hook does not auto-refresh on change by itself.

---

## Options (`UseDataFormOptions`)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `model` | `string` | — | Model name for fetch, refresh, and submit operations |
| `id` | `string` | — | Object ID for edit/read mode |
| `isNewObject` | `boolean` | `false` | Whether the form is creating a new record |
| `fields` | `FieldsInput<T>` | all fields | Field selection object spec or legacy string array |
| `context` | `UiContext` | — | Compatibility UI context; used when `queryContext` is not provided |
| `skip` | `boolean` | `false` | Skip the automatic initial fetch |
| `initialData` | `FormValues` | — | Initial plain values used when bootstrapping a new object or manual baseline |
| `queryContext` | `UiContext` | inferred | Preferred UI context for fetch, refresh, and submit; overrides `context` |
| `uiFields` | `Record<string, UiField \| null>` | — | Preloaded UI field tree; skips backend fetching |
| `refreshMode` | `'auto' \| 'custom' \| 'none'` | `'auto'` | How refresh behaves when triggered. `auto` runs the built-in server refresh; `custom` calls `onRefresh` instead (dev must call `defaultRefresh` explicitly if desired); `none` disables refresh entirely |
| `refreshTriggers` | `string[]` | — | Specific fields that trigger refresh |
| `onSubmitSuccess` | `(result) => void` | — | Called after a successful submit |
| `onSubmitError` | `(error) => void` | — | Called after a failed submit with a top-level error |
| `onObjectLoaded` | `(object) => void` | — | Called with the normalized plain object once data is fetched |
| `onFetchPermissionDenied` | `() => void` | — | Called when the fetch resolves to a permission-denied state |
| `onLoadingChange` | `(loading) => void` | — | Called when effective loading changes |
| `onErrorsChange` | `(errors) => void` | — | Called when field error entries change |
| `onSubmit` | `(sanitizedData, defaultSubmit, context) => Promise<SubmitResult>` | — | Override or wrap the default submit lifecycle |
| `onRefresh` | `OnRefreshCallback` | — | Custom refresh handler, only called when `refreshMode='custom'`. Receives `(defaultRefresh, context)` — call `defaultRefresh()` explicitly if you want the server refresh to run |

When both `context` and `queryContext` are provided, `queryContext` wins.

### `onSubmit`

`onSubmit` lets you intercept submit execution without reimplementing the whole
mutation flow:

```tsx
const dataForm = useDataForm({
  model: 'Task',
  onSubmit: async (data, defaultSubmit) => {
    // Add pre-submit logic here, then delegate to the built-in mutation.
    return defaultSubmit(data);
  },
});
```

### `onRefresh`

`onRefresh` receives the built-in refresh delegate plus the current public
context. Only called when `refreshMode='custom'`:

```tsx
const dataForm = useDataForm({
  model: 'Task',
  refreshMode: 'custom',
  onRefresh: async (defaultRefresh, context) => {
    if (context.changedFieldsSinceRefresh.has('country')) {
      context.getValue('country');
    }
    return defaultRefresh(); // call explicitly to also run server refresh
  },
});
```

---

## Return value (`UseDataFormReturn`)

`UseDataFormReturn` extends `DataFormContextValue` and adds two hook-only
properties.

### Hook-only properties

| Property | Type | Description |
| --- | --- | --- |
| `values` | `FormValues` | Reactive snapshot of all current form values at the hook call site |
| `FormProvider` | `(props: { children: ReactNode }) => ReactNode` | Wraps descendants with `DataFormContext` |

`values` is **not** part of `DataFormContextValue`. Descendant components should
use `useDataFormField()`, `useField({ form, name })`, or `getValue(name)`.

### Form and state

| Property | Type | Description |
| --- | --- | --- |
| `model` | `string \| undefined` | Bound model name |
| `form` | `AnyFormApi` | TanStack Form instance used for field subscriptions |
| `changedFieldsSinceRefresh` | `Set<string>` | Fields changed since the last successful refresh |
| `formState` | `FormState` | Aggregate form state object |

`formState` contains:

| Property | Type | Description |
| --- | --- | --- |
| `formState.isLoading` | `boolean` | Whether the initial fetch is in progress |
| `formState.isRefreshing` | `boolean` | Whether `refresh()` is in flight |
| `formState.isSubmitting` | `boolean` | Whether `submit()` is in flight |
| `formState.isDirty` | `boolean` | Whether TanStack values differ from the current baseline |
| `formState.isTouched` | `boolean` | Whether any field has been touched |
| `formState.isValid` | `boolean` | Whether TanStack currently considers the form valid |
| `formState.hasChangedSinceRefresh` | `boolean` | Whether Drumr change tracking has pending changes |
| `formState.canSubmit` | `boolean` | Whether the form can submit right now |

### Metadata and errors

| Property | Type | Description |
| --- | --- | --- |
| `meta.uiFields` | `Record<string, UiField \| null> \| null` | Backend field metadata tree |
| `meta.actions` | `UiActionMetadata[]` | Available actions for the object |
| `meta.objectId` | `string \| undefined` | Resolved object ID |
| `meta.permissionDenied` | `boolean` | Whether fetch resolved to permission denied |
| `meta.loadError` | `Error \| null` | Fetch error |
| `errors` | `FieldErrorEntry[]` | Field-level errors from refresh or submit |
| `errorSummary` | `ErrorSummaryEntry[]` | Aggregated summary entries for notifications or banners |

### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `getValue` | `(name: string) => unknown` | Imperative read of a single field value |
| `getFieldMeta` | `(name: string) => FieldMeta \| null` | Merge backend UI metadata with TanStack interaction state |
| `change` | `(name: string, value: unknown) => void` | Update a field, track the change, and clear stale field errors |
| `pushFieldValue` | `(name: string, item: unknown) => void` | Append an item to an array field |
| `removeFieldValue` | `(name: string, index: number) => void` | Remove an item from an array field |
| `moveFieldValue` | `(name: string, fromIndex: number, toIndex: number) => void` | Reorder items in an array field |
| `submit` | `() => Promise<SubmitResult>` | Execute the default create/update mutation |
| `refresh` | `(options?) => Promise<RefreshResult>` | Execute the backend UI refresh |
| `reload` | `() => Promise<void>` | Re-fetch the full object from the backend |

---

## Descendant access

Inside `FormProvider`, use the context layer according to the kind of access you
need:

- `useDataFormField(name)` for most custom field components
- `useField({ form, name })` when you need direct TanStack control
- `useDataFormContext()` when you need form-wide operations such as `submit()`,
  `refresh()`, `reload()`, or array mutation helpers

`useDataFormContext()` does **not** expose `values`. For descendants, prefer:

- reactive value access through `useDataFormField()` or `useField({ form, name })`
- imperative snapshots through `getValue(name)`

```tsx
import { useDataFormContext } from '@drumr/framework-frontend';

function SaveToolbar() {
  const { formState, refresh, submit } = useDataFormContext();

  return (
    <>
      <button
        type="button"
        disabled={formState.isRefreshing}
        onClick={() => void refresh()}
      >
        Refresh
      </button>
      <button
        type="button"
        disabled={!formState.canSubmit}
        onClick={() => void submit()}
      >
        Save
      </button>
    </>
  );
}
```

---

## Refresh behavior

`useDataForm` exposes `refresh()`, tracks `changedFieldsSinceRefresh`, and lets
you override refresh through `onRefresh`. It does **not** automatically call
`refresh()` when fields change.

The default `DataForm` renderer adds that behavior through
`RefreshTriggerProvider`, `refreshMode`, and `refreshTrigger`. That distinction
matters:

- `useDataForm` owns the refresh execution
- `DataForm` owns the default blur/change trigger UX
- fully custom renderers must call `refresh()` themselves or recreate the
  trigger semantics they need
- refresh-mode queries are only enabled when refresh is explicitly requested
  (for example create/action parameter forms); a missing `id` by itself does
  not switch fetch logic into refresh mode

---

## Internal architecture

`useDataForm` is composed from small hook modules in `hooks/dataForm/`:

| Module | Responsibility |
| --- | --- |
| `useDataFormFetch` | Fetches `uiFields`, `actions`, `objectId`, and permission state |
| `useDataFormErrors` | Stores field errors and error summary |
| `useDataFormSubmit` | Executes create/update mutations and maps validation errors |
| `useDataForm` | Low-level Apollo UI query wrapper used by `useDataFormFetch` |

The hook layer has zero antd imports. Ant Design rendering, notifications, and
refresh-trigger wiring live in `DataForm` and related form components.

---

## Composable forms pattern

You can coordinate multiple `useDataForm` instances in the same screen:

```tsx
function ProjectWizard() {
  const projectForm = useDataForm({ model: 'Project', isNewObject: true });
  const teamForm = useDataForm({ model: 'Team', isNewObject: true });

  const handleSubmit = async () => {
    const projectResult = await projectForm.submit();
    const projectId =
      projectResult.success &&
      projectResult.data &&
      typeof projectResult.data === 'object'
        ? (projectResult.data as { id?: string }).id
        : undefined;

    if (!projectId) {
      return;
    }

    teamForm.change('project', projectId);

    const teamResult = await teamForm.submit();
    if (!teamResult.success) {
      // teamForm.errors and teamForm.errorSummary contain the current failures
    }
  };

  return (
    <>
      <DataForm dataFormHook={projectForm} showActions={false} />
      <DataForm dataFormHook={teamForm} showActions={false} />
      <button type="button" onClick={() => void handleSubmit()}>
        Finish
      </button>
    </>
  );
}
```

---

## Related skills

- [frontend-components](../frontend-components/SKILL.md) — `DataForm`, `DataField`, `DataComponent`
- [frontend-form-views](../frontend-form-views/SKILL.md) — `CreateView`, `EditView`, `ReadView`
- [frontend-action-views](../frontend-action-views/SKILL.md) — `@ActionView` and action params forms

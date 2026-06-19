# Form components - `DataForm`

> Part of the [frontend-components](./SKILL.md) skill.

---

## Purpose

`DataForm` is the framework's ready-made renderer for a single `useDataForm`
controller. It is intentionally thin: the hook owns data, metadata, submit,
refresh, and error state; `DataForm` owns the default rendering layer around
that controller.

Use `DataForm` when you want framework-managed rendering for one object and you
still want to control layout through JSX. Typical direct-use cases are:

- embedding a read-only details panel inside a custom view
- rendering a non-persistent or action-parameter form with a custom toolbar
- reusing a controller created with `useDataForm()` across several components

Prefer [frontend-form-views](../frontend-form-views/SKILL.md) or
[frontend-action-views](../frontend-action-views/SKILL.md) for full page or
modal CRUD flows. Those higher-level components create the hook for you and add
navigation, headers, and toolbar behavior.

---

## Import

```typescript
import { DataField, DataForm, UiMode, UiUsage, useDataForm } from '@drumr/framework-frontend';
```

---

## Mental model

`DataForm` resolves its controller in this order:

1. `dataFormHook` prop, when provided
2. the nearest form-view context (`CreateView`, `EditView`, `ReadView`, `ActionView`)
3. an internal `useDataForm()` call built from the `DataForm` props

When `DataForm` resolves the controller from `dataFormHook` or from a surrounding form-view context, it reuses that controller directly and does not spin up an extra internal `useDataForm()` instance.

Once the controller is resolved, `DataForm` does five things:

1. renders a loading spinner while `formState.isLoading` is `true`
2. renders a 403 result when `meta.permissionDenied` is `true`
3. auto-renders visible top-level fields when `children` are omitted
4. shows the default submit button when actions are enabled
5. wraps descendants with `FormProvider` and refresh-trigger wiring

There is no built-in reset button and no built-in refresh button in the current
implementation.

---

## Props reference

| `model` | `string` | Model name. Required when `DataForm` should create its own controller. Optional when `uiFields` or a fully configured `dataFormHook` already provide the form state. |
| `id` | `string` | Existing object ID. Triggers an object fetch when the form owns its controller. |
| `isNewObject` | `boolean` | Marks the form as create-mode / non-persistent mode. |
| `fields` | `FieldsInput<T>` | Field selection for the internally created controller. Object spec is preferred; legacy string arrays are still accepted. |
| `fieldNames` | `string[]` | Deprecated alias for `fields`. |
| `uiFields` | `Record<string, UiField \| null>` | Preloaded UI field tree. Skips internal fetching. |
| `dataFormHook` | `UseDataFormReturn` | External controller created with `useDataForm()`. Use this for controller-owned forms, multi-form screens, `initialData`, or hook-level callbacks. |
| `showActions` | `boolean` | Controls whether the default submit area is rendered. Defaults to `true`. Read mode still suppresses actions automatically. |
| `submitter` | `false \| { submitText?: string }` | Hides the default submit button or customizes its label. `false` is equivalent to hiding actions. |
| `refreshMode` | `'auto' \| 'custom' \| 'none'` | Controls refresh behavior. Default is `'auto'` — omit unless using `'custom'` or `'none'`. |
| `refreshTrigger` | `FieldPath<T>[] \| string[]` | Field paths that trigger refresh on blur, selection changes, or array mutations. Paths are schema-level and omit array indices. When omitted, any changed field can trigger refresh. |
| `onSubmitSuccess` | `(result) => void` | Additional submit-success callback forwarded to `useDataForm()`. |
| `onSubmitError` | `(error) => void` | Additional submit-error callback forwarded to `useDataForm()`. |
| `onSubmit` | `OnSubmitCallback` | Override or wrap the default submit behavior. |
| `onRefresh` | `OnRefreshCallback` | Custom refresh handler — only called when `refreshMode='custom'`. Receives `(defaultRefresh, context)`: call `defaultRefresh()` explicitly if you want the server refresh to run. |
| `queryContext` | `UiContext` | UI context used for fetch, refresh, and submit. Defaults to `{ mode: UiMode.Write, usage: UiUsage.Custom }` when not otherwise provided by the controller. |
| `formProps` | `Partial<FormProps>` | Layout and appearance props forwarded to the inner antd `<Form>`. Props like `onFinish`, `onValuesChange`, and `form` are still overridden by `DataForm`. |
| `children` | `ReactNode` | Custom body rendered inside the resolved `FormProvider`. Replaces auto-rendered fields. |

`DataForm` uses the singular prop name `refreshTrigger`. The plural
`refreshTriggers` prop belongs to `CreateView`, `EditView`, and `ActionView`.

When `DataForm` is rendered inside a `CreateView`, `EditView`, `ReadView`, or `ActionView`, configure field selection on the view (or on the external `dataFormHook`). The nested `DataForm` reuses that controller and will auto-render the fields already loaded into `meta.uiFields`.

**`refreshMode` guidance**

- `auto` (default): `DataForm` runs the built-in server refresh automatically. `onRefresh` is ignored.
- `custom`: `onRefresh` is called instead of the default server refresh. The callback receives `defaultRefresh` as first arg — call it explicitly if you want the server refresh to run as part of your logic.
- `none`: refresh is disabled entirely, even if `refreshTrigger` fields are defined.

---

## Rendering behavior

### Auto-rendered body

When `children` is omitted, `DataForm` renders one `<DataField name="..." />`
per visible top-level field.

The default field list is resolved from:

1. `fields`, when provided
2. `meta.uiFields` keys when no explicit field selection is provided

Two important details from the current implementation:

- `_`-prefixed internal keys are always excluded
- object-spec selections only auto-render their top-level keys, so
  `{ address: { street: true } }` renders the `address` field, not a standalone
  `address.street` field

When you need a custom grid or sectioned layout, pass `children` and render
`DataField` instances yourself.

### Submit behavior

The default submit button calls `submit()` on the resolved controller.

`DataForm` also owns the default notification layer:

- success: `Created successfully` or `Saved successfully`
- non-validation errors: error toast
- validation errors: summary notification plus scroll-to-field navigation

If `queryContext.mode === UiMode.Read`, the default submit area is hidden even
when `showActions` is `true`.

---

## Refresh behavior

`DataForm` no longer renders a built-in refresh button. Refresh is driven by the
field pipeline and by the controller API.

- text-like fields notify refresh on blur
- boolean, choice, and reference selections notify refresh immediately on change
- array add / remove / move operations notify refresh immediately
- `refreshTrigger` paths use schema-level dot notation without array indices
- omitting `refreshTrigger` acts as a wildcard, so any eligible field can trigger refresh

For direct `DataForm` usage, treat `onRefresh` as the authoritative
customization point. `refreshMode` is primarily adapted by higher-level view
components such as `CreateView`, `EditView`, and `ActionView`.

If you need imperative control, call `dataFormHook.refresh()` from a
controller-owned form.

---

## Examples

### Embedded read-only details panel

```tsx
import { DataForm, UiMode } from '@drumr/framework-frontend';

<DataForm
  model="Project"
  id={projectId}
  queryContext={{
    mode: UiMode.Read,
    view: { name: 'TaskDetails' },
  }}
  fields={{ name: true, code: true, manager: true }}
  showActions={false}
/>
```

### Custom layout with `children`

```tsx
import { Col, Row } from 'antd';
import { DataField, DataForm, UiMode, UiUsage } from '@drumr/framework-frontend';

<DataForm<Document>
  model="Document"
  id={id}
  queryContext={{ mode: UiMode.Read, usage: UiUsage.Custom }}
  formProps={{ layout: 'horizontal', labelCol: { span: 3 } }}
>
  <Row gutter={16}>
    <Col span={12}>
      <DataField name="title" />
    </Col>
    <Col span={12}>
      <DataField name="status" />
    </Col>
  </Row>
</DataForm>
```

### Controller-owned form with `useDataForm`

```tsx
import { DataForm, useDataForm } from '@drumr/framework-frontend';

function TaskEstimateView() {
  const dataFormHook = useDataForm({
    model: 'TaskEstimate',
    isNewObject: true,
  });

  return (
    <DataForm
      model="TaskEstimate"
      dataFormHook={dataFormHook}
      isNewObject
      showActions={false}
    />
  );
}
```

### Typed refresh trigger paths

```tsx
type Book = {
  title: string;
  notes: Array<{ note: string }>;
};

<DataForm<Book>
  model="Book"
  id={bookId}
  refreshTrigger={['title', 'notes.note']}
/>
```

### Custom refresh mode

Use `refreshMode="custom"` with an `onRefresh` callback to run custom logic on refresh. The callback receives `defaultRefresh` as first arg — call it if you want the standard server refresh to also run:

```tsx
import type { OnRefreshCallback } from '@drumr/framework-frontend';

const handleRefresh: OnRefreshCallback = async (defaultRefresh, ctx) => {
  if (ctx.changedFieldsSinceRefresh.has('title')) {
    ctx.change('slug', slugify(ctx.form.state.values.title as string));
  }
  return defaultRefresh(); // call explicitly to also run server refresh
};

<DataForm
  model="Task"
  id={taskId}
  refreshMode="custom"
  onRefresh={handleRefresh}
/>
```

---

## Migration notes from the pre-refactor API

Do not document or generate these on current code:

- `formRef`
- `form`
- `initialData`
- `showSubmit`
- `refreshTriggers`
- `onChange`
- `onFinish`
- `onFinishFailed`
- `errors`
- `onErrorsChange`
- `loading`
- `loadingPlaceholder`
- `onLoadingChange`
- `renderFields`

Use these current replacements instead:

- `useDataForm({ initialData, onErrorsChange, onLoadingChange, ... })`
- `dataFormHook` to pass that controller into `DataForm`
- `children` for custom body layout
- `showActions` or `submitter` for the default submit area
- `refreshTrigger` on `DataForm`, or `refreshTriggers` on the higher-level view components

---

## Best practices

1. Prefer `CreateView`, `EditView`, `ReadView`, and `ActionView` for full CRUD screens.
2. Use the object-spec `fields` format by default; it matches the UI query builder API.
3. When you pass `children`, render model fields through `DataField` instead of raw antd inputs.
4. Use `dataFormHook` when you need `initialData`, custom submit/refresh orchestration, or several forms on one screen.
5. Use `uiFields` only when you already own the exact UI metadata and want to skip duplicate fetching.

---

## Related skills

- [frontend-hooks](../frontend-hooks/SKILL.md) - `useDataForm`, `useDataFormField`, and controller-owned form patterns
- [frontend-form-views](../frontend-form-views/SKILL.md) - `CreateView`, `EditView`, and `ReadView`
- [frontend-action-views](../frontend-action-views/SKILL.md) - `ActionView` and action-parameter forms
- [frontend-field-components](../frontend-field-components/SKILL.md) - the JSX field components resolved by `DataField`

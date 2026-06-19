# Field components - `DataField` and `DataComponent`

> Part of the [frontend-components](./SKILL.md) skill.

---

## Overview

Drumr exposes two complementary field-level components:

| Component | Purpose |
| --- | --- |
| `DataField` | Form-context field renderer. Reads value, metadata, errors, and interaction state from the nearest `FormProvider`, then chooses the correct editable or read-only field component automatically. |
| `DataComponent` | Value-only renderer. Useful in tables, cards, summaries, and any other display-only surface. It can read from form context or work standalone from a `{ value, options }` payload. |

The refactor changed the contract in an important way:

- `DataField` is now a name-based component tied to the current form context
- `DataComponent` is the component that supports standalone rendering from UI metadata

Do not use the old `DataField options/value/errors/componentId/...` API when
writing new guidance.

---

## Import

```typescript
import { DataComponent, DataField } from '@drumr/framework-frontend';
```

---

## `DataField`

### Props reference

| Prop | Type | Description |
| --- | --- | --- |
| `name` | `FieldIdentifier` or typed `FieldSelector<T>` | Required field path. Accepts dot strings for normal paths and indexed segment arrays for typed array-item paths. |
| `antdOptions` | `Partial<FormItemProps>` | Optional per-field `Form.Item` layout overrides. Use this to mix horizontal and vertical field layouts or tweak label/wrapper columns for one field. |

### Required context

`DataField` must be rendered inside a `FormProvider` returned by
`useDataForm()`. In practice, that means one of these two patterns:

- inside `<DataForm ...>`
- inside `<dataFormHook.FormProvider>...</dataFormHook.FormProvider>` when you own the controller directly

`DataField` is no longer the standalone metadata-entry component. If you only
have a raw `{ value, options }` object and no form context, use
`DataComponent` instead.

### What `DataField` resolves automatically

The current implementation chooses the concrete renderer in this order:

1. explicit backend `ui.component.id`
2. array and nested-model container components
3. label renderer for read-only fields
4. input renderer for editable fields

That means the consumer usually only supplies `name`. `DataField` already knows
how to handle:

- text, number, boolean, choice, date/time, file, JSON, and relationship fields
- array editors and array read-only renderers
- composition / nested-model fields
- hidden or unavailable fields
- backend validation errors and touched-state filtering

If the backend sends an unsupported `dataType` or component id, the field logs a
resolution error and renders nothing.

### Common usage patterns

#### Custom layout inside `DataForm`

```tsx
import { Col, Row } from 'antd';
import { DataField, DataForm } from '@drumr/framework-frontend';

<DataForm model="Task" id={taskId} submitter={false}>
  <Row gutter={16}>
    <Col span={24}>
      <DataField name="title" />
    </Col>
    <Col span={12}>
      <DataField name="project" />
    </Col>
    <Col span={12}>
      <DataField name="status" />
    </Col>
  </Row>
</DataForm>
```

#### Typed array-item paths

```tsx
type Task = {
  notes: Array<{ title: string }>;
};

<DataField<Task> name={['notes', noteIndex, 'title']} />
```

For typed array items, prefer segment arrays over dot strings with runtime
indices.

#### Array or composition parent fields

```tsx
<DataField name="notes" />
<DataField name="reviewChecks" />
```

You do not manually map child rows for the common case. The array or
composition renderer delegates back into `DataField` for nested children.

#### Per-field layout overrides

```tsx
<DataField
  name="status"
  antdOptions={{
    layout: 'horizontal',
    labelCol: { span: 6 },
    wrapperCol: { span: 18 },
  }}
/>
```


---

## `DataComponent`

`DataComponent` renders a field value without `Form.Item` behavior. It supports
three current modes.

### Props reference

| Prop | Type | Description |
| --- | --- | --- |
| `modelName` | `string` | Optional model name used to resolve frontend defaults in standalone mode. |
| `name` | `string` | Form-context field name. When provided, `DataComponent` reads value and metadata from the nearest form context. |
| `options` | `DataComponentOptions` | Standalone payload or form-context overrides. The accepted shape is `{ value?: unknown, options?: UiFieldOptions \| Record<string, unknown>, errors?: ... }`. |
| `className` | `string` | Optional wrapper class. |
| `style` | `React.CSSProperties` | Optional wrapper style. |

### The three supported modes

#### Form-context mode

```tsx
<DataComponent name="status" />
```

This reads the current value and metadata from the nearest `FormProvider`.

#### Form-context mode with metadata overrides

```tsx
<DataComponent
  name="status"
  options={{
    options: {
    },
  }}
/>
```

This keeps the value from form context but merges extra UI options on top.

#### Standalone mode

```tsx
<DataComponent
  options={{
    value: task.status.value,
    options: task.status.options,
  }}
/>
```

This is the display-only replacement for the old standalone `DataField` usage.

### Standalone defaults with `modelName`

When you render `DataComponent` outside a form pipeline and want frontend model
defaults to apply, pass `modelName` as well:

```tsx
<DataComponent
  modelName="Project"
  options={{
    value: project.status.value,
    options: project.status.options,
  }}
/>
```

Inside `DataForm` or any `FormProvider`, those defaults are already part of the
resolved field metadata, so `modelName` is not needed.

### Fallback behavior

`DataComponent` is intentionally forgiving:

For `component`, both object specs and React elements are supported.

Built-in JSX defaults are first-class and compile to canonical component specs. Examples:

- `<TextLabel limitCharacters={200} />` -> `text.label` with `{ limitCharacters: 200 }`
- `<ChoiceDropdown placeholder="Select status" />` -> `choice.dropdown` with `{ placeholder: 'Select status' }`
- `<DateTimePickerField showTime />` -> `dateTime.picker` with `{ showTime: true }`

Array and composition wrappers also support JSX authoring markers in defaults config:

- `<List component={<TextLabel />} />` -> `array.list` with `{ component: { id: 'text.label' } }`
- `<List sorting={false} component={<TextInput placeholder="Enter tag" />} />` -> `array.list` with nested `text.input` options
- `<CompositionPanel label={...} />` -> `nestedModel.list`
- `<CompositionCard label={...} size="large" />` -> `nestedModel.card`
- `<CompositionAccordion label={...} defaultExpanded collapsible />` -> `nestedModel.accordion`

When `List.component` is a JSX element, nested compilation is recursive and produces canonical `id/options` component specs.

When using built-in JSX for defaults, omit `name`. The field name is supplied later by the form pipeline at runtime. Any additional props are treated as component options during defaults compilation.

Unknown JSX elements remain custom components and keep the `customComponent` render path.

### `DataComponent` — `modelName` prop
- with `name`: it renders from form context
- with `options`: it renders from the standalone payload
- with neither: it renders `-`
- with a standalone value but no metadata: it falls back to `String(value)` or `-`

---

## `DataField` vs `DataComponent`

| Scenario | Use |
| --- | --- |
| Editable or metadata-driven field inside a form | `DataField` |
| Custom form layout inside `DataForm` | `DataField` |
| Value-only cell in a table or card | `DataComponent` |
| Standalone render from a raw UI API field payload | `DataComponent` |
| Need submit/refresh/error lifecycle through form context | `DataField` |

---

## Best practices

1. Treat `DataField` as a form-context component, not as a metadata adapter.
2. Let backend metadata choose the concrete field renderer whenever possible.
3. Use `antdOptions` only for layout concerns; do not reintroduce field semantics through props.
4. Use `DataComponent` for pure display and `DataField` for form participation.
5. When you need a custom editable renderer, start from `useDataFormField()` or `useDataFormContext()` instead of bypassing the form pipeline.

---

## Related skills

- [form-components.md](./form-components.md) - `DataForm`, which provides the standard `FormProvider` context
- [table-components.md](./table-components.md) - `DataTable`, which commonly uses `DataComponent` in display cells
- [frontend-hooks](../frontend-hooks/SKILL.md) - `useDataForm`, `useDataFormField`, and form-context hooks
- [frontend-field-components](../frontend-field-components/SKILL.md) - the JSX field components `DataField`/`DataComponent` resolve and render

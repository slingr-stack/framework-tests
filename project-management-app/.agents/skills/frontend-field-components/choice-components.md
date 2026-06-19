# Choice components

> Part of the [frontend-field-components](./SKILL.md) skill. Pairs with backend field type `@ChoiceField` (schema/enum lives in [backend-datamodels](../backend-datamodels/SKILL.md)).

## Available components

| Component | Mode | Pairs with |
| --- | --- | --- |
| `<ChoiceLabel>` | Read | `@ChoiceField` |
| `<ChoiceDropdown>` | Write | `@ChoiceField` |

## Props reference

Both accept choice value-presentation props:

- `valueMetadata?: Record<string, { label?: string; color?: string; description?: string }>` — full metadata per value
- `valueNames?: Record<string, string>` — override display labels only

`<ChoiceDropdown>` also accepts `placeholder?: string`.

### Colors in `valueMetadata`

The `color` property accepts:

- **Ant Design status presets**: `'default'`, `'processing'`, `'success'`, `'warning'`, `'error'`
- **Named colors**: `'green'`, `'blue'`, `'orange'`, `'red'`, `'purple'`, etc.
- **Hex values**: `'#FF5733'`

## Examples

> Field entries inside `app.registerDataModel<Model>('Model', { fields: { … } })`. Define the metadata once as a `const` and pass it to both read and write components — this avoids duplication (the framework also propagates it to tables).

### Status field with colored labels and dropdown

```tsx
// backend: enum ProjectStatus + @ChoiceField({ required: true, type: () => ProjectStatus }) status
const PROJECT_STATUS_METADATA = {
  planning:  { label: 'Planning',  color: 'default' },
  active:    { label: 'Active',    color: 'processing' },
  on_hold:   { label: 'On Hold',   color: 'warning' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
} as const;

// fields:
status: [
  { context: 'read',  component: <ChoiceLabel valueMetadata={PROJECT_STATUS_METADATA} /> },
  { context: 'write', component: <ChoiceDropdown valueMetadata={PROJECT_STATUS_METADATA} placeholder="Select project status" /> },
],
```

### Priority field with named colors

```tsx
// backend: enum ProjectPriority + @ChoiceField({ required: true, type: () => ProjectPriority }) priority
const PRIORITY_METADATA = {
  low:      { label: 'Low',      color: 'green' },
  medium:   { label: 'Medium',   color: 'blue' },
  high:     { label: 'High',     color: 'orange' },
  critical: { label: 'Critical', color: 'red' },
} as const;

priority: [
  { context: 'read',  component: <ChoiceLabel valueMetadata={PRIORITY_METADATA} /> },
  { context: 'write', component: <ChoiceDropdown valueMetadata={PRIORITY_METADATA} placeholder="Select project priority" /> },
],
```

### Choice field without explicit UI (framework default)

```tsx
// backend: @ChoiceField({ type: () => EmployeeStatus, required: true }) status
// Omit the field from `fields` to use the framework default choice rendering.
```

> Do not hand-write `<Tag color={…}>` maps in views or table columns. Configure `valueMetadata` once here and the framework renders colored labels everywhere. See pitfall #8 in [SKILL.md](./SKILL.md).

### Navigation paths to associated skills

| Associated Skill | When to navigate | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | Enum/choice field definition and persisted value contract. | This file focuses on choice rendering, not backend field contracts. |
| [frontend-form-views](../frontend-form-views/SKILL.md) | Choice options dynamic across form lifecycle. | This file does not cover form hook timing. |
| [frontend-api](../frontend-api/SKILL.md) | Choice options sourced from runtime queries/actions. | This file does not define API data-fetch wiring. |

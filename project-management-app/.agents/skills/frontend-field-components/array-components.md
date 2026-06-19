# Generic array components

> Part of the [frontend-field-components](./SKILL.md) skill. Pairs with any array field (`string[]`, reference arrays, composition arrays) declared in [backend-datamodels](../backend-datamodels/SKILL.md).

Array fields use `<List>` to wrap a per-item component. The framework resolves `<List>` to the array display (read) or array editor (write) based on context.

## `<List>` props

- `component: ReactElement` — the inner component rendered per item
- `sorting?: boolean` — enable drag-and-drop reordering (default `true`)

## Examples

> Field entries inside `app.registerDataModel<Model>('Model', { fields: { … } })`.

### String array with text input/label

```tsx
// backend: @TextField() tags!: string[]
tags: [
  { context: 'read',  component: <List component={<TextLabel />} /> },
  { context: 'write', component: <List sorting={false} component={<TextInput placeholder="Enter tag" />} /> },
],
```

### Composition array with `<List>` + `<CompositionPanel>`

```tsx
// backend: @CompositionField({ type: () => TaskMetadata }) metadata!: TaskMetadata[]
metadata: {
  context: 'all',
  component: <List component={<CompositionPanel<TaskMetadata> label={(m) => m.key || 'New Metadata'} />} />,
},
```

> A composition array with no explicit entry uses the framework default. Add an entry only to customize the per-item panel label/layout.

### Reference array with dropdown

```tsx
// backend: @ReferenceField({ type: () => User, load: true }) teamMembers!: User[]
teamMembers: [
  { context: 'read',  labelField: 'fullName', component: <List component={<ReferenceLabel />} /> },
  { context: 'write', labelField: 'fullName', component: <List component={<ReferenceDropdown placeholder="Select team members" sorting={{ firstName: 'asc' }} />} /> },
],
```

### Navigation paths to associated skills

| Associated Skill | When to navigate | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | Array field shape, validation, persistence. | This file focuses on array UI, not data constraints. |
| [frontend-form-views](../frontend-form-views/SKILL.md) | Array fields with custom form rendering/save lifecycle. | This file shows component options only. |
| [frontend-table-views](../frontend-table-views/SKILL.md) | Array data in table columns/row actions. | This file does not define table rendering. |

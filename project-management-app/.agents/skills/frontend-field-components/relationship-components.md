# Relationship components

> Part of the [frontend-field-components](./SKILL.md) skill. Pairs with backend field types `@ReferenceField`, `@CompositionField` (schema/ownership lives in [backend-datamodels](../backend-datamodels/SKILL.md)).

## Available components

| Component | Mode | Description |
| --- | --- | --- |
| `<ReferenceLabel>` | Read | Displays the referenced record's label |
| `<ReferenceDropdown>` | Write | Searchable dropdown selector |
| `<CompositionPanel>` | Read/Write | Inline panel/list layout for a nested (composition) model; wrap in `<List>` for arrays |
| `<CompositionCard>` | Read/Write | Card layout for a nested (composition) model; wrap in `<List>` for arrays |
| `<CompositionAccordion>` | Read/Write | Collapsible accordion layout for a nested (composition) model; wrap in `<List>` for arrays |

## Reference props

**`<ReferenceLabel>`**:

- `label?: string | ((obj) => string)` — field name or function for display

**`<ReferenceDropdown>`**:

- `label?: string | ((obj) => string)` — field shown per option
- `placeholder?: string`
- `sorting?: Record<string, 'asc' | 'desc'>`

> `labelField` is normally set at the **entry** level (which model field renders the reference), not as a component prop. The selectable-options **`filter`** is a backend concern declared on the `@ReferenceField` and validated on save — see [backend-datamodels](../backend-datamodels/SKILL.md).

Entry-level shorthand:

```tsx
manager: [
  { context: 'read',  labelField: 'fullName', component: <ReferenceLabel /> },
  { context: 'write', labelField: 'fullName', component: <ReferenceDropdown label="fullName" placeholder="Select manager" sorting={{ firstName: 'asc' }} /> },
],
```

## Composition props

**`<CompositionPanel<T>>`**:

- `label?: string | ((value: T, index: number) => string)` — item label

**`<CompositionCard<T>>`**:

- `label?: string | ((value: T, index: number) => string)`
- `size?: 'small' | 'large'`

**`<CompositionAccordion<T>>`**:

- `label?: string | ((value: T, index: number) => string)`
- `defaultExpanded?: boolean`
- `collapsible?: boolean`

Use the generic to type the label callback: `<CompositionPanel<TaskMetadata> label={(m) => m.key} />`. The three are interchangeable layouts — pick `Panel` (inline), `Card`, or `Accordion` (collapsible).

## Examples

> Field entries inside `app.registerDataModel<Model>('Model', { fields: { … } })`.

### Reference field with label and sorting

```tsx
// backend: @ReferenceField<Project>({ required: true, type: () => Project, load: true,
//          onDelete: 'delete', filter: () => ({ isArchived: false }) }) project
project: [
  { context: 'read',  labelField: 'name', component: <ReferenceLabel label="name" /> },
  { context: 'write', labelField: 'name', component: <ReferenceDropdown label="name" placeholder="Select project" sorting={{ name: 'asc' }} /> },
],
```

### Reference with `labelField` shorthand

```tsx
// backend: @ReferenceField<User>({ type: () => User, load: true, filter: () => ({ ... }) }) assignee
assignee: [
  { context: 'read',  labelField: 'fullName', component: <ReferenceLabel /> },
  { context: 'write', labelField: 'fullName', component: <ReferenceDropdown placeholder="Select assignee" sorting={{ firstName: 'asc' }} /> },
],
```

### Reference with a context-scoped override

```tsx
// backend: @ReferenceField({ required: true, type: () => User, load: true }) manager
manager: [
  { context: 'read',  labelField: 'fullName', component: <ReferenceLabel /> },
  { context: 'write', labelField: 'fullName', component: <ReferenceDropdown placeholder="Select project manager" sorting={{ firstName: 'asc' }} /> },
  { context: { mode: 'read', view: { name: 'TaskDetails' } }, component: <ReferenceLabel label="fullName" /> },
],
```

### Single composition with a card and a visibility rule

```tsx
// backend: @CompositionField({ type: () => Support }) support!: Support | null
support: {
  context: 'all',
  dependsOn: ['status'],
  visible: (project) => project.status === 'active',
  component: <CompositionCard<Support> size="large" label={(s) => `Support: ${s.email}`} />,
},
```

### Array composition with `<List>` and `<CompositionPanel>`

```tsx
// backend: @CompositionField({ type: () => TaskMetadata }) metadata!: TaskMetadata[]
metadata: [
  { context: 'read',  component: <List component={<CompositionPanel<TaskMetadata> label={(m) => m.key || 'New Metadata'} />} /> },
  { context: 'write', component: <List component={<CompositionPanel<TaskMetadata> label={(m) => m.key || 'New Metadata'} />} /> },
],
```

### Array composition with a collapsible accordion

```tsx
// backend: @CompositionField({ type: () => Address }) addresses!: Address[]
addresses: [
  { context: 'read',  component: <List component={<CompositionAccordion<Address> label={(a) => `${a.street}, ${a.city}`} defaultExpanded={false} collapsible />} /> },
  { context: 'write', component: <List component={<CompositionAccordion<Address> label={(a) => a.street || 'New Address'} defaultExpanded collapsible />} /> },
],
```

### Reference field without explicit UI (framework default)

```tsx
// backend: @ReferenceField({ type: () => Location, required: true }) location
// Omit from `fields` to use the framework default; set the parent model's labelField
// (frontend-datamodels) so the default dropdown/label renders readable values.
```

### Navigation paths to associated skills

| Associated Skill | When to navigate | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | Relation field definitions, ownership, reference `filter` validation. | This file demonstrates relation UI, not relation field contracts. |
| [backend-datasources](../backend-datasources/SKILL.md) | Datasource mapping/loading behind relations. | This file does not cover joins, loading strategies, transactions. |
| [frontend-datamodels](../frontend-datamodels/SKILL.md) | The `labelField` mechanism for references. | This file is the component catalog. |
| [frontend-table-views](../frontend-table-views/SKILL.md) | Related records in nested/linked tables. | This file does not describe table interactions. |

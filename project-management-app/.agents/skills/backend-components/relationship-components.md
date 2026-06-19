# Relationship components

**Field decorators**: `@ReferenceField`, `@CompositionField`

## Reference factories

| Factory                    | Component ID            | Mode  | Description                            |
| -------------------------- | ----------------------- | ----- | -------------------------------------- |
| `referenceLabel(opts?)`    | `relationship.label`    | Read  | Displays the referenced record's label |
| `referenceDropdown(opts?)` | `relationship.dropdown` | Write | Searchable dropdown selector           |

## Reference options

**`ReferenceLabelComponentOptions`** — extends `ReferenceTypeUiOptions`:

- `label?: string | ((obj) => string)` — field name or function for display
- `representation?: 'label' | 'plain'`

**`ReferenceDropdownComponentOptions`** — extends `ReferenceTypeUiOptions`:

- `label?: string | ((obj) => string)`
- `placeholder?: string`
- `filter?: object | ((parent) => object | null)` — restrict available options
- `sorting?: Record<string, 'asc' | 'desc'>`
- `searchScope?: 'labelField' | 'allTextFields'`
- `caseSensitive?: boolean`
- `pageSize?: number`

## Reference entry-level properties

The `labelField` property can be set at the `ui` entry level instead of inside the component. It's shorthand for declaring which field of the referenced model to display:


## Composition factories

| Factory                          | Component ID            | Description              |
| -------------------------------- | ----------------------- | ------------------------ |
| `compositionPanel<T>(opts?)`     | `nestedModel.list`      | Inline panel/list layout |
| `compositionCard<T>(opts?)`      | `nestedModel.card`      | Card layout              |
| `compositionAccordion<T>(opts?)` | `nestedModel.accordion` | Collapsible accordion    |

## Composition options

**`NestedListComponentOptions<T>`** (for `compositionPanel`):

- `label?: string | ((value: T, index: number) => string)` — item label

**`NestedCardComponentOptions<T>`** (for `compositionCard`):

- `label?: string | ((value: T, index: number) => string)`
- `size?: 'small' | 'large'`

**`AccordionComponentOptions<T>`** (for `compositionAccordion`):

- `label?: string | ((value: T, index: number) => string)`
- `defaultExpanded?: boolean`
- `collapsible?: boolean`

## Copilot-optimized examples

### Reference field with label, filter, and sorting

```typescript
@ReferenceField<Project>({
  required: true,
  type: () => Project,
  load: true,
  onDelete: 'delete',
  filter: () => ({ isArchived: false }),
})
project!: Project;
```

### Reference with `labelField` shorthand and filter by roles

```typescript
@ReferenceField<User>({
  type: () => User,
  load: true,
  filter: () => ({
    roles: { elemMatch: { in: [Role.Developer, Role.Manager, Role.Admin] } },
  }),
})
assignee!: User | null;
```

### Reference with context-scoped representation

```typescript
@ReferenceField({
  required: true,
  type: () => User,
  load: true,
})
manager!: User;
```

### Single composition with card and visibility function

```typescript
@CompositionField({
  type: () => Support,
  docs: 'Support details associated with the project',
})
support!: Support | null;
```

### Array composition with `list()` and `compositionPanel()`

```typescript
@CompositionField({
  type: () => TaskMetadata,
  docs: 'Key/value metadata entries',
})
metadata!: TaskMetadata[];
```

### Reference field without explicit UI (framework defaults)

```typescript
@ReferenceField({
  type: () => Location,
  required: true,
})
location!: Location;
```

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| backend-datamodels | If you need to define relation fields, references, and model ownership semantics. | This file demonstrates relation UI helpers, not full relation field modeling contracts. |
| backend-datasources | If relationship behavior depends on datasource mapping and query patterns. | This file does not cover datasource-level joins, loading strategies, or transactions. |
| frontend-form-views | If relation selectors must be orchestrated with form lifecycle events and custom layouts. | This file is component-focused and does not define form hook strategy. |
| frontend-table-views | If related records must be presented in nested or linked table interactions. | This file does not describe table rendering, actions, or row-level navigation behavior. |

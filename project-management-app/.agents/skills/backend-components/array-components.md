# Generic array components

Generic arrays use the `list()` factory to wrap any scalar or composition component for array rendering. The framework resolves `list()` to `array.list` (read) or `array.editor` (write) based on context.

## The `list()` factory

| Signature             | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `list()`              | Default array display                                |
| `list(componentSpec)` | Wrap a component factory call for per-item rendering |
| `list(options)`       | Pass options like `sorting`, `component`             |

**`ListFactoryOptions`** — extends `ArrayListComponentOptions` + `ArrayEditorComponentOptions`:

- `sorting?: boolean` — enable drag-and-drop reordering
- `component?: ComponentSpecification` — the inner component for each item

## Copilot-optimized examples

### String array with text input/label

```typescript
@TextField({
  docs: 'Tags for categorizing the task',
})
tags!: string[];
```

### Composition array with `list()` + `compositionPanel()`

```typescript
@CompositionField({
  type: () => Note,
  docs: 'Notes associated with the task',
})
notes!: Note[];

// With explicit UI:
@CompositionField({
  type: () => TaskMetadata,
})
metadata!: TaskMetadata[];
```

### Reference array with dropdowns

```typescript
@ReferenceField({
  type: () => User,
  load: true,
})
teamMembers!: User[];
```

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| backend-datamodels | If you need to change array field shape, validation, or persistence metadata. | This file focuses on array UI component factories, not full data model constraints. |
| frontend-form-views | If array fields require custom form rendering or save lifecycle behavior. | This file shows component options only and does not cover form lifecycle hooks. |
| frontend-table-views | If array data must be displayed or transformed in table columns and row actions. | This file does not define table-specific rendering and interaction patterns. |

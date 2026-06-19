# Boolean components

> Part of the [frontend-field-components](./SKILL.md) skill. Pairs with backend field type `@BooleanField` (schema lives in [backend-datamodels](../backend-datamodels/SKILL.md)).

## Available components

| Component | Mode | Description |
| --- | --- | --- |
| `<BooleanLabel>` | Read | Displays Yes/No or custom text |
| `<BooleanToggle>` | Read/Write | Toggle switch; non-interactive in read context |

## Props reference

Both accept:

- `trueLabel?: string` — custom label when `true` (default: `'Yes'`)
- `falseLabel?: string` — custom label when `false` (default: `'No'`)

When `<BooleanToggle>` is resolved in read context, the framework keeps it visible but non-interactive.

## Examples

> Field entries inside `app.registerDataModel<Model>('Model', { fields: { … } })`.

### Toggle with custom labels

```tsx
// backend: @BooleanField({ required: true }) isBillable
isBillable: { context: 'all', component: <BooleanToggle trueLabel="Billable" falseLabel="Non-Billable" /> },
```

### Label for read, toggle for write

```tsx
// backend: @BooleanField({ required: true }) isArchived
isArchived: [
  { context: 'read',  component: <BooleanLabel trueLabel="Archived" falseLabel="Not Archived" /> },
  { context: 'write', component: <BooleanToggle trueLabel="Archived" falseLabel="Not Archived" /> },
],
```

### Navigation paths to associated skills

| Associated Skill | When to navigate | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | Boolean field defaults, required flags, validation. | This file explains boolean UI, not backend field semantics. |
| [frontend-form-views](../frontend-form-views/SKILL.md) | Boolean controls reacting to form events/conditional sections. | This file does not describe form orchestration. |
| [frontend-table-views](../frontend-table-views/SKILL.md) | Boolean column rendering in tables. | This file is component-scoped, not table pipelines. |

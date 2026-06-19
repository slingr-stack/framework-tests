# Boolean components

**Field decorator**: `@BooleanField`

## Available factories

| Factory                  | Component ID       | Mode       | Description                    |
| ------------------------ | ------------------ | ---------- | ------------------------------ |
| `booleanLabel(opts?)`    | `boolean.label`    | Read       | Displays Yes/No or custom text |
| `booleanCheckbox(opts?)` | `boolean.checkbox` | Read/Write | Checkbox control; disabled in read mode |
| `booleanToggle(opts?)`   | `boolean.toggle`   | Read/Write | Toggle switch; disabled in read mode |

## Options reference

**`BooleanTypeUiOptions`** (shared):

- `trueLabel?: string` — custom label when `true` (default: `'Yes'`)
- `falseLabel?: string` — custom label when `false` (default: `'No'`)

All three components (`booleanLabel`, `booleanCheckbox`, `booleanToggle`) extend `BooleanTypeUiOptions`.

When `booleanCheckbox()` or `booleanToggle()` are resolved in read context, the framework keeps them visible but non-interactive.

## Copilot-optimized examples

### Toggle with custom labels

```typescript
@BooleanField({
  docs: 'Whether the task is billable to the client',
  required: true,
})
isBillable: boolean = true;
```

### Checkbox for read, toggle for write

```typescript
@BooleanField({
  docs: 'Whether the project is archived',
  required: true,
})
isArchived: boolean = false;
```

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| backend-datamodels | If you need to define boolean field defaults, required flags, or validation behavior. | This file explains boolean UI helpers but not complete backend field semantics. |
| frontend-form-views | If boolean controls must react to form events, conditional sections, or save hooks. | This file does not describe form orchestration or hook-driven UI logic. |
| frontend-table-views | If boolean values require custom badges, toggles, or column-level behaviors in tables. | This file is component-factory scoped and does not define table rendering pipelines. |

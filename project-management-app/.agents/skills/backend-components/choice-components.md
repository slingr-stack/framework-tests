# Choice components

**Field decorator**: `@ChoiceField`

## Available factories

| Factory                 | Component ID      | Mode  | Use with                |
| ----------------------- | ----------------- | ----- | ----------------------- |
| `choiceLabel(opts?)`    | `choice.label`    | Read  | `@ChoiceField` (single) |
| `choiceTags(opts?)`     | `choice.tags`     | Read  | `@ChoiceField` (single) |
| `choiceDropdown(opts?)` | `choice.dropdown` | Write | `@ChoiceField` (single) |
| `choiceBox(opts?)`      | `choice.box`      | Write | `@ChoiceField` (single) |

For multiple-value choice fields (arrays), use the `.multiple` variants:

- `choiceMultipleLabel(opts?)` → `choice.multiple.label`
- `choiceMultipleDropdown(opts?)` → `choice.multiple.dropdown`
- `choiceMultipleBox(opts?)` → `choice.multiple.box`

## Options reference

**`ChoiceTypeUiOptions`** (shared by all choice components):

- `valueNames?: Record<string, string>` — override display labels
- `valueColors?: Record<string, string>` — map values to colors
- `valueMetadata?: Record<string, { label?: string; color?: string; description?: string }>` — full metadata per value

**`ChoiceLabelComponentOptions`** — extends `ChoiceTypeUiOptions`:

- `representation?: 'label' | 'plain'`

**`ChoiceDropdownComponentOptions`** — extends `ChoiceTypeUiOptions` + `BaseInputOptions`:

- `placeholder?: string`

**`ChoiceBoxSelectorComponentOptions`** — extends `ChoiceTypeUiOptions`:

- Card-style selector for small option sets

### Colors in `valueMetadata`

The `color` property in `valueMetadata` accepts:

- **Ant Design status presets**: `'default'`, `'processing'`, `'success'`, `'warning'`, `'error'`
- **Named colors**: `'green'`, `'blue'`, `'orange'`, `'red'`, `'purple'`, etc.
- **Hex values**: `'#FF5733'`

## Copilot-optimized examples

### Status field with colored labels and dropdown

```typescript
export enum ProjectStatus {
  Planning = 'planning',
  Active = 'active',
  OnHold = 'on_hold',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

@ChoiceField({
  required: true,
  type: () => ProjectStatus,
  docs: 'Current status of the project',
})
status: ProjectStatus = ProjectStatus.Planning;
```

### Choice field with shared `valueMetadata` at context level

When `valueMetadata` is placed at the `ui` entry level (not inside the component), it applies to whatever component is assigned to that entry. This avoids duplicating metadata across components:

```typescript
@ChoiceField({
  required: true,
  type: () => TaskStatus,
})
status: TaskStatus = TaskStatus.ToDo;
```

### Priority field with named colors

```typescript
export enum ProjectPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

@ChoiceField({
  required: true,
  type: () => ProjectPriority,
})
priority: ProjectPriority = ProjectPriority.Medium;
```

### Choice field without explicit UI (framework defaults)

```typescript
@ChoiceField({
  type: () => EmployeeStatus,
  required: true,
})
status: EmployeeStatus = EmployeeStatus.Active;
```

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| backend-datamodels | If you need to define enum/choice field metadata and persisted value contracts. | This file focuses on choice component rendering, not full backend field contracts. |
| frontend-form-views | If choice options must be dynamic across create/edit/read form lifecycle hooks. | This file does not cover form hook timing or model-bound form customization strategy. |
| frontend-api | If choice options come from runtime data queries or action responses. | This file does not define frontend operation builders or API data-fetch wiring. |

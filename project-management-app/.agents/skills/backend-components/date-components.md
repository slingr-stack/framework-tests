# `Date` and `DateTime` components

**Field decorators**: `@DateField`, `@DateTimeField`, `@TimeField`

## Available factories

| Factory                 | Component ID      | Mode  | Use with         |
| ----------------------- | ----------------- | ----- | ---------------- |
| `dateLabel(opts?)`      | `date.label`      | Read  | `@DateField`     |
| `dateInput(opts?)`      | `date.input`      | Write | `@DateField`     |
| `datePicker(opts?)`     | `date.picker`     | Write | `@DateField`     |
| `dateTimeLabel(opts?)`  | `datetime.label`  | Read  | `@DateTimeField` |
| `dateTimeInput(opts?)`  | `datetime.input`  | Write | `@DateTimeField` |
| `dateTimePicker(opts?)` | `datetime.picker` | Write | `@DateTimeField` |
| `timeLabel(opts?)`      | `time.label`      | Read  | `@TimeField`     |
| `timePicker(opts?)`     | `time.picker`     | Write | `@TimeField`     |

## Options reference

**`DateTypeUiOptions`** (for `@DateField`):

- `format?: 'yyyy-MM-dd' | 'MM-dd-yyyy' | 'dd-MM-yyyy'` — restricted date formats
- `locale?: string` — e.g. `'en'`, `'es'`

**`DateTimeTypeUiOptions`** (for `@DateTimeField`):

- `format?: string` — e.g. `'DD/MM/YYYY HH:mm'`
- `locale?: string`

**`DateTimePickerComponentOptions`** — extends `DateTimeTypeUiOptions`:

- `showTime?: boolean` — whether to include the time picker (default `true`)

**`TimePickerComponentOptions`**:

- `format?: 'HH:mm' | 'HH:mm:ss' | 'hh:mm A' | 'hh:mm:ss A'` — supported time formats
- `hourStep?: number`
- `minuteStep?: number`

## Copilot-optimized examples

### Date field with formatted display and picker

```typescript
@DateField({
  docs: 'Project start date',
})
startDate!: Date | null;
```

### DateTime field with format

```typescript
@DateTimeField({
  docs: 'When the project was created',
})
createdAt!: Date | null;
```

### Time field with step controls

```typescript
@TimeField({
  min: '08:00',
  max: '17:00',
  precision: 'HH:mm',
  docs: 'Daily meeting time',
})
meetingTime!: string | null;
```

### Conditionally available date field

```typescript
@DateField({
  docs: 'When the task was completed',
  available: (task: Task) => task.status === TaskStatus.Done,
})
completedAt!: string | null;
```

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| backend-datamodels | If you need date/datetime field-level validation and persistence definitions. | This file addresses date component usage, not full date field modeling rules. |
| frontend-form-views | If date fields require custom form-level defaults, transformations, or hook processing. | This file does not document create/edit/read hook behavior for date workflows. |
| frontend-api | If date filters or date payloads are constructed in frontend operation builders. | This file is UI-component focused and does not define API query/mutation construction. |

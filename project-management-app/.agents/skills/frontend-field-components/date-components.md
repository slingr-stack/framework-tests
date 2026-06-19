# Date, DateTime, and Time components

> Part of the [frontend-field-components](./SKILL.md) skill. Pairs with backend field types `@DateField`, `@DateTimeField`, `@TimeField` (schema lives in [backend-datamodels](../backend-datamodels/SKILL.md)).

## Available components

| Component | Mode | Pairs with |
| --- | --- | --- |
| `<DateLabel>` | Read | `@DateField` |
| `<DatePickerField>` | Write | `@DateField` |
| `<DateTimeLabel>` | Read | `@DateTimeField` |
| `<DateTimePickerField>` | Write | `@DateTimeField` |
| `<TimeLabel>` | Read | `@TimeField` |
| `<TimePickerField>` | Write | `@TimeField` |

> `<DateInput>` / `<DateTimeInput>` exist as plain inputs, but the `*PickerField` variants are the standard write components.

## Props reference

**`<DateLabel>` / `<DatePickerField>`** (date):

- `format?: 'yyyy-MM-dd' | 'MM-dd-yyyy' | 'dd-MM-yyyy'` — restricted date formats
- `locale?: string` — e.g. `'en'`, `'es'`

**`<DateTimeLabel>` / `<DateTimePickerField>`** (datetime):

- `format?: string` — e.g. `'DD/MM/YYYY HH:mm'`
- `locale?: string`
- `showTime?: boolean` — include the time picker (default `true`), picker only

**`<TimeLabel>` / `<TimePickerField>`** (time):

- `format?: 'HH:mm' | 'HH:mm:ss' | 'hh:mm A' | 'hh:mm:ss A'`
- `hourStep?: number`
- `minuteStep?: number`

## Examples

> Field entries inside `app.registerDataModel<Model>('Model', { fields: { … } })`.

### Date field with formatted display and picker

```tsx
// backend: @DateField() startDate
startDate: [
  { context: 'read',  component: <DateLabel format="dd-MM-yyyy" /> },
  { context: 'write', component: <DatePickerField format="dd-MM-yyyy" /> },
],
```

### DateTime field with format

```tsx
// backend: @DateTimeField() createdAt
createdAt: [
  { context: 'read',  component: <DateTimeLabel format="DD/MM/YYYY HH:mm" /> },
  { context: 'write', component: <DateTimePickerField format="DD/MM/YYYY HH:mm" /> },
],
```

### Time field with step controls

```tsx
// backend: @TimeField({ min: '08:00', max: '17:00', precision: 'HH:mm' }) meetingTime
meetingTime: [
  { context: 'write', component: <TimePickerField format="HH:mm" hourStep={1} minuteStep={15} /> },
],
```

### Conditionally available date field

Visibility driven by another field's value belongs on the entry (`visible` + `dependsOn`); the backend may also remove it entirely with `available`.

```tsx
// backend: @DateField({ available: (task) => task.status === 'done' }) completedAt
completedAt: [
  { context: 'read',  dependsOn: ['status'], visible: (t) => t.status === 'done', component: <DateLabel format="dd-MM-yyyy" /> },
  { context: 'write', dependsOn: ['status'], visible: (t) => t.status === 'done', component: <DatePickerField format="dd-MM-yyyy" /> },
],
```

### Navigation paths to associated skills

| Associated Skill | When to navigate | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | Date/datetime field validation and persistence. | This file addresses date components, not field modeling rules. |
| [frontend-form-views](../frontend-form-views/SKILL.md) | Date fields with custom form-level defaults/transformations. | This file does not document form hook behavior. |
| [frontend-api](../frontend-api/SKILL.md) | Date filters/payloads built in operation builders. | This file is UI-component focused. |

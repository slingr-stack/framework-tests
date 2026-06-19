# Numeric components

> Part of the [frontend-field-components](./SKILL.md) skill. Pairs with backend field types `@IntegerField`, `@NumberField`, `@DecimalField`, `@MoneyField` (schema lives in [backend-datamodels](../backend-datamodels/SKILL.md)).

## Available components

| Component | Mode | Pairs with |
| --- | --- | --- |
| `<IntegerLabel>` | Read | `@IntegerField` |
| `<IntegerInput>` | Write | `@IntegerField` |
| `<NumberLabel>` | Read | `@NumberField` |
| `<NumberInput>` | Write | `@NumberField` |
| `<DecimalLabel>` | Read | `@DecimalField` |
| `<DecimalInput>` | Write | `@DecimalField` |
| `<MoneyLabel>` | Read | `@MoneyField` |
| `<MoneyInput>` | Write | `@MoneyField` |

## Props reference

**Shared display props** (all numeric labels):

- `showThousandsSeparator?: boolean | ((instance) => boolean)` — format 1000 → 1,000
- `numberOfDecimals?: number | ((instance) => number)` — decimal precision for display
- `zeroPadding?: boolean | ((instance) => boolean)` — pad zeros to reach `numberOfDecimals`
- `extraDecimalsRounding?: 'truncate' | 'roundHalfToEven' | ((instance) => 'truncate' | 'roundHalfToEven')`

**Shared input props** (all numeric inputs):

- `placeholder?: string`
- `prependText?` / `prependIcon?`
- `appendText?` / `appendIcon?` (e.g. `'%'`, `'items'`)
- `showControls?: boolean` — show increment/decrement buttons

**`<MoneyLabel>` / `<MoneyInput>`** add:

- `symbol?: string | ((instance) => string)` — currency symbol

## Examples

> Field entries inside `app.registerDataModel<Model>('Model', { fields: { … } })`.

### Integer field with percentage suffix

```tsx
// backend: @IntegerField({ min: 0, max: 100 }) completionPercentage
completionPercentage: [
  { context: 'read',  component: <IntegerLabel /> },
  { context: 'write', component: <IntegerInput appendText="%" /> },
],
```

### Money field with currency symbol and thousand separators

```tsx
// backend: @MoneyField({ decimals: 2, roundingType: 'roundHalfToEven', min: '0', positive: true }) budget
budget: [
  { context: 'read',  component: <MoneyLabel symbol="$" showThousandsSeparator numberOfDecimals={2} /> },
  { context: 'write', component: <MoneyInput symbol="$" showThousandsSeparator numberOfDecimals={2} /> },
],
```

### Decimal field with unit suffix

```tsx
// backend: @DecimalField({ decimals: 4, roundingType: 'roundHalfToEven' }) volume
volume: [
  { context: 'read',  component: <DecimalLabel showThousandsSeparator={false} numberOfDecimals={4} /> },
  { context: 'write', component: <DecimalInput placeholder="Enter volume" appendText="ml" /> },
],
```

### Integer field without explicit UI (framework default)

```tsx
// backend: @IntegerField({ min: 0, max: 999 }) estimatedHours
// Omit the field from `fields` entirely to use the framework default component.
```

### Money field with dynamic symbol and decimals per instance

```tsx
// backend: @MoneyField({ decimals: 2, roundingType: 'roundHalfToEven' }) amount
amount: [
  {
    context: 'read',
    component: (
      <MoneyLabel
        symbol={(instance) => instance.currencySymbol ?? '$'}
        showThousandsSeparator
        numberOfDecimals={(instance) => instance.currencyDecimals ?? 2}
      />
    ),
  },
  {
    context: 'write',
    component: (
      <MoneyInput
        symbol={(instance) => instance.currencySymbol ?? '$'}
        showThousandsSeparator
        numberOfDecimals={(instance) => instance.currencyDecimals ?? 2}
      />
    ),
  },
],
```

### Navigation paths to associated skills

| Associated Skill | When to navigate | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | Numeric field precision, validation limits, persisted types. | This file focuses on numeric components, not field model definitions. |
| [backend-tech-stack](../backend-tech-stack/SKILL.md) | Stack-level numeric semantics (`financial-number`). | This file does not explain backend numeric library behavior. |
| [frontend-form-views](../frontend-form-views/SKILL.md) | Numeric input behavior tied to form lifecycle. | This file does not provide form lifecycle orchestration. |

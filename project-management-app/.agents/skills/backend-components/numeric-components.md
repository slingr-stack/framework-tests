# Numeric components

**Field decorators**: `@IntegerField`, `@NumberField`, `@DecimalField`, `@MoneyField`

## Available factories

| Factory               | Component ID    | Mode  | Use with        |
| --------------------- | --------------- | ----- | --------------- |
| `integerLabel(opts?)` | `integer.label` | Read  | `@IntegerField` |
| `integerInput(opts?)` | `integer.input` | Write | `@IntegerField` |
| `numberLabel(opts?)`  | `number.label`  | Read  | `@NumberField`  |
| `numberInput(opts?)`  | `number.input`  | Write | `@NumberField`  |
| `decimalLabel(opts?)` | `decimal.label` | Read  | `@DecimalField` |
| `decimalInput(opts?)` | `decimal.input` | Write | `@DecimalField` |
| `moneyLabel(opts?)`   | `money.label`   | Read  | `@MoneyField`   |
| `moneyInput(opts?)`   | `money.input`   | Write | `@MoneyField`   |

## Options reference

**Shared numeric display options** (`NumberTypeUiOptions`):

- `showThousandsSeparator?: boolean | ((instance) => boolean)` — format 1000 → 1,000; dynamic per-instance
- `numberOfDecimals?: number | ((instance) => number)` — decimal precision for display; dynamic per-instance
- `zeroPadding?: boolean | ((instance) => boolean)` — pad zeros to reach `numberOfDecimals`; dynamic per-instance
- `extraDecimalsRounding?: 'truncate' | 'roundHalfToEven' | ((instance) => 'truncate' | 'roundHalfToEven')`

**Shared numeric input options** — extends `BaseInputOptions`:

- `placeholder?: string`
- `prependText? / prependIcon?`
- `appendText? / appendIcon?`
- `showControls?: boolean` — show increment/decrement buttons

**`IntegerLabelComponentOptions`** — extends `IntegerTypeUiOptions`:

- `showThousandsSeparator?: boolean | ((instance) => boolean)`

**`IntegerInputComponentOptions`** — extends `BaseInputOptions` + `IntegerTypeUiOptions`:

- `showControls?: boolean`
- `appendText?: string` (e.g. `'%'`, `'items'`)
- `showThousandsSeparator?: boolean | ((instance) => boolean)`

**`MoneyLabelComponentOptions`** — extends `NumberTypeUiOptions`:

- `symbol?: string | ((instance) => string)` — currency symbol

**`MoneyInputComponentOptions`** — extends `NumberTypeUiOptions` + `BaseInputOptions`:

- `symbol?: string | ((instance) => string)`

## Copilot-optimized examples

### Integer field with percentage suffix

```typescript
@IntegerField({
  min: 0,
  max: 100,
  docs: 'Project completion percentage (0-100)',
})
completionPercentage!: number | null;
```

### Money field with currency symbol and thousand separators

```typescript
@MoneyField({
  decimals: 2,
  roundingType: 'roundHalfToEven',
  min: '0',
  positive: true,
  docs: 'Total budget allocated for the project',
})
budget!: Money | null;
```

### Decimal field with unit suffix

```typescript
@DecimalField({
  decimals: 4,
  roundingType: 'roundHalfToEven',
})
volume!: string;
```

### Integer field without explicit UI (uses framework defaults)

```typescript
@IntegerField({
  min: 0,
  max: 999,
  docs: 'Estimated hours to complete the task',
})
estimatedHours!: number | null;
```

### Money field with dynamic symbol and decimals per instance

```typescript
@MoneyField({
  decimals: 2,
  roundingType: 'roundHalfToEven',
  docs: 'Transaction amount in the account currency',
})
amount!: Money | null;
```

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| backend-datamodels | If you need numeric field precision, validation limits, or persisted types. | This file focuses on numeric component factories, not full field model definitions. |
| backend-tech-stack | If numeric handling requires stack-level details such as `financial-number` semantics. | This file does not explain backend library-level numeric behavior and constraints. |
| frontend-form-views | If numeric input behavior depends on create/edit form lifecycle customization. | This file does not provide form-level lifecycle orchestration patterns. |

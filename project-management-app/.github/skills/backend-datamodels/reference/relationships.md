# Relationships and multi-valued fields

> Part of the [backend-datamodels](../SKILL.md) skill.

---

## Arrays (e.g., `string[]`)

```typescript
import { BaseDataModel, DataModel, TextField } from '@drumr/framework-backend';

@DataModel()
export class TagContainer extends BaseDataModel {
  // Prefer definite assignment for array fields; initialize only when the domain explicitly requires a default collection.
  @TextField({ minLength: 1, maxLength: 30 })
  tags!: string[];
}
```

## `@ReferenceField` vs `@CompositionField`

| Aspect | `@ReferenceField` | `@CompositionField` |
|---|---|---|
| Lifecycle | Entities exist independently | Child belongs to parent; deleted with parent |
| `onDelete` | `'removeReference'` or `'cascade'` | Cascades automatically |
| Persistence | Linked by foreign key | Nested / owned |
| UI | `referenceLabel` / `referenceDropdown` | `compositionCard` / `compositionTable` |
| JSON | Flat reference | Nested serialization |

```typescript
import {
  BaseDataModel,
  DataModel,
  TextField,
  UuidField,
  ReferenceField,
  CompositionField,
  referenceDropdown,
  referenceLabel,
  compositionCard,
} from '@drumr/framework-backend';

@DataModel()
export class Customer extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

  @TextField({ required: true, maxLength: 120 })
  name!: string;
}

@DataModel()
export class OrderLine extends BaseDataModel {
  @TextField({ required: true, maxLength: 120 })
  itemName!: string;
}

@DataModel()
export class Order extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

  // REFERENCE: Customer exists independently of Order.
  @ReferenceField({
    required: true,
    type: () => Customer,
    onDelete: 'removeReference',
    ui: [
      { context: 'read', component: referenceLabel() },
      { context: 'write', component: referenceDropdown({ placeholder: 'Select customer' }) },
    ],
  })
  customer!: Customer;

  // COMPOSITION: OrderLine lifecycle belongs to Order.
  @CompositionField({
    type: () => OrderLine,
    ui: {
      component: compositionCard<OrderLine>({
        label: (line: OrderLine) => line.itemName,
      }),
    },
  })
  lines!: OrderLine[];
}
```

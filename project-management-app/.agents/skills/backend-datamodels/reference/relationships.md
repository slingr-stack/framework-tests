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
| JSON | Flat reference | Nested serialization |

> Read/write component selection for references and compositions (`<ReferenceLabel>`/`<ReferenceDropdown>`, `<List>` + `<CompositionPanel>`) is frontend UI config — see [frontend-datamodels](../../frontend-datamodels/SKILL.md).

For persistent models, keep each `@DataModel()` in its own file. A composition example needs both sides: parent `@CompositionField(...)` and child `@OwnerReferenceField(...)`.

```text
backend/src/orders/data-models/
  customer.data-model.ts
  order.data-model.ts
  order-line.data-model.ts
```

```typescript
// customer.data-model.ts
import { BaseDataModel, DataModel, TextField, UuidField } from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';

@DataModel({ dataSource: MainDs, ui: { labelField: 'name' } })
export class Customer extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

  @TextField({ required: true, maxLength: 120 })
  name!: string;
}
```

```typescript
// order-line.data-model.ts
import {
  BaseDataModel,
  DataModel,
  TextField,
  UuidField,
  OwnerReferenceField,
} from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';
import { Order } from './order.data-model';

@DataModel({ dataSource: MainDs })
export class OrderLine extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

  @OwnerReferenceField({ type: () => Order, required: true })
  owner!: Order;

  @TextField({ required: true, maxLength: 120 })
  itemName!: string;
}
```

```typescript
// order.data-model.ts
import {
  BaseDataModel,
  CompositionField,
  DataModel,
  ReferenceField,
  UuidField,
} from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';
import { Customer } from './customer.data-model';
import { OrderLine } from './order-line.data-model';

@DataModel({ dataSource: MainDs })
export class Order extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

  // REFERENCE: Customer exists independently of Order.
  @ReferenceField({
    required: true,
    type: () => Customer,
    onDelete: 'removeReference',
  })
  customer!: Customer;

  // COMPOSITION: OrderLine lifecycle belongs to Order.
  @CompositionField({
    type: () => OrderLine,
  })
  lines!: OrderLine[];
}
```

`fromJSON()` and `fromJSONWithReferences()` populate owner references on composition children, but the child model still declares the `owner` field explicitly.

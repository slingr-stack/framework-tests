# Database indexing

> Part of the [backend-datamodels](../SKILL.md) skill.

---

## Class-level indexes with `@Indexes`

Use `@Indexes` when the model has multiple indexes or compound indexes.

```typescript
import { BaseDataModel, DataModel, Indexes, ChoiceField, TextField } from '@drumr/framework-backend';
import { MainDs } from '../dataSources/mainDs';

enum TicketStatus { Open = 'open', InProgress = 'in_progress', Done = 'done' }
enum TicketPriority { Low = 'low', Medium = 'medium', High = 'high' }

@Indexes<Ticket>([
  { fields: ['status', 'priority'], name: 'idx_status_priority' },
  { fields: ['name'], type: 'fullText', name: 'idx_name_search' },
])
@DataModel({ dataSource: MainDs })
export class Ticket extends BaseDataModel {
  @TextField({ required: true, maxLength: 100 })
  name!: string;

  @ChoiceField({ required: true, type: () => TicketStatus })
  status: TicketStatus = TicketStatus.Open;

  @ChoiceField({ required: true, type: () => TicketPriority })
  priority: TicketPriority = TicketPriority.Medium;
}
```

## Field-level index with `@Index`

Use `@Index` when only a single field needs its own index.

```typescript
import { BaseDataModel, DataModel, Index, ChoiceField } from '@drumr/framework-backend';
import { MainDs } from '../dataSources/mainDs';

enum TaskPriority { Low = 'low', Medium = 'medium', High = 'high' }

@DataModel({ dataSource: MainDs })
export class Task extends BaseDataModel {
  @ChoiceField({ required: true, type: () => TaskPriority })
  @Index({ type: 'hash', name: 'idx_task_priority' })
  priority: TaskPriority = TaskPriority.Medium;
}
```

## When to add indexes

- Add `@Indexes`/`@Index` only when the prompt or query patterns explicitly require filtering/sorting optimization.
- Compound indexes (`['status', 'priority']`) help when queries filter on both columns together.
- `type: 'fullText'` is for text search; `type: 'hash'` is for exact equality lookups.

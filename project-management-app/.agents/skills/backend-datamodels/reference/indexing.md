# Database indexing

> Part of the [backend-datamodels](../SKILL.md) skill.

---

## Class-level indexes with `@Indexes`

Use `@Indexes` when the model has multiple indexes or compound indexes.

```typescript
import { BaseDataModel, DataModel, Indexes, ChoiceField, TextField, UuidField } from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';

enum TicketStatus { Open = 'open', InProgress = 'in_progress', Done = 'done' }
enum TicketPriority { Low = 'low', Medium = 'medium', High = 'high' }

@Indexes<Ticket>([
  { fields: ['status', 'priority'], name: 'idx_status_priority' },
  { fields: ['name'], type: 'fullText', name: 'idx_name_search' },
])
@DataModel({ dataSource: MainDs })
export class Ticket extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

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
import { BaseDataModel, DataModel, Index, ChoiceField, UuidField } from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';

enum TaskPriority { Low = 'low', Medium = 'medium', High = 'high' }

@DataModel({ dataSource: MainDs })
export class Task extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

  @ChoiceField({ required: true, type: () => TaskPriority })
  @Index({ type: 'hash', name: 'idx_task_priority' })
  priority: TaskPriority = TaskPriority.Medium;
}
```

## When to add indexes

- Add `@Indexes`/`@Index` only when the prompt or query patterns explicitly require filtering/sorting optimization.
- Persistent datasource-backed models still need a primary key even when the example focuses on indexes.
- Compound indexes (`['status', 'priority']`) help when queries filter on both columns together.
- `type: 'fullText'` is for text search; `type: 'hash'` is for exact equality lookups.

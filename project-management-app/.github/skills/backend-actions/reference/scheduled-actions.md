# Scheduled background actions

> Part of the [backend-actions](../SKILL.md) skill.

---

Use `@ScheduledWorkflowAction` when a task must run on a **cron schedule** rather than on user demand.

Key differences from synchronous actions:

| Property | Scheduled action | Synchronous action |
|---|---|---|
| Decorator | `@ScheduledWorkflowAction` | `@Action` |
| Base class | `ScheduledGlobalWorkflowAction` | `GlobalAction` / `ModelAction` / `ObjectAction` |
| `api: 'gql'` | ❌ Never — not user-callable | ✅ When exposed |
| `params` / `returns` | ❌ None — trigger is the schedule | ✅ When needed |
| Execution | Async background (DBOS) | Synchronous request cycle |

## Example

```typescript
import { ScheduledWorkflowAction, ScheduledGlobalWorkflowAction, logger } from '@drumr/framework-backend';
import { MainDs } from '../../dataSources/mainDs';
import { MyEntity, MyEntityStatus } from '../../dataModels/MyEntity';

/**
 * Runs every day at 02:00 AM UTC.
 * Archives MyEntity records inactive for more than 90 days.
 */
@ScheduledWorkflowAction({
  type: 'write',
  schedule: {
    cron: '0 2 * * *', // daily at 02:00
    timezone: 'UTC',
  },
})
export class ArchiveInactiveEntities extends ScheduledGlobalWorkflowAction {
  constructor(private ds: MainDs) { super(); }

  async execute(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    await this.ds.findAndPaginate(
      MyEntity,
      { where: { lastActivityDate: { lt: cutoff }, status: MyEntityStatus.Active } },
      async entity => {
        entity.status = MyEntityStatus.Archived;
        await this.ds.save(entity);
      }
    );

    logger.info('[ArchiveInactiveEntities] Done');
  }
}
```

## File placement

```
backend/src/actions/global/scheduledAction/
  ArchiveInactiveEntities.ts   ← ScheduledGlobalWorkflowAction (cron-triggered)
```

Never place scheduled actions in `regularAction/` — they are not user-callable.

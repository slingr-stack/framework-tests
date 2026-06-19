# Backend action implementation examples

> Part of the [backend-actions](./SKILL.md) skill.

---

## 4.1 `GlobalAction` — system-wide query, no entity context

The VS Code Extension scaffolds GlobalAction with `export default class`.

```typescript
import {
  Action,
  GlobalAction,
  DataModel,
  BaseDataModel,
  TextField,
  IntegerField,
  Context,
} from '@drumr/framework-backend';
import { MyService } from '../services/MyService';

@DataModel()
export class SummaryResult extends BaseDataModel {
  @IntegerField({ required: true })
  totalCount!: number;

  @TextField({ required: true })
  summary!: string;
}

@Action({
  type: 'read',
  api: 'gql',
  returns: SummaryResult,
  ui: { label: 'Get Summary', icon: 'BarChartOutlined' },
})
export default class GetSummary extends GlobalAction<void, SummaryResult> {
  constructor(
    private myService: MyService,
    private context: Context
  ) {
    super();
  }

  override async execute(): Promise<SummaryResult> {
    const data = await this.myService.computeSummary(this.context.user?.id);

    const result = new SummaryResult();
    result.totalCount = data.total;
    result.summary = data.description;
    return result;
  }
}
```

---

## 4.2 `GlobalAction` with params and user context

```typescript
import {
  Action,
  GlobalAction,
  DataModel,
  BaseDataModel,
  TextField,
  ExpectedError,
  Context,
} from '@drumr/framework-backend';
import { MyService } from '../services/MyService';

@DataModel({ ui: { crud: { api: 'gql' } } })
class SendNotificationParams extends BaseDataModel {
  @TextField({ required: true })
  recipient!: string;

  @TextField({ required: true, minLength: 1, maxLength: 500 })
  message!: string;
}

export class RecipientBlockedError extends ExpectedError {
  constructor(message = 'Recipient is blocked') {
    super(message);
  }
}

@Action({ type: 'write', api: 'gql', params: SendNotificationParams })
export default class SendNotification extends GlobalAction<SendNotificationParams, void | RecipientBlockedError> {
  constructor(
    private myService: MyService,
    private context: Context
  ) {
    super();
  }

  override async execute(params: SendNotificationParams): Promise<void | RecipientBlockedError> {
    const blocked = await this.myService.isBlocked(params.recipient);
    if (blocked) return new RecipientBlockedError();

    await this.myService.send({
      from: this.context.user?.email ?? 'system',
      to: params.recipient,
      message: params.message,
    });
  }
}
```

---

## 4.3 `ModelAction` — collection-level operation with `transactional: true`

```typescript
import {
  Action,
  ModelAction,
  DataModel,
  BaseDataModel,
  IntegerField,
  TextField,
  Context,
} from '@drumr/framework-backend';
import { MyEntity, MyEntityStatus } from '../../dataModels/MyEntity';
import { MainDs } from '../../dataSources/mainDs';

@DataModel()
export class MyEntityStatsResult extends BaseDataModel {
  @IntegerField({ required: true }) total!: number;
  @IntegerField({ required: true }) activeCount!: number;
  @IntegerField({ required: true }) archivedCount!: number;
  @TextField({ required: true }) statusSummary!: string;
}

@Action({
  type: 'read',
  model: MyEntity,
  api: 'gql',
  returns: MyEntityStatsResult,
  ui: { label: 'Get Statistics', icon: 'BarChartOutlined' },
})
export class GetMyEntityStats extends ModelAction<MyEntity, void, MyEntityStatsResult> {
  constructor(
    private ds: MainDs,
    private context: Context
  ) {
    super();
  }

  async execute(): Promise<MyEntityStatsResult> {
    const { objects } = await this.ds.find(MyEntity, { first: 100 });

    const result = new MyEntityStatsResult();
    result.total = objects.length;
    result.activeCount = objects.filter(e => e.status === MyEntityStatus.Active).length;
    result.archivedCount = objects.filter(e => e.status === MyEntityStatus.Archived).length;
    result.statusSummary = `${result.activeCount} active, ${result.archivedCount} archived`;
    return result;
  }
}
```

---

## 4.4 `ObjectAction` — simple state transition

```typescript
import { Action, ObjectAction, Context } from '@drumr/framework-backend';
import { MyEntity, MyEntityStatus } from '../../dataModels/MyEntity';
import { MainDs } from '../../dataSources/mainDs';

@Action({
  type: 'write',
  model: MyEntity,
  api: 'gql',
  returns: MyEntity,
  transactional: true,
  ui: { label: 'Activate' },
})
export class ActivateMyEntity extends ObjectAction<MyEntity, void, MyEntity> {
  constructor(
    private ds: MainDs,
    private context: Context
  ) {
    super();
  }

  override async canExecute(entity: MyEntity): Promise<boolean | string> {
    if (entity.status === MyEntityStatus.Active) return 'Record is already active';
    if (entity.status === MyEntityStatus.Archived) return 'Cannot activate an archived record';
    return true;
  }

  async execute(entity: MyEntity): Promise<MyEntity> {
    entity.status = MyEntityStatus.Active;
    entity.activatedBy = this.context.user?.id ?? 'system';
    await this.ds.save(entity);
    return entity;
  }
}
```

---

## 4.5 `ObjectAction` — bulk-aware with transactional cascade

`bulk: true` enables multi-record selection in the UI. When running in bulk, `this.context.action?.bulkAction` is `true` — use it to skip per-record side-effects (e.g. individual emails) that would otherwise overwhelm the system.

```typescript
import {
  Action,
  ObjectAction,
  DataModel,
  BaseDataModel,
  ReferenceField,
  referenceLabel,
  referenceDropdown,
  logger,
  Context,
} from '@drumr/framework-backend';
import { MyEntity, MyEntityStatus } from '../../dataModels/MyEntity';
import { ChildRecord, ChildStatus } from '../../dataModels/ChildRecord';
import { MainDs } from '../../dataSources/mainDs';
import { NotificationService } from '../services/NotificationService';

@DataModel({ ui: { crud: { api: 'gql' } } })
class ArchiveMyEntityParams extends BaseDataModel {
  @ReferenceField({
    required: false,
    type: () => MyEntity,
    ui: [
      { context: 'read', component: referenceLabel({}), labelField: 'name' },
      {
        context: 'write',
        component: referenceDropdown({ placeholder: 'Select transfer target', sorting: { name: 'asc' } }),
        labelField: 'name',
      },
    ],
  })
  transferTo!: MyEntity | null;
}

@Action({
  type: 'write',
  model: MyEntity,
  api: 'gql',
  params: ArchiveMyEntityParams,
  returns: MyEntity,
  bulk: true,
  transactional: true,
  ui: { label: 'Archive', style: 'danger' },
})
export class ArchiveMyEntity extends ObjectAction<MyEntity, ArchiveMyEntityParams, MyEntity> {
  constructor(
    private ds: MainDs,
    private context: Context,
    private notificationService: NotificationService
  ) {
    super();
  }

  override async canExecute(entity: MyEntity): Promise<boolean | string> {
    if (entity.status === MyEntityStatus.Archived) return 'Record is already archived';
    return true;
  }

  async execute(entity: MyEntity, params: ArchiveMyEntityParams): Promise<MyEntity> {
    const isBulk = this.context.action?.bulkAction ?? false;

    await this.archiveChildRecords(entity.id);
    if (params.transferTo) {
      await this.transferOwnership(entity, params.transferTo);
    }

    entity.status = MyEntityStatus.Archived;
    entity.archivedBy = this.context.user?.id ?? 'system';
    await this.ds.save(entity);

    logger.info(`MyEntity [${entity.id}] archived by ${entity.archivedBy}`);

    // Skip email notifications in bulk runs to avoid flooding per-record
    if (!isBulk) {
      await this.notificationService.sendArchiveConfirmation(entity);
    }

    return entity;
  }

  private async archiveChildRecords(entityId: string): Promise<void> {
    await this.ds.findAndPaginate(ChildRecord, { where: { parent: { id: entityId } } }, async child => {
      if (child.status !== ChildStatus.Archived) {
        child.status = ChildStatus.Archived;
        await this.ds.save(child);
      }
    });
  }

  private async transferOwnership(entity: MyEntity, newOwner: MyEntity): Promise<void> {
    await this.ds.findAndPaginate(
      ChildRecord,
      { where: { parent: { id: entity.id }, status: { ne: ChildStatus.Archived } } },
      async child => {
        child.parent = newOwner;
        await this.ds.save(child);
      }
    );
  }
}
```

---

## 4.6 `ModelAction` — complex per-item loop with `this.ds.transaction()`

```typescript
import { Action, ModelAction, logger, Context } from '@drumr/framework-backend';
import { MyEntity, MyEntityStatus } from '../../dataModels/MyEntity';
import { MainDs } from '../../dataSources/mainDs';
import { MyEntityService } from '../services/MyEntityService';

@Action({
  type: 'write',
  model: MyEntity,
  api: 'gql',
  // No transactional: true — each record is its own atomic unit
})
export class ProcessAllPendingEntities extends ModelAction<MyEntity, void, void> {
  constructor(
    private ds: MainDs,
    private context: Context,
    private myEntityService: MyEntityService
  ) {
    super();
  }

  async execute(): Promise<void> {
    await this.ds.findAndPaginate(MyEntity, { where: { status: MyEntityStatus.Pending } }, async entity => {
      // Each iteration is its own transaction — one failure does not roll back the others
      await this.ds.transaction(async () => {
        await this.myEntityService.process(entity);
        entity.status = MyEntityStatus.Done;
        await this.ds.save(entity);
      });
    });

    logger.info('Pending entities processing completed', { initiator: this.context.user?.id });
  }
}
```

---

## 4.7 `ObjectAction` — delegating to a `@Service()`

```typescript
import { Action, ObjectAction, ExpectedError, Context } from '@drumr/framework-backend';
import { MyEntity, MyEntityStatus } from '../../dataModels/MyEntity';
import { MyEntityService } from '../services/MyEntityService';

export class InvalidStateError extends ExpectedError {
  constructor(message = 'Action cannot be performed in the current state') {
    super(message);
  }
}

@Action({ type: 'write', model: MyEntity, api: 'gql', returns: MyEntity })
export class ProcessMyEntity extends ObjectAction<MyEntity, void, MyEntity | InvalidStateError> {
  constructor(
    private myEntityService: MyEntityService,
    private context: Context
  ) {
    super();
  }

  override async canExecute(entity: MyEntity): Promise<boolean | string> {
    if (entity.status !== MyEntityStatus.Active) return 'Only active records can be processed';
    return true;
  }

  override async execute(entity: MyEntity): Promise<MyEntity | InvalidStateError> {
    // MyEntityService.process() is also called by BulkProcess and ScheduledProcess —
    // that shared responsibility is why it lives in a service, not inline here.
    return this.myEntityService.process(entity, this.context.user?.id);
  }
}
```

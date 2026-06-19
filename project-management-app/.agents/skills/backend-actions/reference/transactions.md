# Transactional integrity

> Part of the [backend-actions](../SKILL.md) skill.

---

## Declarative — `transactional: true`

Add `transactional: true` to `@Action` to wrap the entire `execute()` method in a database transaction on the action's model datasource (or the first registered datasource for GlobalActions).

```typescript
@Action({
  type: 'write',
  model: MyEntity,
  api: 'gql',
  returns: MyEntity,
  transactional: true, // entire execute() runs inside one transaction
})
export class CreateMyEntity extends ModelAction<MyEntity, CreateMyEntityParams, MyEntity> {
  constructor(private ds: MainDs, private context: Context) { super(); }

  async execute(params: CreateMyEntityParams): Promise<MyEntity> {
    const entity = new MyEntity();
    entity.name = params.name;
    entity.createdBy = this.context.user?.id ?? 'system';
    await this.ds.save(entity);

    const log = new AuditLog();
    log.entityId = entity.id;
    log.action = 'created';
    await this.ds.save(log); // both saves commit or roll back together

    return entity;
  }
}
```

Span multiple datasources (best-effort; no two-phase commit):

```typescript
@Action({ type: 'write', model: MyEntity, api: 'gql', transactional: [MainDs, AnalyticsDs] })
```

## Manual — `this.ds.transaction()`

Use when each record in a loop must be its own atomic unit, without wrapping the entire action.

```typescript
async execute(): Promise<void> {
  await this.ds.findAndPaginate(MyEntity, { where: { status: MyEntityStatus.Pending } }, async entity => {
    // Each record gets its own commit — one failure does not roll back the others
    await this.ds.transaction(async () => {
      entity.status = MyEntityStatus.Processing;
      await this.ds.save(entity);
      await this.processRecord(entity);
      entity.status = MyEntityStatus.Done;
      await this.ds.save(entity);
    });
  });
}
```

## Decision rule

| Situation | Pattern |
|---|---|
| Simple write action, all saves succeed or fail together | `transactional: true` |
| Loop where each record must be its own rollback unit | `this.ds.transaction()` per iteration |
| Both `transactional: true` AND `this.ds.transaction()` inside | ❌ Redundant — pick one |

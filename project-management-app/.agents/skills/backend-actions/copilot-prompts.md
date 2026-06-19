# Backend action — Copilot prompt patterns

> Part of the [backend-actions](./SKILL.md) skill.

---

## GlobalAction (no params)

```typescript
// Copilot: generate a GlobalAction that <describe what it does>
// returns: <describe result fields>
// inject: Context + <MainDs | MyService>
@Action({ type: 'read', api: 'gql', returns: My__Result })
export default class My__Action extends GlobalAction<void, My__Result> {
  constructor(private ds: MainDs, private context: Context) { super(); }
```

## GlobalAction (with params and user context)

```typescript
// Copilot: generate a GlobalAction with params that <describe what it does>
// params: <describe input fields>
// returns: void | <ErrorType>
// inject: Context + <MyService>
// use: this.context.user?.id to record who triggered it
@Action({ type: 'write', api: 'gql', params: My__Params })
export default class My__Action extends GlobalAction<My__Params, void | My__Error> {
  constructor(private myService: MyService, private context: Context) { super(); }
```

## ModelAction with transactional

```typescript
// Copilot: generate a ModelAction for <EntityName> that <describe what it does>
// transactional: true (all writes in one DB transaction)
// inject: MainDs + Context
@Action({ type: 'write', model: MyEntity, api: 'gql', params: My__Params, returns: MyEntity, transactional: true })
export class My__Action extends ModelAction<MyEntity, My__Params, MyEntity | My__Error> {
  constructor(private ds: MainDs, private context: Context) { super(); }
```

## ObjectAction (simple, transactional)

```typescript
// Copilot: generate an ObjectAction for <EntityName> that <describe what it does>
// canExecute guard: <describe the condition that blocks execution>
// write: this.context.user?.id to record the actor
// transactional: true
@Action({ type: 'write', model: MyEntity, api: 'gql', returns: MyEntity, transactional: true })
export class My__Action extends ObjectAction<MyEntity, void, MyEntity> {
  constructor(private ds: MainDs, private context: Context) { super(); }
```

## ObjectAction (bulk-aware, referenceDropdown param)

```typescript
// Copilot: generate an ObjectAction for <EntityName> with a ReferenceField param
// bulk: true - skip per-record notifications when this.context.action?.bulkAction is true
// param field: show as referenceDropdown in write context, referenceLabel in read context
@Action({ type: 'write', model: MyEntity, api: 'gql', params: My__Params, returns: MyEntity, bulk: true })
export class My__Action extends ObjectAction<MyEntity, My__Params, MyEntity> {
  constructor(private ds: MainDs, private context: Context) { super(); }
  async execute(entity: MyEntity, params: My__Params): Promise<MyEntity> {
    const isBulk = this.context.action?.bulkAction ?? false;
```

## ObjectAction (complex, per-item transaction loop)

```typescript
// Copilot: generate a ModelAction for <EntityName> that processes each record in its own transaction
// inject: MainDs + Context + MyService
// use: this.ds.transaction() per item, NOT transactional: true
@Action({ type: 'write', model: MyEntity, api: 'gql' })
export class My__Action extends ModelAction<MyEntity, void, void> {
  constructor(private ds: MainDs, private context: Context, private myService: MyService) { super(); }
  async execute(): Promise<void> {
    for (const item of items) {
      await this.ds.transaction(async () => { /* one record, one commit */ });
    }
  }
```

## Scheduled background action

```typescript
// Copilot: generate a ScheduledWorkflowAction that <describe what it does>
// cron: <cron expression>   timezone: <IANA timezone>
// inject: MainDs
@ScheduledWorkflowAction({ type: 'write', schedule: { cron: '0 2 * * *', timezone: 'UTC' } })
export class My__ScheduledAction extends ScheduledGlobalWorkflowAction {
  constructor(private ds: MainDs) { super(); }
  async execute(): Promise<void> {
```

## Companion `@Service()`

```typescript
// Copilot: generate a @Service() class <ServiceName> that <describe what it does>
// constructor-inject: <MainDs | other services>
import { Service } from '@drumr/framework-backend';
@Service()
export class MyEntityService {
  constructor(private ds: MainDs) {}
```

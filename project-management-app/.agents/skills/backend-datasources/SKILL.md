---
name: backend-datasources
description: Current Drumr datasource contract: `@DataSource()`, `TypeOrmSqlDataSource`, model linkage, direct queries, transactions, and datasource injection into backend code.
user-invocable: true
metadata:
  applies-to:
    - core/backend/src/datasources/
---

# Backend skill: data sources

## When to use

Use this skill when the user asks about:

- Database connection setup or startup failures
- Creating or configuring a datasource
- Linking models to a datasource
- Injecting a datasource into actions, services, or workflows
- Direct/native queries or transactional operations

Use this skill for backend persistence wiring and direct datasource execution.

## Multi-skill routing

- If request changes model fields, relationships, or `@DataModel(...)` metadata beyond datasource linkage, also use [backend-datamodels](../backend-datamodels/SKILL.md).
- If direct datasource queries must respect current user permissions, also use [backend-auth](../backend-auth/SKILL.md).
- If request changes CRUD exposure or custom action API contracts, also use [backend-api](../backend-api/SKILL.md).
- If request uses dataset folders, datasource fixtures, or `drumr ds` flows, also use [backend-datasets](../backend-datasets/SKILL.md) and [cli-commands](../cli-commands/SKILL.md).
- If request is about dataset-backed tests or `initTestContext({ dataSet })`, also use [testing-integration](../testing-integration/SKILL.md).

## Current contract

A datasource encapsulates three responsibilities:

1. Connection and runtime configuration
2. Model mapping (`@DataModel`) to persistence metadata and tables
3. Database operations (CRUD/query API, `native()` access, and transactions)

`@DataSource()` registers datasource class as singleton in DI. `@DataSource({ id: '...' })` also registers string token for `@Inject('...')` and `DependencyContainer.resolveById('...')`.

## Procedure

### Define datasource class

Create one datasource class in `src/infra/data-sources/main.ds.ts` and decorate it with `@DataSource(...)`.

> **File location:** Data sources live under `src/infra/data-sources/`. Use kebab-case file names with a `.ds.ts` suffix (e.g., `main.ds.ts`, `analytics.ds.ts`).

Recommended defaults:

- Use `TypeOrmSqlDataSource` for SQL-backed app datasources.
- Provide an explicit datasource `id` when CLI or dataset paths need stable naming.
- Use kebab-case for the file name and a descriptive `id` (e.g., `postgres-db`, `analytics-db`).

Runtime-required properties:

- `type`
- `managed`

Common environment-driven properties:

- `host`
- `port`
- `username`
- `password`
- `database`
- `synchronize`
- `logging`

Optional properties by scenario:

- `filename`: SQLite file path or `:memory:`
- `dropSchema`: test reset on startup
- `connectTimeout`: connection timeout tuning
- `maxConnections` and `minConnections`: pool tuning
- `extra`: driver-specific options
- `ssl`: boolean or driver-specific SSL config

Add tuning properties only when environment needs them.

### Configure `TypeOrmSqlDataSource`

- `id` (optional in decorator): datasource identifier for DI token lookup and stable CLI or dataset naming
- `type` (required): SQL engine (`postgres`, `mysql`, `mariadb`, `sqlite`, `mssql`, `oracle`)
- `managed` (required): enables Drumr-managed schema behavior
- `host`: network DB host
- `port`: network DB port
- `username`: DB user
- `password`: DB password
- `database`: DB name
- `filename`: SQLite filename/path
- `logging`: SQL logging flag; defaults to `false`
- `synchronize`: schema sync flag; defaults to `true`
- `connectTimeout`: connection timeout in milliseconds
- `maxConnections`: pool max size
- `minConnections`: pool min size
- `dropSchema`: drop schema on init (usually tests only)
- `extra`: extra low-level driver options
- `ssl`: boolean or driver-specific SSL config

```typescript
import { DataSource, TypeOrmSqlDataSource } from '@drumr/framework-backend';
import type { SqlDataSourceType } from '@drumr/framework-backend';

@DataSource({ id: 'mainDs' })
export class MainDs extends TypeOrmSqlDataSource {
  override type: SqlDataSourceType = 'postgres';
  override managed = true;

  override host = process.env.DB_HOST ?? 'localhost';
  override port = parseInt(process.env.DB_PORT ?? '5432', 10);
  override username = process.env.DB_USER ?? 'postgres';
  override password = process.env.DB_PASSWORD ?? 'postgres';
  override database = process.env.DB_NAME ?? 'my_app';
  override synchronize = process.env.DB_SYNCHRONIZE === 'true';
  override logging = process.env.DB_LOGGING === 'true';

  // Optional tuning when environment needs it:
  // override connectTimeout = parseInt(process.env.DB_CONNECT_TIMEOUT ?? '10000', 10);
  // override maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS ?? '20', 10);
  // override minConnections = parseInt(process.env.DB_MIN_CONNECTIONS ?? '2', 10);
  // override ssl = process.env.DB_SSL === 'true';
  // override extra = {
  //   ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  // };
}
```

### SQLite and test example

```typescript
import { DataSource, TypeOrmSqlDataSource } from '@drumr/framework-backend';

@DataSource({ id: 'mainDs' })
export class MainDs extends TypeOrmSqlDataSource {
  override type = 'sqlite' as const;
  override managed = true;
  override filename = process.env.DB_FILENAME ?? 'data/dev.sqlite';
  override synchronize = true;
  override dropSchema = process.env.NODE_ENV === 'test';
}
```

Use this variant for local prototypes or tests that need SQLite-backed persistence.

For one-off or test-only datasource instances, use `TypeOrmSqlDataSource.from(...)`. Use `TypeOrmSqlDataSource.fromAndRegister(...)` when temporary datasource also needs a class token for `@DataModel({ dataSource: DsClass })`.

### Link models to datasource

`@DataModel({ dataSource: ... })` accepts either datasource class constructor or datasource string token.

Use class token by default when datasource class is available in code:

- `@DataModel({ dataSource: MainDs })`

Use string token when resolution intentionally goes through datasource id:

- `@DataModel({ dataSource: 'mainDs' })`

```typescript
import { BaseDataModel, DataModel, TextField, UuidField } from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';

@DataModel({
  dataSource: MainDs,
  docs: 'Task persisted in main datasource',
})
export class Task extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

  @TextField({ required: true })
  title!: string;
}
```

When datasets or CLI flows use this datasource, set explicit `id` and keep dataset folder naming aligned with that id. For dataset layout and fixture rules, use [backend-datasets](../backend-datasets/SKILL.md).

### Inject datasource into backend code

Use datasource injection when you need transactions or native DB access.

### Common query (non-transactional)

```typescript
import { Action, GlobalAction } from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';
import { Task } from '@/tasks/data-models/task.data-model';

@Action({
  type: 'read',
  api: 'gql',
  returns: [Task],
})
export class FindOpenTasks extends GlobalAction<void, Task[]> {
  constructor(private ds: MainDs) {
    super();
  }

  async execute(): Promise<Task[]> {
    const result = await this.ds.findBy(Task, {
      status: { $eq: 'open' },
    });

    return result;
  }
}
```

Use this style for regular reads/writes that do not require an atomic multi-step boundary.

### Choose query API

#### Choosing `find`, `findBy`, or `findAndPaginate`

> **⚠️ CRITICAL — `find()` and `findBy()` are unbounded by default.** If you do not provide pagination options (`first`/`last` or `page`/`pageSize`), the datasource returns **all matching rows**.

Use this decision rule:

- Use `find()` when you need full query options and the whole result set in memory (dashboard aggregations, dropdown options, immediate in-action business logic).
- Use `findBy()` when you need a concise where-only query and still want the full matching set in memory.
- Use `findAndPaginate()` for massive datasets, scheduled jobs, exports, migrations, and any loop that must process "all rows" safely.

Concrete use-cases:

- Dashboard metrics (in-memory summary): `find()`
- UI dropdown preload (small/medium lists): `findBy()`
- Cron job / nightly maintenance / backfill: `findAndPaginate()`

```typescript
// 1) Dashboard: load matching rows and aggregate in memory
const projects = await this.ds.find(Project, {
  where: { status: { $eq: ProjectStatus.Active } },
});
const activeCount = projects.length;

// 2) Dropdown: concise where-only read (still unbounded)
const openTasks = await this.ds.findBy(Task, {
  status: { $eq: 'open' },
});

// 3) Cron/Bulk: iterate safely in batches (default batch size: 1000)
await this.ds.findAndPaginate(
  Task,
  { where: { status: { $eq: 'open' } }, orderBy: { id: 'ASC' } },
  async (task) => {
    await this.ds.save(task);
  },
);
```

Guardrails:

- Do not use unbounded `find()`/`findBy()` in batch jobs or long-running workflows over large tables.
- Do not materialize massive result sets into arrays when callback-driven processing is enough.
- For deterministic batch traversal, always pass explicit `orderBy` to `findAndPaginate()`.

#### Choosing `findOne`, `findOneBy`, `findOneOrFail`, `findOneByOrFail`

- Use `findOne()` when you need the first match with full query options (for example `orderBy`).
- Use `findOneBy()` for simple where-only first match.
- Use `findOneOrFail()` / `findOneByOrFail()` when "not found" must be a hard error.
- Use `findOneBy(Entity, { id: { $eq: id } })` or `findOne(Entity, { where: { id: { $eq: id } } })` for primary-key lookups inside backend code.

```typescript
// 1) findOne: first match with ordering
const latestOpenTask = await this.ds.findOne(Task, {
  where: { status: { $eq: 'open' } },
  orderBy: { createdAt: 'DESC' },
});

// 2) findOneBy: concise where-only first match
const user = await this.ds.findOneBy(User, { email: { $eq: 'user@example.com' } });

// 3) OrFail variants: fail fast when missing entity is invalid business state
const requiredTask = await this.ds.findOneOrFail(Task, {
  where: { id: { $eq: taskId } },
});

const requiredUser = await this.ds.findOneByOrFail(User, {
  email: { $eq: email },
});
```

`findById` is GraphQL CRUD action name, not datasource method.

### Use transactions and native SQL

```typescript
import { GlobalAction, Action, DataModel, BaseDataModel, TextField } from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';

@DataModel()
class RepriceParams extends BaseDataModel {
  @TextField({ required: true })
  customerId!: string;
}

@Action({
  type: 'write',
  api: 'gql',
  params: RepriceParams,
  returns: String,
})
export class RepriceCustomer extends GlobalAction<RepriceParams, string> {
  constructor(private ds: MainDs) {
    super();
  }

  async execute(params: RepriceParams): Promise<string> {
    await this.ds.transaction(async () => {
      const rows = await this.ds
        .native()
        .query('UPDATE customer SET updated_at = NOW() WHERE id = $1', [params.customerId]);
      if (!rows) {
        throw new Error('Update failed');
      }
    });

    return 'ok';
  }
}
```

`transaction()` accepts optional transaction controls as a second argument.

```typescript
await this.ds.transaction(
  async () => {
    // transactional work
  },
  { new: true, timeout: 5000 }
);
```

- `new: true`: forces a new transaction even if one already exists in the current context.
- `timeout`: maximum time in milliseconds before failing the transaction callback.

Notes:

- Prefer framework query methods first (`find`, `findBy`, `count`, etc.), and use `native()` for advanced DB-specific needs.
- Treat unbounded `find()`/`findBy()` carefully in request/interactive flows with large tables.
- For full scans, scheduled jobs, or bulk/background processing, prefer `findAndPaginate()` with explicit `orderBy`.
- `find()` and `findBy()` return loaded entity arrays. Use `count()` when logic needs total row count.
- **Direct datasource queries are NOT permission-scoped.** Role/permission filtering is applied automatically only by the auto-generated CRUD / GraphQL API. A direct `find`/`findBy`/`findAndPaginate` runs exactly the `where` you pass, with no user scoping. If results must respect the current user's role permissions, derive the `where` from permission rules with `defineAbilityFor` + `translateAbilityToWhere` + `mergeWhereConditions` (all exported from `@drumr/framework-backend`) instead of hand-writing role `if`s. See [backend-auth](../backend-auth/SKILL.md) → "Scoping direct datasource queries by permission".
- Do not assume `result.length` is the total number of matches for a workflow/job scope requirement; `find()` and `findBy()` now return the direct array of loaded rows.
- For full scans or bulk processing, prefer `findAndPaginate()`.
- **Direct datasource queries are NOT permission-scoped.** Role/permission filtering is applied automatically only by the auto-generated CRUD / GraphQL API. A direct `find`/`findBy`/`findAndPaginate` runs exactly the `where` you pass, with no user scoping. If results must respect the current user's role permissions, derive the `where` from `ctx.permissions.getQueryFor(Model, 'access')` + `mergeWhereConditions` instead of hand-writing role `if`s. See [backend-auth](../backend-auth/SKILL.md) → "Scoping direct datasource queries by permission".

### Use save hooks

`save()` (called internally by `create()` and `updateInstance()`) invokes two optional hooks on every `BaseDataModel` entity:

| Hook | When in pipeline | Purpose |
|---|---|---|
| `onBeforeSave()` | After calculations, immediately before the DB write | Mutate or enrich the entity (timestamps, derived fields) |
| `onAfterSave(saved)` | After the DB write, before transaction commit | Side-effects: audit log, cache invalidation, notifications |

If either hook throws, the error propagates to the caller. If a local transaction is active (updates), it is rolled back.

**Re-entrancy guard:** a module-level `WeakSet<BaseDataModel>` prevents infinite loops. If `save()` is called on the **same entity instance** inside a hook, the nested call executes the DB write but skips hooks. Saving a *different* entity from inside a hook works normally — the guard is per-instance.

```typescript
// Safe: onAfterSave writes to a different entity — hooks on `audit` fire normally
override async onAfterSave(saved: this): Promise<void> {
  const log = DependencyContainer.resolve(ActivityLogService);
  log.addEntry(`Project "${saved.name}" saved`);
}

// Also safe: does NOT loop — guard detects same instance and skips hooks on re-entry
override async onBeforeSave(): Promise<void> {
  this.updatedAt = new Date();
  // If you accidentally call save(this) here, it runs once and stops.
}
```

### Troubleshoot startup and persistence

If database startup fails:

1. Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` values.
2. Confirm the DB process/container is running and reachable from the app.
3. Confirm driver packages are installed for your DB (for example `pg` for Postgres).

If models are not persisted:

1. Confirm model uses `@DataModel({ dataSource: MainDs })`.
2. Confirm datasource class is decorated with `@DataSource({ id: '...' })`.
3. Confirm datasource file is under `src/infra/data-sources/` so app discovery can import it.

Environment caveats:

- `managed=true` enables Drumr-managed schema behavior; use consciously per environment.
- `synchronize=true` is convenient in development but risky in production (schema drift/data loss risk).
- Production environments should use controlled schema migration strategy.

## Related skills

| Skill | Use together when | Why |
| --- | --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | Datasource change also updates model decorators, fields, or relationships. | Datasource skill covers persistence wiring, not full model schema rules. |
| [backend-auth](../backend-auth/SKILL.md) | Direct datasource query must respect current user permissions. | Auth skill covers ability-to-where translation and permission-safe query scoping. |
| [backend-api](../backend-api/SKILL.md) | Datasource-backed models or actions also change CRUD or custom API exposure. | API skill covers GraphQL contract and action exposure. |
| [backend-datasets](../backend-datasets/SKILL.md) | Datasource `id` also drives dataset folder naming or fixture layout. | Dataset skill covers JSONL structure, `datasetOptions.json`, and `AppFile` fixture rules. |
| [cli-commands](../cli-commands/SKILL.md) | Work includes `drumr ds` generation, load, or export commands. | CLI skill covers command syntax and flags. |
| [testing-integration](../testing-integration/SKILL.md) | Request uses `TestApp`, `initTestContext({ dataSet })`, or dataset-backed integration tests. | Testing skill covers test lifecycle, setup, and assertions. |

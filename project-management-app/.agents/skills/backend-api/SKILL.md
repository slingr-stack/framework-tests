---
name: backend-api
description: Practical guide for implementing Drumr backend APIs with GraphQL CRUD exposure,	typed actions, validation, and consistent expected error handling.
---

# Backend skill: API

## Purpose

Use this skill when a request involves backend API design or implementation in Drumr, especially:

- exposing `@DataModel()` entities through GraphQL;
- configuring and consuming CRUD operations;
- implementing custom endpoints/business logic with Actions;
- defining type-safe params and responses;
- handling validation and expected errors consistently.

This skill focuses on app-level usage patterns that map directly to framework behavior.

## Scope

This document covers the API-level:

- Exposing data models
- CRUD operations
- Actions (custom endpoints/business logic)
- Type-safe params and responses
- Validations and error handling

This document does not replace low-level framework internals documentation. It provides practical implementation patterns for app code.

## Rich payloads and UI metadata in API responses

- UI evaluator behavior may dynamically resolve function-valued UI options at runtime (for example, labels and nested component options). API consumers should keep UI metadata functions side-effect free and instance-driven.
- Generated CRUD GraphQL operations now accept optional `format: data | rich` on `findBy`, `findById`, `create`, and `update`. Use `rich` only for models with `ui` metadata; otherwise the operation returns `CannotExecuteErrorType`.
- UI-enabled models expose `{Model}Refresh` for form refresh/validation and it returns the same `Rich<Model>` field-wrapper payload shape used by `format: rich`.

## Core concept: exposing data models

In Drumr, data model API exposure starts from `@DataModel()` options, not from manual resolver wiring.

Key pattern:

- Configure `crud.api: 'gql'` in `@DataModel()` to expose CRUD operations via GraphQL.
- Optionally limit exposed CRUD methods with `crud.actions`.

```typescript
import {
	BaseDataModel,
	DataModel,
	UuidField,
	TextField,
	ChoiceField,
} from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';

export enum TaskStatus {
	Todo = 'todo',
	InProgress = 'inProgress',
	Done = 'done',
}

@DataModel({
	dataSource: MainDs,
	docs: 'Task entity exposed through GraphQL CRUD API',
	crud: {
		// Expose generated CRUD operations in GraphQL
		api: 'gql',
		// Optional: limit which generated actions are exposed
		actions: ['create', 'findById', 'findBy', 'update', 'deleteById'],
	},
})
export class Task extends BaseDataModel {
	@UuidField({ primaryKey: true, generated: true, required: true })
	id!: string;

	@TextField({ required: true, minLength: 3, maxLength: 200 })
	title!: string;

	@ChoiceField({ required: true, type: () => TaskStatus })
	status: TaskStatus = TaskStatus.Todo;
}
```

## Core concept: CRUD operations

When `crud.api: 'gql'` is enabled, the framework registers GraphQL operations automatically.

Naming pattern:

- Query: `{DataModel}FindBy`
- Query: `{DataModel}FindById`
- Query: `{DataModel}Refresh` for UI-enabled models
- Mutation: `{DataModel}Create`
- Mutation: `{DataModel}Update`
- Mutation: `{DataModel}DeleteById`

If `crud.actions` is omitted, the framework generates these 5 backend CRUD operations by default.

- `findBy`, `findById`, `create`, and `update` also accept optional `format`.
- `format: data` or omitted preserves raw model/query-response payloads.
- `format: rich` returns `Rich<Model>` / `Rich<Model>QueryResponse` runtime field wrappers for UI-enabled models.
- Rich field wrappers include `value`, `dataType`, `displayValue`, `required`, optional `errors`, and optional `constraints`.
- Rich payloads keep `_actions` populated, including generated CRUD actions.
- `deleteById` remains data-only.
- `Refresh` is the rich-only validation/re-evaluation query for UI-enabled models.

Example operations for `Task`:

- `TaskFindBy`
- `TaskFindById`
- `TaskCreate`
- `TaskUpdate`
- `TaskDeleteById`

Example GraphQL usage:

```graphql
query {
  TaskFindBy(first: 10, orderBy: { title: asc }, format: rich) {
    ... on RichTaskQueryResponse {
      objects {
        title {
          value
          dataType
          required
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    ... on TaskQueryResponse {
      objects {
        id
        title
        status
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

### API pagination vs datasource defaults (critical)

- GraphQL CRUD list operations (`ModelFindBy`) are paginated API contracts and should pass explicit pagination arguments (`first`/`after` or `page`/`pageSize`).
- Backend datasource methods (`ds.find` / `ds.findBy`) are unbounded by default when pagination is omitted and return full arrays.
- Use unbounded `find`/`findBy` for in-memory API/business use-cases (dashboard summaries, dropdown sources, quick calculations in one action execution).
- Keep this separation explicit: API resolvers should send pagination options intentionally; backend jobs/services should choose between unbounded reads and `findAndPaginate()` based on workload size.
- For large-volume backend processing (cron jobs, backfills, exports), prefer `findAndPaginate()` (default batch size: `1000`) instead of loading all records into memory.

```graphql
mutation {
  TaskCreate(input: { title: "Write API skill documentation", status: todo }) {
    ... on Task {
      id
      title
      status
    }
    ... on ValidationErrorType {
      message
      errors {
        field
        constraint
        message
      }
    }
  }
}
```

### Versioned (optimistic-locking) models

Models with `@VersionField` extend the `<Model>Update` mutation contract:

- **Create input** never accepts `version` (the framework strips any client-sent value; TypeORM seeds `1` on INSERT).
- **Update input** must round-trip the current `version` value the caller loaded with the row.
- Missing `version` returns `ValidationErrorType` (constraint `isVersionRequired`).
- Stale `version` returns `OptimisticLockingErrorType` carrying `{ model, primaryKey, expectedVersion, currentVersion, code: "OPTIMISTIC_LOCK_CONFLICT" }` — the GraphQL Update union for versioned models includes this branch automatically.

Clients should always fragment for `OptimisticLockingErrorType` when calling Update mutations on versioned models:

```graphql
mutation {
  OrderUpdate(input: { id: "abc", status: "SHIPPED", version: 7 }) {
    ... on Order { id status version }
    ... on ValidationErrorType { errors { field constraint message } }
    ... on OptimisticLockingErrorType {
      code expectedVersion currentVersion
    }
  }
}
```

See [backend-datamodels](../backend-datamodels/SKILL.md) (Optimistic locking section) for the model-side contract and trade-offs.

## Core concept: actions for custom endpoints and business logic

Use Actions for domain behavior that is not plain CRUD.

Action base classes:

- `GlobalAction<P, R>`: not tied to a specific model instance
- `ModelAction<M, P, R>`: tied to a model class/collection
- `ObjectAction<M, P, R>`: tied to a specific model instance

All action API metadata is defined in `@Action(...)`.

```typescript
import { Action, ObjectAction } from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';

@Action({
  type: 'write',
  api: 'gql',
  model: Task,
  returns: Task,
})
export class StartTask extends ObjectAction<Task, void, Task> {
  constructor(private ds: MainDs) {
    super();
  }

  // canExecute blocks execution before business logic runs
  override async canExecute(task: Task): Promise<boolean | string> {
    if (task.status !== TaskStatus.Todo) {
      return 'Only Todo tasks can be started';
    }
    return true;
  }

  protected async execute(task: Task): Promise<Task> {
    task.status = TaskStatus.InProgress;

    await this.ds.save(task);
    return task;
  }
}
```

## Core concept: type-safe params and responses

Type safety is defined declaratively in action metadata and generics:

- `params: ParamsClass` + generic `P`
- `returns: ReturnClass | [ReturnClassA, ReturnClassB]` + generic `R`
- resolver layer converts plain GraphQL args into model instances (`fromJSON`, `fromJSONWithReferences`).

Recommendations:

- Declare `params` when the action receives input.
- Declare `returns` for model or primitive responses to keep GraphQL union types explicit.
- Consider using union return types for business success/failure outcomes.

```typescript
import {
  Action,
  GlobalAction,
  DataModel,
  BaseDataModel,
  IntegerField,
  TextField,
  ExpectedError,
} from '@drumr/framework-backend';

@DataModel()
class BuildReportParams extends BaseDataModel {
  @IntegerField({ required: true, min: 1, max: 365 })
  days!: number;
}

@DataModel()
class BuildReportResult extends BaseDataModel {
  @TextField({ required: true })
  reportId!: string;
}

class ReportRangeTooLargeError extends ExpectedError {
  constructor() {
    super('Requested range is too large for synchronous report generation');
  }
}

@Action({
  type: 'read',
  api: 'gql',
  params: BuildReportParams,
  // Union of possible success + expected business error type
  returns: [BuildReportResult, ReportRangeTooLargeError],
})
export class BuildReport extends GlobalAction<BuildReportParams, BuildReportResult | ReportRangeTooLargeError> {
  protected async execute(params: BuildReportParams): Promise<BuildReportResult | ReportRangeTooLargeError> {
    if (params.days > 90) {
      return new ReportRangeTooLargeError();
    }

    const result = new BuildReportResult();
    result.reportId = `REP-${Date.now()}`;
    return result;
  }
}
```

## Core concept: validations and error handling
For backend error handling, expected error taxonomy, and GraphQL serialization rules, refer to the backend-error-handling skill.

---

## Practical example block A: expose a persistent model with CRUD

Goal: show the minimum app-side code needed to expose model CRUD operations.

```typescript
import { BaseDataModel, DataModel, UuidField, TextField, ChoiceField } from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';

enum ProjectStatus {
  Draft = 'draft',
  Active = 'active',
  Closed = 'closed',
}

@DataModel({
  dataSource: MainDs,
  docs: 'Project model exposed through generated CRUD API',
  crud: {
    // This enables GraphQL CRUD exposure
    api: 'gql',
    // Keep explicit actions for predictable API surface
    actions: ['create', 'findById', 'findBy', 'update', 'deleteById'],
  },
})
export class Project extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

  @TextField({ required: true, minLength: 3, maxLength: 150 })
  name!: string;

  @ChoiceField({ required: true, type: () => ProjectStatus })
  status: ProjectStatus = ProjectStatus.Draft;
}
```

Usage notes:

- After bootstrap/schema build, GraphQL operations are available as `ProjectFindBy`, `ProjectFindById`, `ProjectCreate`, `ProjectUpdate`, `ProjectDeleteById`.
- Use `crud.actions` to remove unsupported operations from the public API.

---

## Practical example block B: custom action with typed params/returns

Goal: implement business logic endpoint with `ObjectAction`, typed params, and typed return.

```typescript
import {
  Action,
  ObjectAction,
  DataModel,
  BaseDataModel,
  TextField,
  Context,
  DateTimeField,
} from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';
import { Project } from '@/projects/data-models/project.data-model';

@DataModel()
class ArchiveProjectParams extends BaseDataModel {
  @TextField({ required: true, minLength: 5, maxLength: 300 })
  reason!: string;
}

@DataModel()
class ArchiveProjectResult extends BaseDataModel {
  @TextField({ required: true })
  projectId!: string;

  @TextField({ required: true })
  archivedBy!: string;

  @DateTimeField({ required: true })
  archivedAt!: Date;
}

@Action({
  type: 'write',
  api: 'gql',
  model: Project,
  params: ArchiveProjectParams,
  returns: ArchiveProjectResult,
  // Wrap execute() in one DB transaction
  transactional: true,
})
export class ArchiveProject extends ObjectAction<Project, ArchiveProjectParams, ArchiveProjectResult> {
  constructor(
    private ds: MainDs,
    private context: Context
  ) {
    super();
  }

  override async canExecute(project: Project): Promise<boolean | string> {
    if (project.status === ProjectStatus.Closed) {
      return 'Project is already closed';
    }
    return true;
  }

  protected async execute(project: Project, params: ArchiveProjectParams): Promise<ArchiveProjectResult> {
    // Business mutation
    project.status = ProjectStatus.Closed;
    await this.ds.save(project);

    // Typed response payload
    const result = new ArchiveProjectResult();
    result.projectId = String(project.id);
    result.archivedBy = String(this.context.user?.id ?? 'system');
    result.archivedAt = new Date();

    // Keep reason available for audit extension points
    void params.reason;

    return result;
  }
}
```

Usage notes:

- `@Action` metadata drives schema exposure and typed input/output generation.
- `canExecute` gives user-facing guard messages before mutation logic executes.
- For **bulk actions** (`bulk: true`), `canExecute` controls whether each record is **executed or skipped** — it never hides the button. Use `visible` in the UI config if you need to hide a bulk action button conditionally.

---

## Practical example block C: validation + expected error handling

Goal: show how to return predictable business errors and validation failures cleanly.

```typescript
import {
  Action,
  ModelAction,
  DataModel,
  BaseDataModel,
  TextField,
  IntegerField,
  ExpectedError,
} from '@drumr/framework-backend';

@DataModel()
class AllocateBudgetParams extends BaseDataModel {
  @TextField({ required: true, minLength: 3 })
  costCenter!: string;

  // Validation example: framework will return ValidationErrorType if invalid
  @IntegerField({ required: true, min: 1, max: 1_000_000 })
  amount!: number;
}

@DataModel()
class AllocateBudgetResult extends BaseDataModel {
  @TextField({ required: true })
  allocationId!: string;
}

class BudgetExceededError extends ExpectedError {
  constructor() {
    super('Requested budget exceeds policy limit for this cost center');
  }
}

@Action({
  type: 'write',
  api: 'gql',
  params: AllocateBudgetParams,
  // Explicit union so clients can discriminate success/failure paths safely
  returns: [AllocateBudgetResult, BudgetExceededError],
})
export class AllocateBudget extends ModelAction<
  BaseDataModel,
  AllocateBudgetParams,
  AllocateBudgetResult | BudgetExceededError
> {
  protected async execute(params: AllocateBudgetParams): Promise<AllocateBudgetResult | BudgetExceededError> {
    // Business rule failure -> return ExpectedError (do not throw)
    if (params.amount > 50_000) {
      return new BudgetExceededError();
    }

    const result = new AllocateBudgetResult();
    result.allocationId = `ALLOC-${params.costCenter}-${Date.now()}`;
    return result;
  }
}
```

GraphQL query shape (client-side union handling):

```graphql
mutation {
  AllocateBudget(params: { costCenter: "ENG", amount: 75000 }) {
    ... on AllocateBudgetResult {
      allocationId
    }
    ... on BudgetExceededError {
      message
      code
    }
    ... on ValidationErrorType {
      message
      errors {
        field
        constraint
        message
      }
    }
  }
}
```

Usage notes:

- Validation problems produce `ValidationErrorType` with detailed field-level constraints.
- Expected business failures should return `ExpectedError` subclasses as typed union results.
- Unexpected exceptions should be thrown and treated as system errors.

## Usage notes and recommendations

- Prefer `@DataModel({ crud: { api: 'gql' } })` for CRUD exposure; avoid manual resolver coding in app code.
- Prefer explicit `crud.actions` to keep API contracts stable and reviewable.
- For custom endpoints, choose the appropriate base class based on your use case: `GlobalAction`, `ModelAction`, or `ObjectAction`.
- Declaring `params` and `returns` in `@Action(...)` is recommended for robust type-safe generation.
- Params classes are recommended to be dedicated `@DataModel()` classes to enable proper serialization and validation.
- Consider using `canExecute` for early business guards and user-friendly blockage reasons.
- Return `ExpectedError` values for predictable business failures; do not throw them.
- Consider `transactional: true` for multi-write consistency in one action execution.
- Keep examples short, concrete, and production-leaning: real names, realistic fields, and explicit union handling in GraphQL.
- When adding or changing API framework features, update this skill and related backend skills in the same PR.

## Troubleshooting quick notes

- Operation missing from schema:
  - Confirm `crud.api: 'gql'` for model CRUD or `@Action({ api: 'gql' })` for custom actions.
- Params not converted/validated as expected:
  - Confirm `params: ParamsClass` is set in `@Action` and `ParamsClass` is a `@DataModel()` class.
- Unexpected null/filtered fields in response:
  - Review permission rules (`access`, `read`, `write`, `execute`) and field-level restrictions.
  - Fields restricted with `cannot('write', ...)` are hidden from write-mode UI for **all** users, including those with `can('manage', 'all')`. See [backend-auth](../backend-auth/SKILL.md) Rule precedence section.
- Delete/update denied:
  - Verify record-level permission conditions and role rule coverage.

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-actions](../backend-actions/SKILL.md) | If you need to implement custom operation logic behind API endpoints. | This skill explains API exposure patterns, not full action implementation internals. |
| [backend-datamodels](../backend-datamodels/SKILL.md) | If you need to change model fields, constraints, or CRUD model metadata. | This skill references model exposure but does not define model lifecycle or decorator semantics. |
| [backend-auth](../backend-auth/SKILL.md) | If API access must be constrained by role or permission policies. | This skill touches access outcomes but not complete authorization setup rules. |
| [backend-tech-stack](../backend-tech-stack/SKILL.md) | If you need low-level GraphQL/Apollo/Pothos troubleshooting or stack-specific tuning. | This skill is API-oriented and does not provide deep framework stack diagnostics. |

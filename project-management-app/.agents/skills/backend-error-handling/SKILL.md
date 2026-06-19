---
name: backend-error-handling
description: Comprehensive guide to the Drumr Framework backend error taxonomy. Use this when deciding which error to throw/return in actions, understanding how ExpectedError subclasses (ValidationErrors, PermissionDeniedError, NotFoundError, CannotExecuteError, OptimisticLockingError) serialize into GraphQL unions, and how the frontend unwraps them via __typename. Includes best practices, anti-patterns (return vs throw), and required PR checklists for error paths.
metadata:
  applies-to:
    - core/backend/src/action/errors/
---

# Backend Error Handling

## Purpose

Use this skill when a request involves backend error design, error type selection, action failure paths, GraphQL error union behavior, or frontend handling of backend errors.

This skill is the single source of truth for:

- expected error taxonomy and semantics;
- return versus throw conventions for action code;
- GraphQL union serialization for known backend errors;
- frontend union unwrapping patterns;
- required workflow and PR checklist expectations for error-path changes.

## Scope

This skill applies to:

- backend actions in GlobalAction, ModelAction, and ObjectAction flows;
- backend GraphQL action and CRUD resolvers;
- frontend consumption of error unions by typename;
- developer process requirements for reviewing changed error paths.

This skill does not replace domain-specific behavior design. It defines error semantics and cross-layer contracts.

## Error Taxonomy

### ExpectedError (base)

Use as the base class for predictable, user-facing business failures.

Characteristics:

- semantic class for expected failures;
- carries standard code and message;
- maps to an expected union branch at GraphQL boundary.

Use when:

- the failure is a known business outcome, not a system failure.

Do not use when:

- the failure is unexpected infrastructure/runtime behavior; use regular exceptions for those cases.

### ValidationErrors

Use for field-level or model-level validation failures with detailed field paths and constraints.

Characteristics:

- includes structured validation details list;
- maps to ValidationErrorType in GraphQL;
- intended for form-level and field-level UI feedback.

Use when:

- params/model/reference validation fails and UI must display specific field errors.

### PermissionDeniedError

Use for authorization failures.

Characteristics:

- indicates caller identity/role/ability cannot perform or access requested operation;
- maps to PermissionErrorType in GraphQL.

Use when:

- user is authenticated or evaluated for access and policy denies action.

Do not use for:

- business state constraints unrelated to authorization.

### NotFoundError

Use when the target entity/resource does not exist (or cannot be resolved by id/reference).

Characteristics:

- indicates missing resource;
- maps to NotFoundErrorType in GraphQL.

Use when:

- lookup by id/key fails and operation cannot continue.

Do not use for:

- permission denial or business rule rejection.

### OptimisticLockingError

Raised by the framework (TypeOrmSqlDataSource) when an update to a model
that uses `@VersionField` is rejected because the incoming `version` does
not match the persisted row.

Characteristics:

- extends `ExpectedError`; framework-thrown, not normally constructed by app code.
- code: `ErrorCode.OPTIMISTIC_LOCK_CONFLICT`.
- carries `{ model, primaryKey, expectedVersion, currentVersion }`.
- maps to `OptimisticLockingErrorType` in GraphQL (registered automatically in the `<Model>Update` union for versioned models).

Use when:

- you generally **don't** — the framework raises it from `save()`/`updateInstance()` when a stale update is detected. App code mostly catches/handles it at API boundaries or rethrows.

Do not use for:

- missing `version` in the input payload — that surfaces as a `ValidationErrorType` with constraint `isVersionRequired`, not as `OptimisticLockingError`. The distinction is intentional: missing version = client/integration bug; stale version = real concurrency event.

See [backend-datamodels](../backend-datamodels/SKILL.md) (Optimistic locking section) and `docs/framework/backend/fields/version-field.md` for the full lifecycle.

### CannotExecuteError

Use for business precondition failures and invalid state transitions.

Characteristics:

- indicates operation is valid in principle, but cannot execute in current domain state;
- maps to CannotExecuteErrorType in GraphQL.

Use when:

- domain rule blocks execution (status, lifecycle, transition precondition, duplicate-process guard).

Do not use for:

- authorization policy checks;
- missing resources;
- field-level validation detail paths.

## Best Practices and Anti-Patterns

### Canonical rule for action code

For predictable business failures in action code, return ExpectedError subclasses as values in declared union return types.

Recommended pattern:

- action returns SuccessType | ExpectedErrorSubtype;
- caller and GraphQL layer handle the union branch explicitly.

### Important runtime nuance

Current action runtime catches thrown ExpectedError in action call pipeline and returns it as expected output.

Implication:

- thrown expected errors may still work at runtime;
- but authoring convention remains to return expected errors explicitly for clarity and consistency.

### Anti-pattern

Do not introduce new action logic that relies on throwing ExpectedError subclasses as the primary business-path style.

Why:

- hides expected business outcomes behind exception control flow;
- makes success versus expected-failure contract less explicit;
- weakens consistency across action implementations.

### canExecute string to CannotExecuteError flow

canExecute supports Promise<boolean | string>.

Behavior:

- true: execution proceeds;
- false: framework returns CannotExecuteError with default message;
- string: framework returns CannotExecuteError with that string as message.

This means string returns in canExecute become frontend-visible CannotExecuteErrorType union responses without throwing.

### Additional operational best practices

- Keep canExecute lightweight and fast (it is evaluated frequently for UI action availability).
- Re-check critical business conditions in execute to avoid race conditions between UI evaluation and execution time.
- Use PermissionDeniedError before any business-rule error when the caller is not allowed to perform operation.
- Use NotFoundError for lookup absence before state-transition logic.
- Use CannotExecuteError for rule failures after resource and permission are confirmed.
- Keep user-facing error messages actionable and domain-specific.

## Code Examples

Authorization boundary reminder: do not check user identity/roles/permissions inside action methods. Keep that in the permissions layer; actions only enforce domain preconditions.

### Returning expected errors as values (union return type)

Use explicit union return types in action signatures and return expected errors as values from execute.

```typescript
import {
  Action,
  DataModel,
  TextField,
  BaseDataModel,
  ObjectAction,
  PermissionDeniedError,
  NotFoundError,
} from '@drumr/framework-backend';
import { Invoice } from '@/billing/data-models/invoice.data-model';
import { MainDs } from '@/infra/data-sources/main.ds';

@DataModel()
class ArchiveInvoiceResult extends BaseDataModel {
  @TextField({ required: true })
  status!: string;
}

@Action({
  type: 'write',
  api: 'gql',
  model: Invoice,
  returns: [ArchiveInvoiceResult, PermissionDeniedError, NotFoundError],
})
export class ArchiveInvoice extends ObjectAction<
  Invoice,
  void,
  ArchiveInvoiceResult | PermissionDeniedError | NotFoundError
> {
  constructor(private ds: MainDs) {
    super();
  }

  override async execute(
    invoice: Invoice,
  ): Promise<ArchiveInvoiceResult | PermissionDeniedError | NotFoundError> {
    const fresh = await this.ds.findOneBy(Invoice, { id: invoice.id });
    if (!fresh) {
      return new NotFoundError(`Invoice ${invoice.id} not found`);
    }

    if (!fresh.canBeArchivedByCurrentUser) {
      return new PermissionDeniedError('You are not allowed to archive this invoice');
    }

    fresh.archived = true;
    await this.ds.save(fresh);

    const result = new ArchiveInvoiceResult();
    result.status = 'archived';
    return result;
  }
}
```

### canExecute precondition string -> CannotExecuteError

When canExecute returns a string, the framework automatically converts it to CannotExecuteError at runtime.

```typescript
import { Action, ObjectAction } from '@drumr/framework-backend';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';

@Action({ type: 'write', api: 'gql', model: Task, returns: Task })
export class StartTask extends ObjectAction<Task, void, Task> {
  override async canExecute(task: Task): Promise<boolean | string> {
    if (task.status !== TaskStatus.ToDo) {
      // Framework converts this message into CannotExecuteError(message).
      return 'Task must be in ToDo status to start';
    }
    return true;
  }

  override async execute(task: Task): Promise<Task> {
    task.status = TaskStatus.InProgress;
    return task;
  }
}
```

### execute precondition recheck -> CannotExecuteError

Use execute-time guards for race-safe domain validation (same business rule rechecked at execution time).

```typescript
import { Action, CannotExecuteError, ObjectAction } from '@drumr/framework-backend';
import { Audit } from '@/audits/data-models/audit.data-model';
import { AuditStatus } from '@/audits/shared/audit-status.enum';

@Action({ type: 'write', api: 'gql', model: Audit })
export class ApproveAudit extends ObjectAction<Audit, void, void> {
  protected override async canExecute(audit: Audit): Promise<boolean | string> {
    if (audit.status !== AuditStatus.InReview) {
      return 'The audit can be approved only when it is in review.';
    }
    return true;
  }

  override async execute(audit: Audit): Promise<void> {
    if (audit.status !== AuditStatus.InReview) {
      throw new CannotExecuteError('The audit can be approved only when it is in review.');
    }

    audit.status = AuditStatus.Completed;
  }
}
```

### GraphQL contract (serialized union response)

These examples show the backend boundary contract the frontend receives. The discriminator is __typename.

```json
{
  "data": {
    "TaskStartTask": {
      "__typename": "CannotExecuteErrorType",
      "code": "CANNOT_EXECUTE",
      "message": "Task must be in ToDo status to start"
    }
  }
}
```

```json
{
  "data": {
    "InvoiceArchiveInvoice": {
      "__typename": "ValidationErrorType",
      "code": "VALIDATION_ERROR",
      "message": "Parameter validation failed",
      "errors": [
        {
          "field": "reason",
          "constraint": "isNotEmpty",
          "message": "reason should not be empty"
        }
      ]
    }
  }
}
```

## GraphQL Serialization and Frontend Boundary

### Backend to GraphQL union mapping

Known backend error classes are transformed to typed GraphQL union branches using typename discrimination.

Canonical mappings:

- ValidationErrors -> ValidationErrorType
- CannotExecuteError -> CannotExecuteErrorType
- PermissionDeniedError -> PermissionErrorType
- NotFoundError -> NotFoundErrorType
- ExpectedError -> ExpectedErrorType

Notes:

- action resolver and CRUD resolver paths both normalize known error instances to union-compatible objects;
- union resolveType logic supports compatibility names and canonical Type names.

### Frontend consumption contract

Frontend must branch on __typename for operation results that can return union members.

Primary framework patterns:

- DataForm: handles ValidationErrorType with field mapping, plus PermissionErrorType and NotFoundErrorType as global form errors;
- ActionView: detects error union results by typename/code and shows user-facing errors;
- GraphQLClient.execute: throws OperationError when union typename ends with ErrorType, enabling service-layer handling.

App-level custom view pattern:

- query includes inline fragments for both success type and known error types;
- UI checks success typename first;
- non-success branches display actionResult.message or mapped fallback.

### Boundary rule

Backend owns semantic error typing.
Frontend owns presentation and UX mapping of typed branches.

Do not shift semantic type selection to frontend heuristics.

## Developer Workflows

Use these required process steps whenever backend action error paths are added or changed.

### Action creation and modification checklist update

Add to backend action mandatory checklist:

- Review error taxonomy explicitly for this action:
  - list each business failure path in canExecute and execute;
  - confirm chosen error type matches taxonomy semantics;
  - confirm expected business failures are returned as values in action code conventions;
  - confirm messages are actionable for frontend display.

### Pull request template requirement

Add required Error taxonomy notes section for PRs touching backend actions/resolvers/error mapping:

- failure path;
- selected error type;
- why this type is correct;
- returned versus thrown behavior and rationale;
- frontend union impact by typename/message.

### Code review checklist requirement

Add reviewer checkbox:

- error taxonomy reviewed for changed backend action paths and aligned with framework semantics.

### Practical review matrix

For each changed action path, verify in order:

1. Is this authorization? Use PermissionDeniedError.
2. Is target missing? Use NotFoundError.
3. Is this validation with field details? Use ValidationErrors.
4. Is this business precondition or state transition block? Use CannotExecuteError.
5. Is this another expected business class? Use ExpectedError subtype with explicit union contract.
6. Is this unexpected system/infrastructure failure? Throw regular exception for system handling.

## Quick Decision Table

| Situation | Error type | Return or throw in action code |
| --- | --- | --- |
| User cannot access/execute by policy | PermissionDeniedError | Return as expected value (convention) |
| Entity/resource id cannot be resolved | NotFoundError | Return as expected value (convention) |
| canExecute denies by business reason | CannotExecuteError | Return via canExecute string/false path |
| execute fails business precondition | CannotExecuteError | Return as expected value (convention) |
| Field/model validation failure | ValidationErrors | Produced by validation flow; handled as expected error branch |
| Unknown runtime/infrastructure failure | Error (unexpected) | Throw |

## Copilot Usage Guidance

When answering backend action questions:

- apply this skill first for error selection and serialization topics;
- avoid duplicating full taxonomy explanations in other backend skills;
- reference this skill from backend-actions and backend-api when error behavior is discussed in summary form.

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-actions](../backend-actions/SKILL.md) | If you need full action lifecycle guidance, including decorator setup, signatures for GlobalAction/ModelAction/ObjectAction, transactions, and ui.view linkage. | This skill defines error semantics and contracts, but does not cover complete action design and implementation workflow. |
| [backend-api](../backend-api/SKILL.md) | If you need to design API-level operation contracts, CRUD exposure, action metadata, and response typing strategy beyond error branches. | This skill explains error taxonomy and union behavior, but not full backend API composition patterns. |
| [backend-auth](../backend-auth/SKILL.md) | If the main question is policy design, role/permission rules, CASL ability checks, and authorization modeling. | This skill says when to use PermissionDeniedError, but does not define how to build the underlying permission system. |
| [frontend-api](../frontend-api/SKILL.md) | If you need frontend-side query/mutation builder usage and concrete union-branch handling patterns in app code. | This skill defines backend-to-frontend error contract, but not full frontend operation-builder patterns and typed consumption workflows. |

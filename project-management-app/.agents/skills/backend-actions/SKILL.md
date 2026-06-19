---
name: backend-actions
description: Implements GlobalAction, ModelAction, and ObjectAction in Drumr Framework backend. Use when creating or extending any action, endpoint, mutation, query, or scheduled job. Covers action types, params models, canExecute signatures, execute lifecycle, transactions, backend/frontend ownership boundaries, and the permissions checklist every new action requires.
metadata:
  applies-to:
    - backend/src/**/actions/*.ts
    - backend/src/**/_.action.ts
---

# Backend actions - skill guide

Apply to:

- '**/backend/src/**/actions/*.ts**' - any new or existing action class file
- '**/backend/src/**/_.action.ts**' - any new action file following the `_.action.ts` naming convention

## Purpose & role

An **Action** is the **entry point to the backend** - the Drumr equivalent of an MVC Controller. It receives a request from the API or UI, guards execution, and returns a structured response.

Actions are **not** the place for business logic. They coordinate; services and datasources do the work.

### Multi-skill routing

When task mixes backend action work with labels, modal settings, param field rendering, or custom action surfaces, treat it as a multi-skill task.

- Use this skill for backend contract, params shape, permissions, transactions, and execution lifecycle.
- Also load [frontend-declarative-config](../frontend-declarative-config/SKILL.md) and/or [frontend-action-views](../frontend-action-views/SKILL.md) for presentation concerns.
- Action UI is frontend-owned

### When to inject `MainDs` directly vs. extract a `@Service()`

| Situation                                                            | Pattern                                  |
| -------------------------------------------------------------------- | ---------------------------------------- |
| Simple CRUD, status transitions, self-contained queries              | Inject `MainDs` directly                 |
| Multi-step logic used only by this action                            | Inject `MainDs` + private helper methods |
| Logic shared across multiple actions                                 | Extract to `@Service()`                  |
| Cross-cutting concerns (emails, external APIs, complex domain rules) | Extract to `@Service()`                  |

---

## Creation workflow - mandatory checklist

Copy this checklist and complete every step when creating a new action:

```
New action checklist:
- [ ] 1. Choose action type: GlobalAction / ModelAction / ObjectAction
- [ ] 2. Define params @DataModel in same file (directly above the action class)
- [ ] 3. Implement canExecute with the CORRECT signature for the action type
- [ ] 4. Implement execute. For backend error handling, expected error taxonomy, and GraphQL serialization rules, strictly refer to the backend-error-handling skill.
- [ ] 5. Decide where action UI belongs:
         preferred: register labels, icons, modal config, param field presentation, and functional views in frontend / `app.registerAction()`
- [ ] 6. Register permissions in src/infra/auth/ (e.g., admin.perm.ts):
        ```ts
         can('execute', MyAction)
         can('access', MyParamsClass) + can('read', MyParamsClass) + can('write', MyParamsClass)
         can('access', MyModel) + can('read', MyModel) // [if not already granted for this role]
        ```
```

**Step 5 detail - action UI ownership (CRITICAL):**

```typescript
// Preferred - backend stays focused on execution contract.
// Frontend registers any custom surface with defineActionDefaults()/app.registerAction().
@Action({
  type: 'write',
  model: Pet,
  api: 'gql',
  params: LikePetParams,
  returns: PetLike,
})
export class LikePet extends ObjectAction<Pet, LikePetParams, PetLike> { ... }
```

At this point the backend action contract is complete. Handle any action surface, modal, or param UI customization in frontend skills. If a bulk action has params, make sure the frontend registers an action view so the toolbar can collect those params before execution.

**Step 6 detail - permissions (always required after creating any action):**

```typescript
// In src/infra/auth/admin.perm.ts - minimum required for every new action:
app.definePermissionsForRole(Role.SomeRole, (user, { can }) => {
  can('execute', MyAction);                // grants execution
  // If the action has a params class:
  can('access', MyActionParams);           // allows the user to retrieve it
  can('read',   MyActionParams);           // allows reading individual fields
  can('write',  MyActionParams);           // allows submitting form values
  // If the action has a returns class not already accessible:
  can('access', MyActionResult);
  can('read',   MyActionResult);
});
```

See [backend-auth](../backend-auth/SKILL.md) for the full permission API and condition operators.

---

## Core building blocks

### The three action base classes

| Class | Generics | Use when |
| --- | --- | --- |
| `GlobalAction<P, R>` | `P` = params, `R` = return | Not tied to any entity (system checks, reports, notifications) |
| `ModelAction<M, P, R>` | `M` = entity, `P` = params, `R` = return | Collection-level operations (bulk create, aggregate stats) |
| `ObjectAction<M, P, R>` | `M` = entity, `P` = params, `R` = return | Operations on a specific record instance (approve, activate, archive) |

Use `void` for `P` when there are no input parameters. Use `void` for `R` when the action returns nothing meaningful.

### The `@Action` decorator

All configuration lives **inside the decorator** - no static getters needed.

```typescript
@Action({
  type: 'write',       // 'write' for mutations, 'read' for queries - required
  model: MyEntity,     // required for ModelAction and ObjectAction
  params: MyParams,    // declare when the action has input parameters
  returns: MyResult,   // declare when the return type is a @DataModel class
  api: 'gql',          // expose via GraphQL; omit for internal-only actions
  transactional: true, // optional: wraps execute() in a DB transaction
  bulk: true,          // optional: enables multi-record bulk execution
})
```

> **Rule**: When `params`, `returns`, or `model` is set in the decorator, do **not** also add `static get paramClass()`, `static get returnClass()`, or `static get entityClass()`. The decorator is the single source of truth.

> **CRITICAL - always set `ui.view` when a custom ActionView exists for the action.** If you create a `<ActionView action="LikePet" />` component but omit `ui: { view: 'LikePetView' }` from the backend `@Action` decorator, the framework will render an auto-generated form instead of your custom view. The string value must match the component name of the frontend ActionView.
> **Boundary**: Keep this skill focused on backend contract only. Labels, icons, modal settings, param field presentation, and custom action surfaces belong to frontend registration and frontend view skills.

```typescript
@Action({ 
  type: 'write', model: Pet, api: 'gql', params: LikePetParams, returns: PetLike,
})
export class LikePet extends ObjectAction<Pet, LikePetParams, PetLike> { ... }
```

### Parameter models

Params are `@DataModel()` classes defined **in the same file**, just above the action class. Decorate with `ui.crud.api: 'gql'` to expose them through the GraphQL UI layer. Keep params focused on shape, validation, docs, and defaults. Prefer frontend action defaults for app-specific field rendering, labels, visibility, and lightweight param-form customization.

```typescript
import {
  DataModel,
  BaseDataModel,
  ReferenceField,
  TextField,
  DependencyContainer,
} from '@drumr/framework-backend';
import { MyEntity } from '@/tasks/data-models/my-entity.data-model';
import { MainDs } from '@/infra/data-sources/main.ds';

@DataModel({
  ui: {
    crud: { api: 'gql' },
  },
})
class ProcessDataParams extends BaseDataModel {
  @TextField({ required: true, minLength: 1, maxLength: 200 })
  reason!: string;

  @ReferenceField({
    required: true,
    type: () => MyEntity,
    docs: 'Related entity. Defaults to first available active record.',
    // Async default: pre-fills the form when opening the action UI.
    defaultValue: async (): Promise<MyEntity | null> => {
      const ds = DependencyContainer.resolve(MainDs);
      return (await ds.findOneBy(MyEntity, { active: true })) ?? null;
    },
  })
  relatedEntity!: MyEntity;
}
```

The params class is **not exported** unless reused by another action or view.

### The `Context` object (request-scoped)

`Context` is an injectable provided by the framework. It surfacess the authenticated user, the currently executing action, and other request-level metadata.

```typescript
import { Context } from '@drumr/framework-backend';

// Inside any action method, after injection:

// Who triggered this action?
const userId = this.context.user?.id;
const email = this.context.user?.email;
const roles = this.context.user?.roles ?? [];
const isAdmin = roles.includes('admin');

// Is this a bulk execution? (set automatically when the action runs via BulkObjectActionWrapper)
const isBulk = this.context.action?.bulkAction ?? false;
if (isBulk) {
  // Skip notifications or heavy per-record setup during bulk runs
}
```

> `Context` is `@Injectable({ scope: 'request' })`. A single instance is shared within one request. Inject it by type - never resolve manually via `DependencyContainer.resolve(Context)` inside an action unless constructor injection is impractical.

### Lifecycle hooks

| Hook                        | When it runs                                                                 |
| --------------------------- | ---------------------------------------------------------------------------- |
| `canExecute(target?)`       | Before param conversion. Return `false` or a string to block execution.      |
| `onInit(target?, params?)`  | After param conversion, before validation. Set computed default values here. |
| `execute(target?, params?)` | After validation. The core action logic. **Required.**                       |

Execution order: `canExecute` ? param conversion ? `onInit` ? validation ? `execute`

> **CRITICAL - `canExecute` signatures differ by action type.** Using the wrong signature is a silent bug: the entity parameter will be `undefined` for `ModelAction`, causing incorrect guard logic.

| Action type    | `canExecute` signature                            | Entity available? |
| -------------- | ------------------------------------------------- | ----------------- |
| `GlobalAction` | `async canExecute(): Promise<boolean \| string>`  | No - global scope |
| `ModelAction`  | `async canExecute(): Promise<boolean \| string>`  | No - collection level; no specific record |
| `ObjectAction` | `async canExecute(entity: M): Promise<boolean \| string>` | Yes - the specific record |

```typescript
// ? WRONG - ModelAction does NOT receive an entity in canExecute
export class LikePet extends ModelAction<Pet, LikePetParams, PetLike> {
  override async canExecute(pet: Pet): Promise<boolean | string> {
    // ERROR: no entity param for ModelAction
    if (pet.status !== 'available') return 'Pet is not available';
    return true;
  }
}

// ? CORRECT - ModelAction.canExecute() takes no parameters
export class LikePet extends ModelAction<Pet, LikePetParams, PetLike> {
  override async canExecute(): Promise<boolean | string> {
    // Collection-level guard: use this.context for user-based checks if needed
    return true;
  }
}

// ? CORRECT - ObjectAction.canExecute() receives the target entity
export class HidePet extends ObjectAction<Pet, void, Pet> {
  override async canExecute(pet: Pet): Promise<boolean | string> {
    if (pet.status === 'hidden') return 'Pet is already hidden';
    return true;
  }
}
```

`canExecute` signature:

```typescript
// Preferred - explains WHY execution was blocked
override async canExecute(entity: MyEntity): Promise<boolean | string> {
  if (entity.status === MyEntityStatus.Archived) {
    return 'Cannot modify an archived record';
  }
  return true;
}
```

`onInit` - use for defaults that depend on the target or require async:

```typescript
override async onInit(entity: MyEntity, params: ProcessDataParams): Promise<void> {
  if (!params.reason) {
    params.reason = `Auto-processed by ${this.context.user?.email ?? 'system'}`;
  }
}
```

### Expected errors

For backend error handling, expected error taxonomy, and GraphQL serialization rules, strictly refer to the backend-error-handling skill.

### Query pagination in actions

- `find()` and `findBy()` return a paginated `QueryResponse` (`objects` + `pageInfo`). They do not guarantee all matches.
- Use `find()` when you need full query options (where + orderBy + explicit pagination).
- Use `findBy()` as a concise where-only read (still paginated).
- Use `findAndPaginate()` when you must process all matching records.

```typescript
// 1) find: page-based list for UI/API
const page = await this.ds.find(MyEntity, {
  where: { status: MyEntityStatus.Pending },
  paginationType: 'page',
  page: 1,
  pageSize: 20,
  orderBy: { createdAt: 'DESC' },
});

// 2) findBy: concise where-only read (still a page)
const activePage = await this.ds.findBy(MyEntity, { status: MyEntityStatus.Active });

// 3) findAndPaginate: process ALL matches safely
await this.ds.findAndPaginate(
  MyEntity,
  { where: { status: MyEntityStatus.Pending }, orderBy: { id: 'ASC' } },
  async entity => {
    await this.process(entity);
  }
);
```

---

## Transactional integrity

- Use `transactional: true` in `@Action` to wrap the entire `execute()` in one DB transaction.
- Use `this.ds.transaction()` per loop iteration when each record must be its own rollback unit.
- Never combine both — `transactional: true` + inner `this.ds.transaction()` is redundant.
- `transactional: [MainDs, AnalyticsDs]` spans multiple datasources (best-effort; no two-phase commit).

See [reference/transactions.md](./reference/transactions.md) for full examples.

---

## Implementation examples

> **Folder rule for GlobalActions**: Place regular (user-callable) `GlobalAction` classes under `backend/src/actions/global/regularAction/`. Place cron-triggered `ScheduledGlobalWorkflowAction` classes under `backend/src/actions/global/scheduledAction/`. Do not place them directly in `global/` or `global/scheduled/`.

See [examples.md](./examples.md) for complete working examples:
- **4.1** `GlobalAction` - system-wide query, no entity context
- **4.2** `GlobalAction` with params and user context
- **4.3** `ModelAction` - collection-level with `transactional: true`
- **4.4** `ObjectAction` - simple state transition
- **4.5** `ObjectAction` - bulk-aware with transactional cascade
- **4.6** `ModelAction` - complex per-item loop with `this.ds.transaction()`
- **4.7** `ObjectAction` - delegating to a `@Service()`

---

## Backend/frontend ownership boundary

Use backend action metadata mainly for execution concerns: action existence, params shape, returns shape, transactional behavior, permissions, and API exposure. Backend `ui` metadata exists, but app-facing presentation should prefer frontend registration.

Use frontend registration for app-facing presentation concerns:

- `defineActionDefaults()` or `app.registerAction()` for labels, icons, styles, modal settings, and param field presentation.
- `defineActionDefaults({ view })` or `app.registerAction({ view })` for lightweight functional action surfaces.
- Ensure bulk actions with params expose a registered action view somewhere in the frontend flow so selection-driven execution can collect param values.
- [frontend-action-views](../frontend-action-views/SKILL.md) when prompt explicitly targets richer action surface behavior.

```typescript
@Action({
  type: 'write',
  model: MyEntity,
  api: 'gql',
  returns: MyEntity,
})
export class MyAction extends ObjectAction<MyEntity, void, MyEntity> {
  // ...
}
```

---

## Scheduled background actions

Use `@ScheduledWorkflowAction` + `ScheduledGlobalWorkflowAction` for cron-triggered tasks. These run asynchronously in the background — never in the request cycle.

- Decorator: `@ScheduledWorkflowAction({ type, schedule: { cron, timezone } })`
- No `api: 'gql'`, no `params`, no `returns` — the schedule is the trigger.
- File placement: `backend/src/actions/global/scheduledAction/`

See [reference/scheduled-actions.md](./reference/scheduled-actions.md) for a full example.

## Best practices

### Do

- Use `Context` alongside `MainDs` as the standard constructor signature.
- Use `this.context.user?.id` / `this.context.user?.roles` for identity-aware writes and guards.
- Check `this.context.action?.bulkAction` to skip expensive per-record side-effects during bulk runs.
- Use `transactional: true` for simple atomic writes (the declarative default).
- Use `this.ds.transaction()` per-item when each record must be its own rollback unit.
- Define params `@DataModel` in the same file, directly above the action class.
- Keep param models focused on backend contract; push app-specific param field presentation to frontend action defaults.
- Use `@ScheduledWorkflowAction` + `ScheduledGlobalWorkflowAction` for cron-triggered tasks.
- Apply `bulk: true` when the action should appear in the UI toolbar for multi-record selection.
- Keep `execute()` at 5-20 lines; move multi-step logic to private helpers or a `@Service()`.
- **Always register permissions after creating an action** - `execute` permission on the action class, and `access`+`read`+`write` on the params class. See [backend-auth](../backend-auth/SKILL.md).

### Don't

- Add `@injectable()` to an action class - `@Action` already handles DI registration.
- Import from `tsyringe` directly - use `@drumr/framework-backend` exports exclusively.
- Use `@inject()` for class-type tokens - the container resolves them by type automatically.
- Use `static get paramClass()`, `static get returnClass()`, or `static get entityClass()` - the `@Action` decorator is the single source of truth.
- Put app-specific action presentation guidance in backend skill - route it to frontend skills instead.
- Apply `transactional: true` when using `this.ds.transaction()` inside the loop - the inner transactions make the outer wrapper redundant.
- Register `ScheduledWorkflowAction` with `api: 'gql'` - scheduled actions are not user-callable.

---

## Caveats

> **Timeout**: Synchronous actions run in the request/response cycle. Operations that take more than a few seconds **will time out**. For long-running processes, use `@ScheduledWorkflowAction` or a Workflow Action instead.

> **Validation is automatic**: Field constraints declared via decorators on the params `@DataModel` are validated automatically before `execute()` runs. Do not re-implement field-level checks inside the action.

> **`canExecute` runs before validation**: At the time `canExecute` is called, params have been type-converted but **not yet validated**. Keep guards focused on entity state and permissions.

> **`export default` vs `export class`**: By convention, `GlobalAction` uses `export default class` and `ModelAction` / `ObjectAction` use `export class`. Follow this convention when writing actions.

> **`onInit` for default values**: Use `onInit` (not the constructor) when you need to set default parameter values that depend on the target entity or require an async lookup.

---

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | If you need to design `params` or `returns` types with full field decorator behavior. | This skill uses model classes in examples, but it does not define full field/decorator rules. |
| [backend-datasources](../backend-datasources/SKILL.md) | If you need to write or optimize data access queries used by an action. | This skill shows datasource injection, but query and transaction patterns are defined elsewhere. |
| [backend-services](../backend-services/SKILL.md) | If you need to extract action logic into reusable `@Service()` classes. | This skill focuses on action entry points and does not cover service scope/registration depth. |
| [backend-context](../backend-context/SKILL.md) | If you need advanced request/workflow context stack usage inside actions. | This skill references context, but stack utilities and propagation rules are documented in depth there. |
| [backend-auth](../backend-auth/SKILL.md) | If you need to formalize permission checks beyond a local `canExecute` condition. | This skill shows local checks but not the full authorization rules definition workflow. |
| [backend-error-handling](../backend-error-handling/SKILL.md) | If a prompt involves error taxonomy, deciding whether to throw or return errors, or GraphQL error union serialization. | This skill covers action lifecycle and structure, but not the full cross-layer error taxonomy and serialization contract. |
| [backend-queues](../backend-queues/SKILL.md) | If your action must run as a durable workflow or queue-backed execution. | This skill does not cover queue orchestration, retries, or workflow runtime behavior. |
| [frontend-declarative-config](../frontend-declarative-config/SKILL.md) | If the prompt changes action labels, icons, modal settings, param field presentation, or lightweight functional action surfaces. | This skill defines frontend-owned action defaults; backend-actions should not be the only source for presentation guidance. |
| [frontend-action-views](../frontend-action-views/SKILL.md) | If the prompt includes richer action-surface behavior, custom param forms, or action-specific UI flow. | This skill covers functional `ActionView` composition and frontend runtime behavior that backend-actions intentionally does not define. |

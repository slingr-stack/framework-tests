---
name: backend-datamodels
description: Defines @DataModel entities, fields, relationships, and validation in Drumr Framework backend. Use when designing entities, fields, schemas, datasource linkage, lifecycle hooks, or computed fields. Covers @DataModel, BaseDataModel, unified field decorators (@TextField, @ChoiceField, @ReferenceField, @CompositionField, @VersionField, etc.), calculated fields, model-level validation, indexing, optimistic locking via @VersionField, and the permissions registration required after creating any new data model.
user-invocable: true
metadata:
  applies-to:
    - core/backend/src/model/
---

# Backend skill: data models

## When to use

Use this skill for backend model schema and lifecycle work:

- Rich data structures (fields, relationships, arrays)
- Persistence behavior (data source and database mapping)
- Validation rules (field-level and model-level)
- Serialization contracts for API and workflows
- Calculated fields, indexes, optimistic locking, and CRUD exposure metadata

Every model must use `@DataModel()` (never `@Model`) and extend the framework base class.

> **UI ownership.** UI presentation is authored on the frontend with `app.registerDataModel()` — see [frontend-datamodels](../frontend-datamodels/SKILL.md). Backend model metadata still drives schema, validation, query behavior, and backend label fallback such as `@DataModel({ ui: { labelField: 'name' } })`.

## Multi-skill routing

- Use [frontend-datamodels](../frontend-datamodels/SKILL.md) when prompt changes labels, components, visibility/editability, or default CRUD view names.
- Use [backend-datasources](../backend-datasources/SKILL.md) when prompt changes datasource setup, connection options, or direct query strategy.
- Use [backend-api](../backend-api/SKILL.md) when model `crud` exposure or GraphQL contract changes.
- Use [backend-auth](../backend-auth/SKILL.md) when model access, CRUD permissions, or permission-scoped direct queries change.
- Use [backend-files](../backend-files/SKILL.md) when model fields reference file entities or upload/download flows.

## Backend UI contract

- Keep schema, validation, relationships, availability, query behavior, and datasource linkage in backend decorators.
- Use `@DataModel({ ui: { labelField } })` when backend GraphQL/reference label resolution needs a stable model label field.
- Backend field decorators may still carry transport metadata, but view components, default CRUD views, visibility/editability, and help text are authored on the frontend.
- If a prompt asks for labels, placeholders, component factories, read/write controls, or field visibility/editability presentation, route that work to frontend config instead of backend decorators.

## Primary key requirement (mandatory)

Every persistent data model must define a valid primary key.

- Preferred default:

```typescript
@UuidField({ primaryKey: true, generated: true, required: true })
id!: string;
```

- If the user explicitly provides attributes and none is marked as primary key, automatically add the default `id` field above.
- If the user already provided an explicit primary key, keep it and do not add another primary key field.
- Action/workflow params models are the exception: they can omit primary keys.

## Decorator standard

Use unified field decorators as the default style:

- `@TextField()`, `@UuidField()`, `@ChoiceField()`, `@DateField()`, `@MoneyField()`
- `@ReferenceField()`, `@CompositionField()`, `@HtmlField()`, `@IntegerField()`

The two-decorator style (`@Field() + @Text()`, `@Field() + @Decimal()`, etc.) is still supported. For new code, unified decorators are the preferred and standard approach.

## Core API

Models extend `BaseDataModel` (the framework's abstract BaseModel foundation) and rely on these lifecycle operations:

- `validate()`: Runs class-validator and custom framework validations.
- `calculate()`: Executes manual calculated getters (`calculation: 'manual'`) and caches results.
- `filter()`: Sets fields to `null` when their `available` callback returns `false`; fields with static `available: false` stay excluded from serialization and are not touched.
- `toJSON()`: Serializes model instances for API/database/workflow payloads.
- `fromJSON()`: Creates hydrated model instances from plain objects.
- `fromJSONWithReferences()`: Async initialization path for payloads that include reference IDs; resolves references, applies default values, and then runs `onInit()`.

**Optional override hooks on `BaseDataModel`:**

| Hook | When | Typical use |
|---|---|---|
| `onInit?()` | After `fromJSONWithReferences()` applies default values | Initialize collection fields to `[]`; set derived defaults that need multiple sibling values |
| `onRefresh?(changedFields)` | During UI refresh, before recalculation | Auto-fill related fields when a reference field is selected |
| `onBeforeSave?()` | Immediately before every database INSERT/UPDATE | Set `createdAt` once, refresh `updatedAt` on every save, enrich any field centrally |
| `onAfterSave?(saved)` | Immediately after a successful INSERT/UPDATE | Audit logging, cache invalidation, notifications that depend on the persisted record |

All hooks support `async/await`. If `onBeforeSave` or `onAfterSave` throws, the operation aborts and any active transaction is rolled back. A built-in re-entrancy guard prevents infinite loops if `save()` is called on the same entity instance inside a hook.

```typescript
import { BaseDataModel, DataModel, TextField } from '@drumr/framework-backend';

@DataModel({ docs: 'Simple example model' })
export class ExampleModel extends BaseDataModel {
  @TextField({ required: true, maxLength: 100 })
  name!: string;
}

async function lifecycleDemo(): Promise<void> {
  const model = ExampleModel.fromJSON({ name: 'Acme' });

  const errors = await model.validate();
  if (errors.length > 0) {
    return;
  }

  await model.calculate();
  model.filter();

  const payload = model.toJSON();
  const restored = ExampleModel.fromJSON(payload);
  void restored;
}
```

## Example references

See [examples/full-model.md](./examples/full-model.md) for a complete `Project` entity that demonstrates: `dataSource`, `crud`, `validation`, all major field types (`@TextField`, `@ChoiceField`, `@DateField`, `@HtmlField`, `@MoneyField`, `@IntegerField`), and an automatic calculated field. Field UI rendering for these types is configured on the frontend — see [frontend-datamodels](../frontend-datamodels/SKILL.md).

See [examples/patterns.md](./examples/patterns.md) for:
- Conditional `required` fields
- Default values (property declaration + constructor)
- Automatic vs manual calculated fields
- Model-level `validation` + field-level `available`

### Quick reference — field pattern

```typescript
// Conditional required
@TextField({ required: (s: Supplier) => s.isInternational, minLength: 2, maxLength: 2 })
countryCode!: string | null;

// Simple default
@ChoiceField({ required: true, type: () => TicketStatus })
status: TicketStatus = TicketStatus.Draft;

// Automatic calculated getter (always up to date)
@DecimalField({ decimals: 2, roundingType: 'roundHalfToEven' })
get subtotal(): DecimalNumber { return this.unitPrice.multiply(String(this.quantity)); }

// Manual calculated getter (requires invoice.calculate())
@DecimalField({ calculation: 'manual', decimals: 2, roundingType: 'roundHalfToEven' })
get subtotalManual(): DecimalNumber { return this.unitPrice.multiply(String(this.quantity)); }

// Field-level validation + availability
@TextField({
  available: (p: CustomerProfile) => p.isCompany,
  validation: (v, p) => p.isCompany && v ? [] : [{ constraint: 'fmt', message: 'Invalid.' }],
})
taxId!: string | null;
```

## Data types overview

Use unified type decorators to declare field semantics. Typical categories:

- Text: `@TextField`, `@LongTextField`, `@EmailField`, `@HtmlField`, `@UuidField`
- Numeric: `@IntegerField`, `@NumberField`, `@DecimalField`, `@MoneyField`
- Temporal: `@DateField`, `@DateTimeField`, `@TimeField` (and DateTimeRange metadata support in runtime)
- Boolean: `@BooleanField`
- Enum/Choice: `@ChoiceField`
- Structured/Other: `@JsonField`, relationship types
- Concurrency: `@VersionField` — opt-in optimistic locking column (max one per model, TypeORM-backed datasources only). See `docs/framework/backend/fields/version-field.md`.

### Rule: prefer unified decorators

Prefer one unified decorator per field (`@TextField`, `@MoneyField`, etc.). The two-decorator style (`@Field + @Text`, `@Field + @Decimal`) is valid but is not the primary style for new code.

Why:

- Keeps type behavior extensible and explicit.
- Registers correct metadata keys for model/query/UI/datasource flows.
- Activates built-in `class-validator` and `class-transformer` logic for that type.

```typescript
import { BaseDataModel, DataModel, TextField, DecimalField, DateField } from '@drumr/framework-backend';
import type { DecimalNumber } from '@drumr/framework-backend';

@DataModel()
export class Product extends BaseDataModel {
  @TextField({ required: true, maxLength: 30 })
  sku!: string;

  @DecimalField({ required: true, decimals: 2, roundingType: 'roundHalfToEven', min: '0.00' })
  price!: DecimalNumber;

  @DateField()
  launchedAt!: string | null;
}
```

## Relationships and multi-valued fields

- `@ReferenceField` — entities exist independently; linked by foreign key.
  - `filter: (parent) => WhereCondition` — restricts selectable values validated on save. When the filter criteria contains a reference field (e.g. `{ masterAccount: parent.masterAccount }`), the validator compares IDs. On UPDATE, references are submitted as id-only stubs; if a nested relation used in the filter criteria is not loaded on the stub, that condition is skipped rather than failing — "cannot resolve" is not treated as a mismatch.
- `@CompositionField` — child lifecycle belongs to parent; nested serialization, cascades on delete.
- For `string[]` arrays, prefer definite assignment (`tags!: string[]`) and avoid `= []` unless the domain explicitly requires it.

> Read/write component selection for references and compositions (`<ReferenceLabel>`/`<ReferenceDropdown>`, `<List>` + `<CompositionPanel>`) is frontend UI config — see [frontend-datamodels](../frontend-datamodels/SKILL.md).

See [reference/relationships.md](./reference/relationships.md) for full Customer/Order/OrderLine example.

## Database indexing

Add `@Indexes`/`@Index` only when the prompt or query patterns require filtering/sorting optimization. Do not add indexes by default.

- `@Indexes<T>([{ fields, name, type? }])` — class-level, compound or multiple indexes.
- `@Index({ type, name })` — field-level single-column index.
- `type: 'fullText'` for text search; `type: 'hash'` for exact equality; omit `type` for B-tree default.

See [reference/indexing.md](./reference/indexing.md) for full examples.

## Usage notes and best practices

### Reason about field props from business rules (critical)

Do not blindly mark every field as `required: true`. Infer field props from the business flow described in the prompt.

Use this decision logic before defining each field:

- `required`: true only if the entity cannot be created/updated correctly without that value.
- Optional fields: keep nullable types (for example `string | null`) and avoid forcing defaults that hide missing data.
- `maxLength` / `minLength`: infer from realistic business constraints (UI forms, legal identifiers, titles, notes).
- Initial state/defaults: set only when the domain has a clear default (for example `status = Draft`, booleans usually `false`).
- Conditional required: use `required: (instance) => boolean` when a field becomes mandatory only in certain states.
- Validation and availability: move cross-field business rules to model `validation`, and use `available` for conditional visibility.

```typescript
import { BaseDataModel, DataModel, TextField, ChoiceField, ReferenceField, UuidField } from '@drumr/framework-backend';

enum TaskPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

@DataModel()
class User extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;
}

@DataModel({ docs: 'Task creation rules inferred from business requirements' })
export class Task extends BaseDataModel {
  // Required because a task without title is invalid for the business process.
  @TextField({ required: true, minLength: 3, maxLength: 120 })
  title!: string;

  // Required because the team needs enough context to execute the task.
  @TextField({ required: true, minLength: 10, maxLength: 2000 })
  description!: string;

  // Optional at creation time: task can be created before assigning a priority.
  @ChoiceField({ type: () => TaskPriority })
  priority!: TaskPriority | null;

  // Optional at creation time: task can be created before assigning an owner.
  @ReferenceField({ type: () => User })
  assignee!: User | null;
}
```

### Do not use `any`

- Always use explicit types for fields, validation functions, and relationship targets.
- Use framework exported types like `ValidationIssue`, `DecimalNumber`, and `Money`.

### Record identification and `toString()`

- Add `toString()` only when the prompt explicitly asks for a custom textual representation or a nearby existing pattern depends on it.
- If you do override a method inherited from a base class, mark it with `override`.
- When a model is referenced by a child entity, choose which existing field (`name`, `title`, `code`, …) identifies the record. Set `@DataModel({ ui: { labelField: '...' } })` when backend GraphQL/reference label resolution needs that field. Frontend `app.registerDataModel()` can override UI rendering when needed. See [frontend-datamodels](../frontend-datamodels/SKILL.md).
- Use `load: true` on a `@ReferenceField` when the relation must be eager-loaded for backend logic or serialization.

```typescript
// Good — parent model declares backend label fallback for references
@DataModel({ dataSource: MainDs, ui: { labelField: 'name' } })
export class Country extends BaseDataModel { … }

// Good — child model keeps relationship semantics in backend model
@ReferenceField<Country>({
  type: () => Country,
  required: true,
  load: true,
})
country!: Country;
```

### Boolean defaults

- Prefer `false` as the default for boolean fields to avoid tri-state logic (`true`/`false`/`null`).

```typescript
@BooleanField({ required: true })
isArchived: boolean = false;
```

### Decimal and money precision

- `@DecimalField` and `@MoneyField` enforce exact scale (`decimals`) and rounding behavior.
- Use framework numeric objects, not floating-point arithmetic.
- Build values with `decimal(...)` / `money(...)` and keep all operations in those objects.

```typescript
import { BaseDataModel, DataModel, DecimalField, MoneyField, decimal, money } from '@drumr/framework-backend';
import type { DecimalNumber, Money } from '@drumr/framework-backend';

@DataModel()
export class Financials extends BaseDataModel {
  @DecimalField({ required: true, decimals: 4, roundingType: 'roundHalfToEven' })
  ratio: DecimalNumber = decimal('1.0000');

  @MoneyField({ required: true, decimals: 2, roundingType: 'roundHalfToEven', min: '0.00' })
  amount: Money = money('0.00');
}
```

## Procedure checklist

- Always use `@DataModel()`.
- Extend `BaseDataModel`.
- Ensure every persistent entity has one valid primary key. If none is provided in requested attributes, add `id` with `@UuidField({ primaryKey: true, generated: true, required: true })`.
- Prefer unified decorators (`@TextField`, `@MoneyField`, etc.) over split decorator style.
- Keep split decorator style when surrounding code already uses it or when a specialized decorator pairing is required.
- Import only what the final model uses.
- Prefer explicit types and unions like `string | null` over implicit/loose types.
- Use `required: (instance) => boolean` for conditional requirements.
- Infer `required`, `maxLength`, defaults, and nullability from business rules instead of applying fixed defaults.
- For array fields (including `@CompositionField` arrays), prefer `field!: Type[]` and avoid `= []` unless explicitly required by the domain.
- Use `available: (instance) => boolean` for visibility/filtering behavior.
- Use `calculation: 'manual'` only when recalculation must be explicit via `calculate()`.
- Keep primary UI authoring on the frontend; use backend `ui` metadata only when backend label fallback or transport metadata is needed.
- Use `query` options at field level when behavior differs (example: `query: { sorting: false }`).
- Do not author field UI (`ui` blocks, components, default CRUD views, labels) in the backend model; declare that presentation on the frontend — see [frontend-datamodels](../frontend-datamodels/SKILL.md).
- Prefer datasource classes in `@DataModel` (for example `dataSource: MainDs`). Use string datasource ids when model resolution intentionally goes through `@DataSource({ id: '...' })`.
- Import datasource modules when needed to reference the class explicitly.
- Add `@Indexes` and `@Index` only when the prompt or established query patterns require it.
- Avoid `toString()` unless explicitly needed; backend label resolution can use `ui.labelField`, then `toString()`, then `id`, while frontend `app.registerDataModel()` can override UI rendering.
- Default booleans to `false`.
- For decimals/money, use framework numeric objects and matching precision settings.

## Optimistic locking with `@VersionField`

Add a single `@VersionField()` to opt a model into optimistic concurrency
control. The framework adds an integer version column (TypeORM
`@VersionColumn`) and rejects updates whose incoming version doesn't match
the persisted row.

```typescript
import { BaseDataModel, DataModel, TextField, UuidField, VersionField } from '@drumr/framework-backend';

@DataModel({ dataSource: MainDs })
export class Order extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

  @TextField({ required: true })
  status!: string;

  @VersionField()
  version!: number;
}
```

Rules and contract:

- **At most one** `@VersionField` per model (model setup throws otherwise).
- Datasource must support optimistic locking (TypeORM-backed only).
- The decorator takes **no options** — version values are framework-managed.
- On create, any client-sent `version` is stripped; TypeORM seeds `1` on INSERT.
- On update, the input **must** include `version` (the value loaded with the row); missing version returns a typed `ValidationErrorType` with constraint `isVersionRequired`.
- On stale update, the resolver returns `OptimisticLockingErrorType` with `{ model, primaryKey, expectedVersion, currentVersion, code: "OPTIMISTIC_LOCK_CONFLICT" }`.
- **UI/form path** (`UiUpdate`): the framework auto-injects the baseline `_version` captured at load — developers write nothing. Conflicts surface as a default notification.
- **Data API path** (`{Model}Update`): callers must explicitly include the `version` field in the update input (loaded with the row). This is the explicit contract for integrators.
- Scripts, services, workflows using `save()`/`updateInstance()`: follow the standard `load → mutate → save` pattern.

Scope it deliberately: add `@VersionField` to records that can plausibly be edited concurrently (orders, tasks, editable documents). Skip it for append-only data (audit logs, generated artifacts).

See [docs/framework/backend/fields/version-field.md](../../../docs/framework/backend/fields/version-field.md) for the full spec including the schema-migration story and frontend-form round-trip requirement.

## Permissions — always register after creating a model

Every new `@DataModel` exposed via `crud.api: 'gql'` needs permission rules. Without them, users will receive empty results or access-denied errors even if the action succeeds.

Add entries in `src/auth/permissions.ts` immediately after defining a new model:

```typescript
// Minimum for a role to list and read records:
can('access', MyModel);
can('read',   MyModel);

// For create/update/delete:
can('create', MyModel);
can('update', MyModel);
can('delete', MyModel);
```

> **Critical**: `access` and `read` are separate — granting only `read` without `access` silently prevents records from being returned. Always grant both. See [backend-auth](../backend-auth/SKILL.md) for the full permission API and condition operators.

## Related skills

| Skill | Use together when | Why |
| --- | --- | --- |
| [frontend-datamodels](../frontend-datamodels/SKILL.md) | Prompt changes labels, read/write components, visibility/editability, default CRUD views, or reference label fields. | This skill owns schema and persistence only; UI presentation is authored on the frontend with `app.registerDataModel()`. |
| [backend-datasources](../backend-datasources/SKILL.md) | If model persistence requires datasource setup, connection options, or query strategy choices. | This skill references datasource linkage but does not define datasource internals and operations. |
| [frontend-field-components](../frontend-field-components/SKILL.md) | If model fields need detailed UI component selection (read/write JSX components) and their options. | This skill defines schema; the complete component catalog and options are maintained on the frontend. |
| [backend-api](../backend-api/SKILL.md) | If model CRUD exposure must be configured or consumed through GraphQL API contracts. | This skill notes API exposure flags but not full endpoint/query behavior. |
| [backend-files](../backend-files/SKILL.md) | If model fields reference file entities or upload/download storage workflows. | This skill mentions file references but not the full file model lifecycle. |
| [backend-tech-stack](../backend-tech-stack/SKILL.md) | If you need stack-level constraints for validation, serialization, or numeric handling libraries. | This skill is model-centric and does not provide deep backend stack operational guidance. |

## Mandatory architecture rules for compositions and audit fields

These architecture rules apply in this repository.

### 1) One persistent DataModel per file (mandatory)

- Every persistent data model / composition entity must be declared in its own file.
- Never declare parent and child composition models in the same file.
- This rule applies to persistent backend models and composition entities, not to every class decorated with `@DataModel`.
- Non-persistent action/workflow parameter models may be co-located with their related action/workflow when that matches existing repository patterns.
- Violating this rule for persistent models is considered an invalid architecture suggestion.

Why:
- Prevents circular imports and metadata initialization errors.
- Keeps model boot order deterministic and testable.

### 2) Composition dual-link recipe (mandatory)

A valid composition must define both links.

Parent side:

```ts
@CompositionField({ type: () => Note })
notes!: Note[];
```

Child side:

```ts
@OwnerReferenceField({ type: () => Task, required: true })
owner!: Task;
```

If one side is missing, the composition is incomplete and must be rejected.

### 3) Audit fields recipe (createdBy and createdAt)

#### 3.1 Frontend immutability

Audit fields must be rendered as read-only in frontend config. Backend model should not declare field `ui`.

```ts
@ReferenceField({
  type: () => User,
  required: false,
})
createdBy!: User | null;

@DateTimeField({
  calculation: 'automatic',
})
createdAt: Date | null = null;
```

Rendering them as read-only labels is **frontend** UI config — see the audit-field section in [frontend-datamodels](../frontend-datamodels/SKILL.md). UI read-only is presentation only and is not a security control; backend hooks and action logic keep source of truth.

#### 3.2 Backend source of truth

Initialize audit fields in `onInit()` or overwrite them in save hooks. Frontend read-only alone is not a security control, so create/update flows must not trust client-sent audit values.
Use `onBeforeSave` for timestamps that must be refreshed on every write, and `onInit` for fields that are only set once at object creation time (e.g. `createdBy`)
```ts
// Stamps createdAt once and refreshes updatedAt on every save.
// onBeforeSave fires on both INSERT and UPDATE, so updatedAt is always current.
override async onBeforeSave(): Promise<void> {
  if (!this.createdAt) {
    this.createdAt = new Date();
  }
  this.updatedAt = new Date();
}

// createdBy is resolved during model initialization paths that call onInit.
// Save/update hooks do not call onInit.
override async onInit(): Promise<void> {
  if (!this.createdBy) {
    try {
      const context = DependencyContainer.resolve(Context);
      const ds = DependencyContainer.resolve(MainDs);
      const currentUser = await ds.findOneBy(User, {
        id: { $eq: context.user?.id },
      });
      if (currentUser) {
        this.createdBy = currentUser;
      }
    } catch {
      // Keep resilient in bootstrap and tests
    }
  }
}
```

For create payloads, do not trust client-provided audit metadata. Overwrite audit fields server-side in hooks or action logic.

#### 3.3 Immutability policy

- createdAt and createdBy are set at creation.
- Update flows must not allow modifying them.
- Enforce this in authorization rules (see backend-auth skill).

### 4) Backfill playbook for new required fields

When a SQL datasource runs with `synchronize: true`, decorator diffs can apply at startup.

**The risk:** if you add a field with `nullable: false` (or `required: true`) to a model that already has rows, schema sync can attempt `ALTER TABLE ADD COLUMN col NOT NULL` and fail because existing rows still have `NULL`.

Always use 3 phases:

**Phase A — add as nullable, restart app**

TypeORM emits `ADD COLUMN col NULL`. Existing rows are unaffected.

```ts
@TextField({ required: false, maxLength: 120 })
createdByDisplayName!: string | null;
```

**Phase B — backfill existing rows**

Run a one-off script, action, or seed before proceeding to Phase C.

```ts
await ds.findAndPaginate(
  MyModel,
  { orderBy: { id: 'ASC' } },
  async (row) => {
    if (!row.createdByDisplayName) {
      row.createdByDisplayName =
        row.createdBy?.fullName || row.createdBy?.email || 'System';
      await ds.save(row);
    }
  },
);
```

**Phase C — enforce NOT NULL, restart app**

TypeORM emits `ALTER COLUMN SET NOT NULL`. Safe because no NULLs remain.

```ts
@TextField({ required: true, maxLength: 120 })
createdByDisplayName!: string;
```

Never jump directly from Phase A to Phase C while the table has rows. The startup will crash with a TypeORM schema sync error.

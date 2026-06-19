---
name: backend-auth
description: Implements authentication and authorization in Drumr Framework backend. Use when registering role permissions, defining AppUser, granting access/read/write/execute on models and actions, or writing conditional rules. Covers defineGuestPermissions, defineGlobalPermissions, definePermissionsForRole, the mandatory access+read pairing, action params/returns permissions, the File model permission requirement for upload/download to work, and the id-only write requirement for relation selectors in create/edit forms.
user-invocable: true
metadata:
  applies-to:
    - core/backend/src/auth/
---

# Authentication & permissions (backend)

## Purpose

This skill shows how to implement authentication and authorization in backend app code.

Use it to:

- register guest, global, and role permissions;
- define your application user model with AppUser;
- grant access/read/write/execute permissions for models, action params, and actions.

Focus on app usage patterns only. Do not document framework internals.

## Core concepts

- Prefer high-level permission API from app:
  - app.defineGuestPermissions
  - app.defineGlobalPermissions
  - app.definePermissionsForRole
- Register each role in a single `app.definePermissionsForRole(...)` call. Repeating the call for the same role replaces the previous definer; it does not merge rules automatically.
- Keep permissions in a dedicated file under `src/infra/auth/` (for example, `admin.perm.ts`) — the framework auto-discovers all `*.perm.ts` files matching `src/<module>/auth/**/*.perm.ts` at startup. Files must end in `.perm.ts` to be discovered.
- Model users by extending AppUser with your role enum/union and app-specific fields.
- Use conditional rules when needed (for example execute action only if current user is assignee).
- In addition to model permissions, include param/result classes in permissions when your app exposes them.

## Rule precedence

The framework applies permissions in this order:

1. Role permissions (`definePermissionsForRole`) — applied first
2. Global permissions (`defineGlobalPermissions`) — applied last

**Last rule wins** (CASL semantics). Because global permissions are applied after role permissions, a `cannot()` defined in `defineGlobalPermissions` **always overrides** any role grant, including `can('manage', 'all')`.

Use this guarantee to enforce universal restrictions that no role should bypass:

```typescript
app.defineGlobalPermissions((user, { cannot }) => {
  // Applies to every user regardless of role — even System/admin roles with manage('all')
  cannot('write', User, ['createdAt', 'updatedAt']);
});

app.definePermissionsForRole(Role.System, (user, { can }) => {
  can('manage', 'all'); // broad grant, but the global cannot above still wins for createdAt/updatedAt
});
```

> **Note:** Within a single callback (e.g. inside one `definePermissionsForRole`), the same CASL last-rule-wins rule applies. Add `cannot` after `can('manage', 'all')` to restrict specific fields within that same role block.

## Practical examples

### Define permissions with the app API

```typescript
import { app } from '@drumr/framework-backend';
import { Role, User } from '@/users/data-models/user.data-model';
import { Project } from '@/projects/data-models/project.data-model';
import { Task } from '@/tasks/data-models/task.data-model';
import { CompleteTask, CompleteTaskParams } from '@/tasks/actions/complete-task.action';

/**
 * Keep permission registration centralized and imported once from App.ts.
 */
app.defineGuestPermissions(({ can }) => {
  // Guests can read only public projects.
  can('read', Project, { isPublic: true });
});

app.defineGlobalPermissions((user, { can, cannot }) => {
  // Every authenticated user can read/update their own profile.
  can('read', User, { id: { eq: user.id } });
  can('update', User, { id: { eq: user.id } });
  cannot('update', User, ['roles']);
});

app.definePermissionsForRole(Role.Manager, (user, { can }) => {
  // Managers can manage their own projects and execute task actions there.
  can('create', Project);
  can('update', Project, { manager: { id: { eq: user.id } } });
  can('read', Task, { project: { manager: { id: { eq: user.id } } } });
  can('execute', CompleteTask);

  // Param classes can require explicit permissions in app-level rules.
  can('access', CompleteTaskParams);
  can('read', CompleteTaskParams);
  can('write', CompleteTaskParams);
});

app.definePermissionsForRole(Role.Developer, (user, { can, cannot }) => {
  // Conditional execute rule based on target object.
  can('execute', CompleteTask, (task: Task) => task.assignee?.id === user.id);

  // Example explicit deny.
  cannot('delete', Task);
});
```

### Extend `AppUser` for your app

```typescript
import { AppUser, DataModel, TextField, ChoiceField, UuidField } from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';

export enum Role {
  System = 'system',
  Admin = 'admin',
  Manager = 'manager',
  Developer = 'developer',
}

@DataModel({ dataSource: MainDs })
export abstract class User extends AppUser<Role> {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

  @TextField({ required: true, maxLength: 120 })
  fullName!: string;
}
```

### Secure user password encryption (at rest)

By default, the framework's abstract `AppUser` model implements dual-layer password protection:
1. **Hashing:** The password is secure-hashed with Bcrypt before persistence (`hashUserPassword()`).
2. **Encryption At-Rest:** The `password` field is decorated as a `sensitive` field. The framework automatically encrypts the Bcrypt hash using AES-256-GCM.

Every framework-based application must define a 64-character hexadecimal `DRUMR_ENCRYPTION_KEY` environment variable.

#### Backward compatibility & lazy migration
If physical databases already contain users with legacy unencrypted Bcrypt hashes, the framework guarantees complete zero-downtime, continuous availability:
- **Authentication:** `verifyUserPassword` automatically detects non-encrypted Bcrypt hashes (e.g., starting with `$2a$`, `$2b$`) and validates them using standard unciphered Bcrypt comparison.
- **Silent In-Place Upgrade:** Upon successful login of a legacy user, the authentication routing layer automatically re-encrypts their plain Bcrypt hash to GCM ciphertext, saving the resulting ciphertext back to the database. This updates the password security level dynamically without requiring offline migrations.

## Usage notes & copilot guidelines

- Use imports from @drumr/framework-backend in app code.
- Prefer app.defineGuestPermissions, app.defineGlobalPermissions, and app.definePermissionsForRole over low-level setter APIs.
- Keep permission rules close to business language (roles, ownership, tenant, project membership).
- Keep examples short and explicit; avoid giant permission files in docs.
- Do not split one role across multiple `app.definePermissionsForRole` calls unless you are intentionally replacing the previous rules for that role.
- **Always register permissions for action params AND returns classes** — not just the action itself. Missing these causes the UI to silently fail to load the param form or display the result.

```typescript
// Complete permissions for an action with params and a returns class:
app.definePermissionsForRole(Role.Manager, (user, { can }) => {
  can('execute', CompleteTask);          // allows triggering the action

  // Params class — all three permissions required for the form to load and submit:
  can('access', CompleteTaskParams);     // retrieve the param model
  can('read',   CompleteTaskParams);     // read its fields
  can('write',  CompleteTaskParams);     // submit values

  // Returns class — if a specific returns @DataModel is used:
  can('access', TaskCompletionResult);   // retrieve the result
  can('read',   TaskCompletionResult);   // read result fields
});
```

- Use callback-based execute rules for object-specific constraints (for example assignee-only actions).
- **`access` and `read` are DIFFERENT permissions — always grant both.** `access` controls whether the user can see and retrieve an object at all (list/find/detail). `read` controls which individual _fields_ the user is allowed to read. Granting only `read` without `access` will silently prevent the object from being returned, and granting only `access` without `read` returns the object with no readable fields.

```typescript
// ❌ WRONG — missing 'access'; the object will never be returned even though fields are readable
can('read', Pet, { status: { eq: PetStatus.Available } });

// ✅ CORRECT — always pair 'access' with 'read'
can('access', Pet, { status: { eq: PetStatus.Available } });
can('read', Pet, { status: { eq: PetStatus.Available } });
```

- **Always add permissions for the `File` model when any data model has a file field.** Without explicit `create`/`read` permissions on `File`, users will not be able to upload or download attachments even when they have access to the parent record. When you see any `@ReferenceField({ type: () => File })` field, include at minimum:

```typescript
import { File } from '@/shared/data-models/file.data-model';

// Minimum for upload+download to work
can('access', File);
can('create', File);
can('read', File);
```

- **Do not use string literals as the subject of model/action permission rules.** Always pass the imported class reference. The one supported exception is the view-level render permission API: `can('render', 'DashboardView')` uses the registered view name string by design.

```typescript
// ❌ WRONG — string literals are NOT valid model/action permission subjects
can('read', 'User', { id: { eq: user.id } });
can('execute', 'CompleteTask');

// ✅ CORRECT — import and use the class itself for models/actions
import { User } from '@/users/data-models/user.data-model';
import { CompleteTask } from '@/tasks/actions/complete-task.action';

can('read', User, { id: { eq: user.id } });
can('execute', CompleteTask);

// ✅ CORRECT — view render permissions use the registered view name string
can('render', 'DashboardView');
can('render', 'SummaryView');
```

- **Always use the condition operator syntax** (`{ field: { eq: value } }`, `{ field: { in: [...] } }`, etc.) when comparing values in permission conditions. Do **not** use plain equality shorthand like `{ id: user.id }` — that is not supported and will silently allow or deny all records.

```typescript
// ❌ WRONG — plain shorthand is not a valid condition
can('read', Task, { assigneeId: user.id });

// ✅ CORRECT — always use operator wrappers
can('read', Task, { assigneeId: { eq: user.id } });
```

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | If you need to extend `AppUser` with additional user fields and validation metadata. | This skill shows permission outcomes but not comprehensive field modeling details. |
| [backend-actions](../backend-actions/SKILL.md) | If you need to build the action classes that authorization policies target. | This skill defines who can execute, not how the action implementation is built. |
| [backend-datasources](../backend-datasources/SKILL.md) | If user/auth entities require datasource-level configuration or migration alignment. | This skill references model linkage but not datasource setup and persistence operations. |

## Scoping direct datasource queries by permission

Permissions are applied **automatically only for the auto-generated CRUD / GraphQL API**. When you query the datasource directly from an action, service, or workflow (`find`, `findBy`, `findAndPaginate`, ...), the framework does **NOT** inject any permission filter — it runs exactly the `where` you pass. So a direct query is unscoped unless you scope it yourself.

Do **not** hand-write a role `if`-ladder for this. Define each role's data scope once with `app.definePermissionsForRole(...)`, then derive the `where` from those same rules using the request-scoped permission service:

- `ctx.permissions.getQueryFor(Model, 'access')` — build the current user's cached ability and turn static permission rules into a `where` clause.
- `mergeWhereConditions(businessWhere, permissionWhere)` — combine it with your own filter using AND.

```typescript
import { mergeWhereConditions } from '@drumr/framework-backend';
import { Location } from '../dataModels/Location';

// e.g. EndUser scoped to assigned locations — defined ONCE in permissions.ts:
// app.definePermissionsForRole(Role.EndUser, (user, { can }) =>
//   can('access', Location, { id: { in: user.locationIds ?? [] } }),
// );

const permissionWhere = await this.ctx.permissions.getQueryFor(Location, 'access');

// merge with any business filter you actually want
const where = mergeWhereConditions({ active: { eq: true } }, permissionWhere);

const locations: Location[] = [];
await this.mainDs.findAndPaginate(
  Location,
  { where: where ?? {}, references: { state: true, city: true } },
  (location) => locations.push(location),
);
```

This gives the correct behavior for free: a `manage` rule (admins) → `null`, i.e. no restriction; a scoped user with no matching grant → a `where` that matches nothing (not "everything"); multiple roles → combined with OR (union of what any role allows).

- **Caveat — callback rules are NOT captured.** Permission query translation only translates **static condition objects**. If a role's scope is expressed as a callback (`can('access', Model, obj => ...)`), it is silently ignored and the resulting query is **over-permissive**. For direct datasource scoping, express the scope as static condition objects referencing user fields (`{ id: { in: user.locationIds } }`), not callbacks. Keep callback rules for `execute` / instance checks only.

## Immutable audit fields authorization policy

When a model includes immutable audit fields (createdBy and createdAt), authorization must enforce immutability at backend level.

### 1) Principle

- UI read-only is not enough.
- Backend must deny writes to immutable audit fields after creation.

### 2) Permission pattern

**Option A — global restriction (recommended for fields that should be immutable for everyone):**

Use `defineGlobalPermissions` so the restriction applies to all users regardless of role, including System/admin users with `can('manage', 'all')`.

```ts
app.defineGlobalPermissions((user, { cannot }) => {
  // Applies universally — no role can override this
  cannot('write', Note, ['createdBy', 'createdAt']);
});

app.definePermissionsForRole(Role.Manager, (user, { can }) => {
  can('access', Note);
  can('read', Note);
  can('create', Note);
  can('update', Note);
  can('write', Note);
  // No need to repeat the cannot here — the global rule already covers it
});
```

**Option B — per-role restriction (when only certain roles should be restricted):**

```ts
app.definePermissionsForRole(Role.Manager, (user, { can, cannot }) => {
  can('access', Note);
  can('read', Note);
  can('create', Note);
  can('update', Note);

  // Grant write for regular fields, then deny immutable audit fields
  can('write', Note);
  cannot('write', Note, ['createdBy', 'createdAt']); // must come after can('write', ...) in the same block
});
```

If write access is conditional, keep the same condition in both `can('write', ...)` and `cannot('write', ...)` rules.

### 3) Cross-skill alignment

When backend-datamodels recommends audit fields, always pair it with immutable write restrictions in auth rules.

## Relation selectors in write context

When a form uses a relation (reference) selector in a **write context** (create or edit flow), the selected value can be silently submitted as `null` or an empty ID even though the selector displays records correctly in the UI.

### Why this happens

`access` + `read` on the referenced model give the selector enough permission to fetch and display options. However, when the form submits, the framework must **write** the selected record's `id` into the parent record. Without `write` permission on the referenced model's `id` field, the value is dropped from the payload before persistence.

- `access` + `read` → the selector can _show_ options.
- `write` on `id` → the selected value can _persist_ on save.

### Least-privilege permission pattern

Grant only `id`-field write on the referenced model. Do **not** grant broad write access unless the flow truly requires editing fields of the referenced model.

```typescript
// Minimum permissions for a relation selector in a create/edit form
can('access', ReferencedModel);          // selector fetches options
can('read',   ReferencedModel);          // selector displays record fields
can('write',  ReferencedModel, ['id']); // selected ID persists on save
```

### Example — Task form with an assignee selector

```typescript
app.definePermissionsForRole(Role.Manager, (user, { can }) => {
  can('access', Task);
  can('read',   Task);
  can('create', Task);
  can('write',  Task);

  // Assignee selector — access+read show options; id-only write lets the value persist
  can('access', User);
  can('read',   User);
  can('write',  User, ['id']); // required: without this the selector value is dropped on save
});
```

### Symptom checklist

If all of the following are true, a missing `write` on `id` is the likely cause:

- The selector shows the list of records correctly.
- The selected value appears chosen in the UI.
- The submitted payload contains `null` or an empty ID for the relation field.
- The create or update call fails validation (required relation) or silently saves without the relation.
- Permissions appear correct because `access` and `read` are both present.

### Troubleshooting steps

1. Confirm the selector is inside a **write context** (create form, edit form, or action param form).
2. Confirm the role has both `access` and `read` on the referenced model (required for the selector to load options).
3. Add `can('write', ReferencedModel, ['id'])` for the role and retest.
4. Do **not** grant `can('write', ReferencedModel)` broadly unless the flow requires editing fields of the referenced model directly.

# GitHub Copilot Instructions for {{APP_NAME}}

This is a {{APP_TYPE}} application built with Drumr.

## Project Description

{{DESCRIPTION}}

## Architecture

- Backend: {{HAS_BACKEND}}
- Frontend: {{HAS_FRONTEND}}
- Database: {{DB_TYPE}}

## Development Guidelines

- Use TypeScript for all code
- Always use ``.agents/skills``
- Follow Drumr conventions and patterns
- Maintain clean, readable code with proper documentation
- Use the provided data models as starting points

## Drumr Framework

To develop effectively with Drumr, use `.agents/skills` as your primary reference for implementation guidance.

Skills are the primary source of implementation guidance and replace static documentation workflows.

Mandatory skills process:
1. Always start by reading `/.agents/skills/README.md`.
2. Use it as the canonical index to find the exact skill file(s) for the user request.
3. Read the target skill file(s) in full before producing code or architecture guidance.
4. **Multi-Skill Resolution (CRITICAL):** If a prompt spans multiple domains/components, read all relevant skill files in full before generating code. Never stop at the first matched skill.
5. Reconcile constraints from all selected skills and apply the strictest applicable guidance.
6. If no matching skill exists, explicitly state the gap and proceed conservatively using nearby repo patterns without inventing new architecture.

Skills usage expectations:
- Treat skill files as authoritative for patterns, APIs, conventions, and examples.
- Reuse existing helpers and established patterns referenced by skills.
- Do not bypass the skills index by guessing file paths or relying on memory only.
- When proposing new patterns, ensure they do not conflict with skill guidance.

If you can't find skills, then use the documentation below as a fallback reference, but always check for relevant skills first.

### Model Definition

Always use shortcut decorators that combine @Field and type-specific decorators:

```typescript
import { BaseDataModel, DataModel, TextField, EmailField, IntegerField } from '@drumr/framework-backend';

@DataModel()
export class User extends BaseDataModel {
  @TextField({ required: true, maxLength: 100 })
  name: string;

  @EmailField({ required: true })
  email: string;

  @IntegerField({ min: 0, max: 120 })
  age?: number;
}
```

### Relationship Fields

**CRITICAL**: Relationship decorators ALWAYS require the `type` parameter.

#### Single Reference

```typescript
import { ReferenceField } from '@drumr/framework-backend';

@DataModel()
export class Task extends BaseDataModel {
  @TextField({ required: true })
  title: string;

  // ALWAYS include type for references
  @ReferenceField({ required: true, type: () => Project })
  project: Project;
}
```

#### Reference Arrays

```typescript
@ReferenceField({ type: () => User })
assignees: User[];
```

#### Composition (Parent-Child)

```typescript
import { CompositionField, OwnerReferenceField } from '@drumr/framework-backend';

@DataModel()
export class Order extends BaseDataModel {
  // Composition ALWAYS requires type
  @CompositionField({ type: () => LineItem })
  items: LineItem[];
}

@DataModel()
export class LineItem extends BaseDataModel {
  @TextField({ required: true })
  productName: string;

  // Owner reference ALWAYS requires type
  @OwnerReferenceField({ type: () => Order })
  owner: Order;
}
```

#### Shared Composition

```typescript
import { SharedCompositionField } from '@drumr/framework-backend';

@DataModel()
export class Story extends BaseDataModel {
  // Shared composition ALWAYS requires type
  @SharedCompositionField({ type: () => Note })
  notes: Note[];
}
```

### All Field Types

#### String Fields

```typescript
import { TextField, EmailField, HtmlField, UuidField } from '@drumr/framework-backend';

@DataModel()
export class Document extends BaseDataModel {
  // Primary key - ALWAYS use UuidField
  @UuidField({ primaryKey: true, generated: true })
  id!: string;

  // Text with validation
  @TextField({ required: true, minLength: 3, maxLength: 100 })
  title!: string;

  // Email validation
  @EmailField({ required: true })
  email!: string;

  // HTML content
  @HtmlField({ maxLength: 5000 })
  content?: string;

  // Array of strings
  @TextField()
  tags!: string[];
}
```

#### Numeric Fields

```typescript
import { IntegerField, DecimalField, MoneyField, NumberField } from '@drumr/framework-backend';

@DataModel()
export class Product extends BaseDataModel {
  // Integer with constraints
  @IntegerField({ required: true, min: 0, max: 999999 })
  quantity!: number;

  // Decimal - requires decimals and roundingType
  @DecimalField({
    decimals: 4,
    roundingType: 'roundHalfToEven',
    positive: true,
  })
  weight!: string;

  // Money - requires decimals and roundingType
  @MoneyField({
    decimals: 2,
    roundingType: 'roundHalfToEven',
    min: '0',
  })
  price!: string;

  // Floating point number
  @NumberField({ min: 0, max: 1 })
  discount?: number;
}
```

#### Boolean and DateTime

```typescript
import { BooleanField, DateTimeField } from '@drumr/framework-backend';

@DataModel()
export class Article extends BaseDataModel {
  @BooleanField({ required: true })
  published: boolean = false;

  @DateTimeField({ required: true })
  publishedAt!: Date;

  @DateTimeField()
  lastModified?: Date;
}
```

#### Choice/Enum Fields

```typescript
import { ChoiceField } from '@drumr/framework-backend';

enum Status {
  Draft = 'draft',
  Published = 'published',
}

@DataModel()
export class Post extends BaseDataModel {
  // ALWAYS include type for enums
  @ChoiceField({ required: true, type: () => Status })
  status: Status = Status.Draft;

  // Array of enum values
  @ChoiceField({ type: () => Status })
  history!: Status[];
}
```

### Model Options

```typescript
import { DataModel } from '@drumr/framework-backend';

// Simple model
@DataModel({
  docs: 'User model',
})
export class User extends BaseDataModel {
  // fields...
}

// Model with CRUD actions
@DataModel({
  docs: 'Task with auto-generated CRUD',
  crud: {
    generate: true,
    api: 'gql', // Expose via GraphQL
    actions: ['create', 'findById', 'findBy', 'update', 'deleteById'],
  },
})
export class Task extends BaseDataModel {
  // fields...
}

// Model with global validation
@DataModel({
  validation: (model: PasswordChange) => {
    const errors = [];
    if (model.newPassword !== model.confirmPassword) {
      errors.push({
        constraint: 'passwordMismatch',
        message: 'Passwords do not match',
      });
    }
    return errors;
  },
})
export class PasswordChange extends BaseDataModel {
  @TextField({ required: true })
  newPassword!: string;

  @TextField({ required: true })
  confirmPassword!: string;
}
```

### Actions Framework

#### ModelAction (Class-level actions)

```typescript
import { Action, ModelAction } from '@drumr/framework-backend';

@DataModel()
class CreateTaskParams extends BaseDataModel {
  @TextField({ required: true })
  title!: string;

  @ReferenceField({ required: true, type: () => Project })
  project!: Project;
}

@Action({
  type: 'write',
  api: 'gql',
  model: Task,
  params: CreateTaskParams,
  returns: Task,
})
export class CreateTask extends ModelAction<Task, CreateTaskParams, Task> {
  async execute(params: CreateTaskParams): Promise<Task> {
    const task = new Task();
    task.title = params.title;
    task.project = params.project;
    return task;
  }
}
```

#### ObjectAction (Instance-level actions)

```typescript
import { ObjectAction } from '@drumr/framework-backend';

@Action({
  type: 'write',
  api: 'gql',
  model: Task,
  returns: Task,
})
export class StartTask extends ObjectAction<Task, void, Task> {
  async execute(task: Task): Promise<Task> {
    task.status = 'inProgress';
    task.startedAt = new Date();
    return task;
  }

  async canExecute(task: Task): Promise<boolean | string> {
    if (task.status !== 'todo') {
      return 'Task must be in todo status';
    }
    return true;
  }
}
```

#### GlobalAction (Application-level actions)

```typescript
import { GlobalAction } from '@drumr/framework-backend';

@DataModel()
class StatsResult extends BaseDataModel {
  @IntegerField()
  totalTasks!: number;
}

@Action({
  type: 'read',
  api: 'gql',
  returns: StatsResult,
})
export class GetStats extends GlobalAction<void, StatsResult> {
  async execute(): Promise<StatsResult> {
    const stats = new StatsResult();
    stats.totalTasks = 100;
    return stats;
  }
}
```

### Permissions Management

Drumr uses CASL for fine-grained access control. Define permissions in your application:

```typescript
import { app } from '@drumr/framework-backend';

// Guest permissions (non-authenticated)
app.defineGuestPermissions(({ can, cannot }) => {
  can('access', Article, { isPublic: true });
  can('read', Article, ['id', 'title', 'body']);
});

// Global permissions (all authenticated users)
app.defineGlobalPermissions((user, { can, cannot }) => {
  // Users can manage their own profile
  can('read', User, { id: user.id });
  can('update', User, { id: user.id });
  cannot('update', User, ['role', 'status']);
});

// Role-based permissions
enum UserRole {
  Admin = 'admin',
  Editor = 'editor',
}

app.definePermissionsForRole(UserRole.Admin, (user, { can }) => {
  can('manage', 'all'); // Full access
});

app.definePermissionsForRole(UserRole.Editor, (user, { can, cannot }) => {
  // Conditional access to tasks
  can('access', Task, {
    project: {
      members: { elemMatch: { id: { eq: user.id } } },
    },
  });

  can('create', Task);
  can('update', Task);
  can('read', Task);
  can('write', Task);

  // Field-level restrictions
  cannot('write', Task, ['status', 'priority']);
  cannot('read', Task, ['internalNotes']);

  // Action permissions
  can('execute', CreateTask);
});

// Callback-based permissions
app.definePermissionsForRole(UserRole.Editor, (user, { can }) => {
  can('update', Task, task => {
    return task.assignee?.id === user.id;
  });
});
```

### Permission Actions

- `manage` - Matches any action (admin)
- `access` - Access to objects (CRUD)
- `create` - Create new objects
- `update` - Update existing objects
- `delete` - Delete objects
- `read` - Read specific fields
- `write` - Write specific fields
- `execute` - Execute actions

### Permission Conditions

```typescript
// Field conditions
{ eq: value }          // Equal
{ ne: value }          // Not equal
{ gt: value }          // Greater than
{ gte: value }         // Greater than or equal
{ lt: value }          // Less than
{ lte: value }         // Less than or equal
{ in: [values] }       // In array
{ nin: [values] }      // Not in array

// Array conditions
{ elemMatch: query }   // Element matches
{ all: [values] }      // Has all values
{ size: number }       // Array length

// Example
can('read', Article, {
  status: { in: ['published', 'featured'] },
  views: { gte: 1000 }
});
```

### Common Mistakes to Avoid

❌ **Missing type**:

```typescript
@ReferenceField({ required: true })
project: Project; // ERROR: type is required!
```

✅ **Correct**:

```typescript
@ReferenceField({ required: true, type: () => Project })
project: Project;
```

❌ **Using generic @RelationshipField**:

```typescript
@RelationshipField({ type: 'reference', type: () => Project })
project: Project;
```

✅ **Use specific shortcuts**:

```typescript
@ReferenceField({ type: () => Project })
project: Project;
```

### Reference Field Options

```typescript
// With onDelete behavior
@ReferenceField({
  type: () => Project,
  onDelete: 'removeReference' // or 'delete' or 'nothing'
})
project: Project;

// With filter for available records
@ReferenceField({
  type: () => Project,
  filter: (task) => ({ status: 'active' })
})
activeProjects: Project[];

// Lazy vs eager loading
@ReferenceField({
  type: () => Project,
  load: false // default for references (lazy)
})
project: Project;
```

### Field Decorators Reference

- **@TextField** - String fields with validation (maxLength, minLength, regex)
- **@EmailField** - Email validation
- **@HtmlField** - HTML content
- **@UuidField** - UUID fields (use for primary keys with generated: true)
- **@IntegerField** - Integer numbers
- **@DecimalField** - Precise decimals (requires decimals and roundingType)
- **@MoneyField** - Money amounts (requires decimals and roundingType)
- **@NumberField** - Floating point numbers
- **@BooleanField** - Boolean values
- **@DateTimeField** - Date and time
- **@ChoiceField** - Enum selections (requires type for enums)
- **@ReferenceField** - Model references (requires type)
- **@CompositionField** - Parent-child relationships (requires type)
- **@SharedCompositionField** - Shared compositions (requires type)
- **@OwnerReferenceField** - Child to parent reference (requires type)

## Build & Compilation

### ALWAYS use `drumr build` — never `npm run build` directly

Drumr apps have **auto-generated files** in `backend/generated/` and `frontend/generated/` (view registries, GraphQL schema, SDK). These files are produced by `drumr sync-metadata` and must exist before TypeScript can compile. Running `npm run build` directly will fail with errors like:

```
generated/viewsRegistry.ts:25:19 - error TS2307: Cannot find module '../src/views/...'
```

**Always use:**

```bash
drumr build           # sync metadata + compile backend + build frontend
drumr build --skip-frontend   # sync metadata + compile backend only
drumr build --skip-metadata   # skip metadata (if already up-to-date)
drumr build --verbose         # show detailed output
```

### Never edit files in `generated/`

Files in `backend/generated/` and `frontend/generated/` are **auto-generated**. Never edit them manually — changes will be overwritten on the next `drumr sync-metadata` or `drumr build`.

If you see TypeScript errors in `generated/` files:
1. Run `drumr build` to regenerate them
2. Do **not** try to fix the errors by editing `generated/` files

### `drumr sync-metadata` (metadata only)

If you only need to regenerate the metadata without recompiling:

```bash
drumr sync-metadata           # regenerate all generated files
drumr sync-metadata --skip-views   # skip view registries
drumr sync-metadata --skip-schema  # skip GraphQL schema
drumr sync-metadata --skip-sdk     # skip GraphQL SDK
```

---

## Class API Reference — Overridable Methods and Fields

When generating code that extends framework base classes, only use the methods and fields listed below. Do NOT suggest private or internal members.

### BaseDataModel (backend)

Overridable public methods:

- `onRefresh?(changedFields: string[]): void | Promise<void>` — React to field changes server-side.
- `validate(): Promise<ValidationError[]>` — Run validation rules.
- `toJSON(): Record<string, any>` — Serialize to plain object.
- `calculate(maxIterations?: number): Promise<void>` — Recalculate manual calculated fields.
- `filter(): void` — Clear unavailable field values.

Static methods:

- `fromJSON(json): T` — Deserialize a plain object into a typed model instance.

### Actions (backend)

#### GlobalAction\<P, R\>

- `async execute(params: P): Promise<R>` — (required) Implement the action logic.
- `async canExecute(): Promise<boolean | string>` — Return `false` or error string to prevent execution.

#### ModelAction\<M, P, R\>

- `async execute(params: P): Promise<R>` — (required) Implement the action logic.
- `async canExecute(): Promise<boolean | string>` — Return `false` or error string to prevent execution.

#### ObjectAction\<M, P, R\>

- `async execute(target: M, params: P): Promise<R>` — (required) Implement the action logic.
- `async canExecute(target: M): Promise<boolean | string>` — Return `false` or error string to prevent execution.

### Workflow Actions (backend)

All workflow actions share the action pattern plus:

- `callStep(stepName: string, ...args): Promise<any>` — Invoke a `@Step()` method.
- `reportProgress(progress: number): void` — Report execution progress (0–100).

### BaseQueue (backend)

Overridable lifecycle hooks:

- `onWorkflowActive(workflow: Workflow): void | Promise<void>`
- `onWorkflowCompleted(workflow: Workflow, result: any): void | Promise<void>`
- `onWorkflowFailed(workflow: Workflow, error: Error): void | Promise<void>`
- `onWorkflowProgress(workflow: Workflow, progress: number): void | Promise<void>`

Public API:

- `getActiveCount()`, `getCompletedCount()`, `getFailedCount()`, `getName()`, `getConfig()`

### BaseLayout (frontend)

Overridable configuration:

- `navigation` — `'mix'` | `'left'` | `'top'`
- `contentWidth` — `'fluid'` | `'fixed'`
- `features` — Controls header, footer, leftMenu, topMenu, userMenu visibility.
- `header?`, `footer?`, `leftMenu?`, `topMenu?`, `userMenu?`

Lifecycle hooks: `onMenuClick?()`, `onMenuCollapse?(collapsed: boolean)`, `onPageSwitch?()`

### CustomViewComponent (frontend)

Configuration: `header?`, `footer?`, `modal?`, `menu?`, `layout?`, `modalSize?`, `modalPosition?`

Lifecycle hooks:

- `onLoad()` — Initialize data after mount.
- `onLeave()` — Clean up before unmount.
- `onRender(): React.ReactNode` — (required) Render the view content.
- `onParamsChange?(prevParams, newParams)` — Handle route param changes.

Methods: `getParams()`, `getQuery()`, `openView()`, `closeView()`, `getContext()`, `isInModal()`, `setState()`, `forceUpdate()`, `app` (antd message/modal/notification)

### TableViewComponent (frontend)

Required: `tableOptions: TableViewTableOptions<T>` — (required) columns, pagination, selection. Optional: `header?`, `menu?`, `layout?`, `hideHeader?`, `persistence?`, `modalSize?`, `modalPosition?` Hook: `afterActionExecution?(response)` — Post-action hook. Static toolbar: `toolbar.modelActionButton(name)`, `toolbar.globalActionButton(name)`, etc.

### Form Views (frontend)

#### CreateViewComponent\<T\>

Config: `fields?`, `formLayout?`, `layout?`, `refreshMode?` (default `'auto'`, omit unless using `'custom'`/`'none'`), `refreshTriggers?`, `formProps?` Hooks: `beforeCreate()`, `afterCreated(response)`, `onRefresh(changedFields, data, prevData)` (only called when `refreshMode='custom'`), `onRenderForm(context)`

#### EditViewComponent\<T\>

Same as Create plus: `modalSize?`, `modalPosition?` Hooks: `beforeSave()`, `afterSaved(response)`, `onSave()`, `onRefresh()`, `onRender()`, `onRenderForm()` Methods: `getFormValue(field)`, `getFormValues()`, `setFormValue(field, value)`, `setFormValues(values)`

#### ReadViewComponent\<T\>

Config: `fields?`, `formLayout?`, `layout?`, `formProps?`, `deleteFallbackPath?` Hooks: `afterActionExecution(response)`, `onRenderForm(context)` Fields: `id`, `object`, `objectActions`, `modelActions`, `globalActions` Static toolbar: `toolbar.refreshButton()`, `toolbar.editButton()`, `toolbar.deleteButton()`, `toolbar.closeButton()`, `toolbar.actionsDropdown()`

#### ActionViewComponent\<T\>

Config: `fields?`, `formLayout?`, `layout?`, `refreshMode?` (default `'auto'`, omit unless using `'custom'`/`'none'`), `refreshTriggers?`, `modalSize?`, `modalPosition?` Hooks: `onLoad()`, `beforeExecute()`, `onExecute()`, `afterExecuted(response)`, `onCancel()`, `onRefresh()` (only called when `refreshMode='custom'`), `onRender()`, `onRenderForm()` Fields: `actionInfo`, `initialData`, `targetObject`, `idForRefresh`

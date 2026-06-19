---
name: frontend-api
description: Guides the generation of frontend API consumption code in apps. Use this skill when a user asks to fetch data, call custom backend actions, execute CRUD operations, build GraphQL queries/mutations using the Operation Builder, enforce type-safety with generated @gql imports, or handle UI validation and error unions from the frontend.
metadata:
  applies-to:
    - core/frontend/src/hooks/api/
    - core/shared/queryBuilder/
---

# Frontend API consumption

## Purpose

Use this skill when implementing API calls in app code (views, hooks, and services inside app frontends).

The frontend query builder uses metadata generated from backend DataModels and actions, so app developers can compose operations without writing raw GraphQL strings, while still getting auto-expansion for references/compositions and type-safe field selection.

This skill is app-consumption only. Do not explain framework internals.

## When to use builders vs. hooks

The framework exposes two API tiers. Choose based on context:

| Context | Recommended API | Why |
| --- | --- | --- |
| Functional React components (views, widgets, dashboards) | `useApiFindBy`, `useApiFindById`, `useApiCreate`, `useApiUpdate`, `useApiDelete`, `useApiAction`, `useApiRefresh` from `frontend-data-api-hooks` | Declarative, co-located with component lifecycle, handles loading/error state automatically |
| Service-layer / imperative code (outside React render) | `dataCreate`, `uiFindBy`, `gql.execute(op, vars)` — the Operation Builder pattern | No hook rules, full control over when and how operations fire |
| Complex queries needing fine-grained field control, pagination cursors, or custom union handling | Operation Builder (`dataFindBy`, `uiFindBy`, etc.) with Apollo client | Maximum flexibility when hook defaults are insufficient |

> **Default to `useApi*` hooks in functional components.** Use the Operation Builder only for service-layer code or when you need control that the hooks do not expose.

## Core concepts

### UI vs data operations: naming convention

The backend exposes two operation families for every model. They have different field shapes and different purposes.

| Operation family | Name pattern | Field shape | When to use |
| --- | --- | --- | --- |
| **Data** (plain CRUD) | `{Model}Create`, `{Model}FindBy`, `{Model}FindById`, `{Model}Update`, `{Model}DeleteById` | Raw values: `id`, `title`, `status` | Services, dashboards, aggregates, server-to-server logic, non-UI data pipelines |
| **UI-aware** (metadata-enriched) | `{Model}UiCreate`, `{Model}UiFindBy`, `{Model}UiFindById`, `{Model}UiUpdate`, `{Model}UiDeleteById` | Field wrappers: `{ value, options, errors }` where `options` carries field metadata for rendering | Forms, tables, views, any UI component that needs field metadata or validation errors |

Key distinctions:

- `TaskCreate` creates a task and returns plain `Task` fields. No field metadata. No per-field validation error structure.
- `TaskUiCreate` creates a task and returns each field wrapped in `{ value, options, errors }`. The `options` object contains field metadata (label, type, choice values, etc.) that drives form rendering.
- Validation errors from `TaskUiCreate` can be mapped directly onto form fields because each field's `errors` array is part of the response.
- Use the `ui*` builders (`uiCreate`, `uiFindBy`, etc.) in views and components. Use `data*` builders (`dataCreate`, `dataFindBy`, etc.) in services and headless logic.

```typescript
// Data operation — returns { id, title, status } directly
import { dataCreate } from '@drumr/framework-frontend';
const CREATE_TASK = dataCreate<Task>('Task').build();
// variables shape: { data: TaskCreateInput }
// response field: data.TaskCreate — plain Task object

// UI operation — returns { id: { value, options, errors }, title: { value, options, errors }, ... }
import { uiCreate } from '@drumr/framework-frontend';
const CREATE_TASK_UI = uiCreate<TaskUi>('Task').build();
// variables shape: { data: TaskUiCreateInput, context: { mode: 'read' | 'write' } }
// response field: data.TaskUiCreate — TaskUi with per-field wrappers
```

### UI vs data queries (builder selection)

- Use `ui*` builders when you need UI field wrappers: `{ value, options, errors }`.
- Use `data*` builders when you need raw business values for dashboards, cards, table aggregates, and services.

### Auto-expansion with `.fields()`

- `.fields()` uses registered metadata to expand compositions recursively and keep regular references id-only.
- `reference: true` auto-selects only `id` for regular references. A nested selector on a regular reference expands exactly the requested inner fields.
- For UI queries, scalar fields are resolved with UI shape (`value/options/errors`).
- For rich-format operations, scalar fields auto-expand to `{ value, dataType, displayValue, required, errors, constraints }`.
- For data queries, fields return raw values.

### Type safety with `@gql`

- Import generated types from `@gql` or `@gql/types`.
- Pass those types as generics to builders (for example, `uiFindById<UiUserType>`).
- Keep result handling strict with `__typename` checks for unions.

## App setup requirements

1. Keep generated GraphQL artifacts available in the app.
2. Import generated types from `@gql` or `@gql/types`.
3. Keep a side-effect import of `@gql` in app startup so metadata is registered.

```typescript
// app entry (example)
import '@gql';
```

## Practical example blocks

### Block A: CRUD list and detail (uiFindBy + where + paginate + fields)

> **⚠️ CRITICAL — Always call `.paginate(n)` on list queries.** `uiFindBy` and `dataFindBy` are paginated — they return at most one page of results. Without `.paginate()`, the default page size applies and you will silently get only a subset of records. `.paginate(n)` sets the page size for the current query. It does **not** return all records — it returns one page.

```typescript
import React from 'react';
import { useQuery } from '@apollo/client/react';
import { uiFindBy } from '@drumr/framework-frontend';
import type { TaskQueryResponseUi, TaskWhereInput, TaskOrderByInput } from '@gql/types';

const TASK_LIST_QUERY = uiFindBy<TaskQueryResponseUi, TaskWhereInput, TaskOrderByInput>(
  'Task',
  { mode: 'read' }
)
  .where({ status: { eq: 'in_progress' } }, 'TaskWhereInput')
  .orderBy({ dueDate: 'ASC' }, 'TaskOrderByInput')
  .paginate(20)
  .fields({ id: true, summary: true, status: true, priority: true, assignee: true })
  .build();

export function TaskListPanel() {
  const { data, loading, error } = useQuery(TASK_LIST_QUERY.document, {
    variables: TASK_LIST_QUERY.variables,
  });

  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div>Network error: {error.message}</div>;

  const result = data?.TaskUiFindBy;
  if (!result || result.__typename !== 'TaskQueryResponseUi') {
    const message = (result as { errorMessage?: string; message?: string } | undefined)?.errorMessage
      || (result as { message?: string } | undefined)?.message
      || 'Could not load tasks';
    return <div>{message}</div>;
  }

  const rows = result.objects ?? [];

  return (
    <ul>
      {rows.map(row => (
        <li key={row.id?.value}>{row.summary?.value} - {row.status?.value}</li>
      ))}
    </ul>
  );
}
```

### Block B: object actions with public builders (`dataAction()`)

`dataAction()` and `uiAction()` use registered action metadata from `@gql` to infer the variables contract for object actions. For persistent object actions, the generated variables shape expects `id`. For non-persistent object actions, it expects `object` using the action input metadata. In app code, build the operation with the public builder, spread `...OP.variables`, and provide the matching `id` or `object` value.

```typescript
import { useMutation } from '@apollo/client/react';
import { dataAction } from '@drumr/framework-frontend';
import type { Task, PriceCalculation } from '@gql/types';

// Persistent model action (DB-backed object => uses id)
const APPROVE_TASK_OP = dataAction('TaskApprove').selectInlineFragment<Task>('Task', { id: true, status: true }).build();

// Non-persistent model action (calculator/form => uses object)
const CALCULATE_PRICE_OP = dataAction('PriceCalculationCalculate')
  .selectInlineFragment<PriceCalculation>('PriceCalculation', { basePrice: true, taxAmount: true, totalPrice: true })
  .build();

export function useTaskApproval() {
  const [mutate, state] = useMutation(APPROVE_TASK_OP.document);

  const approve = async (id: string) => {
    const response = await mutate({ variables: { ...APPROVE_TASK_OP.variables, id } });
    return response.data?.TaskApprove;
  };

  return { approve, ...state };
}

export async function calculatePrice(input: { basePrice: string; quantity: number }) {
  const client = getGraphQLClient();
  const response = await client.mutate({
    mutation: CALCULATE_PRICE_OP.document,
    variables: { ...CALCULATE_PRICE_OP.variables, object: input },
  });
  return response.data?.PriceCalculationCalculate;
}
```

### Block C: list available actions (uiListActions)

```typescript
import React from 'react';
import { useQuery } from '@apollo/client/react';
import { uiListActions } from '@drumr/framework-frontend';

const AVAILABLE_TASK_ACTIONS = uiListActions(
  { modelName: 'Task', id: 'task-123' },
  { mode: 'write' }
);

export function TaskActionBar({ onRun }: { onRun: (actionName: string) => void }) {
  const { data, loading } = useQuery(AVAILABLE_TASK_ACTIONS.document, {
    variables: AVAILABLE_TASK_ACTIONS.variables,
  });

  if (loading) return <div>Loading actions...</div>;

  type ActionMeta = {
    name: string;
    label: string;
    visible: boolean;
    canExecute: boolean;
  };

  const actions: ActionMeta[] = data?.uiListActions?.actions || [];

  return (
    <div>
      {actions
        .filter((action) => action.visible)
        .map((action) => (
          <button
            key={action.name}
            disabled={!action.canExecute}
            onClick={() => onRun(action.name)}
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
```

### Block D: error handling and validation (\_\_typename branching)

```typescript
import React from 'react';
import { Form, Input, Button } from 'antd';
import { useMutation } from '@apollo/client/react';
import { uiUpdate } from '@drumr/framework-frontend';
import type { TaskUi, TaskUiUpdateInput } from '@gql/types';

const UPDATE_TASK = uiUpdate<TaskUi, TaskUiUpdateInput>('Task').build();

export function TaskEditForm({ id }: { id: string }) {
  const [form] = Form.useForm();
  const [updateTask, { loading }] = useMutation(UPDATE_TASK.document);

  const onFinish = async (values: TaskUiUpdateInput) => {
    const response = await updateTask({
      variables: {
        ...UPDATE_TASK.variables,
        context: { mode: 'write' },
        id,
        data: values,
      },
    });

    const result = response.data?.TaskUiUpdate;
    if (!result) {
      form.setFields([{ name: ['_form'], errors: ['Empty response from server'] }]);
      return;
    }

    if (result.__typename === 'TaskUi') {
      // success path
      return;
    }

    if (result.__typename === 'ValidationErrorType') {
      const fieldErrors = (result.errors || []).map((e: NonNullable<typeof result.errors>[number]) => ({
        name: e.field.split('.'),
        errors: [e.message],
      }));
      form.setFields(fieldErrors);
      return;
    }

    if (result.__typename === 'PermissionErrorType') {
      form.setFields([{ name: ['_form'], errors: [result.errorMessage || 'Permission denied'] }]);
      return;
    }

    if (result.__typename === 'NotFoundErrorType') {
      form.setFields([{ name: ['_form'], errors: [result.errorMessage || 'Task not found'] }]);
      return;
    }

    form.setFields([{ name: ['_form'], errors: ['Could not save changes'] }]);
  };

  return (
    <Form form={form} onFinish={onFinish} layout="vertical">
      <Form.Item name="summary" label="Summary" rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      <Form.Item name="_form">
        <div />
      </Form.Item>

      <Button htmlType="submit" loading={loading}>Save</Button>
    </Form>
  );
}
```

## App error handling rules

Apply both categories:

- Transport/runtime errors: network/Apollo exceptions.
- Business/validation errors: GraphQL union branches.

Recommended order:

1. Check request/runtime error.
2. Read `response.data.<OperationName>`.
3. Branch by `__typename`.
4. Handle success type first.
5. Handle `ValidationErrorType` with field-level mapping.
6. Handle `PermissionErrorType`, `NotFoundErrorType`, `CannotExecuteErrorType` with user-facing messages.

## App type-safety rules

- Import model/input/result types from `@gql` or `@gql/types`.
- Use those types in builder generics.
- Keep mutation/query variable shapes typed.
- Avoid `any` in operation responses and form payloads.

## Copilot usage notes

1. Always prefer builder helpers over raw GraphQL strings.
2. Always import generated types from `@gql` or `@gql/types` and use them in generics.
3. **In React functional components, prefer `useApiFindBy` / `useApiFindById` / `useApiCreate` etc. over raw `useQuery`/`useMutation` + builder.** Use the low-level builder approach only in services, headless logic, or when hooks do not offer the needed control (see `frontend-data-api-hooks` skill). For both tiers: use `ui*`/`format: 'rich'` in view forms; use `data*`/default format in dashboards and services.
4. Use `.fields()` first; rely on metadata auto-expansion for references/compositions. Call `.fields()` with **no arguments** to select every registered field of the model automatically — useful for forms and detail views where all fields are needed.
5. Pass a nested object spec inside `.fields({ ref: { id: true, ... } })` when you need to override the default auto-expansion of a reference or composition.
5a. **Never include system fields (`_displayValue`, `_actions`, `_layout`, `__typename`) in `.fields()` specs.** These are excluded from the TypeScript type (so they do not appear in autocomplete). When a rich query needs object action metadata, call `.actions()` after `.fields()` instead of trying to author `_actions` manually.
6. Always check `__typename` for union responses before reading payload fields.
7. Preserve explicit `context` in UI API calls (`mode: 'read'` / `mode: 'write'`).
8. For object actions, use the supported `dataAction()` / `uiAction()` entry points, and match variables to target persistence: Persistent model => pass `id`. Non-persistent model => pass `object`.
9. Keep examples modular and app-ready: one component/hook per use case, minimal ceremony.
10. **Always call `.paginate(n)` on `uiFindBy` / `dataFindBy` list queries.** Without it, a default page size applies silently. Never assume the result contains all matching records.
11. **Never access `.value` or `.options` on responses from `data*` builders.** Those wrappers only exist in `ui*` responses.
12. **Always provide explicit type generics to every builder call.** Omitting generics causes TypeScript to lose the field metadata needed for `.fields()` autocomplete and type-safe variable shapes. Pass all three generics (`ResponseType`, `WhereInput`, `OrderByInput`) to `dataFindBy` / `uiFindBy`; pass the result type generic to `dataAction` / `uiAction` / `dataCreate` etc.

```typescript
// ❌ WRONG — no generics; metadata unavailable, variables untyped
const query = dataFindBy('Task', { status: { eq: 'active' } })
  .fields({ id: true, title: true })
  .build();
const op = dataAction('GetDashboardSummary').build();

// ✅ CORRECT — explicit generics; full type-safety and metadata
const query = dataFindBy<TaskQueryResponse, TaskWhereInput, TaskOrderByInput>('Task', { status: { eq: 'active' } })
  .fields({ id: true, title: true })
  .build();
const op = dataAction<DashboardSummaryResult>('GetDashboardSummary').build();
```

13. **Prefer `gql.execute(op, variables)` over raw `client.mutate()` / `client.query()` calls.** `GraphQLClient.execute()` is the idiomatic shorthand for imperative (non-hook) action execution in services and lifecycle hooks — it handles the document and default variables in one call.

```typescript
import { getGraphQLClient } from '@drumr/framework-frontend';
import { dataAction } from '@drumr/framework-frontend';
import type { DashboardSummaryResult } from '@gql/types';

const op = dataAction<DashboardSummaryResult>('GetDashboardSummary').build();
const gql = getGraphQLClient();
// Preferred: single call, op.variables are spread automatically
const summary = await gql.execute(op, { params: {} });

// Acceptable but verbose: manual spread
const response = await gql.mutate({
  mutation: op.document,
  variables: { ...op.variables, params: {} },
});
```

14. **Generated types become available only after `drumr sync-metadata` (or `drumr build`) has been run.** When a new `@DataModel` class is added to the backend, its GraphQL types and SDK helpers do NOT exist in the frontend until metadata is regenerated. If TypeScript reports that an imported `@gql/types` type is missing, run `drumr sync-metadata` (or `drumr build`) before writing frontend code that references it.

## Common app-level pitfalls to watch for:

- Calling `uiAction` for bulk/workflow-only paths. Fix: use `dataAction`.
- Assuming success response shape without `__typename` checks. Fix: branch unions first.
- Skipping `@gql` side-effect import. Fix: import it once in app bootstrap.
- Sending wrong variable contract (`id` vs `object` vs `params`). Fix: follow the helper's expected variables and generated input types.
- **Calling `uiFindBy` / `dataFindBy` without `.paginate()` and expecting all records.** Fix: always call `.paginate(n)`. These builders are paginated and return one page. If you need more pages, implement a load-more or infinite scroll pattern using cursor/page info from the response.
- **Confusing `{Model}Create` with `{Model}UiCreate`** (or their builder equivalents `dataCreate` vs `uiCreate`). Fix: use `ui*` operations in views/forms (need field metadata and per-field errors); use `data*` operations in services and headless logic (need plain values only).
- **Including system fields (`_displayValue`, `_actions`, `_layout`) in `.fields()` specs.** Fix: remove them from the spec. If you need object action metadata on a rich query, call `.actions()` after `.fields()`. System fields are excluded from `FieldsSpec<T>` on purpose.
- **Treating `data*` responses as UI-field objects** (accessing `.value` / `.options` on plain data responses). Fix: `data*` operations return plain values (`task.title`, not `task.title.value`). Only `ui*` operations wrap fields.
- **Omitting generics from builder calls.** Fix: always pass explicit type generics so TypeScript can check variable shapes and field names at compile time.
- **Writing frontend code that imports a newly created `@DataModel` type before running metadata sync.** Fix: run `drumr sync-metadata` (or `drumr build`) after adding any new backend model; only then will `@gql/types` contain the new type.

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | If frontend operation fields change because backend models or decorators changed. | This skill covers consumption syntax, not authoritative backend model definitions. |
| [frontend-tech-stack](../frontend-tech-stack/SKILL.md) | If API usage requires stack-level Apollo/React integration troubleshooting. | This skill shows operation builders but not complete frontend stack architecture context. |
| [frontend-views](../frontend-views/SKILL.md) | If API calls must be orchestrated within specific view lifecycle hooks. | This skill defines API patterns but not full view lifecycle composition rules. |
| [backend-error-handling](../backend-error-handling/SKILL.md) | If a prompt involves error taxonomy, deciding whether to throw or return errors, or GraphQL error union serialization. | This skill explains frontend consumption patterns, but backend error semantics and serialization authority live in the backend error handling skill. |
| [backend-api](../backend-api/SKILL.md) | If frontend contract mismatches require backend API exposure adjustments. | This skill assumes existing backend contracts and does not define backend exposure rules. |
| [frontend-notifications](../frontend-notifications/SKILL.md) | If API execution flows need canonical success/error feedback with `getApp()` or `this.app` and notification guardrails. | This skill focuses on operation construction/execution, not dedicated UX feedback conventions and anti-pattern controls. |
| [frontend-data-api-hooks](../frontend-data-api-hooks/SKILL.md) | If the user is writing a functional React component and needs declarative `useApiFindBy`, `useApiFindById`, `useApiCreate`, `useApiUpdate`, `useApiDelete`, `useApiAction`, or `useApiRefresh` patterns. | This skill covers the low-level Operation Builder pattern; the hooks skill covers the higher-level declarative hook API that is preferred in functional component contexts. |

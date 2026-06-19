---
name: frontend-data-api-hooks
description: Guides unified API React hooks (`useApi*`) in functional components. Use this skill when a user wants to fetch, create, update, delete, refresh, or execute actions through hooks instead of raw query builders, choosing `format?: 'data' | 'rich'` per call.
metadata:
  applies-to:
    - core/frontend/src/hooks/api/
---

# Frontend Data API Hooks

## Purpose

Use this skill when implementing declarative API fetching and mutations in functional React components inside Drumr apps. These hooks hide Apollo document and variable wiring and expose a small business-facing contract.

Unified hooks replace split `useDataApi*` and `useMetaApi*` families. Pick response shape per call with `format?: 'data' | 'rich'`.

- `format` omitted or `'data'`: raw values like `title`, `status`, `assigneeId`
- `format: 'rich'`: field wrappers like `{ value, options, errors }`
- `useApiRefresh` is rich-only and always works with `RequestContextInput`

For form and table views that already use framework controllers, keep using `useDataForm` and `useDataTable`.

## When to use (and when not to use)

| Scenario | Use unified API hooks? | Alternative |
|----------|:----------------------:|-------------|
| Custom view with plain data display (dashboards, charts, cards) | ✅ `useApi*` default data format | — |
| Programmatic CRUD in a functional component | ✅ `useApi*` | — |
| Metadata-enriched read/write in custom widgets | ✅ `useApi*` with `format: 'rich'` | — |
| Form view needing controller-managed metadata and refresh pipeline | ❌ | `useDataForm` |
| Table view needing controller-managed columns and row actions | ❌ | `useDataTable` |
| Service-layer code (non-React) | ❌ | Operation builders directly |

Hook-based `labelField` resolvers in declarative frontend config are also valid
consumers of `useApi*` hooks, as long as the resolver itself is authored as a
custom hook named `use...` and returns a synchronous label from hook state.

## Available hooks

| Hook | Import | Purpose |
|------|--------|---------|
| `useApiFindById` | `@drumr/framework-frontend` | Fetch one object by ID |
| `useApiFindBy` | `@drumr/framework-frontend` | Fetch paginated list with where/orderBy |
| `useApiCreate` | `@drumr/framework-frontend` | Lazy create |
| `useApiUpdate` | `@drumr/framework-frontend` | Lazy update |
| `useApiDelete` | `@drumr/framework-frontend` | Lazy delete |
| `useApiRefresh` | `@drumr/framework-frontend` | Lazy rich refresh |
| `useApiAction` | `@drumr/framework-frontend` | Execute any registered action |

## Design rules

1. Query hooks auto-execute. `useApiFindById` and `useApiFindBy` run on mount when params are valid.
2. Mutation hooks are lazy. `useApiCreate`, `useApiUpdate`, `useApiDelete`, `useApiRefresh`, and `useApiAction` only run after `execute()`.
3. `useApiFindById` skips when `id` is `null | undefined`.
4. Failures stay on result state. Hooks surface `error`; `execute()` returns `null` on failure.
5. Query hooks default to `fetchPolicy: 'network-only'`.
6. Pass model generics from `@gql` whenever possible so `fields`, `data`, and `execute` stay typed.
7. Default format is data. Only pass `format: 'rich'` when caller truly needs `{ value, options, errors }` wrappers.
8. Rich query hooks use unified `${Model}FindById` and `${Model}FindBy` operations. They do not send legacy GraphQL `context` variables.
9. Rich create and update send `{ input, format: 'rich' }`. Rich action and refresh are the only unified hooks that send sanitized `RequestContextInput`.

## Pattern: useApiFindById

```tsx
import { useApiFindById } from '@drumr/framework-frontend';
import type { Task } from '@gql';

function TaskDetail({ taskId }: { taskId: string }) {
  const { data, loading, error, refetch } = useApiFindById<Task>(
    'Task',
    taskId,
    { fields: { id: true, title: true, status: true } },
  );

  if (loading) return <Spin />;
  if (error) return <Alert type="error" message={error.message} />;
  return <div>{data?.title} — {data?.status}</div>;
}
```

**Skip behavior:**
```tsx
// Automatically skips when taskId is undefined — safe to use with conditional params
const { data } = useApiFindById<TaskSummary>('Task', selectedId);
// data is null until selectedId is set
```

## Pattern: useApiFindBy

```tsx
import { useApiFindBy } from '@drumr/framework-frontend';
import type { Task, TaskWhereInput, TaskOrderByInput } from '@gql';

function ActiveTaskList() {
  const { data, loading, pageInfo, fetchMore } = useApiFindBy<Task, TaskWhereInput, TaskOrderByInput>(
    'Task',
    {
      where: { status: { eq: 'active' } },
      orderBy: { priority: 'DESC' },
      first: 20,
      fields: { id: true, title: true, priority: true },
    },
  );

  return (
    <>
      {data.map(t => <TaskCard key={t.id} task={t} />)}
      {pageInfo.hasNextPage && <Button onClick={fetchMore}>Load more</Button>}
    </>
  );
}
```

**Key constraints:**
- `data` is always an array (empty on initial load or error).
- `fetchMore` appends the next page to `data` (cursor accumulation).
- `first` defaults to 20 if omitted — always set it explicitly.

## Pattern: useApiCreate / useApiUpdate

```tsx
import { useApiCreate, useApiUpdate } from '@drumr/framework-frontend';
import type { Task } from '@gql';

function QuickCreateForm() {
  const { execute, loading, error, reset } = useApiCreate<Task>(
    'Task',
    { fields: { id: true, title: true } },
  );

  const handleSubmit = async (values: { title: string }) => {
    const task = await execute(values);
    if (task) message.success(`Created ${task.title}`);
  };

  return <Form onFinish={handleSubmit} />;
}

function ToggleBillable({ task }: { task: Task }) {
  const { execute } = useApiUpdate<Task>('Task', {
    fields: { id: true, isBillable: true },
  });

  return (
    <Switch
      checked={task.isBillable}
      onChange={(checked) => execute({ id: task.id, isBillable: checked })}
    />
  );
}
```

Use generated input types as second generic when payload shape differs from result shape:

```tsx
useApiCreate<Task, TaskCreateInput>('Task', { fields: { id: true } });
useApiUpdate<Task, TaskUpdateInput>('Task', { fields: { id: true } });
```

## Pattern: rich format

```tsx
import { useApiAction, useApiFindById } from '@drumr/framework-frontend';
import type { TaskUi } from '@gql';

function TaskInspector({ taskId }: { taskId: string }) {
  const { data } = useApiFindById<TaskUi>('Task', taskId, {
    format: 'rich',
    fields: { id: true, title: true, status: true },
  });

  const { execute } = useApiAction<TaskUi>('AssignTask', {
    format: 'rich',
    fields: { id: true, assignee: true },
  );

  return <Button onClick={() => execute({ id: taskId })}>{data?.title?.value}</Button>;
}
```

Rich mode rules:

- `useApiFindById` / `useApiFindBy`: set `format: 'rich'` when caller needs field wrappers.
- `useApiCreate` / `useApiUpdate`: rich mode returns wrapped fields but still uses one `input` object.
- `useApiAction`: rich mode injects sanitized request context and maps rich union failures to `Error`.
- `useApiRefresh`: dedicated rich-only hook for metadata recomputation.

## Pattern: useApiDelete / useApiRefresh

```tsx
import { useApiDelete, useApiRefresh } from '@drumr/framework-frontend';

function DeleteButton({ taskId, onDone }: { taskId: string; onDone: () => void }) {
  const { execute, loading } = useApiDelete('Task');

  const handleDelete = async () => {
    const success = await execute(taskId);
    if (success) onDone();
  };

  return <Button danger loading={loading} onClick={handleDelete}>Delete</Button>;
}

function RefreshButton({ taskId }: { taskId: string }) {
  const { execute } = useApiRefresh('Task', { fields: { id: true, status: true } });

  return (
    <Button
      onClick={() => execute({ id: taskId, data: { status: 'done' }, oldData: { status: 'todo' } })}
    >
      Refresh
    </Button>
  );
}
```

Delete return value stays `Promise<boolean | null>`.

- `true`: deletion succeeded
- `false`: backend returned union failure mapped into `error`
- `null`: network or runtime failure

## Type safety

| Generic position | What it controls | Default |
|---|---|---|
| 1st (`TResult`) | Result type, `data`, `FieldsSpec` keys | `Record<string, unknown>` |
| 2nd on FindBy (`TWhere`) | `where` shape | `Record<string, unknown>` |
| 3rd on FindBy (`TOrderBy`) | `orderBy` shape | `Record<string, unknown>` |
| 2nd on Create / Update (`TInput`) | `execute` input shape | `Record<string, unknown>` |
| 2nd on Action (`TVariables`) | `execute` input shape | `Record<string, unknown>` |

Rules of thumb:

- Always provide `TResult`.
- Use generated `${Model}CreateInput` and `${Model}UpdateInput` for mutation payloads when relationship ids matter.
- `fields` controls response projection, not input payload shape.
- For global actions with no variables, `execute()` can be called with no argument.

## Anti-patterns

### ❌ Keeping split hook names

```tsx
// WRONG
const { data } = useDataApiFindById<Task>('Task', id);
const { data: uiData } = useMetaApiFindById<TaskUi>('Task', id);

// RIGHT
const { data } = useApiFindById<Task>('Task', id);
const { data: uiData } = useApiFindById<TaskUi>('Task', id, { format: 'rich' });
```

### ❌ Wrapping query hooks in useEffect

```tsx
// WRONG
useEffect(() => {
  findById('Task', id); // not how it works
}, [id]);

// RIGHT
const { data } = useApiFindById<T>('Task', id);
```

### ❌ Adding manual skip when id is absent
```tsx
// WRONG — skip is implicit
const { data } = useDataApiFindById<T>('Task', id, { skip: !id });

// RIGHT — just pass the potentially-undefined id
const { data } = useDataApiFindById<T>('Task', id);
```

### ❌ Catching execute errors with try/catch
```tsx
// WRONG — execute doesn't throw
try {
  await execute(input);
} catch (e) { /* never reached */ }

// RIGHT — check return value or error field
const result = await execute(input);
if (!result) {
  console.log(error?.message); // from the hook's error field
}
```

### ❌ Omitting the model generic
```tsx
// WRONG — gives up all type safety; `data`, `fields` and `execute` are unknown shapes
const { execute } = useDataApiUpdate('Task', { fields: { isBlable: true } }); // typo not caught
await execute({ id, isBilable: true });                                       // typo not caught

// RIGHT — generic + typed result + typed input
const { execute, data } = useDataApiUpdate<Task>('Task', { fields: { isBillable: true } });
await execute({ id, isBillable: true });
```

### ❌ Confusing `fields` with the input shape
```tsx
// WRONG mental model — `fields` does NOT restrict what you can write
const { execute } = useDataApiUpdate<Task>('Task', { fields: { isBillable: true } });
// You CAN still call execute({ id, title, status }) and those writes will be applied —
// `fields` only controls what the server returns. If a widget must only edit isBillable,
// lock the input via the second generic:
useDataApiUpdate<Task, { id: string; isBillable: boolean }>('Task', { fields: { isBillable: true } });
```

## Testing hooks

Use `@testing-library/react` with `renderHook` and a mocked Apollo Client:

```tsx
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { renderHook, waitFor, act } from '@testing-library/react';

function createMockClient(responseFactory) {
  return new ApolloClient({
    cache: new InMemoryCache({ addTypename: false }),
    link: new ApolloLink((operation) =>
      new Observable((observer) => {
        observer.next({ data: responseFactory(operation.operationName) });
        observer.complete();
      })
    ),
  });
}

function createWrapper(client) {
  return ({ children }) => <ApolloProvider client={client}>{children}</ApolloProvider>;
}
```

See `core/frontend/tests/unit/hooks/dataApi.test.tsx` for the full test suite.

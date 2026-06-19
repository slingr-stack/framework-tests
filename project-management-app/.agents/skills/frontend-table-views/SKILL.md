---
name: frontend-table-views
description: Essential skill for Drumr Framework frontend. Teaches the current TableView surface: register the route in app.registerRoutes(), keep page-level props on TableView itself, put table configuration under tableOptions, use dataTable.options<T>() for fully typed configs, and handle refresh or post-action flows through DataTableRef or tableOptions.onActionExecuted.
metadata:
  applies-to:
    - core/frontend/src/components/views/TableView.tsx
    - core/frontend/src/components/tables/types.ts
    - core/frontend/src/components/tables/helpers.ts
    - core/frontend/src/runtime/defineRouting.ts
---

# Frontend skill: table views

Apply to:

- '**/frontend/src/**/*TableView.tsx'
- '**/frontend/src/config/routing.ts'

## Purpose

Use this skill when the user asks about:

- Building a paginated list page for a model
- Configuring columns, filtering, sorting, pagination, or selection for a table page
- Adding CRUD, bulk, or object actions to a table page
- Refreshing the table after an action executes
- Embedding a table inside another view

`TableView` is a function component that composes `View` and `DataTable`. It owns the page shell, while the table behavior lives under `tableOptions`.

---

## Core building blocks

### Route registration is the source of truth

Register every table page in `app.registerRoutes()` from `frontend/src/config/routing.ts`.

Layout definitions own menu entries. Route registration wires the path, view, and optional layout selection for the page.

```typescript
import { AppRegistry } from '@drumr/framework-frontend';
import TaskTableView from '../tasks/views/TaskTableView';

export function registerRoutes(app: AppRegistry) {
  app.registerRoutes([
    {
      path: '/tasks',
      view: TaskTableView,
    },
  ]);
}
```

### TableView owns only view-level props

Keep page-level concerns on `TableView` itself:

- `model`
- `tableOptions`
- `header`
- `hideHeader`
- `queryParams`
- forwarded `ref`

Put table behavior such as columns, filters, sorting, selection, and toolbars inside `tableOptions`.

```typescript
import { TableView } from '@drumr/framework-frontend';

export function TaskTableView() {
  return <TableView model="Task" />;
}
```

When you need custom table behavior, switch to `tableOptions` instead of adding extra top-level props.

---

## Public surface

| Surface | Type | Purpose |
| --- | --- | --- |
| `model` | `ExtractModelName<T>` | Default model name for metadata, row-click resolution, and fallback header title |
| `tableOptions` | `DataTableOptions<T>` | Full table configuration |
| `header` | `ViewHeader` | Page title, breadcrumb, and page-level toolbar |
| `hideHeader` | `boolean` | Suppress the page header when embedding the table elsewhere |
| `queryParams` | `Record<string, string>` | Explicit query-param filters applied as equality filters |
| `ref` | `React.Ref<DataTableRef>` | Imperative access to `refresh()`, `clearSelection()`, `openView()`, and `getObjectActions()` |

## Generic vs model

Both exist for different reasons:

- `model` is the runtime string used for API calls, metadata loading, and default row-click resolution
- `<T>` is the compile-time type that validates column field names and toolbar helpers

```typescript
// TaskUi has __typename?: 'TaskUi' -> ExtractModelName<TaskUi> = 'Task'
<TableView<TaskUi> model="Task" />
```

Use the generic when you want field-name validation in `tableOptions.columns`. Omit it when the wrapper is intentionally lightweight.

---

## Common tableOptions keys

`tableOptions` is the main API surface for `TableView`.

| Key | Type | Purpose |
| --- | --- | --- |
| `model` | `ExtractModelName<T>` | Required model name when configuring the table explicitly |
| `columns` | `DataTableColumn<T>[]` | Table columns |
| `filters` | `ModelDynamicFilters<T>` | Static or computed filters applied to fetches |
| `defaultSorting` | `DataTableDefaultSorting<T>` | Initial sorting plus fallback after clearing sort |
| `pagination` | `DataTablePagination` | Page size and pagination mode |
| `selection` | `DataTableSelection<T>` | Single or bulk row selection |
| `tableToolbar` | `DataTableToolbarConfig` | Toolbar rendered above the table rows |
| `rowToolbar` | `DataTableRowToolbarConfig<T>` | Per-row actions |
| `queryParamFilters` | `Record<string, string>` | Query-param filters merged with or overriding URL query params |
| `onRowClicked` | `(record) => void` | Custom row-click behavior |
| `onActionExecuted` | `(response, actionName) => void` | Table-wide action completion hook |

Use `dataTable.options<T>()` when you want the whole config to be type-checked together.

```typescript
import { dataTable, TableView, toolbar } from '@drumr/framework-frontend';
import type { Task } from '@gql';

<TableView<Task>
  tableOptions={dataTable.options<Task>({
    model: 'Task',
    columns: [
      { field: 'title', title: 'Title', sorting: true, filtering: true },
      { field: 'project.code', title: 'Project code', sorting: true, filtering: true },
      { field: 'assignee', title: 'Assignee', sorting: true, filtering: true },
    ],
    defaultSorting: { field: 'dueDate', direction: 'desc' },
    pagination: { pageSize: 20 },
    tableToolbar: { buttons: toolbar<Task>({ actions: 'crud' }) },
    rowToolbar: { buttons: toolbar<Task>({ container: 'modal' }) },
  })}
/>
```

---

## Toolbar placement

Use the three toolbar surfaces for different scopes:

| Surface | Renders | Typical use |
| --- | --- | --- |
| `header.toolbar` | In the page header | Page shortcuts, report buttons, auxiliary navigation |
| `tableOptions.tableToolbar` | Above the table rows | Create, bulk, and selection-aware table actions |
| `tableOptions.rowToolbar` | Inside each row | Edit, delete, or object actions for one record |

```typescript
import { TableView, TaskEstimateView, toolbar } from '@drumr/framework-frontend';

<TableView
  model="Task"
  header={{
    title: 'Tasks',
    toolbar: {
      buttons: [
        toolbar.view({
          elementId: 'estimate-task',
          view: TaskEstimateView,
          label: 'Estimate task',
          container: 'page',
        }),
      ],
    },
  }}
  tableOptions={{
    model: 'Task',
    columns: [{ field: 'title', title: 'Title' }],
    tableToolbar: { buttons: toolbar({ actions: 'crud' }) },
    rowToolbar: { buttons: toolbar({ container: 'modal' }) },
  }}
/>
```

Use `tableToolbar` when the action depends on current selection or belongs visually to the table itself.

---

## Default row click and custom row click

When `tableOptions.onRowClicked` is omitted, `TableView` resolves the record's read action and opens the read view automatically.

Provide `onRowClicked` only when the table should open a different view or navigate in a different container.

```typescript
tableOptions={{
  model: 'Task',
  columns: [...],
  onRowClicked: (record) => {
    openView('TaskReadView', {
      container: 'modal',
      params: { id: record.id },
    });
  },
}}
```

---

## Refresh and action callbacks

Use the forwarded `DataTableRef` when the page needs imperative refresh or selection reset.

For table-wide post-action logic, use `tableOptions.onActionExecuted`. For button-specific behavior, use each button descriptor's `afterExecution`.

```typescript
import type { ActionResponse, DataTableRef } from '@drumr/framework-frontend';
import { TableView, getApp, toolbar } from '@drumr/framework-frontend';
import React, { useCallback, useRef } from 'react';

export function TaskTableView() {
  const tableRef = useRef<DataTableRef>(null);

  const handleActionExecuted = useCallback(
    (response: ActionResponse, actionName: string) => {
      if (!response.executed) {
        return;
      }

      if (actionName === 'CompleteTask') {
        getApp().message.success('Task completed.');
      }

      tableRef.current?.refresh();
    },
    [],
  );

  return (
    <TableView
      ref={tableRef}
      model="Task"
      tableOptions={{
        model: 'Task',
        columns: [{ field: 'title', title: 'Title' }],
        rowToolbar: {
          buttons: [
            toolbar.objectAction('CompleteTask', {
              afterExecution: handleActionExecuted,
            }),
          ],
        },
        onActionExecuted: handleActionExecuted,
      }}
    />
  );
}
```

---

## Query params and embedded usage

`TableView` can pre-filter rows from query params.

- If you pass `queryParams`, those values are used first
- Otherwise the view reads URL query params automatically
- `tableOptions.queryParamFilters` overrides the same keys when both are present

```typescript
<TableView
  model="Task"
  queryParams={{ assignee: userId }}
  tableOptions={{
    model: 'Task',
    columns: [{ field: 'title', title: 'Title' }],
    queryParamFilters: { status: 'in_progress' },
  }}
/>
```

When embedding a table inside another page, use `hideHeader` so the parent view owns the page shell.

```typescript
<ReadView model="Project" id={id}>
  <TableView
    model="Task"
    hideHeader
    tableOptions={{
      model: 'Task',
      columns: [{ field: 'title', title: 'Title' }],
      filters: () => ({ project: { id: { eq: id } } }),
    }}
  />
</ReadView>
```

For parent-child record views, prefer `NestedView kind="table"` when the relationship is part of a `ReadView` flow.

---

## Full wrapper example

```typescript
import { CheckSquareOutlined } from '@ant-design/icons';
import type { Task } from '@gql';
import type { DataTableRef } from '@drumr/framework-frontend';
import {
  TableView,
  dataTable,
  getApp,
  toolbar,
} from '@drumr/framework-frontend';
import { Space, Tag } from 'antd';
import React, { useCallback, useRef } from 'react';

const STATUS_COLOR: Record<string, string> = {
  to_do: 'default',
  in_progress: 'processing',
  done: 'success',
  blocked: 'error',
};

export function TaskTableView() {
  const tableRef = useRef<DataTableRef>(null);

  const handleActionExecuted = useCallback((response: { executed: boolean }) => {
    if (!response.executed) {
      return;
    }
    getApp().message.success('Task action completed.');
    tableRef.current?.refresh();
  }, []);

  return (
    <TableView<Task>
      ref={tableRef}
      header={{
        title: 'Tasks',
        breadcrumb: (
          <Space size={4}>
            <CheckSquareOutlined />
            <Tag color="processing">Tasks</Tag>
          </Space>
        ),
      }}
      tableOptions={dataTable.options<Task>({
        model: 'Task',
        columns: [
          { field: 'title', title: 'Title', sorting: true, filtering: true },
          { field: 'project.code', title: 'Project code', sorting: true, filtering: true },
          {
            field: 'status',
            title: 'Status',
            sorting: true,
            filtering: true,
            render: (value: string | null | undefined) => (
              <Tag color={STATUS_COLOR[(value ?? '').toLowerCase()] ?? 'default'}>
                {(value ?? '').toUpperCase()}
              </Tag>
            ),
          },
          { field: 'assignee', title: 'Assignee', sorting: true, filtering: true },
        ],
        pagination: { pageSize: 10 },
        selection: { enabled: true, type: 'multiple' },
        tableToolbar: { buttons: toolbar<Task>({ actions: 'crud' }) },
        rowToolbar: {
          buttons: [
            toolbar<Task>({ container: 'modal' }),
            toolbar.objectAction<Task>('CompleteTask', {
              afterExecution: handleActionExecuted,
            }),
          ],
        },
        onActionExecuted: handleActionExecuted,
      })}
    />
  );
}

export default TaskTableView;
```

---

## Best practices

- Keep routed table wrappers thin. Register the page in `config/routing.ts`, then keep most behavior inside `tableOptions`.
- Prefer `dataTable.options<T>()` when the table configuration is large enough to benefit from full type checking.
- Use meaningful business columns first. Do not expose raw ID fields in user-facing tables.
- For reference fields, prefer the label field or a nested path such as `project.code` instead of a foreign-key ID.
- Use `header.toolbar` for page-level shortcuts and `tableToolbar` for table-level CRUD or bulk actions.
- Use `tableOptions.onActionExecuted` or per-button `afterExecution` callbacks to refresh after mutations.
- Use `hideHeader` when nesting a table inside another view.

## Navigation paths to associated skills

| Associated skill | When to use it | Why this skill is not enough |
| --- | --- | --- |
| [frontend-views](../frontend-views/SKILL.md) | If the user needs shared page-header and toolbar conventions across view types | This skill focuses on list pages and table configuration |
| [frontend-form-views](../frontend-form-views/SKILL.md) | If row click or toolbar actions open read, edit, or create views that need custom form behavior | This skill covers table pages, not form view internals |
| [frontend-action-views](../frontend-action-views/SKILL.md) | If a row or bulk action needs a custom action form view | This skill covers table integration, not action-form rendering |
| [backend-datamodels](../backend-datamodels/SKILL.md) | If the available columns, filters, or label fields must change in backend model metadata | This skill covers table composition, not model contracts |

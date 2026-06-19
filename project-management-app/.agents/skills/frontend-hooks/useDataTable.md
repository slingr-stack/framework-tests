# useDataTable

> Part of the [frontend-hooks](./SKILL.md) skill.

---

## Purpose

`useDataTable` is the headless table-state hook behind Drumr's `DataTable`.
It gives custom views the same filtering, sorting, pagination, selection,
metadata, and refresh behavior as the built-in table component, but without
forcing a single visual representation.

Use it when you need to:

- render a normal `DataTable` and an alternate UI from the same controller
- drive a `DataTable` through the `controller` prop instead of letting the
  component own its state
- keep framework filtering and pagination semantics while loading data from a
  custom service
- render metadata-aware values from UI-shaped responses without polluting the
  plain rows consumed by the rest of the UI

---

## Core pattern

```tsx
import type {
  UseDataTableOptions,
  UseDataTableReturn,
} from '@drumr/framework-frontend';
import {
  DataTable,
  DataComponent,
  useDataTable,
} from '@drumr/framework-frontend';
import { ProList } from '@ant-design/pro-components';

type UserTableOptions = UseDataTableOptions<User, 'User'>;

const columns: UserTableOptions['columns'] = [
  { field: 'fullName', title: 'Full Name', filtering: false },
  { field: 'email', title: 'Email', filtering: false },
  { field: 'status', title: 'Status', filtering: false },
];

const controller: UseDataTableReturn<User, 'User'> = useDataTable({
  model: 'User',
  columns,
  pagination: { pageSize: 5 },
});

return viewMode === 'table' ? (
  <DataTable model="User" controller={controller} />
) : (
  <ProList
    rowKey={(record) => controller.getRowKey(record)}
    dataSource={controller.rows}
    loading={controller.loading}
    pagination={{
      current: controller.pagination.page,
      pageSize: controller.pagination.pageSize,
      total: controller.pagination.totalCount ?? controller.rows.length,
      onChange: (page, pageSize) => {
        if (pageSize !== controller.pagination.pageSize) {
          controller.pagination.setPageSize(pageSize, page);
          return;
        }
        if (page !== controller.pagination.page) {
          controller.pagination.goToPage(page);
        }
      },
    }}
    metas={{
      title: { dataIndex: 'fullName' },
      description: {
        render: (_, record) => {
          const uiRecord = controller.getUiRecord(record);
          return uiRecord?.status ? (
            <DataComponent options={uiRecord.status} />
          ) : (
            record.status ?? '-'
          );
        },
      },
    }}
  />
);
```

This is the current framework pattern used by the Summary view in the
project-management app.

---

## Input contract

`useDataTable(options)` accepts the same core data-state inputs that `DataTable`
can manage internally.

### Required inputs

| Option | Purpose |
| --- | --- |
| `model` | Model name used for metadata, query building, and filter resolution |
| `columns` | Headless column definitions and metadata lookup surface |

### Common state inputs

| Option | Purpose |
| --- | --- |
| `filters` | Always-on static GraphQL-style where-clause constraints |
| `initialFilterState` | User-visible initial filters in the same GraphQL-style where shape as `filters` |
| `defaultSorting` | Default sort for first load and reset fallback |
| `initialSort` | One-time initial sort without reset fallback semantics |
| `initialPage`, `initialPageSize` | Initial pagination state |
| `queryParamFilters` | Extra string filters merged into requests without mutating `filters.current` |
| `selection` | Selection behavior and callbacks |
| `pagination` | Page or cursor pagination configuration |

### Data source modes

`useDataTable` supports three data-source modes:

1. Built-in GraphQL loading: omit `data` and `loadData`
2. Static/external data: pass `data`
3. Custom data source: pass `loadData`, with optional `refresh` and `paginate`

For custom data sources, the handlers receive `DataTableRequestState<T>`:

```ts
type DataTableRequestState<T> = {
  model: string;
  context: UiContext;
  filters: DataTableFilters<T>;
  filterState: FilterState;
  sort?: DataTableSort<T>;
  pagination: {
    enabled: boolean;
    type: 'page' | 'cursor';
    pageSize: number;
    page?: number;
    endCursor?: string;
  };
};
```

---

## Output contract

`useDataTable` returns a `DataTableController<T, M>`.

### Data and metadata

| Field | Purpose |
| --- | --- |
| `rows` | Plain model-shaped rows for your UI |
| `loading` | Current loading flag |
| `error` | Last loading error |
| `columns` | Resolved headless columns |
| `columnMetadata` | Backend/UI metadata keyed by field |
| `getRowKey(record)` | Stable row key |
| `getUiRecord(record)` | Original UI-shaped record, when available |

Built-in GraphQL loading also requests `_actions` so a shared controller can
still back `DataTable` row actions, object-action toolbars, and row-click
permission checks. Custom `loadData` / `refresh` / `paginate` handlers must
return `_actions` themselves when the consuming UI depends on them.

### State groups

| Group | Main members |
| --- | --- |
| `pagination` | `page`, `pageSize`, `totalCount`, `goToPage`, `setPageSize(size, page?)`, `loadMore` |
| `sorting` | `current`, `setSort`, `clearSort` |
| `selection` | `selectedKeys`, `selectedRows`, `count`, `select`, `selectAll`, `clear` |
| `filters` | `current`, `activeWhere`, `setFilters`, `clearFilters`, `filterConfigs` |

### Refresh lifecycle

| Method | Behavior |
| --- | --- |
| `refresh()` | Reloads current data using the current filters/sort/pagination |
| `reset()` | Clears user filters, restores default sorting, resets pagination, then refreshes |

---

## Filters: `filters` vs `initialFilterState`

`filters` and `initialFilterState` both use the same GraphQL-style where-clause
shape.

Use `filters` when the constraint should always apply.

```ts
filters: {
  status: { in: ['active', 'planning'] },
}
```

Use `initialFilterState` when you want the same where clause to appear as a
preloaded user-visible filter in the QueryFilter UI.

```ts
initialFilterState: {
  id: { in: selectedProjectUserIds },
}
```

Do not pass old internal `FilterState` objects into `initialFilterState`.

---

## Metadata-aware rendering

`rows` stay plain on purpose. When the backing response includes UI-shaped field
objects, `useDataTable` stores the original record separately and exposes it
through `getUiRecord(record)`.

This is the correct pattern when you want to mix plain data access with
framework field rendering:

```tsx
const uiRecord = controller.getUiRecord(record);

return uiRecord?.roles ? (
  <DataComponent options={uiRecord.roles} />
) : (
  <span>{record.roles?.join(', ') ?? 'None'}</span>
);
```

Do not reshape `rows` into UI-field objects just to feed `DataComponent`.

---

## Custom data handlers

When `loadData` is provided, `useDataTable` still owns filter, sort, pagination,
selection, and metadata orchestration.

Implement handlers like this:

```tsx
const controller = useDataTable<TaskUi, 'Task'>({
  model: 'Task',
  columns,
  loadData: (tableState) => summaryService.loadTasks(tableState, false),
  refresh: (tableState) => summaryService.loadTasks(tableState, true),
  paginate: (tableState) => summaryService.loadTasks(tableState, false),
  pagination: { pageSize: 3 },
});
```

`DataTableLoadResult` can return plain arrays or UI-shaped data, plus optional
`pageInfo` and `columnMetadata`.

---

## Best practices

1. Prefer `<TableView>` for standard CRUD list screens.
2. Use `useDataTable` when one controller must drive multiple renderers.
3. Keep the controller stable while toggling presentations; swap the renderer,
   not the table state.
4. Use `controller={controller}` when `DataTable` is only one consumer of the
   state.
5. Use `getUiRecord(record)` only when you need metadata-aware rendering.
6. Keep `filters` for always-on constraints and `initialFilterState` for
   user-visible defaults.
7. When using custom loaders, let the hook own pagination/filter/sort state
   instead of duplicating that logic in the view.

---

## Related skills

- [frontend-components](../frontend-components/SKILL.md)
- [table-components.md](../frontend-components/table-components.md)
- [frontend-custom-views](../frontend-custom-views/SKILL.md)
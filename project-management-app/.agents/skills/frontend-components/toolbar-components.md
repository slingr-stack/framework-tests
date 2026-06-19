# Toolbar components — `toolbar` namespace

> Part of the [frontend-components](./SKILL.md) skill.

---

## Purpose

The `toolbar` namespace is a unified API that serves as both:

- **A function**: `toolbar<T>()` — returns a toolbar descriptor that auto-resolves available actions
- **A namespace**: `toolbar.objectAction()`, `toolbar.customAction()`, `toolbar.dropdown()`, etc.

Toolbars appear in three contexts:

1. **`tableToolbar`** — above the table (create, bulk actions, global actions)
2. **`rowToolbar`** — inline per row (edit, delete, object actions)
3. **`header.toolbar`** — view header (mixed actions, navigation)

> Toolbar action buttons execute through the headless [`useActionButton`](../frontend-hooks/useActionButton.md) hook internally. The public toolbar config DSL documented here is unchanged — for a custom UI that does not fit the DSL, use `useActionButton` directly.

---

## Import

```typescript
import { toolbar, menu } from '@drumr/framework-frontend';
import type { ActionResponse } from '@drumr/framework-frontend';
```

---

## Toolbar descriptors

### Auto-generated toolbar

```typescript
// All available actions
toolbar<Task>();

// Only CRUD actions (create, delete)
toolbar<Task>({ actions: 'crud' });

// Exclude CRUD, show only custom actions
toolbar<Task>({ exclude: 'crud' });

// Open actions in modal container
toolbar<Task>({ container: 'modal' });

// Open actions in page container
toolbar<Task>({ container: 'page' });
```

---

## Toolbar element factories

### `toolbar.objectAction<T>(name, options?)`

Action that operates on a specific record:

```typescript
toolbar.objectAction<Task>('CompleteTask', {
  modalPosition: 'right',
  modalSize: 'small',
});

toolbar.objectAction<Task>('AssignTask', {
  container: 'page',
  label: 'Assign (page)',
});
```

With custom params and afterExecution:

```typescript
toolbar.objectAction('SubmitEstimate', {
  elementId: 'submit-estimate',
  label: 'Submit for review',
  style: 'primary',
  object: this.currentObject,
  objectFormRef: this.form,
  afterExecution: (response: ActionResponse) => this.handleResult(response),
});
```

### `toolbar.modelAction(name, options?)`

Action that operates on the model (not a specific record):

```typescript
toolbar.modelAction('DailyInactiveTasksCleanup', {
  label: 'Cleanup Inactive Tasks',
  style: 'primary',
  afterExecution: (response: ActionResponse) => this.handleAfterExecution(response),
});

toolbar.modelAction('StartAudit', {
  elementId: 'start-audit',
  label: 'Start Audit',
  style: 'primary',
  view: 'StartAuditCustomActionView',
  afterExecution: this.handleStartAuditExecution,
});
```

### `toolbar.customAction(options)`

Custom button with a handler (no backend action):

```typescript
toolbar.customAction({
  elementId: 'approve-audit',
  label: 'Approve audit',
  style: 'primary',
  handler: async () => {
    await openView(ApproveAuditView, {
      container: 'modal',
      params: { id },
      queryParams: { id },
    });
  },
});
```

### `toolbar.view<T>(options)`

Navigation button that opens a view:

```typescript
toolbar.view<Task>({
  elementId: 'viewAssigneeDetails',
  view: UserReadView,
  label: 'Assignee details',
  container: 'modal',
  modalPosition: 'right',
  visible: record => Boolean(record?.assignee?.id),
  params: record => ({ id: record?.assignee?.id }),
});
```

### `toolbar.editAction(options?)`

Shortcut for the standard edit action:

```typescript
toolbar.editAction({ container: 'page' });
toolbar.editAction({ container: 'modal', modalPosition: 'right' });
```

### `toolbar.refreshAction()`

Standard refresh button:

```typescript
toolbar.refreshAction();
```

### `toolbar.dropdown(options)`

Dropdown menu with nested items:

```typescript
toolbar.dropdown({
  elementId: 'taskActions',
  label: 'Actions',
  icon: <ThunderboltOutlined />,
  style: 'primary',
  menu: menu({
    items: [
      menu.actionsMenu({ actions: ['StartTask', 'CompleteTask'] }),
      menu.divider(),
      menu.objectAction('AssignTask'),
    ],
  }),
})
```

### `toolbar.action(options)` (legacy)

Generic action button:

```typescript
toolbar.action({
  id: 'BulkChangePriority',
  action: 'BulkChangePriority',
  label: 'Bulk Change Priority',
  container: 'modal',
  modalPosition: 'center',
});
```

---

## The `menu` namespace

Used inside `toolbar.dropdown()` and layout menus:

```typescript
import { menu } from '@drumr/framework-frontend';

menu({
  items: [
    menu.actionsMenu({ actions: ['StartTask', 'CompleteTask'] }),
    menu.objectAction('AssignTask'),
    menu.editAction(),
    menu.deleteAction(),
    menu.divider(),
    menu.group({ label: 'Navigation', items: [...] }),
    menu.view({ elementId: 'dashboard', view: DashboardView, label: 'Dashboard', icon: <DashboardOutlined /> }),
  ],
})
```

---

## Common options

| Option | Type | Description |
| --- | --- | --- |
| `elementId` | `string` | Unique identifier (required for custom/view buttons) |
| `label` | `string \| DynamicLabel` | Button text |
| `icon` | `ReactNode` | Button icon |
| `style` | `'primary' \| 'default' \| 'dashed' \| 'text' \| 'link' \| 'danger'` | Visual style |
| `container` | `'modal' \| 'page' \| 'current'` | Where to open the action view |
| `modalPosition` | `'center' \| 'right'` | Modal position |
| `modalSize` | `'small' \| 'medium' \| 'large'` | Modal size |
| `visible` | `(record?) => boolean` | Dynamic visibility |
| `disabled` | `boolean` | Disable the button |
| `afterExecution` | `(response: ActionResponse) => void` | Post-execution callback |

---

## Examples

### Full table view with all toolbar variants (project-management-app)

```typescript
// apps/project-management-app/frontend/src/tasks/views/TaskTableView.tsx
import {
  toolbar,
  menu,
  TableView,
  TableViewComponent,
  TableViewTableOptions,
  openView,
} from '@drumr/framework-frontend';

@TableView({ path: '/tasks', model: 'Task' })
export default class TaskTableView extends TableViewComponent<Task> {
  override tableOptions: TableViewTableOptions<Task> = {
    // Row toolbar — object actions per record
    rowToolbar: {
      buttons: [
        toolbar.objectAction<Task>('CompleteTask', { modalPosition: 'right', modalSize: 'small' }),
        toolbar.objectAction<Task>('AssignTask', { container: 'page', label: 'Assign (page)' }),
        toolbar.view<Task>({
          elementId: 'viewAssigneeDetails',
          view: UserReadView,
          label: 'Assignee details',
          container: 'modal',
          modalPosition: 'right',
          visible: record => Boolean(record?.assignee?.id),
          params: record => ({ id: record?.assignee?.id }),
        }),
      ],
    },
    // Table toolbar — CRUD buttons above the table
    tableToolbar: {
      buttons: toolbar<Task>({ actions: 'crud' }),
    },
  };

  // Header toolbar — mixed buttons
  override header = {
    toolbar: {
      buttons: [
        toolbar.view({ elementId: 'estimateTask', view: TaskEstimateView, label: 'Estimate Task', container: 'page' }),
        toolbar.action({
          id: 'BulkChangePriority',
          action: 'BulkChangePriority',
          label: 'Bulk Change Priority',
          container: 'modal',
          modalPosition: 'center',
        }),
        toolbar<Task>({ exclude: 'crud' }),
      ],
    },
  };
}
```

### Read view toolbar with dropdowns (project-management-app)

```typescript
// apps/project-management-app/frontend/src/tasks/views/TaskReadView.tsx
import { toolbar, menu } from '@drumr/framework-frontend';
import { ThunderboltOutlined, SettingOutlined } from '@ant-design/icons';

override header: ViewHeaderConfig = {
  title: (task: Task | null) => task?.title || 'Task',
  toolbar: {
    buttons: [
      toolbar.refreshAction(),
      toolbar.dropdown({
        elementId: 'taskActions',
        label: 'Actions',
        icon: <ThunderboltOutlined />,
        style: 'primary',
        menu: menu({
          items: [
            menu.actionsMenu({ actions: ['StartTask', 'CompleteTask'] }),
            menu.divider(),
            menu.objectAction('AssignTask'),
          ],
        }),
      }),
      toolbar.dropdown({
        elementId: 'crudActions',
        label: 'Manage',
        icon: <SettingOutlined />,
        menu: menu({
          items: [
            menu.editAction(),
            menu.divider(),
            menu.deleteAction(),
          ],
        }),
      }),
    ],
  },
};
```

### Simple toolbar usage

```typescript
import { toolbar } from '@drumr/framework-frontend';

override header?: ViewHeaderConfig<any> = {
  title: 'Locations',
  toolbar: toolbar<Location>(),
  breadcrumb: null,
};

override tableOptions: TableViewTableOptions<Location> = {
  rowToolbar: { buttons: toolbar<Location>() },
};
```

### Object actions in header (wagecents-app)

```typescript
override header?: ViewHeaderConfig<any> = {
  title: 'Overview',
  toolbar: {
    buttons: [
      toolbar.objectAction<Audit>('RerunAudit'),
      toolbar.objectAction<Audit>('DiscardAudit'),
      toolbar.objectAction<Audit>('ApproveAudit'),
    ],
  },
};
```

---

## Role-based button visibility

Use `visible: () => boolean` (no record needed) or `visible: (record) => boolean` (record-state + role) with `App.resolve(Context)` to show or hide buttons based on the current user's roles.

```typescript
import { App, Context, toolbar } from '@drumr/framework-frontend';

// Helper — resolves once inside the callback so context is always populated
const hasRole = (...roles: string[]): boolean => {
  const userRoles = App.resolve(Context).user?.roles ?? [];
  return roles.some(r => userRoles.includes(r));
};

// Row toolbar — hide a destructive action from non-admins
rowToolbar: {
  buttons: [
    toolbar.objectAction('DeleteRecord', {
      style: 'danger',
      visible: () => hasRole('admin'),
    }),
    toolbar<Task>({ container: 'modal', exclude: ['DeleteRecord'] }),
  ],
},

// Row toolbar — combine role check with record state
rowToolbar: {
  buttons: [
    toolbar.objectAction('ApproveInvoice', {
      style: 'primary',
      visible: (record) => record?.status === 'pending' && hasRole('manager', 'admin'),
    }),
  ],
},

// Header toolbar — global action visible only to admins
override header = {
  toolbar: {
    buttons: [
      toolbar.modelAction('BulkArchive', {
        label: 'Bulk Archive',
        style: 'danger',
        visible: () => hasRole('admin'),
      }),
      toolbar<Task>({ exclude: ['BulkArchive'] }),
    ],
  },
};
```

> **Rules for role-based visibility:**
> - Always call `App.resolve(Context)` **inside** the `visible` callback — the context is not yet available at class instantiation time.
> - Role visibility is a UX concern only. Always back it with a real `can('execute', ...)` permission in `backend-auth` — the backend must also refuse the call if the role is not allowed.
> - For `rowToolbar`, use the `record` argument to combine record-state and role conditions.

---

## Best practices

1. **Use `toolbar<T>({ actions: 'crud' })` for `tableToolbar`** — only create/delete above the table.
2. **Use `toolbar<T>()` for `rowToolbar`** — auto-generates all available object actions per row.
3. **Use explicit button lists for `header.toolbar`** — gives full control over button order and grouping.
4. **Use `toolbar.dropdown()` with `menu()`** to group related actions into a single dropdown.
5. **Use `afterExecution`** to refresh tables or navigate after an action completes.
6. **Use `visible: (record) => boolean`** on row toolbar buttons for conditional visibility.
7. **Use `visible: () => hasRole('admin')` for role-based button visibility** — always check roles inside the callback, not at class definition time.
8. **Do not import Toolbar component directly** — use the `toolbar` namespace functions in view configurations.

---

## Related skills

- [frontend-table-views](../frontend-table-views/SKILL.md) — Table view toolbar configuration
- [action-button-components](./action-button-components.md) — Standalone action button components
- [frontend-views](../frontend-views/SKILL.md) — Header toolbar in all view types

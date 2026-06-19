---
name: frontend-form-views
description: >
  Skill for CRUD form views in the Drumr Framework frontend. Covers CreateView, EditView, and ReadView, plus the shared useDataForm/FormProvider pipeline also used by ActionView param forms. Documents fields, refresh, dataFormProps, custom form bodies via children, useDataFormContext or useFormViewDataFormContext access, NestedView inside ReadView, and current route-wrapper patterns that rely on functional prop injection instead of manual router plumbing.


metadata:
  applies-to:
    - core/frontend/src/components/views/CreateView.tsx
    - core/frontend/src/components/views/EditView.tsx
    - core/frontend/src/components/views/ReadView.tsx
    - core/frontend/src/components/views/FormViewBody.tsx
    - core/frontend/src/components/views/FormViewDataFormContext.tsx
---

Apply to:

- '**/frontend/src/**/*ReadView.tsx'
- '**/frontend/src/**/*EditView.tsx'
- '**/frontend/src/**/*CreateView.tsx'
- '**/frontend/src/**/views/helpers/**'

---

# Form views — `CreateView` / `EditView` / `ReadView` / `ActionView`

> `ActionView` belongs to the same useDataForm-backed form-view family, but its action-execution semantics live in [frontend-action-views](../frontend-action-views/SKILL.md).
> General view concepts (header, toolbar DSL, UI API binding, DI) live in [frontend-views](../frontend-views/SKILL.md).

---

## When to use each component

| Component | When to use |
| --- | --- |
| `CreateView` | New-record CRUD form |
| `EditView` | Edit existing record, or create-like mode when no `id` is available |
| `ReadView` | Read-only record details, often with nested tables or action toolbars |
| `ActionView` | Action param or confirmation form; see [frontend-action-views](../frontend-action-views/SKILL.md) for action-specific execution behavior |

All four are plain React function components registered with `app.registerRoutes()`.

---

## Shared form-view pipeline

`CreateView`, `EditView`, `ReadView`, and `ActionView` (when the action has params) all follow the same internal pattern:

1. Create a `dataFormHook` with `useDataForm()`.
2. Expose that controller through `FormViewDataFormContext.Provider`.
3. Render either:
  - `<dataFormHook.FormProvider>{children}</dataFormHook.FormProvider>` when you provide a custom body.
  - or `<DataForm dataFormHook={dataFormHook} ... />` when you rely on auto-rendering.

Practical consequences:

- Custom form bodies already live inside the provided `FormProvider`.
- `refreshTriggers` behave the same way for custom `children` bodies and auto-rendered `DataForm` bodies.
- `DataField`, `useDataFormContext()`, and `useDataFormField()` work directly inside `children`.
- Advanced helpers can read the full `UseDataFormReturn` through `useFormViewDataFormContext()`.
- The view-level `fields` prop still constrains the underlying `useDataForm()` controller even when `children` are provided.
- You do not create a second `useDataForm()` or wrap your own `FormProvider` inside a form view.
- `ActionView` only exposes this form context when the action actually has params. Param-less confirmation actions do not provide a form context.

---

## Props reference

### `CreateView` and `EditView`

| Prop | Type | Applies to | Description |
| --- | --- | --- | --- |
| `model` | `string` | both | Backend model name |
| `id` | `string` | `EditView` | Object ID to edit. When omitted, `EditView` auto-resolves `:id` from route params; if no ID is resolved it behaves like create mode |
| `fields` | `FieldsInput<T>` | both | Field selection object spec |
| `fieldOverrides` | `FieldOverrides<T>` | both | Local view-level overrides for field metadata (label, readOnly, etc.) |
| `initialData` | `Record<string, unknown>` | both | Initial plain values for create mode or prefilling |
| `header` | `ViewHeader` | both | Title, subtitle, breadcrumb, toolbar override. Default submit actions render in footer. `header.toolbar` is only used when explicitly provided. |
| `beforeSave` | `(values) => boolean \| Promise<boolean>` | both | Return `false` to cancel save |
| `onSaved` | `(result?) => void \| Promise<void>` | both | Called after successful save. When omitted, the view closes automatically |
| `onError` | `(error) => void \| Promise<void>` | both | Overrides the default save-error toast |
| `refreshTriggers` | `string[]` | both | Fields that trigger refresh |
| `refreshMode` | `'auto' \| 'custom' \| 'none'` | both | Controls refresh behavior. Default is `'auto'` — only specify when using `'custom'` or `'none'` |
| `onRefresh` | `OnRefreshCallback` | both | Custom handler forwarded directly to `useDataForm`; only called when `refreshMode='custom'` |
| `dataFormProps` | `Partial<DataFormProps<T>>` | both | Low-level props forwarded to the internal `DataForm`; use for layout and renderer tweaks, not for replacing the controller |
| `children` | `ReactNode` | both | Custom form body. Replaces auto-rendered fields |

`CreateView` is the same family as `EditView`, except it never accepts `id` and always creates a new object internally. Its default submit action is `Create`.

### `ReadView`

| Prop | Type | Description |
| --- | --- | --- |
| `model` | `string` | Backend model name |
| `id` | `string` | Object ID. Auto-resolved from route params when omitted |
| `fields` | `FieldsInput<T>` | Field selection object spec |
| `fieldOverrides` | `FieldOverrides<T>` | Local view-level overrides for field metadata (label, readOnly, etc.) |
| `header` | `ViewHeader` | Title, subtitle, breadcrumb, toolbar override. Defaults to a refresh toolbar |
| `onActionExecuted` | `(response, actionName) => void \| Promise<void>` | Called after framework default action handling finishes |
| `deleteFallbackPath` | `string` | Fallback navigation path after successful delete |
| `children` | `ReactNode` | Custom read-only form body |

Use the provided `useDataForm` contexts to customize form views:

- `useDataFormContext()`
- `useDataFormField()`
- `useFormViewDataFormContext()`

---

## Route registration

Views are registered in `config/routing.ts` via `app.registerRoutes()`. Layout and menu are set in the route definition, **not** inside the view function:

```typescript
// config/routing.ts
import { AppRegistry } from '@drumr/framework-frontend';
import { formLayout } from './layouts/formLayout';
import TaskCreateView from '../tasks/views/TaskCreateView';
import TaskEditView from '../tasks/views/TaskEditView';
import TaskReadView from '../tasks/views/TaskReadView';
import TaskTableView from '../tasks/views/TaskTableView';

export function registerRoutes(app: AppRegistry) {
  app.registerRoutes([
    { path: '/tasks', view: TaskTableView },
    { path: '/tasks/new', view: TaskCreateView, layout: formLayout },
    { path: '/tasks/:id/edit', view: TaskEditView, layout: formLayout },
    { path: '/tasks/:id/view', view: TaskReadView },
  ]);
}
```

---

## Route params

`EditView`, `ReadView`, and `ActionView` already resolve `:id` from route params internally when `id` is not passed as a prop.

For standard routed CRUD pages, the wrappers can stay minimal:

```typescript
export function TaskCreateView() {
  return <CreateView model="Task" />;
}

export function TaskEditView() {
  return <EditView model="Task" />;
}

export function TaskReadView() {
  return <ReadView model="Task" />;
}
```

If the wrapper itself needs the route id for surrounding logic, accept it as a function prop. Route registration injects path params into functional view components, and the form-view primitives also accept an explicit `id` prop for embedded usage or tests.

```typescript
export function ProjectReadView({ id }: { id?: string } = {}) {
  return <ReadView model="Project" id={id} />;
}
```

---

## Callback patterns

### `beforeSave` — cancel a save

```typescript
<EditView
  model="Task"
  id={id}
  beforeSave={async (values) => {
    if (values.status === 'done') {
      getApp().message.warning('Task is done — reopen before editing.');
      return false; // abort
    }
    return true;
  }}
/>
```

### `onSaved` — custom post-save navigation

```typescript
<CreateView
  model="Task"
  onSaved={(result) => {
    const title = (result as { data?: { title?: string } })?.data?.title ?? 'Task';
    getApp().message.success(`"${title}" created!`);
    dashboardService.invalidate();
    closeView();
  }}
/>
```

If `onSaved` is **omitted**, `closeView()` is called automatically after a successful save.
If `onSaved` is provided, you own the follow-up navigation.

### `onError` — override the default toast

```typescript
<EditView
  model="Task"
  id={id}
  onError={(err) => {
    getApp().message.error(`Save failed: ${err.message}`);
  }}
/>
```

---

## Custom form body (`children`)

When `children` are provided, they replace the auto-rendered form.

Those `children` are already rendered inside the view's internal `dataFormHook.FormProvider` and refresh-trigger provider, so `DataField`, `useDataFormContext()`, and `useDataFormField()` work immediately and `refreshTriggers` still fire:

```typescript
import React from 'react';
import {
  DataField,
  EditView,
  useDataFormContext,
} from '@drumr/framework-frontend';
import { Col, Row } from 'antd';

function TaskFormBody() {
  const { formState } = useDataFormContext();
  return (
    <Row gutter={16} style={{ opacity: formState.isSubmitting ? 0.6 : 1 }}>
      <Col span={24}><DataField name="title" /></Col>
      <Col span={12}><DataField name="project" /></Col>
      <Col span={12}><DataField name="status" /></Col>
    </Row>
  );
}

export function TaskEditView({ id: idProp }: { id?: string } = {}) {
  return (
    <EditView model="Task" id={idProp}>
      <div className="alert alert-info mb-3" role="alert">Custom note here.</div>
      <TaskFormBody />
    </EditView>
  );
}
```

Extract `TaskFormBody` into a named component or `helpers/` file so that `CreateView` and `EditView` can share the same layout.

If you need the framework's default auto-rendered field stack inside a custom wrapper, render `<DataForm showActions={false} />` inside the view body. It reuses the controller that the view already created, so the view-level `fields` selection and submit/refresh wiring still apply.

---

## Accessing the provided controller

Use `useDataFormContext()` or `useDataFormField()` inside the custom form body when you need field-level behavior.

Use `useFormViewDataFormContext()` when a helper component needs the full `UseDataFormReturn` object that the view created:

```typescript
import { Button } from 'antd';
import {
  EditView,
  useFormViewDataFormContext,
} from '@drumr/framework-frontend';

function PriorityShortcut() {
  const { dataFormHook } = useFormViewDataFormContext();

  return (
    <Button onClick={() => dataFormHook.change('priority', 'high')}>
      Set High Priority
    </Button>
  );
}

export function TaskEditView() {
  return (
    <EditView model="Task">
      <PriorityShortcut />
      <DataField name="title" />
    </EditView>
  );
}
```

Use this advanced context when you need controller-wide operations such as `change`, `submit`, `refresh`, `reload`, or direct `form` access. Do not create a second controller.

---

## Cross-field refresh (`refreshTriggers` / `refreshMode` / `onRefresh`)

Use `refreshTriggers` for server recalculation — `'auto'` is the default, no need to specify it:

```typescript
<EditView
  model="Task"
  id={id}
  refreshTriggers={['project', 'assignee']}
/>
```

Use `refreshMode: 'custom'` + `onRefresh` for client-side reactions (messages, conditional visibility, derived state). Form views now accept the same hook-native callback shape as `useDataForm`, and `onRefresh` is **only** called when `refreshMode='custom'`:

```typescript
import type { OnRefreshCallback } from '@drumr/framework-frontend';

const handleTaskRefresh: OnRefreshCallback = async (defaultRefresh, context) => {
  const values = context.form.state.values as { status?: string };

  if (
    context.changedFieldsSinceRefresh.has('status') &&
    values.status === 'done'
  ) {
    getApp().message.info(
      'Task marked as completed! Consider updating actual hours.',
    );
  }

  return defaultRefresh();
};

<EditView
  model="Task"
  id={id}
  refreshMode="custom"
  onRefresh={handleTaskRefresh}
/>
```

---

## `ReadView` — `onActionExecuted` and `deleteFallbackPath`

```typescript
<ReadView
  model="Task"
  id={id}
  deleteFallbackPath="/tasks"
  onActionExecuted={(response, actionName) => {
    // Framework already applied: success toast, data refresh, close-on-delete
    if (response.executed && actionName === 'ArchiveTask') {
      getApp().message.info('Task archived.');
    }
  }}
/>
```

---

## `ReadView` with nested tables (`NestedView`)

Use `<NestedView kind="table">` inside a `<ReadView>` to show related records scoped to the parent:

```typescript
import { NestedView, ReadView } from '@drumr/framework-frontend';
import TaskTableView from '../tasks/TaskTableView';

export function ProjectReadView({ id: idProp }: { id?: string } = {}) {
  return (
    <ReadView model="Project" id={idProp} header={{ title: 'Project Details' }}>
      <NestedView
        kind="table"
        view={TaskTableView}
        parentModel="Project"
        parentId={idProp!}
        joinField="projectId"
      />
    </ReadView>
  );
}
```

Use `kind="custom"` for non-table nested views (another ReadView, a custom panel):

```typescript
<NestedView
  kind="custom"
  view={ProjectNotesView}
  parentModel="Project"
  parentId={id!}
/>
```

---

## Example 1: minimal create, edit, and read trio

```typescript
// tasks/views/TaskCreateView.tsx
import { CreateView } from '@drumr/framework-frontend';
import React from 'react';

export function TaskCreateView() {
  return <CreateView model="Task" />;
}
export default TaskCreateView;

// tasks/views/TaskEditView.tsx
import { EditView } from '@drumr/framework-frontend';
import React from 'react';

export function TaskEditView() {
  return <EditView model="Task" />;
}
export default TaskEditView;

// tasks/views/TaskReadView.tsx
import { ReadView } from '@drumr/framework-frontend';
import React from 'react';

export function TaskReadView() {
  return <ReadView model="Task" />;
}
export default TaskReadView;
```

Registration in `config/routing.ts`:

```typescript
{ path: '/tasks/new',      view: TaskCreateView, layout: formLayout },
{ path: '/tasks/:id/edit', view: TaskEditView,   layout: formLayout },
{ path: '/tasks/:id/view', view: TaskReadView },
```

---

## Example 2: EditView with save and refresh callbacks

```typescript
// tasks/views/TaskEditView.tsx
import type { Task } from '@gql';
import { EditView, getApp } from '@drumr/framework-frontend';
import React from 'react';
import { TaskFormBody } from './helpers/taskFormLayout';

export function TaskEditView({ id }: { id?: string } = {}) {
  return (
    <EditView
      model="Task"
      id={id}
      refreshMode="custom"
      refreshTriggers={['project', 'assignee', 'status']}
      onRefresh={async (defaultRefresh, context) => {
        const values = context.form.state.values as { status?: string; title?: string };
        if (
          context.changedFieldsSinceRefresh.has('status') &&
          values.status === 'done'
        ) {
          getApp().message.info('Task marked as completed.');
        }
        return defaultRefresh();
      }}
      beforeSave={async (values) => {
        if (values.status === 'done') {
          getApp().message.warning(`"${values.title}" is done — reopen before editing.`);
          return false;
        }
        return true;
      }}
      onSaved={(result) => {
        const title = (result as { data?: Task })?.data?.title ?? 'Task';
        getApp().message.success(`"${title}" saved successfully.`);
      }}
      onError={(err) => {
        getApp().message.error(`Failed to save: ${err.message}`);
      }}
    >
      <TaskFormBody />
    </EditView>
  );
}
export default TaskEditView;
```

---

## Example 3: ReadView with custom header and nested views

```typescript
// tasks/views/TaskReadView.tsx
import type { Task } from '@gql/types';
import { getApp, menu, NestedView, ReadView, toolbar } from '@drumr/framework-frontend';
import { Space, Tabs } from 'antd';
import { CheckSquareOutlined, ThunderboltOutlined } from '@ant-design/icons';
import React, { useEffect } from 'react';
import UserReadView from '../users/views/UserReadView';

export function TaskReadView({ id }: { id?: string } = {}) {
  useEffect(() => {
    if (id) getApp().message.info(`Task loaded: ${id}`);
  }, [id]);

  return (
    <ReadView
      model="Task"
      id={id}
      deleteFallbackPath="/tasks"
      header={{
        title: (task: Task | null) => task?.title ?? 'Task Details',
        breadcrumb: () => (
          <Space size={4}>
            <CheckSquareOutlined />
            <span>Task</span>
          </Space>
        ),
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
          ],
        },
      }}
      onActionExecuted={(response, actionName) => {
        if (response.executed) {
          console.log(`Action "${actionName}" executed.`);
        }
      }}
    >
      <Tabs
        items={[
          {
            key: 'assignee',
            label: 'Assignee',
            children: (
              <NestedView
                kind="custom"
                view={UserReadView}
                parentModel="Task"
                parentId={id!}
              />
            ),
          },
        ]}
      />
    </ReadView>
  );
}
export default TaskReadView;
```

---

## Shared form layout helpers

When `CreateView` and `EditView` for the same model share the same custom layout, extract to a `helpers/` file:

```typescript
// helpers/taskFormLayout.tsx — plain React, no decorators
import { DataField } from '@drumr/framework-frontend';
import { Card, Col, Row, Typography } from 'antd';
import React from 'react';

const { Title } = Typography;

export function TaskFormBody(): React.ReactNode {
  return (
    <div style={{ padding: '0 24px' }}>
      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>Basic Information</Title>
        <Row gutter={[16, 16]}>
          <Col span={24}><DataField name="title" /></Col>
          <Col span={12}><DataField name="project" /></Col>
          <Col span={12}><DataField name="status" /></Col>
        </Row>
      </Card>
      <Card>
        <Title level={4}>Assignment</Title>
        <Row gutter={[16, 16]}>
          <Col span={12}><DataField name="assignee" /></Col>
          <Col span={12}><DataField name="priority" /></Col>
        </Row>
      </Card>
    </div>
  );
}
```

---

## Best practices

- Default to minimal props (`model`, `id`). Add `beforeSave`/`onSaved` only when the default behavior (save + close) is insufficient.
- Let functional route wrappers receive `id` as a prop when they need it for surrounding logic; do not add manual router plumbing when the view primitives or wrapper props already provide it.
- When `onSaved` is provided, `closeView()` is NOT called automatically — navigate explicitly if needed.
- Return `false` from `beforeSave` to cancel — never throw.
- Extract shared form bodies to `helpers/<model>FormLayout.tsx` or a named component and rely on the provided `FormProvider` instead of creating your own.
- Prefer `children` for custom layouts over `dataFormProps.formProps` for simple column tweaks.
- Omit `refreshMode` for server-recalculated fields — `'auto'` is the default. Only specify `refreshMode` when using `'custom'` or `'none'`. Never write `refreshMode="auto"` explicitly.
- Use `refreshMode: 'custom'` + `onRefresh` only for client-side reactions (toasts, conditional logic). `onRefresh` uses the same `OnRefreshCallback` signature as `useDataForm` and is ignored in `'auto'` mode.
- Use `NestedView kind="table"` inside `ReadView` for related records; pass `joinField` to scope queries automatically.
- Use `useDataFormContext()` / `useDataFormField()` for field-level behavior inside the form body.
- Use `useFormViewDataFormContext()` only when a helper needs the full `dataFormHook` controller.
- Treat `ActionView` as the fourth member of the form-view family for shared form-context behavior, but keep its execution-specific rules in [frontend-action-views](../frontend-action-views/SKILL.md).

---

## Related documentation

- [General views guide](../frontend-views/SKILL.md)
- [Table Views](../frontend-table-views/SKILL.md)
- [Action Views](../frontend-action-views/SKILL.md)
- [Backend: Data Models](../backend-datamodels/SKILL.md) — source of `uiFields` metadata
- [Backend: Auth](../backend-auth/SKILL.md) — field visibility rules

### Navigation paths to associated skills

| Associated Skill | When to navigate | Why the current info is NOT enough |
| --- | --- | --- |
| [frontend-datamodels](../frontend-datamodels/SKILL.md) | When field labels/components or the `defaultCreate/Edit/ReadView` names this view binds to are configured | This skill composes views; field UI and default view names are declared with `app.registerDataModel()` |
| [backend-datamodels](../backend-datamodels/SKILL.md) | When form fields or validation must change in backend models | This skill covers form composition, not model field constraints |
| [frontend-table-views](../frontend-table-views/SKILL.md) | When form views interoperate with table navigation or nested tables | This skill references interactions but does not define table configuration |
| [frontend-views](../frontend-views/SKILL.md) | When shared toolbar/header/action patterns are reused | This skill is form-specific and omits general view conventions |
| [frontend-api](../frontend-api/SKILL.md) | When save/load logic needs custom GraphQL operation builders | This skill focuses on component props, not raw API construction |


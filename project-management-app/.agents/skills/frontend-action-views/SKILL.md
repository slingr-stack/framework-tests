---
name: frontend-action-views
description: Creates ActionView functional components in Drumr Framework frontend for GlobalAction, ModelAction, and ObjectAction param or confirmation flows. Use when building a custom action surface with optional params, custom children, or refresh-driven validation. Covers the props-based API (beforeExecute, onExecuted, onError, initialData), the shared useDataForm/FormProvider pipeline used when params exist, useDataFormContext/useFormViewDataFormContext access, frontend registration through action defaults, and optional explicit routing when a custom path or layout is needed.
metadata:
  applies-to:
    - core/frontend/src/pages/
    - core/frontend/src/config/actionDefaults.ts
    - core/frontend/src/components/toolbar/resolver.ts
    - core/frontend/src/components/views/ActionView.tsx
    - core/frontend/src/navigation/openView.ts
    - core/frontend/src/navigation/breadcrumbUtils.ts
---

applyTo:

- '**/frontend/src/**/views/**/actions/**/*.tsx'
- '**/frontend/src/global/views/**/*.tsx'
- '**/frontend/src/**/*ActionView.tsx'

---

# Action views — `ActionView`

> General view concepts (header, toolbar DSL, UI API binding, DI) live in [frontend-views](../frontend-views/SKILL.md).

> `ActionView` uses [`useActionView`](../frontend-hooks/useActionView.md) internally. Use `ActionView` for standard action surfaces. Use `useActionView` when you need a fully custom headless surface with your own markup, toolbar, or result handling.

---

## When to use `ActionView`

Use `ActionView` when a `GlobalAction`, `ModelAction`, or `ObjectAction` needs a **param or confirmation form**. The action's params type drives the UI API — `ActionView` auto-fetches it and binds the form.

| Action kind    | File convention                                           |
| -------------- | --------------------------------------------------------- |
| `GlobalAction` | `global/views/ActionNameView.tsx`                         |
| `ModelAction`  | `<domain>/views/actions/ActionNameView.tsx`               |
| `ObjectAction` | `<domain>/views/actions/ActionNameView.tsx`               |

`ActionView` is a plain React function component — no decorator, no base class. Register it through `defineActionDefaults({ action, view })` or `app.registerAction({ action, view })`. Add an explicit route only when you need a custom path or layout.

## Multi-skill routing

- Use [frontend-declarative-config](../frontend-declarative-config/SKILL.md) when registering `defineActionDefaults()` or `app.registerAction()` metadata such as labels, icons, views, modal behavior, or param field defaults.
- Use [frontend-views](../frontend-views/SKILL.md) when the change is about shared view primitives, headers, toolbars, or route-level view composition.
- Use [backend-actions](../backend-actions/SKILL.md) when the change affects params shape, permissions, execution, transactions, or return contracts.
- Use [`useActionView`](../frontend-hooks/useActionView.md) when you need headless control instead of the built-in `ActionView` shell.

---

## Props reference

| Prop               | Type                                              | Default        | Description                                               |
| ------------------ | ------------------------------------------------- | -------------- | --------------------------------------------------------- |
| `action`           | `string`                                          | —              | Backend action name (e.g. `'UiTaskAssign'`)               |
| `model`            | `string`                                          | —              | Model name — required for object/model actions            |
| `id`               | `string`                                          | —              | Object ID for object-level actions                        |
| `fields`           | `FieldsInput<T>`                                  | all fields     | Param field selection object spec |
| `initialData`      | `Record<string, unknown>`                         | —              | Pre-fill param field values                               |
| `header`           | `ViewHeader`                                      | Execute+Cancel | Title, breadcrumb, toolbar override                       |
| `beforeExecute`    | `() => boolean \| Promise<boolean>`               | —              | Guard — return `false` to abort execution                 |
| `onExecuted`       | `(response: ActionResponse) => void \| Promise<void>` | toast+close | Called after execution; default: success toast + close  |
| `onError`          | `(error) => void \| Promise<void>`                | toast          | Called on failure; overrides default toast                |
| `refreshTriggers`  | `string[]`                                        | —              | Fields that trigger a server-side refresh on change       |
| `refreshMode`      | `'auto' \| 'custom' \| 'none'`                    | `'auto'` (hook default) | Controls how refresh triggers are handled. Omit for auto — only specify when using `'custom'` or `'none'` |
| `onRefresh`        | `OnRefreshCallback` | —         | Custom handler forwarded directly to `useDataForm`; **only called when `refreshMode: 'custom'`** and ignored in `'auto'` mode |
| `dataFormProps`    | `Partial<DataFormProps>`                          | —              | Low-level form config forwarded to internal DataForm      |
| `executeLabel`     | `string`                                          | `'Execute'`    | Execute button label. If it depends on record data, compute the final label in the wrapper view from `targetObject` and pass the result in |
| `targetObject`     | `Record<string, unknown>`                         | —              | Target object context for object actions. Pass it explicitly to `ActionView`; framework-managed object-action navigation already forwards it as a root prop to the wrapper view |
| `bulkQuery`        | `Record<string, unknown>`                         | —              | Bulk query for bulk operations                            |
| `includeUiMetadata`| `boolean`                                         | `false`        | Use UI metadata variant of the action API                 |
| `onClose`          | `() => void`                                      | —              | Called when modal is dismissed via X (not Cancel)         |
| `children`         | `ReactNode`                                       | auto-render    | Custom param form body                                    |

The execute button has a stable `elementId` of `` `${action}-execute` `` for test targeting.

---

## Shared form-view pipeline

When the action has params, `ActionView` follows the same internal form pattern as `CreateView`, `EditView`, and `ReadView`:

- It creates a `dataFormHook` with `useDataForm()`.
- It exposes that controller through `FormViewDataFormContext.Provider`.
- If you pass `children`, they are rendered inside `<dataFormHook.FormProvider>` and the same refresh-trigger provider used by `DataForm`.
- If you omit `children`, an internal `DataForm` auto-renders the params with the same controller.

This means custom param layouts can use:

- `DataField`
- `useDataFormContext()`
- `useDataFormField()`
- `useFormViewDataFormContext()`

without creating a second controller.

When the action has no params, `ActionView` renders a confirmation surface only. In that branch there is no form context because there is no param form.

---

## Procedure

Register the custom action surface on the frontend. Without registration, the framework uses the default auto-generated action surface.

```tsx
// Frontend — register the view for one action
import { defineActionDefaults } from '@drumr/framework-frontend';

export const likePetDefaults = defineActionDefaults({
  action: 'LikePet',
  view: LikePetView,
});

// Frontend — implement the ActionView wrapper
export function LikePetView({ id }: { id?: string }) {
  return <ActionView action="LikePet" model="Pet" id={id} />;
}
```

Frontend bootstrap must import the module or call the registration function once during startup. Unexecuted registration code does not affect runtime.

---

## Route registration

Most action views do not need explicit route registration. Register a route only when you need a custom path or layout:

```typescript
{ path: '/tasks/:id/assign-task', view: AssignTaskView, layout: FormLayout },
{ path: '/get-dashboard-summary', view: GetDashboardSummaryView, layout: FormLayout },
```

---

## Callback patterns

### `beforeExecute` — cancel execution

```typescript
<ActionView
  action="ArchiveTask"
  model="Task"
  id={id}
  beforeExecute={async () => {
    const confirmed = await getApp().modal.confirm({ title: 'Archive this task?' });
    return confirmed;
  }}
/>
```

### `onExecuted` — post-execution logic

```typescript
<ActionView
  action="CompleteTask"
  model="Task"
  id={id}
  onExecuted={(response) => {
    if (response.executed) {
      getApp().message.success('Task completed!');
      // closeView() is NOT called automatically when onExecuted is provided
      closeView();
    }
  }}
/>
```

When `onExecuted` is **omitted**, the default behavior is:
- Success → success toast + `closeView()`
- Error → error toast (or `onError` callback)
- Workflow blocking → close view after workflow succeeds
- Workflow non-blocking → "executing in background" toast + `closeView()`

### `onError` — override the default toast

```typescript
<ActionView
  action="AssignTask"
  id={id}
  onError={(err) => getApp().message.error(`Assignment failed: ${err.message}`)}
/>
```

### `executeLabel` — compute the button text in the wrapper view

```typescript
export function AssignTaskView({
  id,
  targetObject,
}: {
  id?: string;
  targetObject?: Record<string, unknown>;
}) {
  const title =
    typeof targetObject?.title === 'string' ? targetObject.title : undefined;
  const executeLabel = title ? `Assign task: ${title}` : 'Assign task';

  return (
    <ActionView
      action="AssignTask"
      model="Task"
      id={id}
      targetObject={targetObject}
      executeLabel={executeLabel}
    />
  );
}
```

Use this when the primary action button must include object-specific context without re-fetching the record. Keep the contract explicit: the wrapper receives `targetObject`, computes the final label, and passes that plain value to `ActionView`.

### `header.title` — derive the dialog or drawer title from the current target object

Compute object-aware titles in the wrapper from the same explicit `targetObject` prop:

```typescript
export function CompleteTaskView({
  id,
  targetObject,
}: {
  id?: string;
  targetObject?: Record<string, unknown>;
}) {
  const title =
    typeof targetObject?.title === 'string' ? targetObject.title : undefined;

  return (
    <ActionView
      action="CompleteTask"
      model="Task"
      id={id}
      targetObject={targetObject}
      header={{ title: title ? `Complete: ${title}` : 'Complete' }}
    />
  );
}
```

When the wrapper view is opened from a framework-managed object action, accept `targetObject` and pass it through to `ActionView`. `defaultParams` remain reserved for form defaults; they are not a fallback source for record context.

---

## `initialData` — pre-fill param fields

Use `useMemo` for computed defaults (avoids recomputing on every render):

```typescript
export function GetDashboardSummaryView() {
  const initialData = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, []);

  return <ActionView action="GetDashboardSummary" initialData={initialData} />;
}
```

---

## Custom form body (`children`)

When `children` are provided, they replace the auto-rendered param form:

```typescript
export function AssignTaskView({ id }: { id?: string }) {
  return (
    <ActionView action="AssignTask" model="Task" id={id}>
      <Alert
        type="info"
        message="Select an assignee and priority below."
        style={{ marginBottom: 16 }}
      />
      <DataField name="assignee" />
      <DataField name="priority" />
    </ActionView>
  );
}
```

When an object action view is opened through framework-managed toolbar/read-view actions, the selected record is already forwarded to the wrapper as `targetObject`. Pass it through explicitly so the action can execute without re-fetching the record:

```typescript
export function AssignTaskView({
  id,
  targetObject,
}: {
  id?: string;
  targetObject?: Record<string, unknown>;
}) {
  return (
    <ActionView
      action="AssignTask"
      model="Task"
      id={id}
      targetObject={targetObject}
    />
  );
}
```

For complex sectioned layouts, extract a named component:

```typescript
function DashboardSummaryForm() {
  return (
    <div style={{ padding: '0 24px' }}>
      <Alert type="info" message="Configure filters then click Execute." style={{ marginBottom: 24 }} />
      <Card>
        <Title level={4}>Filters</Title>
        <Row gutter={[16, 16]}>
          <Col span={24}><DataField name="project" /></Col>
          <Col span={12}><DataField name="startDate" /></Col>
          <Col span={12}><DataField name="endDate" /></Col>
        </Row>
      </Card>
    </div>
  );
}

export function GetDashboardSummaryView() {
  const initialData = useMemo(() => { /* date defaults */ }, []);
  return (
    <ActionView
      action="GetDashboardSummary"
      initialData={initialData}
      refreshMode="custom"
      onRefresh={handleRefresh}
    >
      <DashboardSummaryForm />
    </ActionView>
  );
}
```

---

## Cross-field validation (`refreshMode` / `onRefresh`)

```typescript
<ActionView
  action="GetDashboardSummary"
  initialData={initialData}
  refreshMode="custom"
  onRefresh={async (defaultRefresh, context) => {
    const data = context.form.state.values as {
      startDate?: string;
      endDate?: string;
    };

    if (
      (context.changedFieldsSinceRefresh.has('startDate') ||
        context.changedFieldsSinceRefresh.has('endDate')) &&
      data.startDate && data.endDate &&
      new Date(data.startDate as string) > new Date(data.endDate as string)
    ) {
      getApp().message.warning('Start date cannot be after end date.');
    }

    return defaultRefresh();
  }}
/>
```

---

## Full example — minimal object action

```typescript
// tasks/views/actions/AssignTaskView.tsx
import { ActionView } from '@drumr/framework-frontend';
import React from 'react';

export function AssignTaskView({ id }: { id?: string }) {
  return (
    <ActionView
      action="AssignTask"
      model="Task"
      id={id}
    />
  );
}
export default AssignTaskView;
```

---

## Full example — global action with custom layout and cross-field validation

```typescript
// global/views/GetDashboardSummaryView.tsx
import type { DashboardFiltersInput } from '@gql';
import React, { useMemo } from 'react';
import {
  ActionView,
  DataField,
  getApp,
  type OnRefreshCallback,
} from '@drumr/framework-frontend';
import { Alert, Card, Col, Row, Typography } from 'antd';

const { Title } = Typography;

const handleRefresh: OnRefreshCallback = async (defaultRefresh, context) => {
  const data = context.form.state.values as DashboardFiltersInput;

  if (
    context.changedFieldsSinceRefresh.has('startDate') ||
    context.changedFieldsSinceRefresh.has('endDate')
  ) {
    const start = data.startDate;
    const end = data.endDate;
    if (start && end && new Date(start) > new Date(end)) {
      getApp().message.warning('Start date cannot be after end date.');
    }
  }

  return defaultRefresh();
};

export function GetDashboardSummaryView() {
  const initialData = useMemo<DashboardFiltersInput>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, []);

  return (
    <ActionView
      action="GetDashboardSummary"
      initialData={initialData}
      refreshMode="custom"
      onRefresh={handleRefresh}
    >
      <div style={{ padding: '0 24px' }}>
        <Alert
          message="Dashboard Summary"
          description="Configure filters below then click Execute."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Card>
          <Title level={4}>Filters</Title>
          <Row gutter={[16, 16]}>
            <Col span={24}><DataField name="project" /></Col>
            <Col span={12}><DataField name="startDate" /></Col>
            <Col span={12}><DataField name="endDate" /></Col>
          </Row>
        </Card>
      </div>
    </ActionView>
  );
}
export default GetDashboardSummaryView;
```

---

## Accessing the provided controller

When the action has params, the custom body already runs inside the view's provided `FormProvider`.

Use `useDataFormContext()` or `useDataFormField()` for field-level logic.

Use `useFormViewDataFormContext()` when a helper needs the full `dataFormHook`:

```typescript
import { Button } from 'antd';
import {
  ActionView,
  DataField,
  useFormViewDataFormContext,
} from '@drumr/framework-frontend';

function AmountShortcut() {
  const { dataFormHook } = useFormViewDataFormContext();

  return (
    <Button onClick={() => dataFormHook.change('amount', 100)}>
      Set $100
    </Button>
  );
}

export function TransferView({ id }: { id?: string }) {
  return (
    <ActionView action="UiTransfer" model="Account" id={id}>
      <DataField name="amount" />
      <AmountShortcut />
    </ActionView>
  );
}
```

Do not create a second `useDataForm()` or nested `FormProvider` inside the action view body.

---

## Best practices

- Register every custom `ActionView` on the frontend with `defineActionDefaults()` or `app.registerAction()`. Without registration, the framework uses the default auto-generated action surface.
- Use `children` plus `dataFormProps` when you need sections, alerts, or layout tuning beyond the auto-rendered param form.
- Bind every field via `<DataField>` — never render a raw Ant Design input for a param field.
- Return `false` from `beforeExecute()` to cancel — never throw.
- Use `getApp().message.warning()` for validation feedback inside `onRefresh` when a non-blocking warning is enough.
- Prefer generated `@gql` action param types for `initialData`, `ctx.form.state.values`, and helper aliases instead of ad-hoc local shapes when the params type already exists in the schema.
- Treat the custom param body as already wrapped by the view's `FormProvider`; use `useDataFormContext()` / `useFormViewDataFormContext()` for shared form state.
- Remember that param-less confirmation actions do not expose a form context because there is no param form to control.
- Only specify `refreshMode` when using `'custom'` or `'none'`. `'auto'` is the default — never write `refreshMode="auto"` explicitly.
- `onRefresh` uses the same `OnRefreshCallback` signature as `useDataForm` and is only called when `refreshMode='custom'`. It is silently ignored in `'auto'` mode.

---

## Action defaults registration

`app.registerAction` is a frontend-only registry that lets you override action metadata (label, icon, style, view component, param field defaults) without touching the backend. It mirrors the `app.registerDataModel` pattern for model fields.

**Precedence:** backend `@Action ui` config **>** `app.registerAction` **>** system defaults (backend wins on conflicts).

### When to use

| Use case | Mechanism |
|---|---|
| Override label/icon/style of a toolbar button without backend change | `app.registerAction` with `label`/`icon`/`style` |
| Attach a lightweight React component as the action's view | `app.registerAction` with `view` and optional explicit route |
| Customize how specific param fields are rendered (component, label, etc.) | `app.registerAction` with `params` |

### File convention

```
frontend/src/config/actions/<DomainName>Actions.ts
```

Export a bootstrap function or module-level registration that frontend startup executes once.

### Basic example — label + icon override

```tsx
// frontend/src/config/actions/TaskActions.tsx
import React from 'react';
import { SwapOutlined } from '@ant-design/icons';
import { app } from '@drumr/framework-frontend';

export function registerTaskActions() {
  app.registerAction({
    action: 'ChangeStatus',
    label: 'Change Status',
    icon: <SwapOutlined />,
    style: 'primary',
  });
}
```

### Param field component override

```tsx
// frontend/src/config/actions/TaskActions.tsx
import React from 'react';
import { SwapOutlined } from '@ant-design/icons';
import { app, ChoiceDropdown } from '@drumr/framework-frontend';
import type { UiChangeStatusParams } from '@gql';

export function registerTaskActions() {
  app.registerAction<UiChangeStatusParams>({
    action: 'ChangeStatus',
    label: 'Change Status',
    icon: <SwapOutlined />,
    params: {
      newStatus: [
        {
          context: 'write',
          component: <ChoiceDropdown placeholder="Select new status…" />,
        },
      ],
    },
  });
}
```

The `params` entries follow the same `DataModelFieldDefault` shape as `app.registerDataModel` fields — single object or context-aware array. The `DataField` rendering code picks these up automatically via `DataFormContext.actionName`.

### Functional view component

`app.registerAction` can register a React component as the action's view. `openView()` auto-derives the canonical route on first navigation when routing does not already provide an explicit path.

```tsx
// frontend/src/tasks/views/actions/ChangeTaskStatusView.tsx
import React from 'react';
import { ActionView } from '@drumr/framework-frontend';

export function ChangeTaskStatusView({ id }: { id?: string }) {
  return <ActionView action="ChangeStatus" model="Task" id={id} />;
}
```

```tsx
// frontend/src/config/actions/TaskActions.tsx
import { app } from '@drumr/framework-frontend';
import { ChangeTaskStatusView } from '../../tasks/views/actions/ChangeTaskStatusView';

export function registerTaskActions() {
  app.registerAction({
    action: 'ChangeStatus',
    view: ChangeTaskStatusView,
  });
}
```

**Key rules for registered functional views:**
- If `app.registerRoutes` includes an explicit route for the component, that path wins over the auto-derived one.
- Register the component on the frontend action registry so navigation, labels, and view resolution can discover it.

### `ActionDefaultsConfig` type reference

```ts
interface ActionDefaultsConfig<TParams = any> {
  action: string;                           // Required — action name
  label?: string;                           // Button label override
  icon?: React.ReactNode;                   // Button icon override
  style?: string;                           // Button style override
  view?: ((...args: any[]) => any) | (new (...args: any[]) => any); // Registered view component
  modalSize?: string | number;             // Modal size override
  confirmationModal?: boolean;             // Show confirmation modal override
  params?: {                               // Per-param field UI config
    [K in keyof TParams]?: ActionParamFieldDefault | ActionParamFieldDefault[];
  };
}

interface ActionParamFieldDefault {
  context?: UiContextMatcher;              // 'read' | 'write' | 'all'
  component?: React.ReactElement;
  label?: string | ((instance: any) => string);
  visible?: boolean | ((instance: any) => boolean);
  editable?: boolean | ((instance: any) => boolean);
  disabled?: boolean | ((instance: any) => boolean);
  helpMessage?: string | ((instance: any) => string);
  componentOptions?: Record<string, any>;
}
```

For `params.*.component`, pass a JSX element such as `<ChoiceDropdown />` or a custom React element.

### Registry API

| Function | Description |
|---|---|
| `app.registerAction(config)` | Register action defaults |
| `getActionDefaults(actionName)` | Look up defaults by action name |
| `getActionDefaultsByComponent(component)` | Inverse lookup by ComponentType |
| `getActionNameByComponent(component)` | Get action name for a ComponentType |
| `getActionParamDefaults(actionName, fieldName)` | Get param field config for one field |
| `hasActionDefaults(actionName)` | Check whether defaults exist for an action |
| `clearActionDefaults()` | Clear registry (tests only) |

```tsx
// Step 1 — frontend: register the action view
app.registerAction({
  action: 'LikePet',
  view: LikePetView,
});

// Step 2 — frontend: implement the ActionView component
export function LikePetView({ id }: { id?: string }) {
  return <ActionView action="LikePet" model="Pet" id={id} />;
}
```

---

## Related skills

- [frontend-declarative-config](../frontend-declarative-config/SKILL.md) — register action defaults, param field UI, labels, icons, and functional views
- [frontend-views](../frontend-views/SKILL.md) — shared view concepts, routing, headers, and toolbar composition
- [frontend-form-views](../frontend-form-views/SKILL.md) — create/edit/read form surfaces that share form-view patterns with `ActionView`
- [frontend-table-views](../frontend-table-views/SKILL.md) — table surfaces that launch or react to actions
- [backend-actions](../backend-actions/SKILL.md) — action contract, permissions, params, and execution lifecycle

### When to switch

| Associated Skill | When to navigate | Why the current info is NOT enough |
| --- | --- | --- |
| [frontend-declarative-config](../frontend-declarative-config/SKILL.md) | When the change is registration, label/icon config, modal behavior, or param field UI defaults | This skill focuses on the `ActionView` surface, not the broader action-defaults registry |
| [backend-actions](../backend-actions/SKILL.md) | When you need to implement or modify the backend action this view binds to | This skill covers frontend wiring, not backend action implementation |
| [frontend-views](../frontend-views/SKILL.md) | When shared view-level header/toolbar/navigation behavior is needed | This skill is specialized for action views and omits general view primitives |
| [frontend-api](../frontend-api/SKILL.md) | When the action view must execute custom API operations or prefetch data | This skill covers component props, not full API operation-builder patterns |
| [frontend-notifications](../frontend-notifications/SKILL.md) | When action feedback patterns (confirmations, toasts, notifications) need deeper reference | This skill shows action-view callbacks but is not the canonical notifications guide |
| [useActionView](../frontend-hooks/useActionView.md) | When you need a headless/custom action surface instead of the `ActionView` component | This skill documents the component props; the hook reference covers the headless controller (render modes, toolbar, result, refresh coordination) |

---

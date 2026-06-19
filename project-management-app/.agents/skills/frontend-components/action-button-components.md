# Action button components

> Part of the [frontend-components](./SKILL.md) skill.

---

## Purpose

Action buttons are standalone React components that execute backend actions (GraphQL mutations/queries) with built-in:

- Parameter collection via action views
- Confirmation modals
- Loading states and error handling
- Post-execution callbacks
- Workflow support (inline progress, notifications)

**Most of the time you will NOT use these directly** — the `toolbar` namespace handles action buttons declaratively. Use standalone action buttons only in `@CustomView` components where you need full control over placement and behavior.

> These components internally use `useActionExecution` (the framework's internal strategy engine). For a fully custom headless UI — a custom button, menu item, or card CTA — use the public [`useActionButton`](../frontend-hooks/useActionButton.md) or [`useActionView`](../frontend-hooks/useActionView.md) hooks directly instead of these components.

---

## Import

```typescript
import {
  ObjectActionButton,
  ModelActionButton,
  GlobalActionButton,
  WorkflowActionButton,
} from '@drumr/framework-frontend';

import type {
  ActionResponse,
  ObjectActionButtonProps,
  ModelActionButtonProps,
  GlobalActionButtonProps,
  WorkflowActionButtonProps,
} from '@drumr/framework-frontend';
```

---

## Component types

### `ObjectActionButton`

Executes an action on a specific record. Reads `id` and `targetObject` from the enclosing `DataForm` context when not provided explicitly:

```typescript
// Inside a DataForm — automatically gets object context
<DataForm model="Task" id={taskId}>
  <ObjectActionButton
    name="CompleteTask"
    label="Complete"
    style="primary"
    afterExecution={(response) => handleResult(response)}
  />
</DataForm>

// Standalone with explicit context
<ObjectActionButton
  name="CompleteTask"
  id={taskId}
  label="Complete"
  style="primary"
  container="modal"
  modalPosition="right"
  afterExecution={(response) => handleResult(response)}
/>
```

### `ModelActionButton`

Executes a model-level action (no specific record):

```typescript
<ModelActionButton
  name="BulkImport"
  model="Task"
  label="Import Tasks"
  style="primary"
  container="modal"
  afterExecuted={(response) => tableRef.current?.refresh()}
/>
```

### `GlobalActionButton`

Executes a global action with a custom GraphQL operation:

```typescript
<GlobalActionButton
  operation={gql`
    query GetDashboardSummary($params: DashboardFiltersInput!) {
      GetDashboardSummary(params: $params) {
        ... on DashboardSummaryResultType { projectsActive projectsCompleted }
        ... on PermissionErrorType { code message }
      }
    }
  `}
  label="Get Summary"
  style="primary"
  confirmationModal={false}
  afterExecuted={(response) => handleResult(response)}
/>
```

### `WorkflowActionButton`

Executes a long-running workflow action with progress tracking:

```typescript
<WorkflowActionButton
  name="GenerateReport"
  label="Generate Report"
  style="primary"
  blockingExecution={true}
  showProgress={true}
  successMessage="Report generated successfully"
  errorMessage="Report generation failed"
  onWorkflowComplete={(status) => handleComplete(status)}
/>
```

---

## Common props

| Prop | Type | Description |
| --- | --- | --- |
| `name` | `string` | Action name (matches backend `@Action` name) |
| `options` | `UiActionMetadata` | Pre-resolved action metadata (from `uiListActions`); individual props below override it |
| `label` | `string` | Button display text |
| `icon` | `ReactNode` | Button icon |
| `style` | `'primary' \| 'default' \| 'dashed' \| 'text' \| 'link' \| 'danger'` | Visual style |
| `size` | `'small' \| 'middle' \| 'large'` | Button size |
| `disabled` | `boolean` | Disable the button |
| `visible` | `boolean` | Show/hide the button |
| `container` | `'modal' \| 'page' \| 'current'` | Where to open the action view |
| `modalPosition` | `'center' \| 'right'` | Modal position |
| `modalSize` | `'small' \| 'medium' \| 'large'` | Modal size |
| `confirmationModal` | `boolean \| object` | Show confirmation before execution |

> **Note on post-execution callbacks:** Each component uses its own prop name:
>
> - `ObjectActionButton` → `afterExecution?: (response: ActionResponse) => void`
> - `ModelActionButton` → `afterExecuted?: (response: ActionResponse) => void`
> - `GlobalActionButton` → `afterExecuted?: (response: ActionResponse) => void`
> - `WorkflowActionButton` → `onWorkflowComplete?: (status: WorkflowStatusInfo) => void`

---

## `ActionResponse`

```typescript
type ActionResponse<T = unknown> =
  | {
      executed: true;
      responseType: 'data';
      actionName?: string;
      data: T;
    }
  | {
      executed: true;
      responseType: 'workflow';
      actionName?: string;
      workflowId: string;
      status?: string;
    }
  | {
      executed: false;
      actionName?: string;
      cancelled?: boolean;
      error?: string;
    };
```

Always narrow on `executed` first, then on `responseType` for successful executions:

```typescript
afterExecution={(response) => {
  if (!response.executed) return; // cancelled or error
  if (response.responseType === 'workflow') {
    console.log('Workflow started:', response.workflowId);
  } else {
    console.log('Data response:', response.data);
  }
}}
```

---

## Examples

### GlobalActionButton in custom view (project-management-app)

```typescript
// apps/project-management-app/frontend/src/shared/views/ErrorPagesTestView.tsx
import { GlobalActionButton } from '@drumr/framework-frontend';
import { gql } from '@apollo/client';

<GlobalActionButton
  operation={gql`
    query GetDashboardSummary($params: DashboardFiltersInput!) {
      GetDashboardSummary(params: $params) {
        ... on CannotExecuteErrorType { code message }
        ... on DashboardSummaryResultType {
          projectsActive projectsCompleted tasksInProgress
        }
        ... on PermissionErrorType { code message }
        ... on ValidationErrorType { code errors { constraint field message } message }
      }
    }
  `}
  label="Execute Restricted Action (Get Dashboard Summary)"
  style="primary"
  confirmationModal={false}
/>
```

### ObjectActionButton via toolbar (project-management-app)

The preferred approach — toolbar wraps the execution internally:

```typescript
// apps/project-management-app/frontend/src/tasks/views/actions/TaskEstimateView.tsx
toolbar.objectAction('SubmitEstimate', {
  elementId: 'submit-estimate',
  label: 'Submit for review',
  style: 'primary',
  afterExecution: response => this.handleResult(response),
});
```

---

## Headless alternative — `useActionButton` / `useActionView`

When you need a fully custom rendering surface (no `<Button>`, your own state, conditional rendering), use the public hooks directly instead of these components:

```typescript
import { useActionButton } from '@drumr/framework-frontend';
import { Button } from 'antd';

function DeactivateButton({ id }: { id: string }) {
  const { execute, canRun, executing } = useActionButton({
    action: 'DeactivateUser',
    variables: { id },
    confirmationModal: { title: 'Deactivate this user?', danger: true },
    onExecuted: (response) => {
      if (response.executed) console.log('Done');
    },
  });

  return (
    <Button danger loading={executing} disabled={!canRun} onClick={() => void execute()}>
      Deactivate
    </Button>
  );
}
```

See [useActionButton](../frontend-hooks/useActionButton.md) and [useActionView](../frontend-hooks/useActionView.md) for the full API.

---

## Best practices

1. **Prefer `toolbar.objectAction()` / `toolbar.modelAction()`** over standalone components — the toolbar handles resolution, permissions, and placement.
2. **Use standalone buttons only in custom views** where the toolbar DSL doesn't fit.
3. **For fully custom rendering, use `useActionButton`** instead of these components.
4. **Use `confirmationModal`** for destructive actions (delete, discard, etc.).
5. **For workflows, use `showProgress: true`** to display inline progress tracking.

---

## Related skills

- [toolbar-components](./toolbar-components.md) — Preferred declarative toolbar API
- [workflow-components](./workflow-components.md) — Workflow progress and notification components
- [frontend-action-views](../frontend-action-views/SKILL.md) — Views that collect action parameters
- [useActionButton](../frontend-hooks/useActionButton.md) — Headless hook for custom action surfaces
- [useActionView](../frontend-hooks/useActionView.md) — View-oriented headless hook (title, toolbar, result, refresh)

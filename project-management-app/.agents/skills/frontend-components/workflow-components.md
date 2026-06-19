# Workflow components

> Part of the [frontend-components](./SKILL.md) skill.

---

## Purpose

Workflow components provide real-time UI feedback for long-running backend actions (DBOS workflows). They handle:

- **Inline progress** — shows a progress bar inside the action modal while a workflow runs
- **Notification center** — navbar badge showing active/recent workflows with status updates

---

## Import

```typescript
import { WorkflowInlineProgress, WorkflowNotificationCenter } from '@drumr/framework-frontend';
```

---

## `WorkflowInlineProgress`

Displays workflow execution progress inline within an ActionView modal. Replaces the form content after workflow execution starts.

### Features

- Real-time progress updates via polling (with GraphQL subscription support)
- Status display with icons (pending, running, success, error, cancelled)
- Progress bar for running workflows
- Optional cancel button
- Auto-close on success
- Error detail display on failure

### Props

| Prop               | Type                                   | Description                                    |
| ------------------ | -------------------------------------- | ---------------------------------------------- |
| `workflowId`       | `string`                               | Workflow ID to track                           |
| `actionName`       | `string`                               | Display name of the action                     |
| `successMessage`   | `string`                               | Custom success message                         |
| `errorMessage`     | `string`                               | Custom error message prefix                    |
| `showCancelButton` | `boolean`                              | Show "Cancel Action" button (default: `false`) |
| `onComplete`       | `(status: WorkflowStatusInfo) => void` | Callback when workflow finishes                |
| `onCancel`         | `() => void`                           | Callback when cancel is clicked                |
| `showTitle`        | `boolean`                              | Show action name as title (default: `true`)    |

### Usage

```typescript
<WorkflowInlineProgress
  workflowId="workflow-123"
  actionName="Generate Report"
  onComplete={(status) => console.log('Done:', status)}
  onCancel={() => console.log('Cancelled')}
  showCancelButton={true}
/>
```

> **Note:** You rarely render this directly. For workflow-backed actions, the framework shows `WorkflowInlineProgress` automatically inside the action modal when the action is executed as blocking (controlled by the action's `blockingExecution` setting server-side) and a `workflowId` is available. `showProgress` controls non-blocking workflow progress/notification display.

---

## `WorkflowNotificationCenter`

A navbar component that shows a badge with the count of active workflows and a dropdown list with status updates.

### Features

- Badge with active workflow count
- Dropdown showing workflow list with real-time status
- Duration display and relative timestamps
- Click to navigate to workflow details
- Clear all button
- Toast notifications on completion when dropdown is closed

### Usage

The `WorkflowNotificationCenter` is rendered in the layout's header. It is typically configured automatically by the framework when workflows are enabled.

```typescript
// In layout actionsRender
<WorkflowNotificationCenter />
```

### Workflow status values

These are the runtime string values exposed by `WorkflowStatus`. Compare against these lowercase values, not enum-style uppercase keys.

| Status             | Icon          | Description         |
| ------------------ | ------------- | ------------------- |
| `pending`          | Clock (blue)  | Workflow queued     |
| `enqueued`         | Clock (blue)  | Workflow in queue   |
| `running`          | Clock (blue)  | Workflow executing  |
| `success`          | Check (green) | Workflow completed  |
| `error`            | Close (red)   | Workflow failed     |
| `cancelled`        | Stop (grey)   | Workflow cancelled  |
| `retries_exceeded` | Close (red)   | Max retries reached |

---

## Integration with `Toolbar`

The preferred way to trigger workflow actions is via the toolbar:

```typescript
// Toolbar handles WorkflowInlineProgress rendering automatically
toolbar.objectAction<Task>('GenerateReport', {
  style: 'primary',
  // The framework detects workflow actions and shows progress automatically
});
```

For explicit workflow control in toolbar:

```typescript
toolbar.objectAction('ProcessFiles', {
  elementId: 'process-files',
  label: 'Run Audits',
  style: 'primary',
  afterExecution: response => this.handleProcessComplete(response),
});
```

---

## Best practices

1. **Do not render `WorkflowInlineProgress` manually** — use `showProgress: true` on toolbar action buttons.
2. **`WorkflowNotificationCenter` is layout-level** — do not place it inside views.
3. **Use `afterExecution` callbacks** to handle post-workflow logic (refresh tables, navigate, etc.).
4. **The framework auto-detects workflow actions** — no special configuration needed for toolbar buttons.
5. **Use `showCancelButton` cautiously** — cancelling a workflow may leave data in an inconsistent state.

---

## Related skills

- [toolbar-components](./toolbar-components.md) — Preferred way to trigger workflow actions
- [action-button-components](./action-button-components.md) — WorkflowActionButton component
- [frontend-action-views](../frontend-action-views/SKILL.md) — Views that collect workflow parameters

# useActionView

> Part of the [frontend-hooks](./SKILL.md) skill.

---

## Purpose

`useActionView` is the headless controller behind the `ActionView` component. It
turns a single action into a render-ready view: a `title`, a render `mode`
(`form` / `confirm` / `workflow`), a default `toolbar`, an enriched `result`,
and a `useActionButton`-shaped `action` controller that carries the inline
param `form`.

It is built around a **single** inline execution engine plus one `useDataForm`,
so the view's `mode` / `workflow` / `executing` always reflect the exact engine
instance that executed. (This is why it does not reuse `useActionButton`
internally — that would spin up a second engine whose workflow state the view
could never observe.)

The hook owns state, refresh coordination, and lifecycle callbacks. It does
**not** render anything, toast, or close the view — the rendering component does
that. Use it when you need a custom action surface with full control over markup
but want the framework's title/toolbar/result/refresh behavior.

Default API is the **Data API** (`includeUiMetadata` defaults to `false`) — this
works for every action, including workflows and scalar/custom-result actions.
Opt into the **Meta API** with `includeUiMetadata: true` when the action returns a
**model type** and you want the enriched `result` to bind directly to
`<DataField options={view.result.field} />`. `uiAction()` throws for
non-model-returning actions, so Meta is opt-in, not the default.

---

## Signature

```ts
function useActionView<TResult = unknown>(
  options: UseActionViewOptions<TResult>,
): UseActionViewResult<TResult>;
```

```tsx
import { useActionView } from '@drumr/framework-frontend';

const view = useActionView({ action: 'AssignTask', model: 'Task', id });
```

---

## Options (`UseActionViewOptions`)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `action` | `string` | — | Backend action name (e.g. `'AssignTask'`) |
| `model` | `string` | — | Model name — relevant for object/model actions |
| `id` | `string` | — | Object id; falls back to ambient context when omitted |
| `fields` | `FieldsInput<TResult>` | all fields | Param field selection passed to the inline form |
| `initialData` | `Record<string, unknown>` | — | Pre-fill values for the param form |
| `includeUiMetadata` | `boolean` | `false` | Opt into the Meta API (enriched result for `DataField` binding). Requires a model-returning action — leave `false` (Data API) for workflows/scalar/custom-result actions |
| `targetObject` | `Record<string, unknown>` | — | Target object for non-persistent object actions |
| `bulkQuery` | `Record<string, unknown>` | — | Bulk query for bulk operations |
| `executeLabel` | `string` | `'Execute'` | Execute button label in the default toolbar |
| `title` | `string` | action label or name | Override the auto-derived title |
| `refreshMode` | `'auto' \| 'custom' \| 'none'` | form default (`'auto'`) | How the param form's refresh triggers behave |
| `onRefresh` | `(changedFields, data, prevData, dirtyFields?) => void` | — | Custom refresh handler. Wired via the form's refresh adapter; only meaningful with `refreshMode: 'custom'` |
| `beforeExecute` | `() => boolean \| Promise<boolean>` | — | Guard — return `false` to abort execution |
| `onExecuted` | `(response: ActionResponse<TResult>) => void \| Promise<void>` | — | Called after execution completes |
| `onError` | `(error: { type: string; message: string }) => void \| Promise<void>` | — | Called on failure |
| `refreshModels` | `string[]` | action's own model | Models whose active Apollo queries are refetched on success |

---

## Return value (`UseActionViewResult`)

| Property | Type | Description |
| --- | --- | --- |
| `title` | `string` | Resolved view title (`title` override → action label → action name) |
| `mode` | `'form' \| 'confirm' \| 'workflow'` | Which surface the component should render |
| `hasParams` | `boolean` | Whether the action has a params form |
| `executing` | `boolean` | `true` while an execution is in flight |
| `result` | `TResult \| null` | Last successful result (UI-enriched when `includeUiMetadata`) |
| `error` | `Error \| null` | Last execution error, if any |
| `executed` | `boolean` | `true` once a successful execution has occurred |
| `action` | `UseActionButtonResult<TResult>` | The underlying action controller; carries `.form` when params exist |
| `toolbar` | `{ buttons: ToolbarCustomButton[] }` | Default toolbar (Execute + Cancel, or Close during a workflow) |
| `workflow` | `ActionViewWorkflowState` | Present **only** when `mode === 'workflow'` |

### `ActionViewWorkflowState`

| Field | Type | Description |
| --- | --- | --- |
| `workflowId` | `string` | Id of the running workflow |
| `showProgress` | `boolean` | Whether to render inline progress |
| `successMessage` | `string` | Optional success message |
| `errorMessage` | `string` | Optional error message |
| `onComplete` | `(status: WorkflowStatusInfo) => void` | Pass to `WorkflowInlineProgress.onComplete` |
| `onCancel` | `() => void` | Pass to the Close/Cancel button while the workflow runs |

---

## Render modes

The hook computes `mode` from the action and engine state; the component renders
accordingly. The canonical pattern is a `switch`:

```tsx
function renderBody(view: UseActionViewResult) {
  switch (view.mode) {
    case 'form':
      // action has params — render the param form
      return <DataForm dataFormHook={view.action.form} showActions={false} />;
    case 'confirm':
      // no params — render a confirmation message
      return <p>Execute {view.title}?</p>;
    case 'workflow':
      // long-running workflow in progress — render inline progress
      return (
        <WorkflowInlineProgress
          workflowId={view.workflow!.workflowId}
          showProgress={view.workflow!.showProgress}
          onComplete={view.workflow!.onComplete}
        />
      );
  }
}
```

- `form` — the action declares params; render the param form.
- `confirm` — no params; render a confirmation surface.
- `workflow` — a workflow is running; render inline progress. `view.workflow`
  is defined only in this mode.

---

## Headless boundary

The split between hook and component is deliberate:

**The hook owns:**

- execution state (`executing`, `result`, `error`, `executed`)
- Apollo refresh coordination (refetch active queries on success)
- the lifecycle callbacks (`onExecuted`, `onError`, `beforeExecute`)
- the inline param form (`view.action.form`)

**The component owns:**

- all rendering (form body, confirmation text, inline progress)
- toasts / messages
- `closeView()` after success

`useActionView` never calls `getApp().message.*` or `closeView()`. Wire those in
your component, typically from `onExecuted`:

```tsx
const view = useActionView({
  action: 'AssignTask',
  model: 'Task',
  id,
  onExecuted: (response) => {
    if (response.executed) {
      getApp().message.success('Task assigned');
      closeView();
    }
  },
});
```

---

## Refresh coordination

On a successful execution the hook invalidates active Apollo queries so lists
and read views re-fetch automatically. By default it targets the action's own
model (when known). Override the set of models with `refreshModels`:

```tsx
useActionView({
  action: 'ReassignAll',
  model: 'Task',
  // refetch both Task and Project active queries on success
  refreshModels: ['Task', 'Project'],
});
```

This is separate from the param form's own field-refresh behavior, which is
controlled by `refreshMode` / `onRefresh` (the hook wires `onRefresh` through the
form's refresh adapter as `refreshMode: 'custom'`).

---

## Controller pattern

`view.action` is a `useActionButton`-shaped controller. Pass its `.form` into a
`DataForm`, and read `view.result` for enriched field metadata:

- Render the param form: `<DataForm dataFormHook={view.action.form} />`
  (the prop is `dataFormHook`, **not** `controller`).
- Bind a result field: `<DataField options={view.result?.field} />`
  — requires opting into the Meta API (`useActionView({ action, includeUiMetadata: true })`)
  on a model-returning action so `result` carries enriched `{ value, options, errors }`.
- Drive your own buttons: `view.action.execute()`, `view.action.canRun`,
  `view.action.executing`.

You can also just spread the framework default toolbar instead of building your
own buttons: `view.toolbar.buttons`.

---

## Full worked example — `AssignTaskView`

```tsx
import {
  useActionView,
  DataForm,
  WorkflowInlineProgress,
  getApp,
  closeView,
} from '@drumr/framework-frontend';
import { Button, Space } from 'antd';

export function AssignTaskView({ id }: { id?: string }) {
  const view = useActionView({
    action: 'AssignTask',
    model: 'Task',
    id,
    fields: { assignee: true, priority: true },
    onExecuted: (response) => {
      if (response.executed) {
        getApp().message.success('Task assigned');
        closeView();
      }
    },
    onError: (err) => getApp().message.error(err.message),
  });

  return (
    <div>
      <h2>{view.title}</h2>

      {view.mode === 'form' && (
        <DataForm dataFormHook={view.action.form} showActions={false} />
      )}

      {view.mode === 'confirm' && <p>Execute {view.title}?</p>}

      {view.mode === 'workflow' && view.workflow && (
        <WorkflowInlineProgress
          workflowId={view.workflow.workflowId}
          showProgress={view.workflow.showProgress}
          onComplete={view.workflow.onComplete}
        />
      )}

      {view.mode !== 'workflow' && (
        <Space>
          <Button onClick={() => closeView()}>Cancel</Button>
          <Button
            type="primary"
            loading={view.executing}
            disabled={!view.action.canRun}
            onClick={() => void view.action.execute()}
          >
            Assign
          </Button>
        </Space>
      )}
    </div>
  );
}
export default AssignTaskView;
```

For most action views you do not need this much markup — the `ActionView`
component is a thin renderer over this hook and handles the toolbar, modes, and
default toast/close for you. Reach for `useActionView` directly only when you
need full control over the surface.

---

## Related skills

- [useActionButton.md](./useActionButton.md) — the headless action button controller (`view.action` is shaped like its result)
- [useDataForm.md](./useDataForm.md) — the param form controller exposed as `view.action.form`
- [frontend-action-views](../frontend-action-views/SKILL.md) — the `ActionView` component (thin renderer over this hook) and `@Action` backend linking
- [frontend-components/toolbar-components.md](../frontend-components/toolbar-components.md) — the declarative toolbar DSL

# useActionButton

> Part of the [frontend-hooks](./SKILL.md) skill.

---

## Purpose

`useActionButton` is the headless, component-agnostic controller behind every
Drumr action button. It executes a model / object / global action and exposes
imperative state (`execute`, `canRun`, `executing`, `result`, `error`, `reset`)
plus an optional inline param `form`.

It owns no rendering: no button, no modal, no toast. You bring the UI; the hook
brings the execution strategy, the permission/context gate, and (when you give
it `fields`) an inline `useDataForm` controller.

Use it when you need to:

- build a custom action surface (a button, menu item, card CTA) in a
  Custom Views where the toolbar DSL does not fit
- collect action params inline next to other content instead of in a separate
  param view
- drive an action's enabled/disabled state from your own component
- read the action result imperatively after execution

Internally the hook reads the ambient `DataFormContext` / `ViewActionContext`
for `id`, `object`, and the per-action `canExecute` permission, so a standalone
button placed inside a form or read view "just works" without wiring those
values manually.

---

## Signature

```ts
function useActionButton<TResult = unknown, TVariables extends ActionVariables = ActionVariables>(
  options: UseActionButtonOptions<TResult, TVariables>,
): UseActionButtonResult<TResult>;
```

```tsx
import { useActionButton } from '@drumr/framework-frontend';

const { execute, canRun, executing, result, error, reset, form } =
  useActionButton({ action: 'DeactivateUser', variables: { id } });
```

---

## Options (`UseActionButtonOptions`)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `action` | `string` | — | Action name as declared in the model (e.g. `'AssignTask'`, `'DeactivateUser'`) |
| `variables` | `TVariables` | — | Execution variables. `id` / `object` fall back to ambient context when omitted |
| `fields` | `FieldsInput<TResult>` | — | When provided, the hook owns an inline `useDataForm` (exposed as `.form`) and `execute()` validates + submits it. When omitted, `execute()` resolves the metadata strategy |
| `initialData` | `Record<string, unknown>` | — | Pre-fill values for the inline form (only meaningful with `fields`) |
| `includeUiMetadata` | `boolean` | `false` | Use the UI-enriched Meta API instead of the raw Data API |
| `label` | `string` | — | Plain-string label for confirmation / notification titles |
| `container` | `ViewContainer` | — | Container for the param view when the strategy opens one |
| `modalSize` | `ModalSize \| number` | — | Modal size when a param view opens |
| `modalPosition` | `ModalPosition` | — | Modal position when a param view opens |
| `confirmationModal` | `ActionConfirmation` | shown unless `false` | Confirmation dialog for direct execution. Pass `false` to skip, or an object to customize title/content/labels/danger |
| `canRun` | `boolean` | — | Explicit override. When set, replaces the computed permission + context gate entirely |
| `blockingExecution` | `boolean` | — | Workflow tuning — block the UI on a modal while the workflow runs |
| `showProgress` | `boolean` | — | Workflow tuning — show inline progress |
| `successMessage` | `string` | — | Workflow success message |
| `errorMessage` | `string` | — | Workflow error message |
| `view` | `unknown` | — | Developer escape hatch (used by toolbar internals; rarely needed) |
| `operation` | `DocumentNode` | — | Developer escape hatch — explicit GraphQL operation (used by toolbar internals) |
| `onExecuted` | `(response: ActionResponse<TResult>) => void \| Promise<void>` | — | Called after execution completes (success or failure) with the response |

### `ActionVariables`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Target record id (falls back to ambient context) |
| `ids` | `string[]` | Selected ids for a bulk action |
| `object` | `Record<string, unknown>` | Target object for a non-persistent action (falls back to ambient context) |
| `params` | `Record<string, unknown>` | Param values for actions that skip the inline form |
| `query` | `Record<string, unknown>` | Bulk query for the inline engine |
| `allRowsSelected` | `boolean` | Whether the "select all rows" mode is active |
| `selectionQuery` | `Record<string, unknown>` | Query describing the current selection |

### `ActionConfirmation`

`boolean | { title?; content?; cancelLabel?; submitterLabel?; danger? }`. `true`
(or omitting it) shows the default confirmation; `false` skips it.

---

## Return value (`UseActionButtonResult`)

| Property | Type | Description |
| --- | --- | --- |
| `execute` | `() => Promise<void>` | Run the action using the resolved strategy (or submit the inline form). Named **`execute`**, not `run` |
| `canRun` | `boolean` | `true` when the action can be executed: permission + required context + not executing |
| `executing` | `boolean` | `true` while an execution is in flight |
| `result` | `TResult \| null` | Result of the last successful execution (raw or UI-enriched per `includeUiMetadata`) |
| `error` | `Error \| null` | Error of the last execution, if any |
| `reset` | `() => void` | Clear `result` + `error` |
| `form` | `UseDataFormReturn` | Inline form controller — present **only** when `fields` was provided |

---

## `canRun` semantics

`canRun` is `true` only when all of the following hold:

1. **Permission** — the ambient action metadata's `canExecute` is not `false`.
   When the action metadata is not yet known, the gate is optimistic (treated as
   allowed) so the button is not disabled while metadata loads.
2. **Required context** — non-object actions always pass. Object actions require
   at least one of: a resolved `id` (from `variables.id` or ambient context),
   a non-empty `variables.ids`, `variables.allRowsSelected === true`, or a
   `variables.object`.
3. **Not executing** — `executing` must be `false`.

The `canRun` option overrides this computation entirely. When you pass
`canRun: true | false`, that value is returned as-is and the permission/context
gate is ignored.

> Permission gating here is a UX convenience only. The backend must still enforce
> the real permission — `canRun` does not replace a backend `can('execute', ...)`
> check.

---

## Execution strategies

`execute()` behaves differently depending on whether you supplied `fields`.

### No `fields` — metadata strategy

When `fields` is omitted, the hook resolves the action's strategy from its
metadata and runs one of:

- **open param view** — the action declares params and a view; the strategy
  opens it in the configured `container` / `modalSize` / `modalPosition`
- **confirm + execute** — shows the confirmation dialog (unless
  `confirmationModal: false`), then runs the mutation directly
- **direct execution** — runs the GraphQL mutation/query immediately
- **workflow** — starts a long-running workflow, either blocking on a modal
  (`blockingExecution`) or running in the background with progress / notifications

In this mode the hook does not own a form and `form` is `undefined`.

### `fields` — inline form

When you pass `fields`, the hook creates and owns an inline `useDataForm`
controller for the action's params model (exposed as `.form`). `execute()`:

- submits the form (validating params) when the action has params, or
- runs the param-less execution path when it does not.

Use this when you want the param inputs rendered inline in your own layout
(via `<DataForm dataFormHook={form} />` or `FormProvider` + `DataField`)
rather than in a separate param view.

---

## Worked example — standalone param-less button

A custom deactivate button that reads `id` from ambient context, confirms, and
runs directly:

```tsx
import { useActionButton, getApp } from '@drumr/framework-frontend';
import { Button } from 'antd';

export function DeactivateButton({ id }: { id?: string }) {
  const { execute, canRun, executing, error, reset } = useActionButton({
    action: 'DeactivateUser',
    variables: { id },
    label: 'Deactivate user',
    confirmationModal: {
      title: 'Deactivate this user?',
      content: 'They will lose access immediately.',
      danger: true,
    },
    onExecuted: (response) => {
      if (response.executed) {
        getApp().message.success('User deactivated');
      }
    },
  });

  return (
    <>
      <Button
        danger
        loading={executing}
        disabled={!canRun}
        onClick={() => void execute()}
      >
        Deactivate
      </Button>
      {error && (
        <span role="alert" onClick={reset}>
          {error.message}
        </span>
      )}
    </>
  );
}
```

---

## Worked example — inline-form button

A button that collects params inline through the hook-owned `form`:

```tsx
import { useActionButton, DataForm, getApp } from '@drumr/framework-frontend';
import { Button } from 'antd';

export function AssignTaskInline({ id }: { id: string }) {
  const { execute, canRun, executing, form } = useActionButton({
    action: 'AssignTask',
    variables: { id },
    fields: { assignee: true, priority: true },
    onExecuted: (response) => {
      if (response.executed) {
        getApp().message.success('Task assigned');
      }
    },
  });

  return (
    <div>
      {form && <DataForm dataFormHook={form} showActions={false} />}
      <Button
        type="primary"
        loading={executing}
        disabled={!canRun}
        onClick={() => void execute()}
      >
        Assign
      </Button>
    </div>
  );
}
```

`execute()` validates and submits `form` before running the action. Note the
prop is `dataFormHook` (not `controller`).

---

## When NOT to use

- **Standard toolbar buttons** — `toolbar.objectAction()`, `toolbar.modelAction()`,
  and the `ObjectActionButton` / `ModelActionButton` / `GlobalActionButton`
  components already call `useActionButton` internally. Use the declarative DSL.
- **A full param view with title + toolbar + refresh coordination** — use
  [`useActionView`](./useActionView.md) (or the `ActionView` component), which is
  built around a single inline engine and adds the view chrome.
- **Plain CRUD forms** — use `EditView` / `CreateView` or `DataForm`.

---

## Related skills

- [useActionView.md](./useActionView.md) — view-oriented action controller (title, toolbar, result, refresh)
- [useDataForm.md](./useDataForm.md) — the inline form controller exposed as `.form`
- [frontend-action-views](../frontend-action-views/SKILL.md) — the `ActionView` component and `@Action` backend linking
- [frontend-components/action-button-components.md](../frontend-components/action-button-components.md) — the standalone button components built on this hook

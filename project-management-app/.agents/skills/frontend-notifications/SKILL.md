---
name: frontend-notifications
description: Essential skill for Drumr Framework frontend notifications. Use getApp() as the default feedback API in app code and App.useApp() only inside rendered function components. Covers message, modal, notification, and guardrails against manual bootstrap or direct antd message/modal/notification imports.
user-invocable: true
---

Apply to:

- '**/frontend/src/**/services/**/*.ts'
- '**/frontend/src/**/services/**/*.tsx'
- '**/frontend/src/**/utils/**/*.ts'
- '**/frontend/src/**/utils/**/*.tsx'
- '**/frontend/src/**/views/**/*.ts'
- '**/frontend/src/**/views/**/*.tsx'

# Frontend skill: notifications

## Purpose

Use this skill when the user asks about:

- Showing success, warning, error, or informational feedback in Drumr frontend code
- Confirming a user action with a modal before running a mutation or action
- Choosing between `getApp()` and `App.useApp()`
- Replacing direct `antd` `message`, `modal`, or `notification` usage with framework-aligned APIs
- Adding feedback to form callbacks, action handlers, services, or custom pages

The framework owns the Ant Design App bootstrap. Application code should read feedback APIs from that mounted instance and never bootstrap notification plumbing manually.

---

## Core building blocks

Choose the feedback API from the execution context:

| Context | Use | Why |
| --- | --- | --- |
| Plain TypeScript module, shared helper, service, or callback that can run outside React render | `getApp()` | Safe in runtime callbacks and does not require React hook context |
| Function component body | `App.useApp()` | Valid only inside a mounted React tree and keeps hook rules intact |

message is for short status feedback, modal is for confirmations and blocking decisions, and notification is for richer async outcomes.

---

## Workflow 1: utilities and callbacks with `getApp()`

Use getApp() in service modules, helper modules, and callbacks where the code can run outside a React render path.

### Checklist

- [ ] Step 1: Import `getApp` from `@drumr/framework-frontend`.
- [ ] Step 2: Call `getApp()` inside the runtime function or callback.
- [ ] Step 3: Read `message`, `modal`, or `notification` from the returned object.
- [ ] Step 4: Keep feedback near the side effect that produced it.

### Example: reusable helper with confirmation and completion feedback

```typescript
import { getApp } from '@drumr/framework-frontend';

interface BulkActionResult {
  processed: number;
  skipped?: number;
}

interface ConfirmAndRunBulkActionParams {
  actionLabel: string;
  selectionLabel: string;
  run: () => Promise<BulkActionResult>;
}

export function confirmAndRunBulkAction({
  actionLabel,
  selectionLabel,
  run,
}: ConfirmAndRunBulkActionParams): void {
  const { message, modal, notification } = getApp();

  modal.confirm({
    title: `${actionLabel} selected records?`,
    content: `This will execute ${actionLabel.toLowerCase()} for ${selectionLabel}.`,
    okText: actionLabel,
    cancelText: 'Cancel',
    onOk: async () => {
      try {
        const result = await run();
        const skipped = result.skipped ?? 0;

        message.success(`${actionLabel} started`);
        notification.success({
          message: `${actionLabel} completed`,
          description: `${result.processed} processed${skipped > 0 ? `, ${skipped} skipped` : ''}.`,
          placement: 'bottomRight',
        });
      } catch (error) {
        message.error(`${actionLabel} failed: ${(error as Error).message}`);
      }
    },
  });
}
```

### Example: view callback using `getApp()`

```typescript
import type { Task } from '@gql';
import {
  closeView,
  CreateView,
  getApp,
  toolbar,
} from '@drumr/framework-frontend';

export function TaskCreateView() {
  return (
    <CreateView
      model="Task"
      header={{
        toolbar: { buttons: [toolbar.objectAction('AssignTask')] },
      }}
      onSaved={(result?: unknown) => {
        const response = result as
          | { executed: boolean; data?: Task; error?: string }
          | undefined;

        if (response?.executed !== false) {
          const title = (response?.data as Task)?.title ?? 'Task';
          getApp().message.success(`"${title}" created successfully!`);
          closeView({ returnData: { executed: true, data: response?.data } });
        }
      }}
    />
  );
}
```

---

## Workflow 2: function components with `App.useApp()`

Use App.useApp() inside function components when the feedback belongs to handlers declared in that component.

### Checklist

- [ ] Step 1: Import `App` from `antd`.
- [ ] Step 2: Call `const { message, modal, notification } = App.useApp();` inside the component body.
- [ ] Step 3: Use those APIs inside submit, execute, or click handlers declared by the component.
- [ ] Step 4: Keep the call inside the component body and never move it to module scope.

### Example: action wrapper component

```typescript
import type { ActionResponse } from '@drumr/framework-frontend';
import { ActionView, closeView } from '@drumr/framework-frontend';
import { App } from 'antd';

interface Props {
  id: string;
}

export function InitializeProjectView({ id }: Props) {
  const { message } = App.useApp();

  const handleExecuted = (response: ActionResponse) => {
    if (response.executed) {
      message.success('Project initialized successfully.');
    } else if (response.error) {
      message.error(
        `Initialization failed (transaction rolled back): ${response.error}`,
      );
    }

    closeView({ executed: true });
  };

  return (
    <ActionView
      action="InitializeProject"
      model="Project"
      id={id}
      onExecuted={handleExecuted}
    />
  );
}
```

---

---

- Preferred app-level API is getApp() for utilities and callbacks.
- App.useApp() is valid inside rendered function components and custom hooks.
- Use message for short status feedback, modal for confirmations or blocking decisions, and notification for richer async outcomes.
- In toolbar and action flows, use declarative confirmationModal where possible. Use modal.confirm(...) for imperative flows that depend on runtime state.
- The framework initializes the singleton via layout rendering; app code should only read from it.
- Always call getApp() inside runtime functions or methods, never at top-level module scope.
- Example action names in this skill are placeholders. Replace them with real generated action names in the target app.

## Usage notes

- Use getApp() in plain TypeScript utilities and callbacks that may run outside a React component body.
- Use App.useApp() only inside function components or custom hooks rendered under the framework layout.
- In action and toolbar flows, confirmation is often handled declaratively with confirmationModal; use imperative modal.confirm(...) when the flow depends on runtime state.
- The framework initializes the singleton automatically through layout rendering; application code should only read from it.
- Always call getApp() inside a runtime function or method, never at top-level module scope.
- Example action names in this skill are placeholders. Replace them with real generated action names in the target app.

## Anti-patterns and guardrails

- NEVER use or introduce deprecated legacy notification patterns in app code.
- NEVER call setAppInstance from application code.
- NEVER render or call AppBootstrap from application code.
- NEVER wire notification bootstrap manually.
- NEVER import message, modal, or notification directly from antd.
- NEVER call getApp() at top-level module scope; call it only inside runtime functions or methods.
- NEVER bypass context-appropriate APIs for user feedback in Drumr frontend code.

## Execution checklist

- [ ] Detect the execution context first: utility/callback or function component.
- [ ] If the code is a plain module or callback, call getApp() inside the runtime function.
- [ ] If the code is a function component, call App.useApp() inside the component body.
- [ ] Keep all feedback APIs inside runtime scope; do not move them to module scope.
- [ ] If the request also changes view composition, routing, or API execution, route to the associated skill.

## Related documentation

- [Custom Views](../frontend-custom-views/SKILL.md)
- [Views (general)](../frontend-views/SKILL.md)
- [Frontend Services](../frontend-services/SKILL.md)
- [Frontend API](../frontend-api/SKILL.md)
- [Frontend Helpers](../frontend-helpers/SKILL.md)

### Navigation paths to associated skills

| Associated skill | When to use it | Why this skill is not enough |
| --- | --- | --- |
| [frontend-custom-views](../frontend-custom-views/SKILL.md) | If the feedback logic belongs to a route-driven custom page with non-standard composition | This skill focuses on feedback APIs and guardrails, not complete custom-page routing and composition |
| [frontend-services](../frontend-services/SKILL.md) | If notification behavior is implemented in shared services and needs service registration or replacement patterns | This skill defines feedback usage only; it does not define service architecture |
| [frontend-api](../frontend-api/SKILL.md) | If feedback depends on Operation Builder queries, mutations, or typed union responses | This skill explains UI feedback APIs, not full API execution contracts |
| [frontend-views](../frontend-views/SKILL.md) | If the request spans header, toolbar, or general view conventions | This skill is intentionally narrow to feedback patterns |
| [frontend-helpers](../frontend-helpers/SKILL.md) | If notification behavior is triggered from shared navigation or toolbar helpers | This skill does not describe helper registries or navigation abstractions |
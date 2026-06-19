---
name: frontend-helpers
description: >
  Essential skill for Drumr Framework frontend helpers. Documents public helper APIs for navigation, toolbar composition, UI-object extraction, context shaping, query-builder operations, workflow registry integration, and metadata field utilities with Copilot-optimized examples.


metadata:
  applies-to:
    - core/frontend/src/navigation/
    - core/frontend/src/queryBuilder/
---

# Frontend helpers

## Purpose

Use this skill when implementing frontend helper usage in views, services, and reusable UI logic. This guide documents what is currently public in @drumr/framework-frontend and what exists internally but is not exported.

## Public API status (validated in code)

### Available and public

- Navigation: openView, closeView, useNavigationContext, useViewContainer, ViewContainerContext, ViewContainerProvider, NavigationProvider, getCurrentNavigationContext, buildBreadcrumbItems, createBreadcrumbItemRenderer, resolveBreadcrumbInput
- Toolbar DSL: exported `toolbar` namespace includes createAction, customAction, action, cancelAction, deleteAction, dropdown, editAction, executeAction, globalAction, modelAction, myProfileAction, objectAction, options, refreshAction, saveAction, view, actionsMenu, divider. Exported `menu` namespace includes group, subMenu, divider, actionsMenu, customAction, objectAction, modelAction, globalAction, view, myProfileAction, cancelAction, createAction, deleteAction, editAction, executeAction, refreshAction, saveAction. Also exported: mergeToolbars, resolveToolbarElements, ACTION_MESSAGES, DELETE_CONFIRMATION_MODAL. Individual toolbar/menu functions are also exported standalone (e.g. `createAction`, `group`, `divider`).
- UI object helpers: extractData, merge, isUiField, isUiObject, extractPlainValue
- Context helpers: getContext, Context (singleton), useUiApiContext (hook), useContextHistory, useContextPath, useContextPrevious, useContextUser, useContextViews, useContextValue, ViewsCollection, UiMode, UiUsage, UiViewContainer, UiViewType
- Auth helpers: login, logout, fetchWithAuth, fetchWithAuthJson, getAuthStorageKeys, getAuthStorageKey, getAuthStorageAppId
- Query builders: findById, findBy, create, update, deleteById, refresh, uiMutation, dataMutation, dataQuery, uiListActions, uiListActionsCombined, workflowStatus, myWorkflows, dataAction, uiAction, OperationBuilder
- Workflow registry functions: registerWorkflow, unregisterWorkflow, updateWorkflowStatus, isWorkflowRegistered, getRegisteredWorkflow, getActiveWorkflows, getAllWorkflows, clearAllWorkflows, clearCompletedWorkflows, subscribeToWorkflowRegistry, registerAfterExecutedCallback
- Metadata helpers: getFieldInfo, isReferenceField, isCompositionField, isSharedCompositionField, isOwnerField, getReferenceTarget, getModelFields, getActionInfo, getActionsMetadata, isWorkflowActionInfo, getModelsMetadata, registerModelsMetadata, registerActionsMetadata

### Exists in source but not exported from @drumr/framework-frontend

- isReferenceObject
- uiRefresh
- workflowCancel
- isArrayField
- workflowRegistry (as a single object name)
- getApiBaseUrl

Usage note: When you need one of these non-exported helpers, do not hallucinate imports from @drumr/framework-frontend. Either use supported exported alternatives or add/export the helper in framework code first.

## Navigation helpers

openView and closeView are the canonical navigation APIs for page and modal flows.

```ts
import { closeView, openView } from '@drumr/framework-frontend';
import type { Project } from '@gql/types';
import ProjectReadView from '../views/ProjectReadView';

async function openProject(projectId: string): Promise<void> {
  await openView(ProjectReadView, {
    params: { id: projectId },
    container: 'modal',
    modalSize: 'big',
  });
}

function completeAndReturn(project: Project): void {
  closeView({ returnData: { projectId: project.id } });
}
```

Additional navigation exports:

```ts
import {
  useNavigationContext,
  useViewContainer,
  ViewContainerProvider,
  NavigationProvider,
  getCurrentNavigationContext,
  buildBreadcrumbItems,
} from '@drumr/framework-frontend';
```

Usage notes:

- Use openView instead of manual route pushes to preserve framework navigation stack behavior.
- Use closeView from the currently active modal/view context only.
- onClose only receives what the opened view returns via closeView(returnData); do not assume flags like saved/executed unless the child view explicitly returns them.
- When DataTable uses loadData/refresh callbacks, avoid setState inside those callbacks; return data directly and keep any lookup cache outside React state to prevent render loops.
- useViewContainer provides access to the nearest ViewContainerContext (modal, pageContent, drawer).

## Toolbar helpers

Toolbar elements can be used in view headers, table header toolbars, row toolbars, and custom in-view composition. Both a `toolbar` namespace object and standalone functions are exported; prefer the namespace form for clarity.

```ts
import { menu, toolbar } from '@drumr/framework-frontend';
import type { ToolbarOptions } from '@drumr/framework-frontend';
import type { Task } from '@gql/types';
import TaskReadView from '../views/TaskReadView';

export function buildTaskHeaderToolbar(): ToolbarOptions<Task> {
  return {
    buttons: [
      toolbar.createAction(),
      toolbar.modelAction('TaskExport'),
      toolbar.refreshAction(),
      toolbar.dropdown({
        elementId: 'bulk',
        label: 'Bulk',
        menu: menu({
          items: [
            menu.group({
              elementId: 'bulk-actions',
              label: 'Bulk actions',
              items: [menu.modelAction('TaskAssignBulk'), menu.divider(), menu.modelAction('TaskArchiveBulk')],
            }),
          ],
        }),
      }),
    ],
  };
}

export function buildRowToolbar(): ToolbarOptions<Task> {
  return {
    container: 'modal',
    buttons: [
      toolbar.view({ elementId: 'view-task', label: 'View', view: TaskReadView }),
      toolbar.editAction(),
      toolbar.deleteAction(),
    ],
  };
}
```

Pre-built action shortcuts available on both `toolbar` and `menu` namespaces:

- `createAction()` — standard Create button
- `editAction()` — standard Edit button
- `deleteAction()` — standard Delete button
- `saveAction()` — standard Save button
- `cancelAction()` — standard Cancel button
- `refreshAction()` — standard Refresh button
- `executeAction()` — standard Execute button
- `myProfileAction()` — My Profile button
- `customAction({ elementId, label, onClick })` — arbitrary handler button

Usage notes:

- `toolbar<T>()` (callable form) creates a `ToolbarDescriptorConfig` and does not accept a `buttons` property. For a manual toolbar, return a plain `ToolbarOptions` object (`{ buttons: [...] }`) or use `toolbar.options({ buttons: [...] })` instead.
- Header toolbar: use in view header.toolbar.
- Table header toolbar: use in tableOptions.tableToolbar.
- Row toolbar: use in tableOptions.rowToolbar.
- Inline composition: use toolbar namespace methods inside custom render logic.
- `toolbar.view` expects a view class (or lazy factory), `elementId`, and `label`. Do not pass a string cast (e.g. `'TaskReadView' as any`); import the view class directly.
- Use menu.group/menu.divider inside menu({ items: [...] }) only.
- `menu.subMenu()` creates a collapsible sub-menu; use inside menu({ items: [...] }).
- Do not use `toolbar.group` or `menu.action`; those names are not valid in current exports.
- `toolbar.divider()` exists but is a menu-item type — do not use it directly in header.toolbar.buttons. Use it only inside dropdown/menu composition.
- Use `mergeToolbars()` to combine multiple ToolbarOptions configurations.

## UI object helpers (data extraction and merging)

```ts
import { extractData, extractPlainValue, isUiField, isUiObject } from '@drumr/framework-frontend';

function normalizeTaskPayload(uiTask: Record<string, any>): Record<string, any> {
  if (!isUiObject(uiTask)) {
    return {};
  }

  const plain = extractData(uiTask, { deep: true });

  if (isUiField(uiTask.status)) {
    plain.status = uiTask.status.value;
  }

  return plain;
}
```

Usage notes:

- Use extractData for plain value extraction before non-UI processing.
- Use deep extraction for nested reference/composition value structures.
- merge exists and is public, but keep it for UI object merge scenarios only.
- extractPlainValue is exported from formHelpers for scalar field extraction.
- isReferenceObject exists in source but is not exported publicly.

## Context helpers

For view-scoped UiContext, use the `useUiApiContext` hook inside React components. For non-React code paths, use the `getContext()` singleton.

```ts
import {
  getContext,
  useContextUser,
  useContextViews,
  useUiApiContext,
  UiMode,
  UiUsage,
  UiViewContainer,
  UiViewType,
} from '@drumr/framework-frontend';

// Outside React: access Context singleton
const ctx = getContext();
const user = ctx.user;

// Inside React component: reactive user context
function MyComponent() {
  const user = useContextUser();
  const uiCtx = useUiApiContext(); // view-scoped UiContext (mode, usage, targetId, etc.)
  return <div>{user?.email}</div>;
}
```

Exported context hooks:

- `useContextUser()` — current authenticated user
- `useContextHistory()` — navigation history entries
- `useContextPath()` — current path
- `useContextPrevious()` — previous navigation state
- `useContextViews()` — registered view collection
- `useContextValue()` — arbitrary context value by key
- `useUiApiContext()` — UiContext provided by the enclosing view

Exported enums (runtime values, not type-only):

- `UiMode` — Read | Write
- `UiUsage` — View | Form | CustomView | NestedView
- `UiViewContainer` — Modal | PageContent | Drawer
- `UiViewType` — Custom | Table | Create | Edit | Read | Action

Usage notes:

- The `Context` singleton and `getContext()` are for non-React code paths; prefer hooks inside components.

## Auth helpers and session utilities

Use auth helpers from @drumr/framework-frontend for login/logout flows and authenticated requests.

```ts
import { fetchWithAuth, fetchWithAuthJson, getAuthStorageKeys, login, logout } from '@drumr/framework-frontend';

async function signIn(email: string, password: string): Promise<void> {
  await login({ email, password });
}

async function loadMyProfile(): Promise<any> {
  return fetchWithAuthJson('/auth/me');
}

async function signOut(): Promise<void> {
  const keys = getAuthStorageKeys();
  console.log('token key:', keys.tokenKey);
  await logout({ loginPath: '/login' });
}

async function pingProtectedRoute(): Promise<number> {
  const response = await fetchWithAuth('/api/health');
  return response.status;
}
```

Usage notes:

- Prefer logout() over manual token cleanup to keep framework session handling consistent.
- Use fetchWithAuth/fetchWithAuthJson for endpoints that require Bearer auth.
- getApiBaseUrl is defined in src config internals but is not publicly exported by @drumr/framework-frontend.

## GraphQL query builder helpers

Prefer OperationBuilder-based helpers. Pass a `mode` option to `findById`, `findBy`, `create`, and `update` to control whether the response uses UI (rich field wrapper) or data (plain value) format.

```ts
import {
  create,
  dataAction,
  dataMutation,
  dataQuery,
  deleteById,
  findBy,
  findById,
  myWorkflows,
  OperationBuilder,
  refresh,
  uiAction,
  uiListActions,
  uiListActionsCombined,
  uiMutation,
  update,
  workflowStatus,
  WorkflowStatus,
} from '@drumr/framework-frontend';

// Find by ID — pass mode as option
const uiById = findById<Task>('Task', { mode: 'read' }).fields({ id: true, title: true }).build();
const dataById = findById<Task>('Task', { mode: 'data' }).fields({ id: true, title: true }).build();

// List with filters — always paginate
const uiList = findBy<Task>('Task', { mode: 'read' }).paginate(25).build();
const dataList = findBy<Task>('Task', { mode: 'data' }).where({ archived: { eq: false } }, 'TaskWhereInput').paginate(25).build();

// Create / Update
const createTask = create<Task>('Task', { mode: 'ui' })
  .variables({ data: { title: 'New task' } })
  .build();
const updateTask = update<Task>('Task', { mode: 'ui' }, 'task-1', { title: 'Updated' }).build();

// Refresh
const refreshTask = refresh<Task>('Task', { mode: 'read' }).build();

// Mutations and queries
const customMutation = uiMutation<Task>('TaskReschedule', { mode: 'write' })
  .data('TaskRescheduleInput', { date: '2026-04-29' })
  .build();
const backendQuery = dataQuery<Task>('TaskReport').build();

// Actions
const actionQuery = uiAction<Task>('TaskApprove').id('task-1').build();
const backendAction = dataAction<Task>('TaskRecalculate').id('task-1').build();

// Delete
const del = deleteById('task-1').build();

// Action listings
const listActions = uiListActions({ modelName: 'Task', id: 'task-1' }, { mode: 'write' });
const combinedActions = uiListActionsCombined('Task', { mode: 'read' });

// Workflow queries
const workflowNow = workflowStatus('wf-123').build();
const myWorkflowItems = myWorkflows({ status: WorkflowStatus.RUNNING, limit: 20, offset: 0 }).build();
```

Usage notes:

- Pass `{ mode: 'read' | 'write' | 'ui' | 'data' }` to `findById`, `findBy`, `create`, and `update`.
- **`findBy` and `dataQuery`-based builders are paginated — always call `.paginate(n)`** when listing. Without it, a default page size applies and you silently receive only a subset of records.
- **UI mode vs data mode:** `mode: 'ui'` / `mode: 'read'` / `mode: 'write'` returns fields wrapped in `{ value, options, errors }` (suitable for forms/views). `mode: 'data'` returns plain values (suitable for services, dashboards). Do not mix them.
- Keep typed generics aligned with generated GraphQL types whenever available.
- Rich-format builders auto-select `dataType` together with `value`, `displayValue`, `required`, `errors`, and `constraints` for scalar fields.

## Workflow registry helpers

There is no exported symbol named `workflowRegistry`. Use the registry function set.

```ts
import {
  getActiveWorkflows,
  isWorkflowRegistered,
  registerAfterExecutedCallback,
  registerWorkflow,
  subscribeToWorkflowRegistry,
  unregisterWorkflow,
  updateWorkflowStatus,
  WorkflowStatus,
} from '@drumr/framework-frontend';

registerWorkflow({ workflowId: 'wf-123', actionName: 'TaskApprove', modelName: 'Task', dialogOpen: false });

updateWorkflowStatus('wf-123', {
  status: WorkflowStatus.RUNNING,
  workflowId: 'wf-123',
  actionName: 'TaskApprove',
  progress: 35,
});

const dispose = subscribeToWorkflowRegistry(workflows => {
  console.log('active:', workflows.length);
});

if (isWorkflowRegistered('wf-123')) {
  const active = getActiveWorkflows();
  console.log(active.length);
}

// Register a one-time callback to run after workflow completes
registerAfterExecutedCallback('wf-123', (result) => {
  console.log('workflow done', result);
});

unregisterWorkflow('wf-123');
dispose();
```

## Metadata and field info helpers

```ts
import {
  getActionInfo,
  getActionsMetadata,
  getFieldInfo,
  getModelFields,
  getModelsMetadata,
  getReferenceTarget,
  isCompositionField,
  isOwnerField,
  isReferenceField,
  isSharedCompositionField,
  isWorkflowActionInfo,
  registerActionsMetadata,
  registerModelsMetadata,
} from '@drumr/framework-frontend';

const field = getFieldInfo('Task', 'assignee');
const isRef = isReferenceField('Task', 'assignee');
const isComp = isCompositionField('Task', 'subtasks');
const isSharedComp = isSharedCompositionField('Task', 'attachments');
const isOwner = isOwnerField('Task', 'owner');
const target = getReferenceTarget('Task', 'assignee');
const modelFields = getModelFields('Task');

const actionInfo = getActionInfo('TaskApprove');
const isWf = isWorkflowActionInfo(actionInfo);
const allActions = getActionsMetadata();
const allModels = getModelsMetadata();

console.log({ field, isRef, isComp, isSharedComp, isOwner, target, modelFields });
```

Usage notes:

- Register metadata early in app bootstrap via `registerModelsMetadata` and `registerActionsMetadata` before relying on metadata helper outcomes.
- `isArrayField` exists in shared metadata helpers but is not currently re-exported by @drumr/framework-frontend.
- `getActionInfo` and `isWorkflowActionInfo` are useful for branching between regular and workflow action flows.

## Copilot prompt templates

- Implement a Read view toolbar that combines CRUD and custom menu/group/divider actions using toolbar DSL.
- Build a safe UI-to-data conversion utility using isUiObject, isUiField, and extractData with deep extraction.
- Add a query-builder service that uses findById, update, uiAction, and workflowStatus with typed generics.
- Integrate workflow registry events in a custom view using registerWorkflow and subscribeToWorkflowRegistry.
- Add metadata-driven rendering logic using getFieldInfo, isReferenceField, and getReferenceTarget.

## Anti-patterns

- Importing helpers that are not publicly exported from @drumr/framework-frontend.
- Building large raw GraphQL strings instead of OperationBuilder helpers.
- Using ad-hoc router APIs instead of openView and closeView.
- Mixing UI object shapes with plain mutation payloads without extraction/sanitization.
- Updating React state from DataTable loadData/refresh callbacks (can trigger render/reload loops and freeze the view).
- Assuming a ReadView/action modal emits saved automatically; require an explicit closeView({ saved: true }) contract in the child view before closing the launcher.
- Using `toolbar.group` or `menu.action` in generated code; these names are invalid in current exports.
- Using `toolbar.divider()` in header.toolbar.buttons instead of inside menu composition.

## Maintenance rule

When helper exports or signatures change, update this skill in the same PR so Copilot guidance remains aligned with runtime APIs.

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [frontend-views](../frontend-views/SKILL.md) | If helpers are used inside view lifecycle hooks (onInit, header, toolbar wiring) or view-level navigation flows. | This skill documents helper APIs, not how views consume them in their full lifecycle. |
| [frontend-layout](../frontend-layout/SKILL.md) | If toolbar/menu helpers are placed inside layout slots or BaseLayout overrides. | This skill is helper-focused and does not describe layout slot composition rules. |
| [frontend-api](../frontend-api/SKILL.md) | If query-builder helpers are chained with Apollo Client calls or need typed operation variables. | This skill shows builder call signatures but not Apollo provider setup or cache policies. |
| [frontend-context](../frontend-context/SKILL.md) | If useUiApiContext or context singleton results feed into broader UI context patterns. | This skill covers helper signatures; full context shaping conventions live in frontend-context. |
| [frontend-services](../frontend-services/SKILL.md) | If auth helpers or query builders are encapsulated inside injectable service classes. | This skill is not the authoritative source for service class structure and DI patterns. |
| [frontend-notifications](../frontend-notifications/SKILL.md) | If helper-driven flows need canonical message/modal/notification behavior across view and non-view callers. | This skill documents helper signatures and composition, not dedicated notification lifecycle and guardrails. |

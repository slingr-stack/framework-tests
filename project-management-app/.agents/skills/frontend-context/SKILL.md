---
name: frontend-context
description: Guide for using the frontend UI Context singleton in Drumr apps. Covers the Context class properties (user, path, history, previous, views), reactive hooks (useContextUser, useContextPath, useContextHistory, useContextPrevious, useContextViews, useContextValue, useAppContext), view registration lifecycle, dynamic state mutation via put() and notifyChange(), and practical access patterns from views, layouts, and services.
user-invocable: true
metadata:
  applies-to:
    - core/frontend/src/context/
    - core/frontend/src/providers/
---

# Frontend context

## Overview

The `Context` class is a **centralized singleton** that represents the current state of the frontend UI. It tracks the authenticated user, navigation paths, and mounted view instances. Any component, view, layout, or service can read the context at any time.

```
┌───────────────────────────────────────────────────────┐
│                 Context (singleton)                   │
├────────┬────────────┬───────────┬─────────────────────┤
│  user  │    path    │  history  │        views        │
│ (auth) │ (curr URL) │   (nav)   │ (mounted instances) │
└────────┴────────────┴───────────┴─────────────────────┘
```

---

## Obtaining the context

There are three primary access patterns depending on where you need the context.

### Imperative access (services, callbacks, lifecycle hooks)

```typescript
import { getContext } from '@drumr/framework-frontend';

const context = getContext();
console.log(context.user?.email);
```

Use this inside action callbacks, toolbar handlers, `queryParams` functions, lifecycle hooks, and services — anywhere outside the React lifecycle.

### Reactive access — named hooks (recommended for components)

For individual slices of context state, use the dedicated named hooks. Each hook re-renders the component only when its specific value changes.

```tsx
import {
  useContextUser,
  useContextPath,
  useContextHistory,
  useContextPrevious,
  useContextViews,
} from '@drumr/framework-frontend';

function Header() {
  const user = useContextUser();
  return <span>{user?.email}</span>;
}

function Breadcrumb() {
  const history = useContextHistory();
  // re-renders only when history array changes
  return <nav>{history.map(e => e.label).join(' > ')}</nav>;
}
```

### Reactive access — selector hook (advanced / custom slices)

For selectors not covered by the named hooks, use `useContextValue` with a custom selector. The component re-renders only when the selected value changes (via `Object.is`).

```tsx
import { useContextValue } from '@drumr/framework-frontend';

const lastVisitedPath = useContextValue(
  ctx => ctx.history.at(-1)?.path ?? '/'
);
```

> **Tip**: Prefer selecting a **primitive** or a **stable reference**. Returning a new object on every call (e.g., `ctx => ctx.user`) triggers re-renders even when data is identical. Use `useContextUser()` instead.

### Stable singleton reference in components (`useAppContext`)

When you need access to the `Context` singleton itself (not a reactive slice) from inside a component — for example, in a `useCallback` or event handler — use `useAppContext()`. It returns the stable singleton reference and **does not** trigger re-renders.

```tsx
import { useAppContext } from '@drumr/framework-frontend';

function MyComponent() {
  const ctx = useAppContext();

  const handleClick = useCallback(() => {
    // Read context imperatively inside a callback
    console.log(ctx.user?.email);
  }, [ctx]); // ctx is stable — no re-renders

  return <button onClick={handleClick}>Log user</button>;
}
```

> `useAppContext()` is provided automatically by `DrumrProvider`, which the framework mounts in `rootContainerFactory`. No additional setup is required.

---

## Properties

### Get `context.user`

Information about the currently authenticated user.

**Type**: `FrontendUserContext | undefined`

```typescript
interface FrontendUserContext {
  id?: string;
  email?: string;
  username?: string;
  roles?: string[];
  // Additional custom properties may be included
}
```

**Behavior**: Reads from the context state first (`put({ user: ... })`), then falls back to stored auth info from `localStorage`.

**Example — dynamic menu item based on user id**:

```tsx
// MainLayout.tsx — navigate to "My profile" using ctx.user
menu.view({
  elementId: 'myProfileDetails',
  view: UserReadView,
  label: 'My profile',
  icon: <UserOutlined />,
  params: async () => {
    const ctx = getContext();
    const userId = ctx.user?.id;
    return userId ? { id: userId } : {};
  },
}),
```

---

### Get `context.path`

The current URL or route representing the active context.

**Type**: `string`

```typescript
context.path; // "/projects/42/view"
```

Falls back to `window.location.pathname` when no explicit path has been set via `put()`.

---

### Get `context.history`

An array of navigation entries from the root to the current view. Built automatically from the framework's internal navigation stack.

**Type**: `HistoryEntry[]`

```typescript
interface HistoryEntry {
  path: string; // URL path for this step
  label: string; // Display label (e.g., "Projects", "Edit User")
}
```

**Example — conditional breadcrumbs based on navigation origin**:

```typescript
// ProjectReadView.tsx — using useAppContext() inside a functional component
import { useAppContext } from '@drumr/framework-frontend';

export function ProjectReadView({ id }: { id: string }) {
  const ctx = useAppContext(); // stable singleton, no re-renders

  const buildBreadcrumb = useCallback((): BreadcrumbSegment[] => {
    const cameFromProjectsList = ctx.history?.some(
      entry => entry.path === '/projects'
    );
    if (cameFromProjectsList) {
      return [
        { label: 'Projects', to: '/projects' },
        { label: 'Details', to: `/projects/${id}/view` },
      ];
    }
    return [
      { label: 'Project', to: `/projects/${id}/view` },
    ];
  }, [id, ctx]);
  // ...
}
```

---

### Get `context.previous`

The previous navigation entry in the chain. Returns `null` if at root.

**Type**: `HistoryEntry | null`

```typescript
context.previous; // { path: "/projects", label: "Projects" }
```

Useful for "back" labels or conditional breadcrumb rendering.

---

### Get `context.views`

A `ViewsCollection` of currently mounted **class-based** view instances. Use this only when a class-based `CustomViewComponent` exposes public methods or params that another part of the UI needs to read. Function components are not looked up through `context.views`.

**Access by class** (recommended):

```typescript
const usersTable = context.views.get(UsersTableView);
usersTable?.getSelectedItems();
```

**Access by id** (registered id or class name):

```typescript
const usersTable = context.views.get<UsersTableView>('usersTable');
usersTable?.getSelectedItems();
```

**Example — derive params from a mounted class-based view**:

```typescript
function getTaskFiltersFromMountedUserView() {
  const userView = getContext().views.get('userReadView');

  if (!userView) {
    return {};
  }

  return { assignee: userView.getParams()['id'] };
}
```

---

## Exposing custom information from views

`context.views` only stores instances of **class-based** `CustomViewComponent` subclasses. Functional components are not registered in `ViewsCollection` and cannot be retrieved via `context.views.get()`.

To expose shared state from a view to other parts of the UI, use a class-based `CustomViewComponent` with public methods:

```typescript
import { CustomViewComponent } from '@drumr/framework-frontend';

export class RolesTableView extends CustomViewComponent {
  private selectedItems: Role[] = [];

  /** Public method — consumers can read selected role names. */
  getSelectedRoleNames(): string[] {
    return this.selectedItems.map(r => r.name);
  }

  getTotalSelected(): number {
    return this.selectedItems.length;
  }

  handleSelectionChange(items: Role[]) {
    this.selectedItems = items;
    getContext().notifyChange();
  }
}

// Consumer (e.g., a toolbar button handler):
const rolesSummary = getContext().views.get(RolesTableView);
if (rolesSummary) {
  console.log(rolesSummary.getSelectedRoleNames());
  console.log(rolesSummary.getTotalSelected());
}
```

If you need to share state from a functional component, use a React context or lift the state to a shared store instead — do not attempt to retrieve functional components via `context.views.get()`.

---

## Mutating context state

### Get `context.put(partial)`

Merges partial data into the current context state and notifies all subscribers.

```typescript
const context = getContext();
context.put({ path: '/users/123/edit' });
context.put({ user: { roles: ['admin', 'manager'] } }); // merges into existing user
```

> **Note**: `put()` performs a shallow merge at the top level, but **deep-merges** `user` when both existing and new `user` are present.

### Get `context.notifyChange()`

Manually triggers subscriber notifications when external view state changes outside of `put()`. Use this when a view's internal state (e.g., selection) changes and external consumers depend on it.

```typescript
// Inside a class-based view that exposes selection to the context
handleSelectionChange(nextSelectedRoles: Role[]) {
  this.setState({ selectedRoles: nextSelectedRoles });
  getContext().notifyChange();
}
```

This ensures that `useContextValue` subscribers re-evaluate and components re-render if their selected value changed.

---

## View registration lifecycle

Views are automatically registered and unregistered with the context:

1. **Mount**: When a view component mounts, the framework calls `context.views.register(viewId, ViewClass, instance)`.
2. **Active**: While mounted, the view instance is accessible via `context.views.get(ViewClass)` or `context.views.get('viewId')`.
3. **Unmount**: When the view unmounts, `context.views.unregister(viewId)` is called. The view is no longer accessible.

For class-based views, the `viewId` comes from the registered id when present. If no explicit id is specified, the class name is used.

> **Warning**: If multiple instances of the same view class can be mounted simultaneously, override `resolveViewId()` in the view to return a unique id per instance.

---

## Subscribing to context changes (advanced)

For non-React code that needs to react to context mutations:

```typescript
const context = getContext();
const unsubscribe = context.subscribe(() => {
  console.log('Context changed:', context.path);
});

// Later, when done:
unsubscribe();
```

This is called on **any** mutation: `put()`, `reset()`, view mount/unmount, and `notifyChange()`.

---

## Quick-reference cheat sheet

| Need                                        | Pattern                                                     |
| ------------------------------------------- | ----------------------------------------------------------- |
| Read current user imperatively              | `getContext().user`                                         |
| Read user reactively in JSX                 | `useContextUser()`                                          |
| Read path reactively in JSX                 | `useContextPath()`                                          |
| Read history reactively in JSX              | `useContextHistory()`                                       |
| Read previous reactively in JSX             | `useContextPrevious()`                                      |
| Read views collection reactively in JSX     | `useContextViews()`                                         |
| Custom reactive selector in JSX             | `useContextValue(ctx => ctx.user?.email)`                   |
| Stable Context reference in component       | `useAppContext()` (no re-renders)                           |
| Check navigation origin                     | `context.history?.some(e => e.path === '/target')`          |
| Get previous page label                     | `context.previous?.label`                                   |
| Access a mounted view                       | `context.views.get(MyView)`                                 |
| Access a view by id                         | `context.views.get('myViewId')`                             |
| Update context state                        | `context.put({ path: '/new-path' })`                        |
| Notify after internal change                | `context.notifyChange()`                                    |
| Subscribe to all changes                    | `context.subscribe(() => { ... })`                          |

## Rules and best practices

1. **Use `getContext()` imperatively** — use `getContext()` in callbacks, services, and lifecycle methods; never instantiate `Context` directly.
2. **Prefer named hooks in render functions** — `useContextUser()`, `useContextPath()`, and the other built-in hooks only re-render when their specific slice changes.
3. **Use `useContextValue` for custom slices** — when named hooks do not cover your selector, use `useContextValue(selector)` with a primitive or stable reference selector.
4. **Use `useAppContext()` for stable imperative access in components** — when you need the singleton inside a `useCallback` or event handler without triggering re-renders.
5. **Select primitives when possible** — avoid returning new objects from `useContextValue` selectors to prevent unnecessary re-renders.
6. **Do not store business data in context** — the context is for UI navigation state and class-based view references, not domain data.
7. **Treat `context.views` as a narrow runtime surface** — use it only for mounted class-based views that intentionally expose a public API.
8. **Call `notifyChange()` when exposed view state changes** — if consumers depend on view-exposed values, ensure they are notified.
9. **Do not rely on views being present** — always null-check `context.views.get(...)` since the target view may not be mounted.

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [frontend-views](../frontend-views/SKILL.md) | If you need general view conventions or component-level context consumption patterns. | This skill covers context consumption but not full view composition and registration patterns. |
| [frontend-layout](../frontend-layout/SKILL.md) | If context is used to drive menu items, navigation guards, or layout-level conditional rendering. | This skill explains how to read/write context state but not how layouts and menus are configured. |
| [frontend-custom-views](../frontend-custom-views/SKILL.md) | If building route-driven custom pages that read route params, user info, or class-based view APIs from context. | This skill documents the Context API but not custom-page routing and view composition patterns. |
| [frontend-services](../frontend-services/SKILL.md) | If shared services need to read or subscribe to context changes outside of components. | This skill covers the Context API but not service architecture or provider patterns. |
| [frontend-notifications](../frontend-notifications/SKILL.md) | If context-driven UI flows need canonical feedback behavior (`getApp()`, `App.useApp()`, or `this.app`). | This skill focuses on context state and subscriptions, not notification API patterns and safety guardrails. |

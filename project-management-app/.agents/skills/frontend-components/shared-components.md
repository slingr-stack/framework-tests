# Action execution internals

> Part of the [frontend-components](./SKILL.md) skill.

---

## Purpose

The action execution pipeline is split across two layers:

- **Public hooks** (`useActionButton`, `useActionView`) — the developer-facing API for building custom action surfaces. These are fully supported and exported from `@drumr/framework-frontend`.
- **Internal engines** (`useActionExecution`, `useActionViewExecution`) — low-level hooks consumed by the framework's own components and by the public hooks. App developers **do not call these directly**.

This document describes the internal layer for orientation. For the public API, see [useActionButton](../frontend-hooks/useActionButton.md) and [useActionView](../frontend-hooks/useActionView.md).

---

## Internal hooks (do not use directly)

### `useActionExecution` — strategy engine

Located at `core/frontend/src/hooks/actions/internal/strategyEngine.ts`.

Resolves and executes the action strategy determined by backend metadata:

- Opens views for parameter collection (modal or page)
- Executes GraphQL operations (mutations and queries) directly
- Shows confirmation modals
- Manages loading states and error handling
- Handles permission denied (navigates to `/permission-denied`) and not-found errors
- Triggers post-execution callbacks
- Integrates with the workflow registry for long-running actions

Used by `BaseActionButton` and toolbar's `ToolbarButton`.

### `useActionViewExecution` — inline engine

Located at `core/frontend/src/hooks/actions/internal/inlineEngine.ts`.

Drives inline param-form execution and param-less actions when the hook owns the form. Used by both `useActionButton` (when `fields` is provided) and `useActionView`.

---

## Execution flow

```
User clicks action button / toolbar button
        │
        ▼
useActionButton (public) or BaseActionButton / ToolbarButton (via internal engine)
        │
        ├── Has inline fields? → useActionViewExecution (inline engine)
        │      → validate + submit form → execute
        │
        └── No inline fields? → useActionExecution (strategy engine)
               │
               ├── Has param view? → Open ActionView in container (modal/page)
               │                      → User fills form → submits
               │
               ├── confirmationModal? → Show confirmation dialog
               │
               ▼
        Execute GraphQL mutation/query
               │
               ├── Success → onExecuted callback → refresh/navigate
               ├── Permission error → Navigate to /permission-denied
               ├── Not found → Show error message
               └── Workflow detected → Register in workflow registry → Show progress
```

---

## Public API vs internal

| Hook | Package export | Use when |
| --- | --- | --- |
| `useActionButton` | ✅ exported | You need a custom button/CTA that executes an action |
| `useActionView` | ✅ exported | You need a custom view with title, toolbar, result, and refresh |
| `useActionExecution` | ❌ internal | Used internally by `BaseActionButton` and `ToolbarButton` |
| `useActionViewExecution` | ❌ internal | Used internally by `useActionButton` and `useActionView` |

---

## Best practices

1. **Do not import `useActionExecution` or `useActionViewExecution` directly** — use the public hooks or action button components.
2. **Error handling is automatic** — the engine detects permission denied and not-found errors; validation errors are handled in `ActionView` / `DataForm` flows.
3. **Workflow registration is automatic** — long-running actions are tracked via the workflow registry.

---

## Related skills

- [useActionButton](../frontend-hooks/useActionButton.md) — Public headless hook for custom action buttons
- [useActionView](../frontend-hooks/useActionView.md) — Public view-oriented hook (title, toolbar, result, refresh)
- [action-button-components](./action-button-components.md) — Standalone button components built on the internal engines
- [toolbar-components](./toolbar-components.md) — Toolbar buttons that use the internal engines

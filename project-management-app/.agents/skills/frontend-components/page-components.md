# Page components

> Part of the [frontend-components](./SKILL.md) skill.

---

## Purpose

Page components are pre-built, full-page screens that the framework renders for common system states: authentication, errors, and maintenance. They follow a consistent design and integrate with the framework's routing and error detection.

**You do NOT create these pages** — the framework renders them automatically when needed. They are available for manual use in custom error handling or testing scenarios.

---

## Import

```typescript
import {
  NotFoundPage,
  PermissionDeniedPage,
  InternalErrorPage,
  MaintenancePage,
  WorkflowManagementPage,
} from '@drumr/framework-frontend';
```

> **Note:** `LoginPage` is rendered automatically by the framework at `/login`. It is exported from `@drumr/framework-frontend` but is typically not used directly in app code — the framework handles routing and rendering it automatically.

---

## Available pages

| Component | Route/Trigger | Description |
| --- | --- | --- |
| `LoginPage` | `/login` | Email/password login form. Rendered automatically for unauthenticated users; exported but rarely used directly |
| `NotFoundPage` | 404 routes | Shown when a route doesn't match any view |
| `PermissionDeniedPage` | Permission errors | Shown when the current user lacks access to a resource |
| `InternalErrorPage` | 500 errors | Shown for unhandled server errors |
| `MaintenancePage` | Server maintenance | Shown when the backend signals maintenance mode |
| `WorkflowManagementPage` | `/workflows` | Admin page for monitoring active workflows |

---

## Automatic integration

The framework automatically detects and renders error pages for certain errors:

```
GraphQL query/mutation
        │
        ▼
Error detection (isPermissionDeniedError, isNotFoundError)
        │
        ├── Permission denied → navigates to /permission-denied → PermissionDeniedPage
        ├── Not found        → shows error message (message.error)
        └── Server error     → InternalErrorPage
```

Both `DataForm` and `DataTable` include built-in error detection that renders `PermissionDeniedPage` when the backend returns a permission error.

---

## LoginPage

The login page is rendered at `/login` and handles JWT authentication:

- Email and password form fields
- Error message display on failed authentication
- Stores JWT token and user info in localStorage
- Redirects to the app after successful login

Configuration is automatic — the page reads the app title from `window.DRUMR_APP_TITLE`.

---

## WorkflowManagementPage

Admin page for monitoring and managing active workflows:

```typescript
import { WorkflowManagementPage } from '@drumr/framework-frontend';
import type { WorkflowManagementPageProps } from '@drumr/framework-frontend';
```

---

## Best practices

1. **Do not recreate error pages** — use the framework-provided components.
2. **Error detection is automatic** — `DataForm` and `DataTable` handle permission/not-found errors.
3. **For custom error handling**, catch errors in lifecycle hooks and render the appropriate page component.
4. **LoginPage integrates with the auth system** — configure authentication in the backend, not the login page.

---

## Related skills

- [frontend-layout](../frontend-layout/SKILL.md) — Layout controls page shell around these pages
- [frontend-views](../frontend-views/SKILL.md) — Views route to pages

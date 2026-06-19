---
name: frontend-app
description: >
  Dedicated guide for bootstrapping Drumr frontend applications with app.ts,
  app.runtime.ts, and the app registry (app.registerDefaults,
  app.registerRoutes, app.registerLayout, app.registerDataModel,
  app.registerAction). Covers provider registration, runtime exports, view
  access rules, and the separation of bootstrap from declarative config.
metadata:
  applies-to:
    - '**/frontend/src/App.ts'
    - '**/frontend/src/App.tsx'
    - '**/frontend/src/app.ts'
    - '**/frontend/src/app.tsx'
---

# Frontend app bootstrap

## Purpose

Use this skill when creating or maintaining the frontend app entry point.

This skill documents:

- How to bootstrap with `app.ts`, `app.runtime.ts`, and `configureApp(app)`
- How to configure declarative app defaults with `app.registerDefaults(...)`
- Provider registration for shared runtime dependencies
- Runtime exports for UmiJS
- View access registration for frontend route guards

## Minimal bootstrap

```typescript
// frontend/src/app.ts
import '../generated/gql';
import { app } from '@drumr/framework-frontend';
import runtime from './app.runtime';
import { configureApp } from './config/appConfig';

configureApp(app);

export default runtime;
export { getInitialState, layout, antd, patchClientRoutes, rootContainer } from './app.runtime';
```

## Apollo client bootstrap

Keep the Apollo client in `config/providers/apolloClient.ts` so provider registration stays co-located and import paths stay shallow:

```ts
// frontend/src/config/providers/apolloClient.ts
import { getGraphQLClient } from '@drumr/framework-frontend';

export const client = getGraphQLClient();
```

## Bootstrap with providers

Use `app.registerProviders(...)` to wrap the app tree with React providers for shared
runtime dependencies. The registered provider function is nested **inside** the
framework's built-in providers (`DrumrProvider`, `CallbackRegistryProvider`,
`ProConfigProvider`), so `useAppContext()` and `useConfigService()` are already
available in any app-registered provider.

```tsx
// frontend/src/config/providers/appProviders.tsx
import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { client } from './apolloClient';
import { FancyAlertProvider } from '../../shared/providers/FancyAlertProvider';
import { AppRegistry } from '@drumr/framework-frontend';

export function registerProviders(app: AppRegistry) {
  app.registerProviders(({ children }) => (
    <React.StrictMode>
      <ApolloProvider client={client}>
        <FancyAlertProvider>{children}</FancyAlertProvider>
      </ApolloProvider>
    </React.StrictMode>
  ));
}
```

> Any app that renders GraphQL-backed views or hooks must register an Apollo
> provider with `app.registerProviders(...)`, using the `client` from
> `./providers/apolloClient`.

## Framework-provided providers (automatic)

The framework's `rootContainerFactory` automatically installs these providers
around the app tree — no manual setup required:

| Provider | What it provides |
| --- | --- |
| `DrumrProvider` | `useAppContext()` — stable `Context` singleton; `useConfigService()` — stable `ConfigService` singleton |
| `CallbackRegistryProvider` | Internal plugin callback registry |
| `ProConfigProvider` | Ant Design Pro locale and component defaults |

### `useAppContext()`

Returns the stable `Context` singleton. Does **not** trigger re-renders. Use
when you need imperative access to the context object inside a component
(e.g., in a `useCallback` or event handler).

```tsx
import { useAppContext } from '@drumr/framework-frontend';

function MyComponent() {
  const ctx = useAppContext();
  // ctx is stable — safe in callbacks
  return <button onClick={() => console.log(ctx.user?.email)}>Log</button>;
}
```

For reactive subscriptions to context values, use the named hooks instead:
`useContextUser()`, `useContextPath()`, `useContextHistory()`, etc.

### `useConfigService()`

Returns the stable `ConfigService` singleton. Reads the app's `config.json`
values. Use this inside React components in place of `getConfigService()`.

```tsx
import { useConfigService } from '@drumr/framework-frontend';

function TaskLabel({ name }: { name: string }) {
  const config = useConfigService();
  const suffix = config.custom?.showIcons ? ' 🎉' : '';
  return <span>{name}{suffix}</span>;
}
```

## App-level layout settings

App-wide layout settings, the default layout, and locale are configured in `config/appDefaults.ts` with `app.registerDefaults()`. Routing is configured separately in `config/routing.ts` with `app.registerRoutes()`. Bootstrap composition calls both before the runtime starts.

```typescript
// frontend/src/config/appDefaults.ts
import enUS from 'antd/locale/en_US';
import type { AppRegistry } from '@drumr/framework-frontend';
import { mainLayout } from './layouts/mainLayout';

export function registerAppDefaults(app: AppRegistry) {
  app.registerDefaults({
    appName: 'Tasky',
    appVersion: '1.0.0',
    defaultLayout: mainLayout,
    layoutSettings: {
      logo: '/logo.svg',
      navTheme: 'light',
      fixedHeader: false,
      fixSiderbar: true,
    },
    locale: enUS,
  });
}
```

```typescript
// frontend/src/config/routing.ts
import type { AppRegistry } from '@drumr/framework-frontend';
import { mainLayout } from './layouts/mainLayout';
// ... view imports ...

export function registerRoutes(app: AppRegistry) {
  app.registerRoutes([
    { path: '/', view: DashboardView },
    { path: '/tasks', view: TasksView },
    { path: '/tasks/:id', view: TaskReadView, layout: mainLayout },
  ]);
}
```

- `app.registerRoutes()`: takes route definitions directly — no separate `defineRouting()` call needed.
- `defaultLayout`: the layout class returned by `app.registerLayout()` from `config/layouts/mainLayout.tsx`.
- `additionalProviders`: extra React providers nested inside the framework providers.
- `layoutSettings`: global Ant Design Pro layout options shared across all layouts.

> **Rule**: `app.ts` imports and triggers `configureApp(app)` on startup, then exports `app.runtime.ts`. Keep declarative config in `config/`.

---

## Separation of responsibilities

| Concern | API | File |
| --- | --- | --- |
| Bootstrap, providers, runtime exports | `configureApp(app)` | `app.ts` |
| Orchestrate configuration | `configureApp(app)` calling list | `config/appConfig.ts` |
| Custom React providers | `app.registerProviders(...)` | `config/providers/appProviders.tsx` |
| App name, default layout, locale | `app.registerDefaults(...)` | `config/appDefaults.ts` |
| Route definitions | `app.registerRoutes(...)` | `config/routing.ts` |
| Layout classes | `app.registerLayout(name, ...)` | `config/layouts/*.tsx` |
| Data model field config | `app.registerDataModel(name, ...)` | `config/dataModels/*.ts` |
| Action config | `app.registerAction(...)` | `config/actions/*.ts` |
| Runtime exports | re-export from `app.runtime.ts` | `app.ts` |

---

## Bootstrap contract

1. Call the `configureApp(app)` function inside `app.ts`.
2. `configureApp(app)` registers app defaults, layouts, routes, model defaults, action defaults, providers, and view access rules before runtime exports are used.
3. Default-export the UmiJS runtime object from `app.runtime.ts`.
4. Re-export runtime symbols: `getInitialState`, `layout`, `antd`, `patchClientRoutes`, `rootContainer`.

Rule: only one bootstrap composition logic per application.

## Runtime exports

Keep runtime exports in `app.runtime.ts`, then default-export and re-export them from `app.ts`:

```ts
// frontend/src/app.runtime.ts
import type { AppRuntimeExports } from '@drumr/framework-frontend';
import {
  antd,
  getInitialState,
  layout,
  patchClientRoutes,
  rootContainer,
} from '@drumr/framework-frontend';

const runtime: AppRuntimeExports = {
  getInitialState,
  layout,
  antd,
  patchClientRoutes,
  rootContainer,
};

export default runtime;
export { antd, getInitialState, layout, patchClientRoutes, rootContainer };
```

## app.registerDefaults fields

Set these via `app.registerDefaults({...})` in `config/appDefaults.ts`:

| Field | Purpose |
| --- | --- |
| `appName` | Internal app identifier used by runtime defaults |
| `appVersion` | Version string propagated into initial state |
| `defaultLayout` | Layout class for views that do not define their own layout |
| `layoutSettings` | Global Ant Design Pro layout options |
| `locale` | Ant Design locale object |
| `loginPath` | Login route override |
| `graphqlUri` | GraphQL endpoint override |
| `additionalProviders` | Extra React providers nested inside the framework providers |
| `navigation.homePage` | View name for root path redirect |
| `views.modalSize` | Default modal size for views |
| `views.modalPosition` | Default modal position |
| `custom` | App-specific public settings accessible via `ConfigService.custom` |

Note: the layout option is `fixSiderbar` (with `er`), not `fixSidebar`.

## Provider pattern (recommended for shared dependencies)

Instead of DI services for app-level concerns, use providers:

```tsx
// bootstrap/theme.ts
import { ConfigProvider } from 'antd';
import type { FC, ReactNode } from 'react';

export const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <ConfigProvider theme={{ token: { colorPrimary: '#1890ff' } }}>
    {children}
  </ConfigProvider>
);
```

Then in `app.ts`:
```tsx
import type { AppRegistry } from '@drumr/framework-frontend';

export function registerProviders(app: AppRegistry) {
  app.registerProviders(({ children }) => (
    <ThemeProvider>{children}</ThemeProvider>
  ));
}
```

Components consume the provider context through standard React hooks.

## View access rules

Use `app.registerViewAccessForRole` to declare, per role, which views a user
can render. Rules are evaluated locally in the browser using the current user's
session — no backend round-trip is required.

### Default behavior

When **no** rules are registered every view is accessible (default-allow).
Once at least one `registerViewAccessForRole` call is made, only views that
satisfy a registered `allowView` call for the current user's roles are shown.
Denied views redirect to the "Permission denied" page and any navigation
link/button pointing to them is automatically hidden.

### Canonical file: `config/accessRules.ts`

```ts
// frontend/src/config/accessRules.ts
import { app } from '@drumr/framework-frontend';
import { Role } from '../shared/roles';
import { UsersView, UserCreateView, UserEditView, UserReadView } from '../users/views';
import { SummaryView } from '../dashboard/views';

export function setAccessRules(): void {
  // Admin — unrestricted access
  app.registerViewAccessForRole(Role.Admin, (_user, { allowView }) => {
    allowView('all');
  });

  // Manager — everything except user management
  app.registerViewAccessForRole(Role.Manager, (_user, { allowView, denyView }) => {
    allowView('all');
    denyView(UsersView);
    denyView(UserCreateView);
    denyView(UserEditView);
    denyView(UserReadView);
  });
}
```

### Registration in `appConfig.ts`

Call `setAccessRules()` inside `configureApp(app)` before runtime exports are used:

```ts
// frontend/src/config/appConfig.ts
import { registerAppDefaults } from './appDefaults';
import { AppRegistry } from '@drumr/framework-frontend';
import { registerLayouts, registerModelDefaults, registerActionDefaults } from './index';
import { registerRoutes } from './routing';
import { registerProviders } from './providers/appProviders';
import { setAccessRules } from './accessRules';

export function configureApp(app: AppRegistry) {
  registerAppDefaults(app);
  registerLayouts(app);
  registerRoutes(app);
  registerModelDefaults(app);
  registerActionDefaults(app);
  registerProviders(app);
  setAccessRules();
}
```

### `ViewAccessHelpers` API

| Method | Signature | Description |
| --- | --- | --- |
| `allowView` | `(view: ViewRef \| 'all') => void` | Grant render access. Pass `'all'` for a blanket allow baseline. |
| `denyView` | `(view: ViewRef \| 'all') => void` | Deny render access. `denyView` always overrides a preceding `allowView`. |

`ViewRef` is any React component — either a class constructor or a function component.

### Multiple definers per role

You can call `registerViewAccessForRole` more than once for the same role. All
definers are evaluated in registration order and the results are merged.

```ts
app.registerViewAccessForRole(Role.Manager, (_user, { allowView }) => {
  allowView('all');
});
// Applied on top of the previous definer:
app.registerViewAccessForRole(Role.Manager, (_user, { denyView }) => {
  denyView(UserReadView);
});
```

### Cache and session transitions

Permission results are cached in memory for the duration of the session. The
cache is cleared automatically on login and logout, so no stale results survive
session transitions.

### Testing

In tests, clear the registry before each test:

```ts
import { clearViewAccessRegistry } from '@drumr/framework-frontend';

beforeEach(() => clearViewAccessRegistry());
```

### Updated module structure

```
config/
  appConfig.ts          ← configureApp(app) composes register* calls and setAccessRules()
  accessRules.ts        ← exports setAccessRules() — calls app.registerViewAccessForRole()
  appDefaults.ts        ← exports registerAppDefaults(app) — calls app.registerDefaults()
  index.ts              ← optional aggregator for registerLayouts/registerModelDefaults/registerActionDefaults
  routing.ts            ← exports registerRoutes(app) — calls app.registerRoutes()
  providers/
    appProviders.tsx    ← exports registerProviders(app) — calls app.registerProviders()
  layouts/              ← each file exports a layout via app.registerLayout()
```

### Updated separation of responsibilities

| Concern | API | File |
| --- | --- | --- |
| Bootstrap and providers | `configureApp(app)` | `app.ts` |
| Orchestrate configuration | `configureApp(app)` calling list | `config/appConfig.ts` |
| Custom React providers | `app.registerProviders(...)` | `config/providers/appProviders.tsx` |
| App name, default layout, locale | `app.registerDefaults(...)` | `config/appDefaults.ts` |
| Route definitions | `app.registerRoutes(...)` | `config/routing.ts` |
| View access rules (per role) | `app.registerViewAccessForRole(...)` | `config/accessRules.ts` |
| Layout classes | `app.registerLayout(name, ...)` | `config/layouts/*.tsx` |
| Data model field config | `app.registerDataModel(name, ...)` | `config/dataModels/*.ts` |
| Action config | `app.registerAction(...)` | `config/actions/*.ts` |

---

## Anti-patterns

- Calling `configureApp(app)` multiple times in one app
- Mixing runtime bootstrap logic with declarative defaults
- Mutating the app registry after startup instead of during bootstrap composition
- Spreading registration across unrelated modules with no single bootstrap owner
- Using frontend DI for app-level data fetching (prefer hooks + Apollo)
- Defining view access rules inline in `app.ts` — always extract to `config/accessRules.ts`
- Forgetting to call `setAccessRules()` in `configureApp(app)` — rules registered after first render are ignored

## Related skills

| Skill | When to use it |
| --- | --- |
| [frontend-layout](../frontend-layout/SKILL.md) | Defining layout config and shell/menu behavior |
| [frontend-views](../frontend-views/SKILL.md) | Implementing view components and route targets |
| [frontend-services](../frontend-services/SKILL.md) | Creating singleton frontend services and injection contracts |
| [frontend-context](../frontend-context/SKILL.md) | Reading and mutating UI context state from app/view code |

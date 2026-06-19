---
name: frontend-services
description: >
  Essential skill for Drumr Framework frontend services. Covers the exact patterns for module-level singleton getters, shared state via React providers registered through the app registry, and service consumption from current function components.


metadata:
  applies-to:
    - core/frontend/src/config/
    - core/frontend/src/context/
    - core/frontend/src/graphql/
---

# Frontend services

## Purpose

Frontend services centralize reusable client-side application logic that should not be duplicated across view or layout components. In Drumr frontend, services are plain TypeScript classes exposed through module-level singleton getter functions.

Use services for:

- GraphQL orchestration and query/mutation composition
- Cross-view caching and cache invalidation
- Reusable business logic used by multiple views
- Runtime extension points that may require test replacements

## Scope and intent

Use this skill when you need to:

- Create a new service as a module-level singleton
- Consume framework singletons (`getContext()`, `getGraphQLClient()`, `getConfigService()`)
- Share cross-component state via React context + `app.registerProviders()`
- Keep service code predictable and testable

## Core patterns

### 1) Module-level singleton getter

Expose a single instance of the service using a lazy factory getter. Do not use class decorators or a DI container.

```ts
// frontend/src/services/DashboardDataService.ts
import { getGraphQLClient } from '@drumr/framework-frontend';
import { dataFindBy } from '@drumr/framework-frontend';
import type { ProjectQueryResponse, ProjectWhereInput, ProjectOrderByInput } from '@gql/types';

export class DashboardDataService {
  async loadSummary(): Promise<unknown> {
    const gql = getGraphQLClient();
    const op = dataFindBy<ProjectQueryResponse, ProjectWhereInput, ProjectOrderByInput>('Project')
      .paginate(20)
      .fields({ id: true, name: true, status: true })
      .build();

    return gql.query({ query: op.document, variables: op.variables });
  }
}

let _instance: DashboardDataService | undefined;

export function getDashboardDataService(): DashboardDataService {
  return (_instance ??= new DashboardDataService());
}
```

### 2) Consuming framework singletons

The framework exports three built-in getter functions for use **outside** React components (callbacks, lifecycle methods, imperative code). Never instantiate the underlying classes directly.

```ts
import {
  getContext,
  getGraphQLClient,
  getConfigService,
} from '@drumr/framework-frontend';

// App context (current user, path, mounted views)
const context = getContext();
console.log(context.user?.email);

// Apollo-backed GraphQL client
const gql = getGraphQLClient();
await gql.execute(op);

// App configuration loaded from config.json
const cfg = getConfigService();
const showIcons = cfg.custom?.showIcons;
```

**Inside React components**, prefer the hook equivalents — they are provided automatically by `DrumrProvider` (mounted by the framework's root container):

```tsx
import {
  useAppContext,
  useConfigService,
  useContextUser,
} from '@drumr/framework-frontend';

function Header() {
  const user = useContextUser();       // reactive: re-renders when user changes
  const config = useConfigService();   // stable reference: no re-renders
  const ctx = useAppContext();         // stable Context singleton: no re-renders
  // ...
}
```

| Situation | Use |
| --- | --- |
| Callbacks, services, lifecycle (outside React) | `getContext()`, `getConfigService()` |
| Reactive user/path/history in JSX | `useContextUser()`, `useContextPath()`, `useContextHistory()` |
| Config values in JSX | `useConfigService()` |
| Stable Context reference in callbacks inside components | `useAppContext()` |

### 3) Shared cross-component state via React providers

When state must be reactive (trigger re-renders) and shared across the component tree, use React context + `app.registerProviders()` instead of a singleton.

```tsx
// frontend/src/shared/providers/NotificationProvider.tsx
import React, { createContext, useCallback, useContext } from 'react';
import { notification } from 'antd';

interface NotificationContextValue {
  showSuccess: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [api, contextHolder] = notification.useNotification();
  const showSuccess = useCallback(
    (message: string) => { api.success({ message, placement: 'topRight' }); },
    [api],
  );
  return (
    <NotificationContext.Provider value={{ showSuccess }}>
      {contextHolder}
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationService(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationService must be used within a NotificationProvider');
  return ctx;
}
```

```tsx
// frontend/src/config/providers/appProviders.tsx
import React from 'react';
import type { AppRegistry } from '@drumr/framework-frontend';
import { NotificationProvider } from '../../shared/providers/NotificationProvider';

export function registerProviders(app: AppRegistry) {
  app.registerProviders(({ children }) => (
    <NotificationProvider>{children}</NotificationProvider>
  ));
}
```

## Consuming services from views

Call the getter function directly inside function components or runtime callbacks. Do not use `new` or any DI container.

```tsx
import { View } from '@drumr/framework-frontend';
import React, { useCallback, useEffect, useState } from 'react';
import { getActivityLogDataService } from '../services/ActivityLogDataService';

export function ActivityLogView() {
  const [entries, setEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const activityLogService = getActivityLogDataService();

  const loadLog = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await activityLogService.getActivityLog();
      setEntries(data?.entries ?? []);
    } finally {
      setLoading(false);
    }
  }, [activityLogService]);

  useEffect(() => {
    void loadLog();
  }, [loadLog]);

  return (
    <View header={{ title: 'Activity Log' }}>
      {loading ? 'Loading...' : `${entries.length} entries`}
    </View>
  );
}
```

## Testing

Reset the module-level singleton between tests using `jest.resetModules()`, or expose a `resetServiceForTesting()` helper on the module when tests need a fresh instance.

```ts
// Option A — jest.resetModules() in beforeEach (isolated module context per test)
beforeEach(() => {
  jest.resetModules();
});

// Option B — expose an explicit reset helper (preferred when tests share a module)
// In the service module:
export function resetDashboardDataServiceForTesting(): void {
  _instance = undefined;
}

// In the test file:
import { resetDashboardDataServiceForTesting, getDashboardDataService } from '../../src/services/DashboardDataService';

beforeEach(() => {
  resetDashboardDataServiceForTesting();
});
```

## Usage notes

- Keep each service focused on a single responsibility.
- Keep public APIs explicitly typed.
- Prefer passing `getGraphQLClient()` calls inside service methods rather than at module load time.
- Keep side effects isolated and explicit (network, storage, timers).
- Reuse framework helpers such as `getGraphQLClient()` and `dataFindBy`.
- When behavior changes, update related skills in the same PR.

## Anti-patterns

- Putting large business workflows directly inside view components instead of extracting them to a service.
- Instantiating service classes manually with `new` in views.
- Mixing unrelated concerns in one service (transport + formatting + UI state + navigation).
- Creating ad hoc mutable globals instead of explicit service getters or provider hooks.

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [frontend-api](../frontend-api/SKILL.md) | If service methods must execute typed operation-builder queries/mutations. | This skill includes service structure but not comprehensive API builder conventions. |
| [frontend-tech-stack](../frontend-tech-stack/SKILL.md) | If service behavior depends on Apollo/React runtime constraints and provider setup. | This skill is service-focused and does not document full stack-level troubleshooting. |
| [frontend-views](../frontend-views/SKILL.md) | If services are consumed in specific view lifecycle hooks and UI orchestration. | This skill describes service creation, not all view lifecycle integration patterns. |
| [frontend-notifications](../frontend-notifications/SKILL.md) | If service logic must show canonical user feedback through `getApp()` and follow App bootstrap constraints. | This skill covers DI/service architecture, but it is not the canonical source for notification API usage and anti-patterns. |

---
name: frontend-custom-views
description: Essential skill for Drumr Framework frontend. Teaches the current custom page pattern: register routes in app.registerRoutes(), build free-form pages as functional components with View, receive route params as props, and use openView or closeView for navigation. Covers the remaining class-based CustomViewComponent surface when a view needs lifecycle hooks.
metadata:
  applies-to:
    - core/frontend/src/components/views/View.tsx
    - core/frontend/src/components/views/CustomView.tsx
    - core/frontend/src/decorators/CustomView.ts
    - core/frontend/src/runtime/discoverViews.ts
    - core/frontend/src/runtime/defineRouting.ts
    - core/frontend/src/navigation/openView.ts
---

# Frontend skill: custom views

Apply to:

- '**/frontend/src/**/views/**/*.tsx'
- '**/frontend/src/**/views/**/*.ts'
- '**/frontend/src/config/routing.ts'

## Purpose

Use this skill when the user asks about:

- Creating a dashboard, summary page, report page, landing page, or other free-form page in the Drumr frontend
- Registering a route that points to a custom page component
- Reading route params or query params inside a custom page
- Navigating between custom pages programmatically
- Opening a custom page in `pageContent`, `modal`, or `current`
- Choosing between the primary functional `View` pattern and the class-based `CustomViewComponent` surface

A custom view is a route-backed page that is not primarily one of the form or table view primitives. In current app code, the primary pattern is a function component composed with `View` and registered in `app.registerRoutes()`.

---

## Core building blocks

### Route registration is the source of truth

Register every custom page in `app.registerRoutes()` from `frontend/src/config/routing.ts`. The route definition owns the page path and layout.

```typescript
import { AppRegistry } from '@drumr/framework-frontend';
import DashboardView from '../dashboard/views/DashboardView';
import SummaryView from '../dashboard/views/SummaryView';
import TaskEstimateView from '../tasks/views/TaskEstimateView';
import { formLayout } from './layouts/formLayout';

export function registerRoutes(app: AppRegistry) {
  app.registerRoutes([
    { path: '/', view: DashboardView },
    { path: '/summary', view: SummaryView },
    { path: '/tasks/estimate', view: TaskEstimateView, layout: formLayout },
  ]);
}
```

Do not rely on decorator metadata as the routing source of truth.

### Functional `View` pages are the primary authoring pattern

Build new custom pages as function components and wrap the page in `View`.

```typescript
import { View } from '@drumr/framework-frontend';
import { Card } from 'antd';

export function DashboardView() {
  return (
    <View
      header={{
        title: 'Dashboard',
        subTitle: 'Project activity and summary metrics',
      }}
    >
      <Card>Dashboard content</Card>
    </View>
  );
}

export default DashboardView;
```

Use `View` to compose the header, content, and optional footer for a custom page.

### Functional route props

For functional custom pages registered through `app.registerRoutes()`:

- Path params are injected as top-level props
- Query params are injected as a `queryParams` prop

```typescript
import { View } from '@drumr/framework-frontend';

type ProjectOverviewViewProps = {
  id: string;
  queryParams?: Record<string, string>;
};

export function ProjectOverviewView({ id, queryParams }: ProjectOverviewViewProps) {
  return (
    <View
      header={{
        title: `Project ${id}`,
        subTitle: queryParams?.tab ? `Active tab: ${queryParams.tab}` : undefined,
      }}
    >
      <div>Custom page content</div>
    </View>
  );
}
```

Prefer these injected props over coupling the page directly to router-specific hooks.

---

## Current custom page patterns

### Minimal route-backed page

```typescript
import { View } from '@drumr/framework-frontend';
import { Card } from 'antd';

export function WelcomeView() {
  return (
    <View header={{ title: 'Welcome' }}>
      <Card>Hello from Drumr</Card>
    </View>
  );
}

export default WelcomeView;
```

### Page with toolbar actions

```typescript
import { DataForm, toolbar, useDataForm, View } from '@drumr/framework-frontend';
import React, { useMemo } from 'react';

export function TaskEstimateView() {
  const dataFormHook = useDataForm({ model: 'TaskEstimate', isNewObject: true });

  const headerConfig = useMemo(
    () => ({
      title: 'Task estimate',
      subTitle: 'Submit an estimate for review',
      toolbar: {
        buttons: [
          toolbar.objectAction('SubmitEstimate', {
            elementId: 'submit-estimate',
            targetObject: dataFormHook.form.state.values as Record<string, unknown>,
          }),
        ],
      },
    }),
    [dataFormHook.form.state.values],
  );

  return (
    <View header={headerConfig}>
      <DataForm model="TaskEstimate" dataFormHook={dataFormHook} isNewObject />
    </View>
  );
}
```

### Page navigation from a function component

Use `openView()` for programmatic navigation.

```typescript
import { openView, View } from '@drumr/framework-frontend';
import { Button } from 'antd';
import SummaryView from './SummaryView';

export function DashboardView() {
  return (
    <View header={{ title: 'Dashboard' }}>
      <Button
        onClick={() =>
          openView(SummaryView, {
            container: 'pageContent',
            queryParams: { scope: 'weekly' },
          })
        }
      >
        Open summary
      </Button>
    </View>
  );
}
```

Current container values are:

- `pageContent` for full-page navigation
- `modal` for modal presentation
- `current` to replace content inside the current `ViewContainer`

### Modal flow

Use `openView()` with `container: 'modal'`, then call `closeView()` from the opened page when the flow is complete.

```typescript
import { closeView, openView, View } from '@drumr/framework-frontend';
import { Button } from 'antd';
import CreateProjectView from '../projects/views/ProjectCreateView';

export function DashboardView() {
  return (
    <View header={{ title: 'Dashboard' }}>
      <Button
        onClick={() =>
          openView(CreateProjectView, {
            container: 'modal',
            queryParams: { source: 'dashboard' },
          })
        }
      >
        Create project
      </Button>
    </View>
  );
}

export function QuickCreateDoneButton() {
  return <Button onClick={() => closeView({ executed: true })}>Done</Button>;
}
```

### Nested navigation in a `ViewContainer`

When a custom page is rendered inside a `ViewContainer`, use `container: 'current'` to swap the content within that container instead of navigating the full page.

```typescript
import { openView } from '@drumr/framework-frontend';
import TaskDetailView from './TaskDetailView';

openView(TaskDetailView, {
  container: 'current',
  params: { id: row.id },
  breadcrumbLabel: row.title,
});
```

---

## Class-based custom views

The class-based surface still exists when a view needs the `CustomViewComponent` lifecycle hooks or class helpers such as `this.app`, `this.workflows`, `this.getParams()`, or `this.getQuery()`.

If you use the class-based surface:

- keep the route registered in `app.registerRoutes()`
- keep decorator metadata aligned with the registered route
- implement `onRender()` instead of overriding `render()`

```typescript
import {
  CustomView,
  CustomViewComponent,
  type ViewHeaderConfig,
} from '@drumr/framework-frontend';
import { Card } from 'antd';

@CustomView({
  path: '/project-audit',
  id: 'project-audit',
})
export default class ProjectAuditView extends CustomViewComponent {
  override header: ViewHeaderConfig = {
    title: 'Project audit',
  };

  override async onLoad() {
    this.app.message.info('Loading audit data');
  }

  override onRender() {
    return <Card>Audit content</Card>;
  }
}
```

### Class-based lifecycle hooks

| Hook | When it runs | Typical use |
| --- | --- | --- |
| `onLoad()` | After the view mounts | Fetch data, set up subscriptions |
| `onLeave()` | Before the view unmounts | Clean up subscriptions or pending work |
| `onRender()` | Every render cycle | Return the page content |
| `onParamsChange(prevParams, newParams)` | When route params or query params change | Reload view state without remounting |

For class-based views, use `this.getParams()` and `this.getQuery()` to read routing state.

---

## File placement

Co-locate custom pages with the domain they belong to, and keep route registration in `config/routing.ts`.

```text
frontend/
  src/
    config/
      routing.ts
    dashboard/
      views/
        DashboardView.tsx
        SummaryView.tsx
    shared/
      views/
        ErrorPagesTestView.tsx
    tasks/
      views/
        TaskEstimateView.tsx
```

Use one page component per file and export it as the default view for route registration.

---

## Rules and constraints

| Rule | Reason |
| --- | --- |
| Register every custom page in `app.registerRoutes()` | Route definitions populate the runtime route registry and own the path |
| Use a function component with `View` for new custom pages | This is the primary authoring pattern in current app code |
| Read path params from function props and query params from `queryParams` | Functional route wrappers inject them automatically |
| Use `openView()` with `pageContent`, `modal`, or `current` | These are the supported navigation containers |
| Use `closeView()` to finish modal or nested flows | The navigation stack handles return data and cleanup |
| Keep layout selection in the route config | Layout is assigned where the route is registered |
| Use `getApp()` or `App.useApp()` in function components for notifications and modals | UI feedback must use the Ant Design App context |
| Use `this.app` only inside `CustomViewComponent` subclasses | The class surface exposes the App APIs there |
| Do not rely on decorator metadata for automatic routing | Registered routes are the current routing source of truth |
| Do not override `render()` in `CustomViewComponent` subclasses | Class-based custom views render through `onRender()` |

## Navigation paths to associated skills

| Associated skill | When to use it | Why this skill is not enough |
| --- | --- | --- |
| [frontend-app](../frontend-app/SKILL.md) | If the page needs bootstrap wiring in `app.ts`, providers, or access rules | This skill focuses on page components and routes, not the full frontend bootstrap |
| [frontend-layout](../frontend-layout/SKILL.md) | If the page must participate in a specific app shell or layout configuration | This skill focuses on the page and its route, not on layout composition |
| [frontend-views](../frontend-views/SKILL.md) | If the user needs shared guidance that applies across read, edit, create, table, and action views | This skill covers free-form custom pages specifically |
| [frontend-services](../frontend-services/SKILL.md) | If page state, orchestration, or side effects should move into injectable services | This skill focuses on view composition, not service boundaries |
| [frontend-api](../frontend-api/SKILL.md) | If the page needs detailed operation-builder query or mutation guidance | This skill covers page structure and navigation, not API composition |
| [frontend-notifications](../frontend-notifications/SKILL.md) | If the main concern is feedback patterns across views and non-view code | This skill only covers notifications as part of custom page flows |

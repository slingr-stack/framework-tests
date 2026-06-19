---
name: frontend-layout
description: Use it to create, configure, or extend Drumr application layouts. Covers app.registerLayout(), navigation modes, menu system (menu namespace), header/footer configuration, per-route layout assignment via app.registerRoutes(), and lifecycle hooks.
metadata:
  applies-to:
    - core/frontend/src/pages/
    - core/frontend/src/decorators/
    - core/frontend/src/runtime/defineLayout.ts
---

# Frontend layout

## Purpose & scope

A **Layout** controls the structural shell of every page in a Drumr frontend app:

- Navigation position (left sidebar, top bar, or mixed)
- Primary (`leftMenu`), secondary (`topMenu`), and user (`userMenu`) navigation menus
- Header and footer
- Content width and sidebar collapse behaviour

Use `app.registerLayout()` to create layouts. It registers the layout name and returns the layout class used by `app.registerDefaults()` and `app.registerRoutes()`.

## Multi-skill routing

- Use [frontend-app](../frontend-app/SKILL.md) when wiring `app.registerDefaults()`, `app.registerRoutes()`, providers, or app bootstrap flow.
- Use [frontend-views](../frontend-views/SKILL.md) when layout menus or routes target concrete views and shared view primitives.
- Use [frontend-services](../frontend-services/SKILL.md) when menus, badges, or layout behavior depend on injected services.

## Quick start — `app.registerLayout()`

```typescript
import { app, menu } from '@drumr/framework-frontend';
import { DashboardOutlined } from '@ant-design/icons';
import DashboardView from '@/dashboard/views/DashboardView';

export const mainLayout = app.registerLayout('main', {
  navigation: 'mix',
  contentWidth: 'fixed',

  features: {
    header: true,
    footer: true,
    leftMenu: true,
    topMenu: true,
    userMenu: true,
  },

  header: { title: 'My App' },
  footer: { copyright: '© 2026 My Company' },

  leftMenu: {
    menu: menu({
      items: [
        menu.view({ elementId: 'dashboard', view: DashboardView, label: 'Dashboard', icon: <DashboardOutlined /> }),
      ],
    }),
  },

  onMenuClick() {
    console.log('[mainLayout] Menu item clicked');
  },

  onMenuCollapse(collapsed: boolean) {
    console.log('[mainLayout] Sidebar', collapsed ? 'collapsed' : 'expanded');
  },
});
```

## `app.registerLayout(name, config)`

`app.registerLayout(name: string, config: DefineLayoutConfig)` registers the layout under the given name and returns a layout class that is immediately usable as a `defaultLayout` in `app.registerDefaults()` or as a `layout` entry in `app.registerRoutes()`.

- `DefineLayoutConfig` is a `Partial<LayoutConfig>` — all keys are optional.
- Import: `import { app } from '@drumr/framework-frontend';`
- `DefineLayoutConfig` (the type) is also exported if you need type annotations.

### Layout file location

Place layout files under `frontend/src/config/layouts/`:

```
frontend/src/config/layouts/
  mainLayout.tsx    ← default/global layout
  formLayout.tsx    ← form-heavy routes
  viewLayout.tsx    ← read/detail routes
```

### Assigning layouts in `routing.ts`

Assign layouts in `app.registerRoutes()`. Layout selection lives in routing config, not on view classes.

```typescript
// frontend/src/config/routing.ts
import { app } from '@drumr/framework-frontend';
import { mainLayout } from '@/config/layouts/mainLayout';
import { formLayout } from '@/config/layouts/formLayout';

export function registerRoutes() {
  app.registerRoutes([
    { path: '/projects',          view: ProjectTableView,  layout: mainLayout },
    { path: '/projects/new',      view: ProjectCreateView, layout: formLayout },
    { path: '/projects/:id',      view: ProjectReadView,   layout: mainLayout },
    { path: '/projects/:id/edit', view: ProjectEditView,   layout: formLayout },
  ]);
}
```

## Navigation modes

Set `navigation` to control where menus appear:

| Value    | Behaviour                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------- |
| `'mix'`  | Top bar + left sidebar; menu splitting is controlled by `layoutSettings.splitMenus` in `app.registerDefaults()` |
| `'left'` | Sidebar only; `topMenu` is hidden even if enabled in `features`                                     |
| `'top'`  | Top bar only; `leftMenu` is **always hidden** even if `features.leftMenu = true`                    |

> **Rule**: When `navigation = 'top'`, only configure `topMenu`. Setting `leftMenu` has no effect.

## Content width

```typescript
contentWidth: 'fluid';  // full width (default)
contentWidth: 'fixed';  // capped at ~1200px
```

## Sidebar collapse

```typescript
collapsible: true,   // enables collapse toggle
collapsed: false,    // initial state
```

## Features

Controls which layout chrome is rendered. All keys are optional (default is `DEFAULT_LAYOUT_FEATURES`):

```typescript
import { DEFAULT_LAYOUT_FEATURES } from '@drumr/framework-frontend';

features: {
  ...DEFAULT_LAYOUT_FEATURES,  // { header: true, footer: true, leftMenu: true, topMenu: false, userMenu: true }
  topMenu: true,               // override individual keys as needed
  footer: false,
},
```

## Header configuration

```typescript
header: {
  title: 'My App',          // text shown in the header
},
```

> App-level `layoutSettings.logo` sets the global default logo.

---

## Footer configuration

```typescript
footer: {
  copyright: '© 2026 My Company',
  links: [
    { key: 'docs', title: 'Documentation', href: 'https://docs.example.com', blankTarget: true },
    { key: 'support', title: 'Support', href: 'https://support.example.com', blankTarget: true },
  ],
},
```

## Menu system — `menu` namespace

Import the `menu` namespace from `@drumr/framework-frontend`. It is both a **function** (creates the menu structure) and a **namespace** (builds individual items).

```typescript
import { menu } from '@drumr/framework-frontend';
```

### `menu({ items: [...] })` — menu container

Wraps items into a typed menu structure used by `leftMenu.menu`, `topMenu.menu`, and `userMenu.menu`.

### `menu.view()` — navigate to a view

```typescript
// Direct class reference (most common)
menu.view({ elementId: 'projects', view: ProjectTableView, label: 'Projects', icon: <ProjectOutlined /> })

// Lazy reference — use to avoid circular imports
menu.view({ elementId: 'tasks', view: () => TaskTableView, label: 'Tasks' })

// With static params (passed to view on open)
menu.view({ elementId: 'my-profile', view: UserReadView, label: 'My Profile',
  params: async () => {
    const ctx = getContext();
    return ctx.user?.id ? { id: ctx.user.id } : {};
  },
})

// With query params driving the view's initial query
menu.view({ elementId: 'my-tasks', view: TaskTableView, label: 'My Tasks',
  queryParams: () => {
    const ctx = getContext();
    return { assignee: ctx.user?.id };
  },
})
```

`menu.view(...)` entries automatically respect frontend view access rules registered
via `app.registerViewAccessForRole`. If the current user is denied for the target
view, the framework hides the menu entry once the permission cache resolves, and
direct navigation is still blocked by the route guard. See the `frontend-app` skill
for how to register rules in `config/accessRules.ts`.

### `menu.group()` — flat section header (left menu only)

Renders a non-collapsible, labelled group. Valid at the **top level of `leftMenu`** and **inside `menu.subMenu()`**. Not valid at the top level of `topMenu` or `userMenu`.

```typescript
menu.group({
  elementId: 'main-menu',
  label: 'Main',
  icon: <MenuOutlined />,
  items: [
    menu.view({ elementId: 'projects', view: ProjectTableView, label: 'Projects' }),
    menu.view({ elementId: 'tasks', view: TaskTableView, label: 'Tasks' }),
  ],
})
```

### `menu.subMenu()` — collapsible section (top menu primary)

Primarily used in `topMenu`. Also valid in `leftMenu` when a collapsible section is needed. Can contain `menu.view()`, `menu.divider()`, and `menu.group()`.

```typescript
menu.subMenu({
  elementId: 'admin',
  label: 'Admin',
  icon: <SettingOutlined />,
  items: [
    menu.view({ elementId: 'users', view: UserTableView, label: 'Users' }),
    menu.divider(),
    menu.view({ elementId: 'roles', view: RolesView, label: 'Roles' }),
  ],
})
```

### `menu.divider()` — visual separator

```typescript
menu.divider();
menu.divider({ id: 'after-home' }); // optional explicit id
```

### `menu.customAction()` — run code on click

```typescript
menu.customAction({
  elementId: 'refresh',
  label: 'Refresh Data',
  icon: <ReloadOutlined />,
  handler: async () => {
    await refreshData();
  },
})
```

### `menu.objectAction()`, `menu.modelAction()`, `menu.globalAction()` — invoke backend actions

```typescript
menu.objectAction('AssignTask'); // shorthand: action name string
menu.objectAction({ elementId: 'assign', name: 'AssignTask', label: 'Assign' });

menu.modelAction('BulkArchive');
menu.globalAction('SendNotification');
```

### `menu.actionsMenu()` — dynamic action list

Renders a set of actions resolved at runtime. Typically used in toolbars but valid in menus too.

```typescript
menu.actionsMenu({ actions: ['StartTask', 'CompleteTask'] });
```

### `menu.myProfileAction()` — "My Profile" shortcut

Adds a menu item that navigates to the user's own profile view.

```typescript
menu.myProfileAction({
  elementId: 'myProfile-user-menu',
  view: UserReadView,
  label: 'My Profile',
  icon: <UserOutlined />,
})
```

## `leftMenu` configuration

```typescript
leftMenu: {
  menu: menu({
    items: [
      menu.group({ elementId: 'home', label: 'Home', items: [ /* ... */ ] }),
      menu.divider(),
      menu.group({ elementId: 'settings', label: 'Settings', items: [ /* ... */ ] }),
    ],
  }),
},
```

## `topMenu` configuration

```typescript
topMenu: {
  position: 'header' as const,  // only valid value
  menu: menu({
    items: [
      menu.view({ elementId: 'dashboard', view: DashboardView, label: 'Dashboard' }),
      menu.subMenu({
        elementId: 'views', label: 'Views',
        items: [
          menu.view({ elementId: 'projects', view: ProjectTableView, label: 'Projects' }),
          menu.view({ elementId: 'tasks', view: TaskTableView, label: 'Tasks' }),
        ],
      }),
    ],
  }),
},
```

## `userMenu` configuration

The framework's `enhanceUserMenu` function processes the items before rendering:

- `menu.myProfileAction()` is **explicit only**: include it when you want a "My Profile" entry and control its target/label/icon.
- **Logout** is always appended by the Ant Design Pro shell — treat it as fixed shell behavior.

This means:

- **Omit `menu.myProfileAction()`** if you do not want a profile entry in `userMenu`.
- **Include `menu.myProfileAction()`** when you need profile navigation (for example, to `UserReadView`) and control over target view, label, or icon.

```typescript
// Minimal: default "My Profile" (→ MyProfileView) is auto-inserted by the framework
userMenu: {
  menu: menu({
    items: [
      menu.view({ elementId: 'dashboard', view: DashboardView, label: 'Dashboard' }),
    ],
  }),
},

// Custom: supply menu.myProfileAction() to override the target view, label, or icon.
userMenu: {
  menu: menu({
    items: [
      menu.myProfileAction({ elementId: 'myProfile', view: UserReadView, label: 'My Profile', icon: <UserOutlined /> }),
      menu.divider(),
    ],
  }),
},
```

### My Profile setup (explicit-only)

When a developer asks for "My Profile" setup, generate this pattern by default:

1. Ensure layout features enable `userMenu`.
2. Add `override userMenu: UserMenuConfig`.
3. Add `menu.myProfileAction(...)` explicitly (never imply auto-insert behavior).
4. Default the target view to `UserReadView` when the app already has user CRUD views.

Default snippet to generate:

```typescript
import { UserOutlined } from '@ant-design/icons';
import type { UserMenuConfig } from '@drumr/framework-frontend';
import { menu } from '@drumr/framework-frontend';
import UserReadView from '@/views/dataModels/users/UserReadView';

override userMenu: UserMenuConfig = {
  menu: menu({
    items: [
      menu.myProfileAction({
        elementId: 'myProfile-user-menu',
        view: UserReadView,
        label: 'My Profile',
        icon: <UserOutlined />,
      }),
    ],
  }),
};
```

Customization guidance to generate:

- Keep `menu.myProfileAction(...)` and customize `label`, `icon`, `container`, `modalSize`, `modalPosition`, `params`, and `queryParams` as needed.
- For a fully custom profile page, create a `@CustomView` and set `view` in `menu.myProfileAction(...)` to that custom view class.

Do not generate any guidance that omits `menu.myProfileAction(...)` while expecting the framework to auto-add a profile entry.

## Dynamic menu labels and params

Labels can be React components or functions returning JSX. Use `useContextValue` inside label components for reactive data.

```typescript
import { useContextValue, getContext } from '@drumr/framework-frontend';

// Dynamic label (React component)
function TaskCountLabel() {
  // ... fetch count with Apollo, render badge
  return <span>Tasks <Badge count={count} /></span>;
}

menu.view({
  elementId: 'tasks',
  view: TaskTableView,
  label: TaskCountLabel,   // React component — re-renders on state change
  icon: <CheckSquareOutlined />,
})

// Dynamic queryParams using getContext()
menu.view({
  elementId: 'my-tasks',
  view: TaskTableView,
  label: 'My Tasks',
  queryParams: () => {
    const ctx = getContext();
    const userView = ctx.views.get(UserReadView);
    return userView ? { assignee: userView.getParams()['id'] } : {};
  },
})
```

## Lifecycle hooks

Declare lifecycle hooks as config keys inside `app.registerLayout()`:

```typescript
export const mainLayout = app.registerLayout('main', {
  // ...

  onMenuClick() {
    console.log('[mainLayout] Menu item clicked');
    // analytics, side effects
  },

  onMenuCollapse(collapsed: boolean) {
    console.log('[mainLayout] Sidebar', collapsed ? 'collapsed' : 'expanded');
    // persist user preference
  },

  onPageSwitch() {
    console.log('[mainLayout] Page switched');
    // reset scroll, clear notifications
  },
});
```

---

## Multiple layouts — recommended pattern

Define a layout per major section of the app. Each layout provides the shell appropriate for that section.

```typescript
// mainLayout  — full sidebar + header, navigation='mix'
// formLayout  — minimal top bar only, navigation='top', no footer
// viewLayout  — left sidebar only, navigation='left'

// config/appDefaults.ts → app.registerDefaults({ defaultLayout: mainLayout })
// EditView / CreateView → { layout: formLayout } in app.registerRoutes()
// ReadView with context panel → { layout: viewLayout } in app.registerRoutes()
```

## App-level layout settings

`app.registerDefaults({ layoutSettings })` supplies global Ant Design Pro layout options shared by all layouts. These are not per-layout — they apply to the entire app shell.

```typescript
import { app } from '@drumr/framework-frontend';
import type { LayoutSettings } from '@drumr/framework-frontend';
import { mainLayout } from './layouts/mainLayout';

export function registerAppDefaults() {
  app.registerDefaults({
    defaultLayout: mainLayout,
    layoutSettings: {
      logo: '/logo.svg',
      navTheme: 'light', // 'light' | 'realDark'
      fixedHeader: false,
      fixSiderbar: true,
    } satisfies LayoutSettings,
  });
}
```

## Layout-related exports

Common layout exports from `@drumr/framework-frontend`:

| Export                    | Kind      | Purpose                                           |
| ------------------------- | --------- | ------------------------------------------------- |
| `defineLayout`            | function  | Build a layout class from plain config            |
| `DefineLayoutConfig`      | type      | Optional layout config shape                      |
| `Navigation`              | type      | `'mix' \| 'left' \| 'top'`                        |
| `NavigationType`          | enum      | Same values as `Navigation` with autocomplete     |
| `ContentWidth`            | type      | `'fluid' \| 'fixed'`                              |
| `ContentWidthType`        | enum      | Same values as `ContentWidth` with autocomplete   |
| `MenuPositionType`        | enum      | `Header = 'header'`                               |
| `DEFAULT_LAYOUT_FEATURES` | const     | Default values for `LayoutFeatures`               |
| `LayoutFeatures`          | interface | `{ header, footer, leftMenu, topMenu, userMenu }` |
| `LayoutHeaderConfig`      | interface | `{ title?, logo? }`                               |
| `LayoutFooterConfig`      | interface | `{ copyright?, links? }`                          |
| `LeftMenuConfig`          | interface | `{ menu? }`                                       |
| `TopMenuConfig`           | interface | `{ position?, menu? }`                            |
| `UserMenuConfig`          | interface | `{ position?, menu? }`                            |
| `menu`                    | namespace | Builds menus and all menu item types              |

## Checklist

Before writing layout code:

- [ ] Use `app.registerLayout(name, config)` and export the returned layout as a named constant
- [ ] Export the return value as a named export: `export const mainLayout = app.registerLayout('main', {...})`
- [ ] Place layout file in `frontend/src/config/layouts/`
- [ ] Import `app` from `@drumr/framework-frontend` only — no direct `tsyringe` imports
- [ ] Assign layouts in `routing.ts` via `app.registerRoutes()`
- [ ] When `navigation = 'top'`: use `topMenu` only, no `leftMenu`
- [ ] When `navigation = 'left'`: use `leftMenu`, `topMenu` is hidden at runtime
- [ ] `topMenu.position` must always be `'header' as const`
- [ ] Use lazy view refs (`view: () => ViewClass`) in `FormLayout`-style layouts to avoid circular imports

## Related skills

| Associated Skill | When to use | Why this skill is not enough |
| --- | --- | --- |
| [frontend-views](../frontend-views/SKILL.md) | If layout menu entries must target concrete views with specific view configuration. | This skill explains shell composition, not full target view implementation details. |
| [frontend-services](../frontend-services/SKILL.md) | If dynamic menus, badges, or layout behavior rely on injectable frontend services. | This skill shows usage touchpoints but not complete service architecture patterns. |
| [frontend-tech-stack](../frontend-tech-stack/SKILL.md) | If layout customization requires deeper Ant Design Pro/React stack constraints. | This skill describes layout APIs but not full stack-level implementation guidance. |
| [frontend-api](../frontend-api/SKILL.md) | If layout-level widgets need direct data fetching through operation builders. | This skill is layout-oriented and does not define complete API integration flows. |
| [frontend-notifications](../frontend-notifications/SKILL.md) | If layout-level actions or shell interactions need canonical message/modal/notification behavior. | This skill focuses on layout composition, not dedicated notification APIs and guardrails. |

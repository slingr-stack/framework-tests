# Header & navigation components

> Part of the [frontend-components](./SKILL.md) skill.

---

## Purpose

These components provide the header navigation area — the user avatar dropdown, the header dropdown wrapper, and the right-side content area. They are internal framework components used by the layout system.

**You do NOT use these directly** — they are configured through the layout's `features`, `userMenu`, and menu system via `app.registerLayout()`.

---

## Components

### `HeaderDropdown`

A responsive Ant Design `<Dropdown>` wrapper used internally by `AvatarDropdown` and other header items.

This is an internal component (`core/frontend/src/components/HeaderDropdown/index.tsx`) — it is not exported for direct app consumption.

### `AvatarDropdown`

Renders the user avatar/email and a dropdown menu with profile actions and logout. Reads the current user from the framework's `initialState` store.

Features:

- Displays current user email
- Renders custom menu items configured via the layout's `userMenu`
- Logout action with token cleanup (always present; no configuration needed)
- Navigation to custom profile/settings views via `menu.myProfileAction()`

### `RightContent`

Container for right-side header items. Includes `AvatarDropdown` and optionally `WorkflowNotificationCenter`.

---

## Configuration via `app.registerLayout()`

These components are not imported directly. Configure them through the layout object:

```typescript
// apps/project-management-app/frontend/src/config/layouts/mainLayout.tsx
import {
  app,
  menu,
  type UserMenuConfig,
  type LayoutFeatures,
} from '@drumr/framework-frontend';
import { UserOutlined, SettingOutlined } from '@ant-design/icons';
import UserReadView from '@/users/views/UserReadView';
import SettingsView from '@/settings/views/SettingsView';

export const mainLayout = app.registerLayout('main', {
  features: {
    header: true,
    userMenu: true,
  } as LayoutFeatures,

  userMenu: {
    menu: menu({
      items: [
        menu.myProfileAction({
          elementId: 'myProfile-user-menu',
          view: UserReadView,
          label: 'My Profile',
          icon: <UserOutlined />,
        }),
        menu.view({
          elementId: 'settings',
          view: SettingsView,
          label: 'Settings',
          icon: <SettingOutlined />,
        }),
      ],
    }),
  } as UserMenuConfig,
});
```

### `menu.myProfileAction()`

Opens a view scoped to the currently logged-in user's record. The framework automatically resolves the current user's id and passes it as the `id` param when the view path contains `:id`.

```typescript
menu.myProfileAction({
  elementId: 'myProfile-user-menu',
  view: UserReadView,          // Any view that accepts an id param
  label: 'My Profile',
  icon: <UserOutlined />,
  container: 'page',           // optional: 'page' (default) | 'modal'
})
```

---

## User menu behavior

- **Logout** is always appended automatically — the framework provides it without configuration. When `userMenu.menu.items` is empty or not set, only the logout entry is shown.
- **Menu items** defined in `userMenu.menu` appear above the automatic logout entry.
- The dropdown opens when clicking the user avatar/email in the top-right header area.

---

## Best practices

1. **Do not import `HeaderDropdown` or `AvatarDropdown` directly** — configure them via `app.registerLayout()`.
2. **User menu items are defined in the layout** via `userMenu.menu.items`.
3. **My Profile is explicit-only** — add `menu.myProfileAction(...)` when needed; never assume auto-inserted profile entries.
4. **Logout is automatic** — the framework provides it without configuration.
5. **`features.userMenu: false`** hides the entire avatar dropdown when you do not need per-user navigation.

---

## Related skills

- [frontend-layout](../frontend-layout/SKILL.md) — Full layout configuration including header, menus, and `app.registerLayout()`

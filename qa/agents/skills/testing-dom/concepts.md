# Concepts: DOM Abstraction

> How the Drumr framework renders UI components and why DrumrTestKit must be the only layer with that knowledge.

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | UmiJS + Ant Design Pro + Apollo Client |
| Backend | TypeScript + TypeORM + PostgreSQL + GraphQL |
| Routing | UmiJS convention-based |

---

## UI Component Mapping

| Framework concept | Ant Design component |
|-------------------|---------------------|
| Tables | ProTable (`@ant-design/pro-table`) |
| Forms | ProForm (`@ant-design/pro-form`) |
| Layout | ProLayout (`@ant-design/pro-layout`) |
| Modals/drawers | Modal / Drawer (`antd`) |
| Select fields | Select (`antd`) — NOT native `<select>` |
| Notifications | message / notification (`antd`) |

---

## View Types and Containers

| View type | Purpose | Typical container |
|-----------|---------|-------------------|
| TableView | List records | Page (always) |
| CreateView | New record form | Page |
| ReadView | Record detail | Page or drawer |
| EditView | Edit record form | Page, drawer, or modal |

Drawer stacking: TableView (page) → ReadView (left drawer) → EditView (right drawer). Z-index increments with each layer.

---

## Form Field Conventions

| Convention | Detail |
|-----------|--------|
| Field ID | `id="fieldName"` (e.g., `id="title"`) |
| Select fields | Ant Design `<Select>`, NOT native |
| Textarea fields | Accessible name = **placeholder text** |
| Required fields | Marked with `*` in label |
| Composition fields | Nested records in Card with heading |

---

## CRUD Action Labels

| Action | Button text |
|--------|-------------|
| Create | Create |
| Edit | Edit |
| Delete | Delete |
| Save | Save |

Labels are simple verbs — they do NOT include the entity name.

---

## Delete Confirmation

- `Modal.confirm` from Ant Design
- Confirm button: `"Delete"` or `"Execute"` depending on context
- Container CSS: `.ant-modal-confirm`

---

## Authentication

| Fact | Value |
|------|-------|
| Login URL | `/login` (NOT `/user/login`) |
| Email field | `#email` |
| Password field | `#password` |
| Credentials | Check `LOGIN_INFO.md` in app root or env vars |

---

## Drawer Scoping

The framework supports **stacked drawers** (e.g., ReadView drawer + EditView drawer on top). Field IDs can collide between the table's filter inputs and the edit form.

`DrumrTestKit` handles this with `_formContainer` scoping:
- `waitForForm()` detects if a drawer is open and scopes to the **topmost** drawer body
- `fillField()` and `clearAndFillField()` use the scoped container
- `navigateTo()` resets the scope to prevent stale scoping across tests

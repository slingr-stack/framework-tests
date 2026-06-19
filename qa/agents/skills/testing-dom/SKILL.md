# Skill: testing-dom

> DrumrTestKit API reference, framework rendering knowledge, and selector strategy for E2E tests.

## Scope

This skill covers everything about how the Drumr framework renders UI components and how `DrumrTestKit` abstracts that rendering for test authors. Spec files never use this knowledge directly — it lives exclusively inside `drumr-test-kit.ts`.

| Topic | File |
|-------|------|
| Why the abstraction exists and framework rendering architecture | [concepts.md](./concepts.md) |
| Selector priority, scoping rules, and kit extension discipline | [best-practices.md](./best-practices.md) |
| Internal selector patterns used inside the kit | [examples.md](./examples.md) |

---

## DrumrTestKit API Reference

> Always read the actual `drumr-test-kit.ts` file in the target app — it may have app-specific extensions. Use the concrete API present in the repo, not a speculative one.

### Authentication

| Method | Signature | Purpose |
|--------|-----------|---------|
| `login` | `(email, password) → void` | Navigate to `/login`, fill credentials, submit |
| `loginAsAdmin` | `() → void` | Login with admin credentials (env vars first, no hardcoded fallback) |
| `expectLoggedIn` | `() → void` | Assert user is authenticated |
| `expectOnLoginPage` | `() → void` | Assert user is on the login page |
| `logout` | `() → void` | Open avatar dropdown and click logout |
| `reload` | `() → void` | Reload current page and wait for network |

### Navigation

| Method | Signature | Purpose |
|--------|-----------|---------|
| `navigateTo` | `(path) → void` | Navigate to a framework entity route. Resets drawer scope. |

### TableView

| Method | Signature | Purpose |
|--------|-----------|---------|
| `waitForTable` | `() → void` | Wait for `slingr-data-table` to be visible |
| `waitForDrawer` | `() → void` | Wait for a drawer/modal to appear |
| `clickCreateInTable` | `() → void` | Click "Create" in table toolbar |
| `searchInTable` | `(text) → void` | Fill search filter and click Search |
| `clickTableRow` | `(text) → void` | Find row by text (searches if needed) and click |
| `clickFirstTableRow` | `() → void` | Click the first data row |
| `selectFirstRowCheckbox` | `() → void` | Check checkbox on first data row |
| `expectTableContains` | `(text) → void` | Assert table displays text (searches first) |
| `expectTableNotContains` | `(text) → void` | Assert table does NOT display text |

### Forms (CreateView / EditView)

| Method | Signature | Purpose |
|--------|-----------|---------|
| `waitForForm` | `(fieldId?) → void` | Wait for form field; auto-scopes to topmost drawer |
| `fillField` | `(fieldId, value) → void` | Fill text/number input by ID |
| `clearAndFillField` | `(fieldId, value) → void` | Clear and re-fill (keyboard-level for React) |
| `fillTextarea` | `(placeholderPattern, value) → void` | Fill textarea by placeholder |
| `selectFirstOption` | `(fieldLabel) → void` | Click Select/Reference field, pick first option |
| `selectFirstOptionByPlaceholder` | `(placeholder) → void` | Same but by placeholder text |
| `fillCompositionReferenceField` | `(sectionTitle, fieldLabel) → void` | Fill reference field inside composition section |
| `submitCreate` | `() → void` | Click "Create" and wait for navigation |
| `submitSave` | `() → void` | Click "Save" in edit form |

### ReadView

| Method | Signature | Purpose |
|--------|-----------|---------|
| `expectTextVisible` | `(text) → void` | Assert text is visible |
| `clickManageDropdown` | `() → void` | Open "Manage" dropdown (waits for async toolbar) |
| `clickManageOption` | `(namePattern) → void` | Click Manage dropdown item |
| `clickActionsDropdown` | `() → void` | Open "Actions" dropdown |
| `clickActionOption` | `(namePattern) → void` | Click Actions dropdown item |
| `clickEditButton` | `(entityName?) → void` | Click standalone "Edit" button |
| `clickDeleteButton` | `(entityName?) → void` | Click standalone "Delete" button |
| `clickDeleteButtonAndWait` | `(buttonName?) → void` | Wait for delete button, then click |
| `clickToolbarMoreButton` | `() → void` | Click "More" overflow button |
| `clickMenuItem` | `(namePattern) → void` | Click any menu item by pattern |
| `confirmDelete` | `() → void` | Confirm delete dialog (clicks "Delete" or "Execute") |

### Action dialogs

| Method | Signature | Purpose |
|--------|-----------|---------|
| `waitForDialog` | `(namePattern) → void` | Wait for named modal dialog |
| `selectFirstOptionInDialog` | `(dialogName, fieldLabel) → void` | Select first option inside dialog |
| `executeDialog` | `(dialogName) → void` | Click "Execute" in dialog, wait for close |

### Feedback and assertions

| Method | Signature | Purpose |
|--------|-----------|---------|
| `expectFeedback` | `(textPattern) → void` | Assert feedback message visible |
| `expectFieldHasValue` | `(fieldLabel) → void` | Assert form field has non-empty value |

# Examples: E2E Tests

> Representative E2E patterns based on the project-management-app. Adapt import paths and kit usage to match the app's current `drumr-test-kit.ts` API.

---

## Example 1: Drawer-Based CRUD (Tasks)

The ReadView for Tasks opens in a **drawer**. Use `waitForDrawer()` after clicking a row. The Manage dropdown provides Edit and Delete actions inside the drawer.

```typescript
import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

const TASK_TITLE = `E2E Task ${Date.now()}`;
const TASK_TITLE_EDITED = `${TASK_TITLE} Edited`;

test.describe.serial('Tasks CRUD E2E', () => {
  test.setTimeout(90_000);

  test('should create a new task', async ({ page }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await app.navigateTo('/tasks');
    await app.waitForTable();

    await app.clickCreateInTable();
    await app.waitForForm('title');
    await app.fillField('title', TASK_TITLE);
    await app.fillTextarea(/enter task description/i, 'Task created by Playwright E2E test');
    await app.selectFirstOption('Project');
    await app.fillCompositionReferenceField('Notes', 'Created By');
    await app.submitCreate();

    await app.navigateTo('/tasks');
    await app.expectTableContains(TASK_TITLE);
  });

  test('should read/view a task', async ({ page }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await app.navigateTo('/tasks');
    await app.waitForTable();

    await app.clickTableRow(TASK_TITLE);
    await app.waitForDrawer();
    await app.expectTextVisible(TASK_TITLE);
  });

  test('should edit an existing task', async ({ page }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await app.navigateTo('/tasks');
    await app.waitForTable();

    await app.clickTableRow(TASK_TITLE);
    await app.waitForDrawer();
    await app.clickManageDropdown();
    await app.clickManageOption(/edit/i);
    await app.waitForForm('title');
    await app.clearAndFillField('title', TASK_TITLE_EDITED);
    await app.submitSave();

    await app.navigateTo('/tasks');
    await app.expectTableContains(TASK_TITLE_EDITED);
  });

  test('should delete a task', async ({ page }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await app.navigateTo('/tasks');
    await app.waitForTable();

    await app.clickTableRow(TASK_TITLE_EDITED);
    await app.waitForDrawer();
    await app.clickManageDropdown();
    await app.clickManageOption(/delete/i);
    await app.confirmDelete();

    await app.navigateTo('/tasks');
    await app.expectTableNotContains(TASK_TITLE_EDITED);
  });
});
```

### Key patterns

1. **Serial suite** — edit depends on create, delete depends on edit.
2. **Drawer-based ReadView** — uses `waitForDrawer()` after `clickTableRow()`.
3. **Stacked drawers** — EditView opens as second drawer; `waitForForm()` auto-scopes to the topmost.
4. **Composition fields** — `fillCompositionReferenceField()` handles nested composition records.
5. **`clearAndFillField`** — uses keyboard-level input for React compatibility.
6. **Navigate back after mutation** — verifies persistence in the table.

---

## Example 2: Page-Based CRUD (Projects)

The ReadView for Projects opens as a **page** (URL navigation), not a drawer. Edit and Delete use standalone buttons instead of the Manage dropdown.

```typescript
import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

const PROJECT_NAME = `E2E Project ${Date.now()}`;
const PROJECT_NAME_EDITED = `${PROJECT_NAME} Edited`;

test.describe.serial('Projects CRUD E2E', () => {
  test.setTimeout(90_000);

  test('should create a new project', async ({ page }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await app.navigateTo('/projects');
    await app.waitForTable();

    await app.clickCreateInTable();
    await app.waitForForm('name');
    await app.fillField('name', PROJECT_NAME);
    await app.fillField('code', `E2E${Date.now()}`);
    await app.selectFirstOption('Status');
    await app.submitCreate();

    await app.navigateTo('/projects');
    await app.expectTableContains(PROJECT_NAME);
  });

  test('should read/view a project', async ({ page }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await app.navigateTo('/projects');
    await app.waitForTable();

    // Page-based ReadView — no waitForDrawer()
    await app.clickTableRow(PROJECT_NAME);
    await app.expectTextVisible(PROJECT_NAME);
  });

  test('should edit an existing project', async ({ page }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await app.navigateTo('/projects');
    await app.waitForTable();

    await app.clickTableRow(PROJECT_NAME);
    await app.clickEditButton();
    await app.waitForForm('name');
    await app.clearAndFillField('name', PROJECT_NAME_EDITED);
    await app.submitSave();

    await app.navigateTo('/projects');
    await app.expectTableContains(PROJECT_NAME_EDITED);
  });

  test('should delete a project', async ({ page }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await app.navigateTo('/projects');
    await app.waitForTable();

    await app.clickTableRow(PROJECT_NAME_EDITED);
    await app.clickDeleteButtonAndWait();
    await app.confirmDelete();

    await app.navigateTo('/projects');
    await app.expectTableNotContains(PROJECT_NAME_EDITED);
  });
});
```

### Drawer vs page pattern comparison

| Aspect | Tasks (drawer) | Projects (page) |
|--------|----------------|-----------------|
| Row click | Opens drawer → `waitForDrawer()` | Navigates URL — no `waitForDrawer()` |
| Edit trigger | `clickManageDropdown()` + `clickManageOption(/edit/i)` | `clickEditButton()` |
| Delete trigger | `clickManageDropdown()` + `clickManageOption(/delete/i)` | `clickDeleteButtonAndWait()` |
| Edit form container | Stacked drawer — `waitForForm()` auto-scopes | Page-level — no scoping needed |

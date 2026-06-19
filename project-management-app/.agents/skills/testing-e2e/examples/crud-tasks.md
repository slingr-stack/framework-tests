# Example: CRUD Test — Tasks (Drawer-Based ReadView)

> This is a real, passing test from the `project-management-app`. The ReadView opens in a **drawer**.

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
    // ...assertions for drawer content...
  });

  // ...more CRUD tests (edit, delete)...
});
```

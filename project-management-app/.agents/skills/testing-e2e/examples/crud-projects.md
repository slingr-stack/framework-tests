# Example: CRUD Test — Projects (Page-Based ReadView)

> CRUD for an entity where ReadView opens as a **page** (URL navigation), not a drawer.

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
    // ...assertions for page content...
  });

  // ...more CRUD tests (edit, delete)...
});
```

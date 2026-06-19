import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.describe
  .serial('Task – Project Details Panel E2E', () => {
    let PROJECT_NAME: string;
    let PROJECT_CODE: string;
    let TASK_TITLE: string;
    test.beforeAll(() => {
      PROJECT_NAME = `E2E Details Project ${Date.now()}`;
      PROJECT_CODE = `DP-${Date.now() % 1000}`;
      TASK_TITLE = `E2E Details Task ${Date.now()}`;
    });
    // This describe creates a project, then creates/edits a task linked to
    // it across several tests. The "editing a task that already has a
    // project" case runs create + navigate + open drawer + manage + edit
    // back-to-back, which can exceed 90s on resource-constrained CI runners.
    test.setTimeout(180_000);

    // ── Setup: create the project used across all tests ──────────────────

    test('setup: create project', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await app.clickCreateInTable();
      await app.waitForForm('name');
      await app.fillField('name', PROJECT_NAME);
      await app.fillField('code', PROJECT_CODE);
      await app.selectFirstOption('Manager');
      await app.submitCreate();

      await app.navigateTo('/projects');
      await app.expectTableContains(PROJECT_NAME);
    });

    // ── Core feature: panel appears when project is selected ─────────────

    test('should show project details panel after selecting a project in the create form', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.clickCreateInTable();
      await app.waitForForm('title');
      await app.fillField('title', TASK_TITLE);

      // Select the specific project we created in setup
      await app.selectOption('Project', PROJECT_NAME);

      // The project details panel (Alert wrapping a DataForm) should appear
      // and show the project name fetched from the backend
      const alert = page.locator('.ant-alert').first();
      await expect(alert).toBeVisible({ timeout: 15_000 });
      await expect(alert).toContainText(PROJECT_NAME, { timeout: 15_000 });
    });

    test('should show project details panel with project code and manager', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.clickCreateInTable();
      await app.waitForForm('title');
      await app.fillField('title', `${TASK_TITLE} Details Check`);

      await app.selectOption('Project', PROJECT_NAME);

      const alert = page.locator('.ant-alert').first();
      await expect(alert).toBeVisible({ timeout: 15_000 });
      // All three projected fields (name, code, manager) should be visible
      await expect(alert).toContainText(PROJECT_NAME, { timeout: 15_000 });
      await expect(alert).toContainText(PROJECT_CODE, { timeout: 15_000 });
    });

    test('should show project details panel when editing a task that already has a project', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      // First create a task with a project via the create form
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickCreateInTable();
      await app.waitForForm('title');
      await app.fillField('title', `${TASK_TITLE} For Edit`);
      await app.selectOption('Project', PROJECT_NAME);
      await app.fillCompositionReferenceFieldIfPresent('Notes', 'Created By');
      await app.submitCreate();

      // Now open the task in edit mode and verify the panel is already visible
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickTableRow(`${TASK_TITLE} For Edit`);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      const alert = page.locator('.ant-alert').first();
      await expect(alert).toBeVisible({ timeout: 15_000 });
      await expect(alert).toContainText(PROJECT_NAME, { timeout: 15_000 });
    });

    // ── Teardown: clean up project ────────────────────────────────────────

    test('teardown: delete project', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await app.clickTableRow(PROJECT_NAME);
      await app.clickDeleteButtonAndWait();
      await app.confirmDelete();

      await app.navigateTo('/projects');
      await app.expectTableNotContains(PROJECT_NAME);
    });
  });

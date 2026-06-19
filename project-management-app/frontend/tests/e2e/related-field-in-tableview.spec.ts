/**
 * E2E tests for related-field (dot-notation) columns in TaskTableView.
 *
 * Verifies that `field: 'project.code'` correctly:
 * 1. Displays the project code in the table column
 * 2. Allows sorting by project code
 * 3. Allows filtering by project code
 */
import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

const SUFFIX = Date.now();
const PROJECT_NAME = `RelatedFieldE2E-${SUFFIX}`;
const PROJECT_CODE = `RF-${SUFFIX % 10_000}`;
const TASK_TITLE = `RelatedTask-${SUFFIX}`;

test.describe
  .serial('TaskTableView — related field (project.code) column', () => {
    test.setTimeout(120_000);

    test('setup: create project and task', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      // Create project
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.clickCreateInTable();
      await app.waitForForm('name');
      await app.fillField('name', PROJECT_NAME);
      await app.fillField('code', PROJECT_CODE);
      await app.selectFirstOption('Manager');
      await app.submitCreate();

      // Create task linked to project
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickCreateInTable();
      await app.waitForForm('title');
      await app.fillField('title', TASK_TITLE);
      await app.selectOption('Project', PROJECT_NAME);
      await app.submitCreate();
    });

    test('project.code column is visible and shows correct value', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // The "Project Code" column header should be present
      await expect(
        page.getByRole('columnheader', { name: 'Project Code' }),
      ).toBeVisible();

      // Filter to our test task by title
      await app.filterTable('Title', TASK_TITLE);
      await app.waitForTable();

      // The project code should appear in the table row
      await expect(
        page.getByRole('cell', { name: PROJECT_CODE }),
      ).toBeVisible();
    });

    test('table can be sorted by project.code', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Click "Project Code" column header to sort
      const header = page.getByRole('columnheader', { name: 'Project Code' });
      await header.click();

      // Table should still be visible after sort (no error)
      await app.waitForTable();
      await expect(page.locator('.ant-table-wrapper')).toBeVisible();
    });

    test('table can be filtered by project.code', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Filter by project code using the filter panel
      await app.filterTable('Project Code', PROJECT_CODE);
      await app.waitForTable();

      // Our task should be visible
      await expect(page.getByRole('cell', { name: TASK_TITLE })).toBeVisible();
    });

    test('teardown: delete task and project', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      // Delete task by opening it directly and using Manage > Delete
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.filterTable('Title', TASK_TITLE);
      await app.waitForTable();
      const taskRow = page
        .locator('.ant-table-tbody tr.ant-table-row')
        .filter({ hasText: TASK_TITLE })
        .first();
      const hasTaskRow = await taskRow.isVisible().catch(() => false);
      if (hasTaskRow) {
        // Open row actions menu (the "more" dropdown in the row toolbar) and delete
        await app.openRowActionsMenu(TASK_TITLE);
        await app.clickMenuItem(/delete/i);
        await app.confirmDelete();
        await app.waitForTable();
      }

      // Delete project by opening it directly and using Manage > Delete
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.filterTable('Project Name', PROJECT_NAME);
      await app.waitForTable();
      const projectRow = page
        .locator('.ant-table-tbody tr.ant-table-row')
        .filter({ hasText: PROJECT_NAME })
        .first();
      const hasProjectRow = await projectRow.isVisible().catch(() => false);
      if (hasProjectRow) {
        await app.clickTableRow(PROJECT_NAME);
        // ProjectTableView uses default row click → navigates to /projects/<id>/view
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(2000);
        await app.clickDeleteButtonAndWait();
        await app.confirmDelete();
      }
    });
  });

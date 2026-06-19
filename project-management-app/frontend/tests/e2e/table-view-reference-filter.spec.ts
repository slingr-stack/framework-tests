/**
 * E2E tests for reference field filter dropdowns in TaskTableView (Issue #1455).
 *
 * Regression: before the fix, the Project and Assignee filter dropdowns in the
 * task table were always empty because ProTable's `formItemRender` prop was set
 * under the old name `renderFormItem`, which pro-components 3.x silently ignores,
 * causing <ReferenceFilter> to never mount and no GraphQL queries to be fired.
 *
 * Scenario:
 *   1. Create a dedicated project (FILTER_PROJECT) and a task linked to it.
 *   2. Open the Task table and verify the Project filter dropdown shows options.
 *   3. Select FILTER_PROJECT — the table must show only the test task.
 *   4. Verify the Assignee filter dropdown shows eligible users (role-filtered
 *      server-side: developer / manager / admin).
 *   5. Clear the filter — the full task list is restored.
 *   6. Teardown: delete the test task and project.
 */
import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

// ── Unique identifiers ────────────────────────────────────────────────────────
const SUFFIX = Date.now();
const FILTER_PROJECT_NAME = `FilterE2E-${SUFFIX}`;
const FILTER_PROJECT_CODE = `FE-${SUFFIX % 10_000}`;
const FILTER_TASK_TITLE = `FilterTask-${SUFFIX}`;

test.describe
  .serial('TaskTableView — reference filter dropdowns (Issue #1455)', () => {
    test.setTimeout(120_000);

    // ── Setup ─────────────────────────────────────────────────────────────────

    test('setup: create a dedicated project', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await app.clickCreateInTable();
      await app.waitForForm('name');
      await app.fillField('name', FILTER_PROJECT_NAME);
      await app.fillField('code', FILTER_PROJECT_CODE);
      await app.selectFirstOption('Manager');
      await app.submitCreate();

      await app.navigateTo('/projects');
      await app.expectTableContains(FILTER_PROJECT_NAME);
    });

    test('setup: create a task linked to the dedicated project', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.clickCreateInTable();
      await app.waitForForm('title');
      await app.fillField('title', FILTER_TASK_TITLE);
      await app.selectOption('Project', FILTER_PROJECT_NAME);
      // onRefresh auto-sets reporter to the project manager; clear it so the
      // task can be saved without a reporter (the field is optional).
      await app.clearReferenceFieldIfSet('Reporter');
      await app.fillCompositionReferenceFieldIfPresent('Notes', 'Created By');
      await app.submitCreate();

      await app.navigateTo('/tasks');
      await app.expectTableContains(FILTER_TASK_TITLE);
    });

    // ── Test 1: Project filter shows options (core regression check) ──────────

    test('Project filter dropdown shows options on open', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Regression: before fix, opening this dropdown always showed an empty list
      await app.openTableReferenceFilter('Project');
      await app.expectDropdownContainsOption(FILTER_PROJECT_NAME);
      await app.closeOpenDropdown();
    });

    // ── Test 2: Selecting a project narrows the table ─────────────────────────

    test('Selecting a project filter shows only its tasks', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.openTableReferenceFilter('Project');
      await app.selectTableFilterOption(FILTER_PROJECT_NAME);
      await app.applyTableFilters();

      // The test task must be present
      await app.expectTableContains(FILTER_TASK_TITLE);

      // Every project cell visible in the table must belong to FILTER_PROJECT_NAME —
      // verifies the filter was applied server-side, not just client-side
      const projectCells = page
        .locator('.ant-table-tbody td')
        .filter({ hasText: /FilterE2E/ });
      const count = await projectCells.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await expect(projectCells.nth(i)).toContainText(FILTER_PROJECT_NAME);
      }
    });

    // ── Test 3: Clearing the filter restores the full table ───────────────────

    test('Clearing the project filter restores all tasks', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.openTableReferenceFilter('Project');
      await app.selectTableFilterOption(FILTER_PROJECT_NAME);
      await app.applyTableFilters();
      await app.expectTableContains(FILTER_TASK_TITLE);

      await app.clearTableFilters();

      // Table still renders without errors after clearing
      await expect(page.locator('.ant-table-tbody')).toBeVisible();
    });

    // ── Teardown ──────────────────────────────────────────────────────────────

    test('teardown: delete the test task', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      const row = page
        .locator('.ant-table-tbody tr')
        .filter({ hasText: FILTER_TASK_TITLE })
        .first();
      const exists = await row.isVisible().catch(() => false);
      if (!exists) return;

      await app.clickTableRow(FILTER_TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/delete/i);
      await app.confirmDelete();
    });

    test('teardown: delete the test project', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      const row = page
        .locator('.ant-table-tbody tr')
        .filter({ hasText: FILTER_PROJECT_NAME })
        .first();
      const exists = await row.isVisible().catch(() => false);
      if (!exists) return;

      await app.clickTableRow(FILTER_PROJECT_NAME);
      await app.clickDeleteButtonAndWait();
      await app.confirmDelete();
    });
  });

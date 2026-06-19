/**
 * E2E tests for dynamic Tasks menu item label and queryParams filtering.
 *
 * When a UserReadView is open (mounted in the UI Context):
 *   - The "Tasks" menu item label changes to "User's tasks"
 *   - Clicking it navigates to /tasks?assignee=<userId> and the table is
 *     pre-filtered to show only that user's tasks.
 *
 * When no UserReadView is open (e.g. a ProjectReadView is the current page):
 *   - The label reads "All tasks"
 *   - Clicking it navigates to /tasks with no assignee filter.
 *
 * Setup: create a dedicated user, project, and a task assigned to that user
 * so we have a guaranteed filterable row in the tasks table.
 * Teardown: delete the task, project, and user.
 */
import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

// ── Unique identifiers ────────────────────────────────────────────────────────
const SUFFIX = Date.now();
const USER_FIRST = `DynMenu${SUFFIX}`;
const USER_LAST = 'TestUser';
const USER_FULL_NAME = `${USER_FIRST} ${USER_LAST}`;
const USER_EMAIL = `dyn.menu.${SUFFIX}@example.com`;
const PROJECT_NAME = `DynMenuProject-${SUFFIX}`;
const PROJECT_CODE = `DM-${SUFFIX % 10_000}`;
const TASK_TITLE = `DynMenuTask-${SUFFIX}`;

test.describe
  .serial('Dynamic Tasks menu — label and queryParams (Context-aware)', () => {
    test.setTimeout(120_000);

    // ── Setup ─────────────────────────────────────────────────────────────────

    test('setup: create user', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/users/new');
      await app.waitForForm('firstName');
      await app.fillField('firstName', USER_FIRST);
      await app.fillField('lastName', USER_LAST);
      await app.fillField('email', USER_EMAIL);
      await app.selectOption('Roles', /admin/i);
      await app.submitCreate();

      await app.navigateTo('/users');
      await app.expectTableContains(USER_FULL_NAME);
    });

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

    test('setup: create task assigned to the test user', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickCreateInTable();
      await app.waitForForm('title');
      await app.fillField('title', TASK_TITLE);
      await app.selectOption('Project', PROJECT_NAME);
      await app.selectOption('Assignee', USER_FULL_NAME);
      await app.fillCompositionReferenceFieldIfPresent('Notes', 'Created By');
      await app.submitCreate();

      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.expectTableContains(TASK_TITLE);
    });

    // ── Scenario 1: UserReadView open → "User's tasks" → filtered table ───────

    test('shows "User\'s tasks" label when UserReadView is open', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      // Navigate to the Users table and open the test user's read view
      await app.navigateTo('/users');
      await app.waitForTable();
      await app.clickTableRow(USER_FULL_NAME);

      // UserReadView opens as a page (URL changes to /users/<id>/view)
      await expect(page).toHaveURL(/\/users\/[^/]+\/view/, { timeout: 15_000 });

      // The Tasks menu item should now read "User's tasks"
      await app.expectMainMenuItemLabel(/tasks/i, "User's tasks");
    });

    test('clicking "User\'s tasks" navigates to tasks filtered by that user', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      // Open the test user's read view
      await app.navigateTo('/users');
      await app.waitForTable();
      await app.clickTableRow(USER_FULL_NAME);

      // UserReadView opens as a page (URL changes to /users/<id>/view)
      await expect(page).toHaveURL(/\/users\/[^/]+\/view/, { timeout: 15_000 });

      // Click the dynamic "User's tasks" menu item
      await app.clickMainMenuItem("User's tasks");

      // Should navigate to /tasks with the assignee query param
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10_000 });
      await app.waitForTable();

      // The task we created for this user must be in the results
      await app.expectTableContains(TASK_TITLE);

      // Every visible row must have this user in the Assignee column
      await app.expectTableFilteredBy('Assignee', USER_FULL_NAME);
    });

    // ── Scenario 2: ProjectReadView open → "All tasks" → unfiltered table ─────

    test('shows "All tasks" label when a ProjectReadView is open (no UserReadView)', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      // Open a project read view — no UserReadView in context
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.clickTableRow(PROJECT_NAME);
      await expect(page).toHaveURL(/\/projects\/[^/]+\/view/, {
        timeout: 15_000,
      });

      // Label must revert to "All tasks"
      await app.expectMainMenuItemLabel(/tasks/i, 'All tasks');
    });

    test('clicking "All tasks" navigates to tasks without assignee filter', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      // Open a project read view
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.clickTableRow(PROJECT_NAME);
      await expect(page).toHaveURL(/\/projects\/[^/]+\/view/, {
        timeout: 15_000,
      });

      // Click the "All tasks" menu item
      await app.clickMainMenuItem('All tasks');
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10_000 });
      await app.waitForTable();

      // URL must NOT contain an assignee filter
      await expect(page).not.toHaveURL(/[?&]assignee=/, { timeout: 5_000 });

      // The task we created must appear (confirms table is not limited to one user)
      await app.expectTableContains(TASK_TITLE);
    });

    // ── Teardown ──────────────────────────────────────────────────────────────

    test('teardown: delete task', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/delete/i);
      await app.confirmDelete();
      await app.navigateTo('/tasks');
      await app.expectTableNotContains(TASK_TITLE);
    });

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

    test('teardown: delete user', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/users');
      await app.waitForTable();
      await app.selectTableRowCheckbox(USER_FULL_NAME);
      await app.clickDeleteButton();
      await app.confirmDelete();
      await app.navigateTo('/users');
      await app.expectTableNotContains(USER_FULL_NAME);
    });
  });

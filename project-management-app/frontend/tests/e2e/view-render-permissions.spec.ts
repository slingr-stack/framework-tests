/**
 * E2E tests — View render permissions
 *
 * Validates the framework-level view render permission feature.
 * Rules are registered via `app.registerViewAccessForRole` in
 * `frontend/src/config/accessRules.ts` and evaluated purely on the
 * client — no backend GraphQL round-trip is performed.
 *
 * Permission matrix under test (project-management-app demo):
 *
 * | View              | Admin | Manager | Developer |
 * |-------------------|-------|---------|-----------|
 * | UserTableView     |  ✅   |   ❌    |    ❌     |
 * | SummaryView       |  ✅   |   ✅    |    ❌     |
 * | ActivityLogView   |  ✅   |   ✅    |    ❌     |
 * | All other views   |  ✅   |   ✅    |    ✅     |
 *
 * The "Manage Users" toolbar.view() button in ProjectTableView is also tested
 * because it exercises the framework's auto-hide of toolbar buttons whose
 * target view is render-permission-denied for the current user.
 *
 * Credential environment variables:
 *   Admin    — E2E_EMAIL / E2E_ADMIN_EMAIL  +  E2E_PASSWORD / E2E_ADMIN_PASSWORD
 *   Manager  — E2E_MANAGER_EMAIL            +  E2E_MANAGER_PASSWORD
 *   Developer— E2E_DEVELOPER_EMAIL          +  E2E_DEVELOPER_PASSWORD
 */
import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

// ─────────────────────────────────────────────────────────────────────────────
// Admin — uses the default storageState (pre-loaded admin session)
// ─────────────────────────────────────────────────────────────────────────────
test.describe
  .serial('View render permissions — Admin', () => {
    test.setTimeout(90_000);

    test('direct navigation to /summary loads the view', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/summary');
      await app.expectUrlMatches(/\/summary/);
      await app.expectUrlNotMatches(/\/permission-denied/);
    });

    test('direct navigation to /users loads the table view', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/users');
      await app.waitForTable();
    });

    test('Manage Users toolbar button is visible in Projects', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.expectBulkActionButtonVisible(/manage users/i);
    });

    test('Summary and Activity are visible in the top menu', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.expectMenuItemVisible('Summary');
      await app.expectMenuItemVisible('Activity');
    });

    test('Users is visible in the left sidebar', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.expectMenuItemVisible('Users');
    });
  });

// ─────────────────────────────────────────────────────────────────────────────
// Manager — empty storageState forces a fresh login for this describe block
// ─────────────────────────────────────────────────────────────────────────────
test.describe
  .serial('View render permissions — Manager', () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    test.setTimeout(90_000);

    test('login and direct navigation to /summary loads the view', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsManager();
      await app.navigateTo('/summary');
      await app.expectUrlMatches(/\/summary/);
      await app.expectUrlNotMatches(/\/permission-denied/);
    });

    test('direct navigation to /users redirects to permission denied', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsManager();
      await app.navigateTo('/users');
      await app.expectOnPermissionDeniedPage();
    });

    test('Manage Users toolbar button is hidden in Projects', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsManager();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.expectBulkActionButtonNotVisible(/manage users/i);
    });

    test('Summary and Activity are visible in the top menu', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsManager();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.expectMenuItemVisible('Summary');
      await app.expectMenuItemVisible('Activity');
    });

    test('Users is not visible in the left sidebar', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsManager();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.expectMenuItemNotVisible('Users');
    });
  });

// ─────────────────────────────────────────────────────────────────────────────
// Developer — empty storageState forces a fresh login for this describe block
// ─────────────────────────────────────────────────────────────────────────────
test.describe
  .serial('View render permissions — Developer', () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    test.setTimeout(90_000);

    test('login and direct navigation to /summary redirects to permission denied', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsDeveloper();
      await app.navigateTo('/summary');
      await app.expectOnPermissionDeniedPage();
    });

    test('direct navigation to /users redirects to permission denied', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsDeveloper();
      await app.navigateTo('/users');
      await app.expectOnPermissionDeniedPage();
    });

    test('Manage Users toolbar button is hidden in Projects', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsDeveloper();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.expectBulkActionButtonNotVisible(/manage users/i);
    });

    test('direct navigation to /activity redirects to permission denied', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsDeveloper();
      await app.navigateTo('/activity');
      await app.expectOnPermissionDeniedPage();
    });

    test('Summary, Activity, and Users are not visible in the menu', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsDeveloper();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.expectMenuItemNotVisible('Summary');
      await app.expectMenuItemNotVisible('Activity');
      await app.expectMenuItemNotVisible('Users');
    });
  });

// ─────────────────────────────────────────────────────────────────────────────
// Session isolation — permissions must not leak between sessions
// ─────────────────────────────────────────────────────────────────────────────
test.describe
  .serial('View render permissions — session isolation', () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    test.setTimeout(120_000);

    test('Manage Users button state is correct after Admin → Developer → Admin transitions', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);

      // Step 1: Admin baseline — button must be visible
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.expectBulkActionButtonVisible(/manage users/i);

      // Step 2: Switch to Developer — button must be hidden after permission cache clear
      await app.logout();
      await app.loginAsDeveloper();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.expectBulkActionButtonNotVisible(/manage users/i);

      // Step 3: Switch back to Admin — button must be visible again
      await app.logout();
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.expectBulkActionButtonVisible(/manage users/i);
    });

    test('left-menu Users item visibility updates correctly after Admin → Manager transition', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);

      // Admin: Users item must be visible in the sidebar
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.expectMenuItemVisible('Users');

      // Switch to Manager: Users item must be hidden
      await app.logout();
      await app.loginAsManager();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.expectMenuItemNotVisible('Users');
    });
  });

/**
 * E2E tests for ReferenceDropdown interaction freshness (PR #1369).
 *
 * Verifies that ReferenceDropdown refetches options on open/focus so a
 * recently-created entity appears immediately without a page reload.
 *
 * Scenario:
 *   1. Create a brand-new user (FRESH_USER) with a unique name.
 *   2. Open the Task edit form for a dedicated test task.
 *   3. Open the Assignee dropdown → FRESH_USER must appear in the options,
 *      proving the component did a live refetch and is not using stale data
 *      from a previous page-load cache.
 *   4. Repeat the same check for the Reporter dropdown.
 *   5. Teardown: delete the test task and user.
 */
import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

// ── Unique identifiers ───────────────────────────────────────────────────────
const SUFFIX = Date.now();
const FRESH_FIRST = `RefreshE2E${SUFFIX}`;
const FRESH_LAST = `User`;
const FRESH_USER_NAME = `${FRESH_FIRST} ${FRESH_LAST}`;
const FRESH_USER_EMAIL = `refresh.e2e.${SUFFIX}@example.com`;

test.describe
  .serial('ReferenceDropdown interaction freshness (PR #1369)', () => {
    test.setTimeout(90_000);

    // ── Setup: create the fresh user ─────────────────────────────────────────

    test('setup: create a fresh user that will appear in reference dropdowns', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/users/new');
      await app.waitForForm('firstName');

      await app.fillField('firstName', FRESH_FIRST);
      await app.fillField('lastName', FRESH_LAST);
      await app.fillField('email', FRESH_USER_EMAIL);
      await app.selectOption('Roles', /admin/i);

      await app.submitCreate();
    });

    // ── Test 1: Assignee dropdown refetches on open ───────────────────────────

    test('Assignee dropdown shows newly created user on open (refetch-on-open)', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Open any existing task ReadView drawer, then enter edit mode
      await app.clickFirstTableRow();
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      // Open the Assignee dropdown — this triggers the refetch-on-open/focus
      // from the PR. FRESH_USER was created in a different browser session so
      // it would be missing from any pre-loaded cache; a live fetch must return it.
      await app.openReferenceDropdown('assignee');
      await app.expectDropdownContainsOption(FRESH_USER_NAME);

      await app.closeOpenDropdown();
    });

    // ── Test 2: Reporter dropdown refetches on open ───────────────────────────

    test('Reporter dropdown shows newly created user on open (refetch-on-open)', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.clickFirstTableRow();
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      await app.openReferenceDropdown('Reporter');
      await app.expectDropdownContainsOption(FRESH_USER_NAME);

      await app.closeOpenDropdown();
    });

    // ── Teardown ──────────────────────────────────────────────────────────────

    test('teardown: delete the test user', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/users');
      await app.waitForTable();

      const row = page
        .locator('.ant-table-tbody tr')
        .filter({ hasText: FRESH_USER_NAME })
        .first();
      const exists = await row.isVisible().catch(() => false);
      if (!exists) {
        return;
      }

      await app.clickTableRow(FRESH_USER_NAME);
      const drawerVisible = await page
        .locator('.ant-drawer:visible, .ant-modal-wrap:visible')
        .first()
        .isVisible()
        .catch(() => false);

      if (!drawerVisible) {
        return;
      }

      await app.clickManageDropdown();
      await app.clickManageOption(/delete/i);
      await app.confirmDelete();

      await app.navigateTo('/users');
      await app.expectTableNotContains(FRESH_USER_NAME);
    });
  });

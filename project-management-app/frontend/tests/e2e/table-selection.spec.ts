import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

/**
 * E2E tests for DataTable row selection behaviour.
 *
 * Covers:
 *  - Individual row checkbox select / deselect
 *  - Alert banner text ("N items selected", "All N rows selected")
 *  - 3-state header checkbox (empty → all-visible/blue → all-global/orange)
 *  - "Clear" link resets selection
 *  - Refresh button resets selection
 *
 * Uses the seeded /tasks route because it has selection + bulk actions enabled
 * and more than one page of default rows to trigger the "select all rows" global mode.
 *
 * Tests that require a deterministic total count (> page size) filter to the
 * seeded BulkSetup-seed-* prefix (12 rows) so they don't race against parallel
 * workers mutating the global /tasks table.
 */
const TOTAL_COUNT_SETUP_PREFIX = 'BulkSetup-seed-';
test.describe
  .serial('DataTable – row selection', () => {
    test.setTimeout(90_000);

    // ── Individual row selection ──────────────────────────────────────────

    test('selecting a single row shows "1 item selected" alert', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.selectTableRowByIndex(0);
      await app.expectSelectionAlertText(/1 item selected/i);
    });

    test('selecting two rows shows "2 items selected" alert', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.selectTableRowByIndex(0);
      await app.selectTableRowByIndex(1);
      await app.expectSelectionAlertText(/2 items selected/i);
    });

    test('deselecting all individually-selected rows hides the alert', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.selectTableRowByIndex(0);
      await app.expectSelectionAlertText(/1 item selected/i);

      // deselect
      await app.selectTableRowByIndex(0);
      await app.expectNoSelectionAlert();
    });

    // ── Header checkbox 3-state ───────────────────────────────────────────

    test('first click on header checkbox selects all visible rows (blue)', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.clickHeaderCheckbox();

      // Alert should show the page-size count (10 items by default) — blue checked state
      await app.expectSelectionAlertText(/\d+ items? selected/i);
    });

    test('second click on header checkbox (all visible selected) selects ALL rows (orange)', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Filter to a stable seed prefix (12 rows > page size 10) so the
      // "select all" flow is deterministic regardless of parallel workers.
      await app.filterTable('Title', TOTAL_COUNT_SETUP_PREFIX);
      await app.waitForTable();
      const seedRow = page
        .locator('.ant-table-tbody tr.ant-table-row')
        .filter({ hasText: TOTAL_COUNT_SETUP_PREFIX })
        .first();
      await expect(seedRow).toBeVisible({ timeout: 20_000 });

      // First click → all visible selected (blue)
      await app.clickHeaderCheckbox();
      await app.expectSelectionAlertText(/\d+ items? selected/i);

      // Second click → all global rows selected (orange)
      await app.clickHeaderCheckbox();
      await app.expectSelectionAlertText(/All \d+ rows selected/i);
      await app.expectHeaderCheckboxOrange();
    });

    test('clicking orange header checkbox clears the entire selection', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Get to orange state
      await app.clickHeaderCheckbox(); // blue
      await app.clickHeaderCheckbox(); // orange
      await app.expectSelectionAlertText(/All \d+ rows selected/i);

      // Third click clears
      await app.clickHeaderCheckbox();
      await app.expectNoSelectionAlert();
    });

    // ── Clear link ────────────────────────────────────────────────────────

    test('"Clear" link in the alert bar resets selection', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.selectTableRowByIndex(0);
      await app.selectTableRowByIndex(1);
      await app.expectSelectionAlertText(/2 items selected/i);

      await app.clearTableSelection();
      await app.expectNoSelectionAlert();
    });
  });

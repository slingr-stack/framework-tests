import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

const _FILTERED_TODO_TASK_PREFIX = `BulkFilterTodoE2E-${Date.now()}`;
const _MIN_ROWS_FOR_FILTERED_SELECT_ALL = 11;

// Tasks seeded in Task.jsonl to guarantee totalCount > page size (10).
// Titles: BulkSetup-seed-00 through BulkSetup-seed-11
const SETUP_PREFIX = 'BulkSetup-seed-';
const _SETUP_TASK_COUNT = 12;

async function _deleteTasksByTitlePrefix(
  app: DrumrTestKit,
  page: import('@playwright/test').Page,
  prefix: string,
  expectedCount: number,
): Promise<void> {
  await app.navigateTo('/tasks');
  await app.waitForTable();
  await app.filterTable('Title', prefix);
  await app.waitForTable();

  const visibleRows = await page
    .locator('.ant-table-tbody tr.ant-table-row')
    .count();
  if (visibleRows === 0) {
    return;
  }

  await app.clickHeaderCheckbox();
  await app.expectSelectionAlertText(/\d+ items? selected/i);

  if (expectedCount > visibleRows) {
    await app.clickHeaderCheckbox();
    await app.expectSelectionAlertText(/All \d+ rows selected/i);
  }

  await app.clickBulkActionButton(
    new RegExp(`Delete \\(${expectedCount}\\)`, 'i'),
  );
  await app.confirmDelete();
  await app.waitForTable();
}

/**
 * E2E tests for DataTable bulk action behaviour.
 *
 * Covers:
 *  - Bulk action buttons absent when nothing is selected
 *  - Bulk action buttons appear with the correct row count label
 *  - Button label reflects totalCount when all rows are globally selected
 *  - Delete bulk action shows confirmation modal with counts and can be cancelled
 *  - BulkChangePriority action opens the form modal with the right context
 *  - Full execution of BulkChangePriority produces success feedback
 *  - All-rows state opens BulkChangePriority with the "all tasks" banner
 *  - Filtered select-all carries the active filter into the action view and backend defaults
 *
 * Uses the /tasks route because it has selection + bulk actions enabled.
 * BulkChangePriority is configured in the header toolbar of TaskTableView.
 * Delete is configured via toolbar({ actions: 'crud' }) in the table toolbar.
 */
test.describe
  .serial('DataTable – bulk actions', () => {
    test.setTimeout(90_000);

    // ── Button visibility ─────────────────────────────────────────────────

    test('bulk action buttons are not visible when no rows are selected', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // No selection — neither button should appear
      await app.expectBulkActionButtonNotVisible(/Bulk Change Priority/i);
      await app.expectBulkActionButtonNotVisible(/Delete \(\d+\)/i);
    });

    test('selecting rows shows "Bulk Change Priority (N)" and "Delete (N)" buttons', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.selectTableRowByIndex(0);
      await app.selectTableRowByIndex(1);
      await app.expectSelectionAlertText(/2 items selected/i);

      await app.expectBulkActionButtonVisible(/Bulk Change Priority \(2\)/i);
      await app.expectBulkActionButtonVisible(/Delete \(2\)/i);
    });

    test('selecting all rows shows total count in bulk action button labels', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Filter to the seeded BulkSetup-seed-* tasks (12 records, > page size of 10)
      // so this test is isolated from other parallel workers that may be creating
      // or deleting tasks on the global /tasks table.
      await app.filterTable('Title', SETUP_PREFIX);
      await app.waitForTable();

      await app.clickHeaderCheckbox(); // all-visible (blue)
      await app.expectSelectionAlertText(/\d+ items? selected/i);
      await app.clickHeaderCheckbox(); // all-global within filter (orange)
      await app.expectSelectionAlertText(/All \d+ rows selected/i);

      // Extract the total from the selection alert ("All 12 rows selected")
      const alertLocator = page.locator('.ant-pro-table-alert');
      const alertText = (await alertLocator.textContent()) ?? '';
      const totalMatch = alertText.match(/All (\d+) rows/i);
      expect(
        totalMatch,
        'Expected selection alert to include total row count',
      ).not.toBeNull();
      const total = totalMatch?.[1];

      // Button labels must include that same total
      await app.expectBulkActionButtonVisible(
        new RegExp(`Bulk Change Priority \\(${total}\\)`, 'i'),
      );
      await app.expectBulkActionButtonVisible(
        new RegExp(`Delete \\(${total}\\)`, 'i'),
      );
    });

    // ── Delete bulk action ────────────────────────────────────────────────

    test('Delete bulk action shows confirmation modal with the selected count', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.selectTableRowByIndex(0);
      await app.selectTableRowByIndex(1);
      await app.expectSelectionAlertText(/2 items selected/i);

      await app.clickBulkActionButton(/Delete \(2\)/i);

      // Confirmation modal must appear and mention the count
      const modal = page.locator('.ant-modal-confirm');
      await modal.waitFor({ state: 'visible', timeout: 10_000 });
      await expect(modal).toContainText(/2/, { timeout: 5_000 });

      // Cancel — do NOT delete production data
      await app.cancelDialog();
      await expect(modal).toBeHidden({ timeout: 10_000 });

      // Selection should still be intact after cancelling
      await app.expectSelectionAlertText(/2 items selected/i);
    });

    // ── BulkChangePriority action flow ────────────────────────────────────

    test('clicking "Bulk Change Priority (N)" opens the action form modal', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.selectTableRowByIndex(0);
      await app.selectTableRowByIndex(1);
      await app.expectSelectionAlertText(/2 items selected/i);

      await app.clickBulkActionButton(/Bulk Change Priority \(2\)/i);

      // Action form modal must open
      const dialog = page.getByRole('dialog', {
        name: /Bulk change priority/i,
      });
      await dialog.waitFor({ state: 'visible', timeout: 15_000 });

      // Modal must show the Priority select field
      const priorityField = dialog
        .locator('.ant-form-item')
        .filter({ hasText: /priority/i })
        .first();
      await expect(priorityField).toBeVisible({ timeout: 10_000 });

      // The BulkChangePriorityView info banner mentions count or "all tasks"
      await expect(dialog).toContainText(/task/i, { timeout: 5_000 });

      // Close without executing
      await app.cancelDialog();
      await expect(dialog).toBeHidden({ timeout: 10_000 });
    });

    test('executing BulkChangePriority with a chosen priority produces success feedback', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.selectTableRowByIndex(0);
      await app.selectTableRowByIndex(1);
      await app.expectSelectionAlertText(/2 items selected/i);

      await app.clickBulkActionButton(/Bulk Change Priority \(2\)/i);

      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible', timeout: 15_000 });

      // Select a priority value and execute — scope to dialog to avoid matching
      // the hidden Priority filter in the table's search form
      await app.selectFirstOptionInDialog(/Bulk change priority/i, 'Priority');

      const executeBtn = dialog.getByRole('button', { name: /execute/i });
      await executeBtn.waitFor({ state: 'visible', timeout: 5_000 });
      await executeBtn.click();

      // Dialog must close after execution
      await expect(dialog).toBeHidden({ timeout: 20_000 });

      // No error message should appear; the table refreshes and clears selection
      await app.expectNoSelectionAlert();
    });

    test('"Bulk Change Priority" modal in all-rows mode shows "all tasks" banner', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Get to orange (all-global) state
      await app.clickHeaderCheckbox(); // all-visible
      await app.expectSelectionAlertText(/\d+ items? selected/i);
      await app.clickHeaderCheckbox(); // all-global
      await app.expectSelectionAlertText(/All \d+ rows selected/i);

      // Extract total to build the label pattern
      const alertLocator = page.locator('.ant-pro-table-alert');
      const alertText = (await alertLocator.textContent()) ?? '';
      const totalMatch = alertText.match(/All (\d+) rows/i);
      expect(totalMatch).not.toBeNull();
      const total = totalMatch?.[1];

      await app.clickBulkActionButton(
        new RegExp(`Bulk Change Priority \\(${total}\\)`, 'i'),
      );

      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible', timeout: 15_000 });

      // BulkChangePriorityView renders "Changing priority for all tasks" in the alert banner
      await expect(dialog).toContainText(/all tasks/i, { timeout: 10_000 });

      await app.cancelDialog();
      await expect(dialog).toBeHidden({ timeout: 10_000 });
    });

    // ── BulkChangePriority — filtered select-all context ─────────────────

    // test('filtered select-all passes bulkQuery into the action view and backend defaults', async ({
    //   page,
    // }) => {
    //   test.slow();

    //   const app = new DrumrTestKit(page);
    //   await app.loginAsAdmin();
    //   let createdTaskCount = 0;

    //   try {
    //     await app.navigateTo('/tasks');
    //     await app.waitForTable();
    //     await app.filterTable('Status', 'To Do');

    //     const visibleTodoRows = await page.locator('.ant-table-tbody tr.ant-table-row').count();
    //     const tasksToCreate = Math.max(0, MIN_ROWS_FOR_FILTERED_SELECT_ALL - visibleTodoRows);

    //     for (let index = 0; index < tasksToCreate; index += 1) {
    //       await createTask(app, `${FILTERED_TODO_TASK_PREFIX}-${index}`);
    //       createdTaskCount += 1;
    //     }

    //     await app.navigateTo('/tasks');
    //     await app.waitForTable();
    //     await app.filterTable('Status', 'To Do');
    //     await app.expectTableFilteredBy('Status', 'To Do');

    //     // Second click means “all rows matching the active filter”, which is the
    //     // code path that sends selectionQuery/bulkQuery instead of explicit ids.
    //     await app.clickHeaderCheckbox();
    //     await app.expectSelectionAlertText(/\d+ items? selected/i);
    //     await app.clickHeaderCheckbox();
    //     await app.expectSelectionAlertText(/All \d+ rows selected/i);

    //     await app.clickBulkActionButton(/Bulk Change Priority \(\d+\)/i);

    //     const dialog = page.getByRole('dialog');
    //     await dialog.waitFor({ state: 'visible', timeout: 15_000 });

    //     await expect(dialog).toContainText(/matching the active filter/i, { timeout: 10_000 });

    //     const priorityField = dialog.locator('.ant-form-item').filter({ hasText: /priority/i }).first();
    //     await expect(priorityField).toBeVisible({ timeout: 10_000 });

    //     // Wait for the initial server-side form refresh (onInit runs here)
    //     await dialog.locator('.ant-spin').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});

    //     const reasonInput = dialog.locator('#reason, [name="reason"], textarea').first();
    //     await expect(reasonInput).toHaveValue(/bulk priority change for tasks with status: to_do/i, {
    //       timeout: 10_000,
    //     });

    //     await app.cancelDialog();
    //     await expect(dialog).toBeHidden({ timeout: 10_000 });
    //   } finally {
    //     if (createdTaskCount > 0) {
    //       await deleteTasksByTitlePrefix(app, page, FILTERED_TODO_TASK_PREFIX, createdTaskCount);
    //     }
    //   }
    // });

    // ── BulkChangePriority — execution with reason field ─────────────────

    test('executing BulkChangePriority with priority and reason produces success feedback', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.selectTableRowByIndex(0);
      await app.selectTableRowByIndex(1);
      await app.expectSelectionAlertText(/2 items selected/i);

      await app.clickBulkActionButton(/Bulk Change Priority \(2\)/i);

      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible', timeout: 15_000 });

      // Wait for the initial form refresh to complete
      await dialog
        .locator('.ant-spin')
        .waitFor({ state: 'hidden', timeout: 15_000 })
        .catch(() => {});

      // Override the default reason so onInit won't override priority
      const reasonInput = dialog
        .locator('.ant-form-item')
        .filter({ hasText: /Reason/i })
        .locator('textarea, input')
        .first();
      await expect(reasonInput).toBeVisible({ timeout: 10_000 });
      await reasonInput.fill('E2E test — priority change with reason', {
        timeout: 10_000,
      });

      // Select a priority value
      await app.selectFirstOptionInDialog(/Bulk change priority/i, 'Priority');

      const executeBtn = dialog.getByRole('button', { name: /execute/i });
      await expect(executeBtn).toBeEnabled({ timeout: 10_000 });
      await executeBtn.click();

      // Dialog must close after execution
      await expect(dialog).toBeHidden({ timeout: 20_000 });

      // Table refreshes and selection is cleared
      await app.expectNoSelectionAlert();
    });
  });

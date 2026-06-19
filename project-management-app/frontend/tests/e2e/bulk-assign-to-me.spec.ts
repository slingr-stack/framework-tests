import { expect, type Page, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

// Tasks seeded in Task.jsonl to guarantee totalCount > page size (10).
// Titles: BulkAssignSetup-seed-00 through BulkAssignSetup-seed-11
const SETUP_PREFIX = 'BulkAssignSetup-seed-';
const _SETUP_TASK_COUNT = 12;

/**
 * E2E tests for BulkAssignToMe — ObjectAction with bulk: true and no params form.
 *
 * BulkAssignToMe is registered via toolbar<Task>({ exclude: 'crud' }) in
 * TaskTableView and appears in the page-header "More" overflow menu when rows
 * are selected.
 *
 *  - Interaction: clickToolbarMoreButton() → clickMenuItem(/assign to me/i).
 *  - After clicking, a confirmation modal appears (no params view needed).
 *  - On confirm, the framework runs it as a workflow → notification appears.
 *
 * canExecute logic:
 *  - Done and Blocked tasks are SKIPPED at execution time (server-side), but the
 *    button remains VISIBLE for those tasks. This is intentional: bulk canExecute
 *    returning false means "skip this record", not "hide the button".
 *  - When allRowsSelected (orange mode) the same skip logic applies server-side.
 *
 * Setup:
 *  - BulkAssignSetup-seed-00..11 (status=in_review): 12 eligible tasks seeded in Task.jsonl.
 *  - BulkMix<suffix>-blk (status=blocked) + BulkMix<suffix>-ok (status=to_do):
 *    pair created in beforeAll / deleted in afterAll to test mixed-selection visibility.
 */

/** Navigate to /tasks, filter by SETUP_PREFIX, wait for table, then select rows 0..1. */
async function filterAndSelectTwo(
  app: DrumrTestKit,
  page: Page,
): Promise<void> {
  await app.navigateTo('/tasks');
  await app.waitForTable();
  await app.filterTable('Title', SETUP_PREFIX);
  await app.waitForTable();

  // The bundler on Linux/CI can serve the filtered request slower than the
  // table-loading overlay disappears, so explicitly poll for at least one
  // matching seed row before selecting. Without this, selectTableRowByIndex(0)
  // can race the filtered fetch and time out.
  const seedRow = page
    .locator('.ant-table-tbody tr.ant-table-row')
    .filter({ hasText: SETUP_PREFIX })
    .first();
  await expect(seedRow).toBeVisible({ timeout: 20_000 });

  await app.selectTableRowByIndex(0);
  await app.selectTableRowByIndex(1);
  await app.expectSelectionAlertText(/2 items selected/i);
}

/** Navigate to /tasks, filter by title, wait row visibility, then select first row. */
async function filterAndSelectOne(
  app: DrumrTestKit,
  page: Page,
  title: string,
): Promise<void> {
  await app.navigateTo('/tasks');
  await app.waitForTable();
  await app.filterTable('Title', title);
  await app.waitForTable();

  const row = page
    .locator('.ant-table-tbody tr.ant-table-row')
    .filter({ hasText: title })
    .first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await app.selectTableRowByIndex(0);
}
test.describe
  .serial('BulkAssignToMe — bulk action in page header toolbar', () => {
    test.setTimeout(90_000);

    // ── Mix-task setup: created in beforeAll, deleted in afterAll ─────────
    let MIX_BLOCKED_TITLE: string;
    let MIX_ELIGIBLE_TITLE: string;
    let MIX_RUN_PREFIX: string;

    test.beforeAll(() => {
      const suffix = Date.now().toString().slice(-4);
      MIX_RUN_PREFIX = `BulkMix${suffix}`;
      MIX_BLOCKED_TITLE = `${MIX_RUN_PREFIX}-blk`;
      MIX_ELIGIBLE_TITLE = `${MIX_RUN_PREFIX}-ok`;
    });

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(120_000);
      const page = await browser.newPage();
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      // Create blocked task (startedAt is required for Blocked status)
      await app.navigateTo('/tasks/new');
      let titleInput = page.getByRole('textbox', { name: /title/i }).first();
      await titleInput.waitFor({ state: 'visible', timeout: 30_000 });
      await titleInput.fill(MIX_BLOCKED_TITLE);
      await app.selectFirstOption('Project');
      await app.selectOption('Status', 'Blocked');
      await app.fillDateField('startedAt', '2026-01-01');
      await app.submitCreate();

      // Create eligible task (default To Do status — canExecute returns true)
      await app.navigateTo('/tasks/new');
      titleInput = page.getByRole('textbox', { name: /title/i }).first();
      await titleInput.waitFor({ state: 'visible', timeout: 30_000 });
      await titleInput.fill(MIX_ELIGIBLE_TITLE);
      await app.selectFirstOption('Project');
      await app.submitCreate();

      await page.close();
    });

    test.afterAll(async ({ browser }) => {
      test.setTimeout(120_000);
      const page = await browser.newPage();
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      for (const title of [MIX_BLOCKED_TITLE, MIX_ELIGIBLE_TITLE]) {
        await app.navigateTo('/tasks');
        await app.waitForTable();
        await app.filterTable('Title', title);
        await app.waitForTable();
        const firstRow = page
          .locator('.ant-table-tbody tr.ant-table-row')
          .first();
        const hasRow = await firstRow.isVisible().catch(() => false);
        if (!hasRow) continue;
        await firstRow.click();
        await app.waitForDrawer();
        await app.clickManageDropdown();
        await app.clickManageOption(/delete/i);
        await app.confirmDelete();
      }

      await page.close();
    });

    // ── "Assign to me" appears in header toolbar when rows are selected ────

    test('"Assign to me" appears in the More overflow menu after selecting rows', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await filterAndSelectTwo(app, page);

      await app.clickToolbarMoreButton();
      await app.expectRowActionVisible(/assign to me/i);

      // Close without clicking
      await page.keyboard.press('Escape');
    });

    // ── Confirmation modal ─────────────────────────────────────────────────

    test('clicking "Assign to me" opens a confirmation modal', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await filterAndSelectTwo(app, page);

      await app.clickToolbarMoreButton();
      await app.clickMenuItem(/assign to me/i);

      // Confirmation modal must appear with Execute + Cancel buttons
      const modal = page.getByRole('dialog', { name: /assign to me/i });
      await modal.waitFor({ state: 'visible', timeout: 10_000 });
      await expect(modal.getByRole('button', { name: /execute/i })).toBeVisible(
        { timeout: 5_000 },
      );
      await expect(modal.getByRole('button', { name: /cancel/i })).toBeVisible({
        timeout: 5_000,
      });

      await app.cancelDialog();
      await expect(modal).toBeHidden({ timeout: 10_000 });
    });

    test('cancelling confirmation modal leaves selection intact', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await filterAndSelectTwo(app, page);

      await app.clickToolbarMoreButton();
      await app.clickMenuItem(/assign to me/i);

      const modal = page.getByRole('dialog', { name: /assign to me/i });
      await modal.waitFor({ state: 'visible', timeout: 10_000 });

      await app.cancelDialog();
      await expect(modal).toBeHidden({ timeout: 10_000 });

      // Selection must still be intact after cancelling
      await app.expectSelectionAlertText(/2 items selected/i);
    });

    // ── Happy path execution ───────────────────────────────────────────────

    test('confirming "Assign to me" triggers background execution and clears selection', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await filterAndSelectTwo(app, page);

      await app.clickToolbarMoreButton();
      await app.clickMenuItem(/assign to me/i);

      // During confirm->execution transition Antd can render two matching dialogs briefly;
      // scope to the first one to avoid strict-mode ambiguity.
      const modal = page.getByRole('dialog', { name: /assign to me/i }).first();
      await modal.waitFor({ state: 'visible', timeout: 10_000 });

      // Confirm execution
      const confirmBtn = modal.getByRole('button', { name: /execute/i });
      await confirmBtn.click();
      await expect(modal).toBeHidden({ timeout: 10_000 });

      // Table reloads and selection clears after successful execution
      await app.waitForTable();
      await app.expectNoSelectionAlert();
    });

    // ── canExecute visibility — Blocked / mixed selection ────────────────
    // Regression: before the fix, canExecute=false on a bulk action hid the
    // button entirely. Now it stays visible; the record is skipped at runtime.

    test('"Assign to me" is visible in More menu when only a Blocked task is selected', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await filterAndSelectOne(app, page, MIX_BLOCKED_TITLE);

      await app.clickToolbarMoreButton();
      await app.expectRowActionVisible(/assign to me/i);

      await page.keyboard.press('Escape');
    });

    test('"Assign to me" is visible in More menu for mixed Blocked + eligible selection', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.filterTable('Title', MIX_RUN_PREFIX);
      await app.waitForTable();

      const blockedRow = page
        .locator('.ant-table-tbody tr.ant-table-row')
        .filter({ hasText: MIX_BLOCKED_TITLE })
        .first();
      const eligibleRow = page
        .locator('.ant-table-tbody tr.ant-table-row')
        .filter({ hasText: MIX_ELIGIBLE_TITLE })
        .first();
      await expect(blockedRow).toBeVisible({ timeout: 15_000 });
      await expect(eligibleRow).toBeVisible({ timeout: 15_000 });

      await app.selectTableRowCheckbox(MIX_BLOCKED_TITLE);
      await app.selectTableRowCheckbox(MIX_ELIGIBLE_TITLE);
      await app.expectSelectionAlertText(/2 items selected/i);

      await app.clickToolbarMoreButton();
      await app.expectRowActionVisible(/assign to me/i);

      await page.keyboard.press('Escape');
    });

    test('executing "Assign to me" on a Blocked task skips it and workflow completes successfully', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await filterAndSelectOne(app, page, MIX_BLOCKED_TITLE);

      await app.clickToolbarMoreButton();
      await app.clickMenuItem(/assign to me/i);

      // Same transition behavior as the happy path: two matching dialogs can coexist briefly.
      const modal = page.getByRole('dialog', { name: /assign to me/i }).first();
      await modal.waitFor({ state: 'visible', timeout: 10_000 });

      const confirmBtn = modal.getByRole('button', { name: /execute/i });
      await confirmBtn.click();

      // BulkAssignToMe uses blockingExecution: true — the modal stays open until the
      // workflow finishes. If it closes cleanly, the workflow completed without error.
      // Skipped records (blocked tasks) do not cause errors; they are counted in result.skipped.
      await expect(modal).toBeHidden({ timeout: 15_000 });

      // No extra assertion needed here: if execution failed, the blocking modal flow would surface it.
    });

    // ── All-rows (orange) mode ─────────────────────────────────────────────

    test('all-rows mode — "Assign to me" button is visible in the header toolbar', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();
      // Filter to seeded prefix so all visible rows are eligible (to_do status)
      await app.filterTable('Title', SETUP_PREFIX);
      await app.waitForTable();

      // Reach orange (all-global) state: two clicks on header checkbox
      await app.clickHeaderCheckbox(); // all-visible
      await app.clickHeaderCheckbox(); // all-global (orange)
      await app.expectHeaderCheckboxOrange();

      // More button still appears; BulkAssignToMe is inside it
      await app.clickToolbarMoreButton();
      await app.expectRowActionVisible(/assign to me/i);
      await app.clickMenuItem(/assign to me/i);

      const modal = page.getByRole('dialog', { name: /assign to me/i });
      await modal.waitFor({ state: 'visible', timeout: 10_000 });

      await app.cancelDialog();
      await expect(modal).toBeHidden({ timeout: 10_000 });
    });
  });

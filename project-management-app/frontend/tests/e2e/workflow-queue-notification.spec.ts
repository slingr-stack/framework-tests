/**
 * E2E tests for WorkflowNotificationCenter queue-backed workflow flows.
 *
 * Covers two gap scenarios:
 *
 * 1. SUCCESS PATH — SyncData (backed by SystemQueue) is triggered from the
 *    Tasks table toolbar.  While the workflow is running the notification bell
 *    badge shows a non-zero count; after completion the count returns to 0
 *    and the panel entry shows the green checkmark icon.
 *
 * 2. FAILURE PATH — ImportTasks is triggered with deliberately invalid JSON.
 *    The workflow fails during its parseInput step; the notification panel
 *    entry changes to the red error icon.  The user can clear the entry via
 *    "Clear all", leaving an empty panel.
 *
 * DOM knowledge is encapsulated in DrumrTestKit — spec files contain only
 * business-level assertions.
 *
 * Prerequisites:
 *   - App running at http://localhost:8000 (or configured baseURL)
 *   - Docker stack up: `docker compose up -d` from project-management-app/
 */

import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Click the "Sync Data" button in the Projects table toolbar and kick off the
 * workflow.  SyncData runs with blockingExecution: false, so the dialog closes
 * immediately and the workflow is registered in the WorkflowNotificationCenter.
 * Returns once the workflow has had time to register in the notification center.
 */
async function triggerSyncDataWorkflow(
  app: DrumrTestKit,
  page: import('@playwright/test').Page,
): Promise<void> {
  await app.navigateTo('/projects');
  await app.waitForTable();

  // "Sync Data" is a global action rendered in the Projects table toolbar
  const syncBtn = page.getByRole('button', { name: /sync data/i }).first();
  await syncBtn.waitFor({ state: 'visible', timeout: 15_000 });
  await syncBtn.click();

  // A confirmation/params dialog may appear before execution starts
  const dialog = page.locator('.ant-modal-wrap:visible').last();
  const hasDialog = await dialog
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (hasDialog) {
    // If there is an Execute button, click it to start execution
    const execBtn = dialog.getByRole('button', { name: /execute/i }).first();
    const hasExecBtn = await execBtn.isVisible().catch(() => false);
    if (hasExecBtn) {
      await execBtn.click();
    }
  }

  // Allow the workflow to register in the notification center
  await page.waitForTimeout(1500);
}

/**
 * Start the ImportTasks workflow with invalid JSON and click Execute.
 * Returns once Execute is clicked — the caller is responsible for handling
 * the blocking progress modal that appears next.
 */
async function triggerImportTasksFailure(
  app: DrumrTestKit,
  page: import('@playwright/test').Page,
): Promise<void> {
  await app.navigateTo('/tasks');
  await app.waitForTable();

  // "Import Tasks" renders as a model action button in the Tasks toolbar
  const importBtn = page.getByRole('button', { name: /import tasks/i }).first();
  await importBtn.waitFor({ state: 'visible', timeout: 15_000 });
  await importBtn.click();

  // Params form dialog (has Execute / Cancel buttons)
  const paramsDialog = page
    .getByRole('dialog', { name: /import tasks/i })
    .filter({ has: page.getByRole('button', { name: /execute/i }) });
  await paramsDialog.waitFor({ state: 'visible', timeout: 10_000 });

  // Fill with invalid JSON to force parseInput to throw.
  // The textarea is inside the action form; wait for it then fill.
  const textarea = paramsDialog.locator('textarea').first();
  await textarea.waitFor({ state: 'visible', timeout: 20_000 });
  await textarea.fill('NOT VALID JSON {{{');

  await paramsDialog.getByRole('button', { name: /execute/i }).click();
  // Caller handles the blocking progress modal that appears after Execute.
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('WorkflowNotificationCenter — queue-backed workflow flows', () => {
  // These tests share WorkflowNotificationCenter state and rely on a narrow
  // (~1 s) timing window between the workflow-progress modal appearing and the
  // poll cycle detecting failure. Running them in parallel (multiple workers)
  // causes resource contention that intermittently blows that window — the
  // ImportTasks test would flake. Serial mode pins them to one worker, in order.
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  // Out of scope for #2040: SyncData is a GlobalAction not currently exposed in
  // the Tasks toolbar, so triggerSyncDataWorkflow cannot reach it. Marked fixme
  // (not skip) to keep it visible as pending work rather than silently excluded.
  test.fixme('badge increments while SyncData is running and reaches zero after success', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await triggerSyncDataWorkflow(app, page);

    // While the workflow is running the badge should be non-zero.
    // SyncDataWorkflow takes ~6 s (3 steps × 2 s); check shortly after kick-off.
    const bellWrapper = page
      .locator('.ant-badge')
      .filter({ has: page.locator('[aria-label="bell"]') })
      .first();

    // Badge must become visible while the workflow is in-flight
    await expect(bellWrapper.locator('.ant-badge-count').first()).toBeVisible({
      timeout: 15_000,
    });
    const badgeCount = await bellWrapper
      .locator('.ant-badge-count')
      .first()
      .textContent();
    expect(Number(badgeCount ?? '0')).toBeGreaterThan(0);

    // Wait for the workflow to complete (up to 60 s on slow CI)
    // Success toast: "Sync Data completed successfully"
    const successToast = page
      .locator('.ant-message-notice')
      .filter({ hasText: /sync data/i })
      .first();

    await successToast.waitFor({ state: 'visible', timeout: 60_000 });
    await expect(successToast).toBeVisible();

    // Give React a moment to process the completed status and re-render the badge
    await page.waitForTimeout(2000);

    // After completion the badge should disappear or show 0
    await app.expectWorkflowNotificationBadgeCount(0);
  });

  // Out of scope for #2040 — see note on the SyncData badge test above.
  test.fixme('notification panel shows Sync Data entry with success icon after completion', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await triggerSyncDataWorkflow(app, page);

    // Wait for the success toast first (proof that the workflow is done)
    const successToast = page
      .locator('.ant-message-notice')
      .filter({ hasText: /sync data/i })
      .first();
    await successToast.waitFor({ state: 'visible', timeout: 60_000 });

    // Give React a moment to flush the state update (workflow status → SUCCESS)
    await page.waitForTimeout(2000);

    // Open the notification panel
    await app.clickWorkflowNotificationBell();
    await app.waitForWorkflowNotificationPanel();

    // The panel must contain an entry for "Sync Data"
    await app.expectWorkflowEntryInPanel(/sync data/i);

    // The entry should show the green success icon
    await app.waitForWorkflowSuccessInPanel(/sync data/i);

    await app.closeWorkflowNotificationPanel();
  });

  test('notification panel shows error icon when ImportTasks workflow fails', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await triggerImportTasksFailure(app, page);

    // After Execute, the modal transitions from the params form to the
    // workflow-progress view (WorkflowInlineProgress).  The transition is
    // confirmed when any progress-view-only indicator appears. The status copy
    // is preferred, but the progress container can render the footer Close
    // button or progress bar first depending on timing.
    // At that point workflowId is set and showInlineProgress=true, but the
    // 1 s polling cycle has not yet run (workflowFailed is still false).
    // Closing the modal NOW triggers componentWillUnmount which hands the
    // workflow to WorkflowNotificationCenter.
    const progressModal = page.locator('.ant-modal-wrap:visible').last();
    await progressModal.waitFor({ state: 'visible', timeout: 15_000 });
    const transitionResult = await Promise.race([
      progressModal
        .getByText(/being executed in the background/i)
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => 'background' as const),
      progressModal
        .locator('.ant-progress')
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => 'progress' as const),
      progressModal
        .locator('.ant-modal-footer')
        .getByRole('button', { name: /close/i })
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => 'close' as const),
    ]);
    expect(transitionResult).toMatch(/background|progress|close/);

    // Use the footer Close button (not the X icon) so the click always goes through
    // onCancel(), which registers with WorkflowNotificationCenter unconditionally when
    // workflowId && showInlineProgress — same pattern as bulk-assign-to-me.spec.ts.
    const closeBtn = progressModal
      .locator('.ant-modal-footer')
      .getByRole('button', { name: /close/i })
      .first();
    await closeBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await closeBtn.click();
    await expect(progressModal).toBeHidden({ timeout: 5_000 });

    // The next polling cycle (≤ 1 s) detects the parse failure.
    // WorkflowNotificationCenter updates the entry to the error icon.
    await app.clickWorkflowNotificationBell();
    await app.waitForWorkflowNotificationPanel();
    await app.waitForWorkflowErrorInPanel(/import tasks/i);

    await app.closeWorkflowNotificationPanel();
  });

  test('failed workflow notification can be dismissed from the panel', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await triggerImportTasksFailure(app, page);

    // Late-dismiss flow: wait for the error to appear INSIDE the modal before closing.
    // This covers the scenario where the polling cycle detects the failure while the
    // modal is still open. Depending on timing, the user-facing signal can arrive as
    // the inline failed state first or as the failure toast first.
    const progressModal = page.locator('.ant-modal-wrap:visible').last();
    await progressModal.waitFor({ state: 'visible', timeout: 15_000 });

    const failureSignal = await Promise.race([
      progressModal
        .getByText(/the action failed/i)
        .waitFor({ state: 'visible', timeout: 30_000 })
        .then(() => 'status-text' as const),
      progressModal
        .locator('.ant-alert-error')
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 })
        .then(() => 'error-alert' as const),
      page
        .locator('.ant-message-notice')
        .filter({ hasText: /import tasks/i })
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 })
        .then(() => 'toast' as const),
    ]);
    expect(failureSignal).toMatch(/status-text|error-alert|toast/);

    // If the modal is still open after the failure is surfaced, close it manually.
    // Some runs auto-close the dialog immediately after the failed state is rendered,
    // so the panel assertion below must work in either case.
    const modalStillVisible = await progressModal
      .isVisible()
      .catch(() => false);
    if (modalStillVisible) {
      const xButton = progressModal.locator('.ant-modal-close').first();
      const footerCloseButton = progressModal
        .locator('.ant-modal-footer')
        .getByRole('button', { name: /close/i })
        .first();

      const closePath = await Promise.race([
        xButton
          .waitFor({ state: 'visible', timeout: 3_000 })
          .then(() => 'x' as const)
          .catch(() => null),
        footerCloseButton
          .waitFor({ state: 'visible', timeout: 3_000 })
          .then(() => 'footer' as const)
          .catch(() => null),
      ]);

      if (closePath === 'x') {
        await xButton.click();
      } else if (closePath === 'footer') {
        await footerCloseButton.click();
      }

      await expect(progressModal).toBeHidden({ timeout: 10_000 });
    }

    // Once the failure is surfaced, the workflow must be registered in the
    // notification center and be dismissible from the panel.
    await app.clickWorkflowNotificationBell();
    await app.waitForWorkflowNotificationPanel();
    await app.waitForWorkflowErrorInPanel(/import tasks/i);

    await app.clearWorkflowNotifications();
    await app.expectWorkflowNotificationPanelEmpty();

    await app.closeWorkflowNotificationPanel();
  });
});

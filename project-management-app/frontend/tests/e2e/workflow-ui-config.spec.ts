/**
 * E2E tests — Workflow UI config migration (PR #2100).
 *
 * Verifies that blockingExecution, showProgress, successMessage, and errorMessage
 * are correctly sourced from defineActionDefaults (frontend) instead of the
 * backend @Workflow decorator.
 *
 * Covers:
 *   TC-1 · Generate Report — blocking workflow with custom success message
 *   TC-2 · Background Report — non-blocking, dialog closes immediately + info toast
 *   TC-3 · Approve Task — object-level workflow with custom success message
 *   TC-4 · Bulk Change Priority — bulk action with custom success message
 */

import { expect, type Page, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createTaskInReview(page: Page, title: string): Promise<void> {
  const app = new DrumrTestKit(page);
  await app.navigateTo('/tasks/new');
  const titleInput = page.getByRole('textbox', { name: /title/i }).first();
  await titleInput.waitFor({ state: 'visible', timeout: 30_000 });
  await titleInput.fill(title);
  await app.selectFirstOption('Project');
  await page.waitForTimeout(1500);
  await app.selectOption('Status', 'In Review');
  await app.fillDateField('startedAt', '2026-05-13');
  // Clear any auto-generated notes that would cause validation issues
  const notesCard = page
    .locator('.ant-card')
    .filter({ hasText: /^Notes$/i })
    .first();
  let hasNote = await notesCard
    .getByRole('button', { name: /delete/i })
    .first()
    .waitFor({ state: 'visible', timeout: 6_000 })
    .then(() => true)
    .catch(() => false);
  while (hasNote) {
    await notesCard
      .getByRole('button', { name: /delete/i })
      .first()
      .click();
    await page.waitForTimeout(400);
    hasNote = await notesCard
      .getByRole('button', { name: /delete/i })
      .first()
      .isVisible()
      .catch(() => false);
  }
  await app.submitCreate();
}

async function deleteTask(page: Page, title: string): Promise<void> {
  const app = new DrumrTestKit(page);
  await app.navigateTo('/tasks');
  await app.waitForTable();
  await app.clickTaskRowByTitle(title);
  await app.waitForDrawer();
  await app.clickManageDropdown();
  await app.clickManageOption(/delete/i);
  await app.confirmDelete();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe
  .serial('Workflow UI config — custom messages from defineActionDefaults', () => {
    test.setTimeout(120_000);

    // ── TC-1: Generate Report ─────────────────────────────────────────────────

    test('TC-1: Generate Report blocking workflow shows custom success message from defineActionDefaults', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      const reportTitle = `WFConfig-TC1-${Date.now()}`;
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await page.getByRole('button', { name: /generate report/i }).click();

      await app.waitForDialog(/generate ?report/i);
      const dialog = page.getByRole('dialog', { name: /generate ?report/i });

      // Wait for the initial server-side refresh (form may show a spinner briefly)
      const titleField = dialog.locator('#drumr-field-title');
      await titleField.waitFor({ state: 'visible', timeout: 60_000 });
      await dialog
        .locator('.ant-spin')
        .waitFor({ state: 'hidden', timeout: 30_000 })
        .catch(() => {});

      await titleField.fill(reportTitle);

      const firstSection = dialog.locator('#drumr-field-sections_0');
      await firstSection.waitFor({ state: 'visible', timeout: 10_000 });
      await firstSection.fill('Summary');

      const executeBtn = dialog.getByRole('button', { name: /execute/i });
      await expect(executeBtn).toBeEnabled({ timeout: 10_000 });
      await executeBtn.click();

      // The dialog transitions to inline workflow progress (blockingExecution: true)
      await expect(
        dialog.getByText(/being executed in the background/i),
      ).toBeVisible({ timeout: 20_000 });

      // After the workflow completes, the custom successMessage from generateReportDefaults
      // must be displayed instead of the generic "Completed successfully" default.
      await expect(
        dialog.getByText('Report generated successfully!'),
      ).toBeVisible({ timeout: 60_000 });

      // The green check-circle icon (SUCCESS state) must be visible alongside the message
      await expect(
        dialog.locator('[aria-label="check-circle"]').first(),
      ).toBeVisible({
        timeout: 5_000,
      });

      // Dialog auto-closes 2 s after success
      await expect(dialog).toBeHidden({ timeout: 15_000 });
    });

    // ── TC-2: Background Report ───────────────────────────────────────────────

    test('TC-2: Background Report (non-blocking) closes immediately without showing inline progress', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await page.getByRole('button', { name: /background report/i }).click();

      // The action has no params — it renders in confirmation mode
      const dialog = page.getByRole('dialog').first();
      await dialog.waitFor({ state: 'visible', timeout: 10_000 });

      const executeBtn = dialog.getByRole('button', { name: /execute/i });
      await expect(executeBtn).toBeVisible({ timeout: 10_000 });
      await executeBtn.click();

      // Non-blocking: the dialog must NOT enter inline progress mode;
      // it must close immediately after execution is dispatched.
      const inlineProgressMsg = dialog.getByText(
        /being executed in the background/i,
      );
      const closedFirst = await Promise.race([
        dialog
          .waitFor({ state: 'hidden', timeout: 8_000 })
          .then(() => 'closed' as const),
        inlineProgressMsg
          .waitFor({ state: 'visible', timeout: 8_000 })
          .then(() => 'blocked' as const),
      ]);
      expect(
        closedFirst,
        'Expected dialog to close without blocking progress for non-blocking action',
      ).toBe('closed');

      // The view's onExecuted handler fires an info toast confirming background dispatch
      const infoToast = page
        .locator('.ant-message-notice')
        .filter({ hasText: /report started in background/i })
        .first();
      await expect(infoToast).toBeVisible({ timeout: 8_000 });
    });

    // ── TC-3: Approve Task ────────────────────────────────────────────────────

    test('TC-3: Approve Task shows custom success message from defineActionDefaults', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      const taskTitle = `WFConfig-TC3-${Date.now()}`;

      // Setup: create a task in "In Review" status so Approve Task is available
      await app.loginAsAdmin();
      await createTaskInReview(page, taskTitle);

      // Open the task in the drawer and trigger Approve Task
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickTaskRowByTitle(taskTitle);
      await app.waitForDrawer();
      await app.clickActionsDropdown();
      await app.clickActionOption(/approve task/i);

      const dialog = page.getByRole('dialog', { name: /Approve Task/i });
      await dialog.waitFor({ state: 'visible', timeout: 25_000 });

      // Ensure the workflow checkbox is checked (default) so the action runs as a workflow
      const workflowField = dialog
        .locator('.ant-form-item')
        .filter({ hasText: /execute.*work.*flow/i })
        .first();
      const workflowCheckbox = workflowField
        .locator('input[type="checkbox"]')
        .first();
      await expect(workflowCheckbox).toBeChecked({ timeout: 10_000 });

      await app.clickOverlayButton(/execute/i);

      // The dialog transitions to blocking workflow progress
      await expect(
        dialog.getByText(/being executed in the background/i),
      ).toBeVisible({ timeout: 20_000 });

      // After workflow success, the custom successMessage from approveTaskDefaults
      // must be shown instead of the generic "Completed successfully".
      await expect(dialog.getByText('Task approved successfully')).toBeVisible({
        timeout: 60_000,
      });

      // The green check-circle icon must be visible
      await expect(
        dialog.locator('[aria-label="check-circle"]').first(),
      ).toBeVisible({
        timeout: 5_000,
      });

      // Dialog auto-closes 2 s after success
      await expect(dialog).toBeHidden({ timeout: 15_000 });

      // Cleanup
      await deleteTask(page, taskTitle).catch(() => {});
    });

    // ── TC-4: Bulk Change Priority ────────────────────────────────────────────

    test('TC-4: Bulk Change Priority shows custom success message from defineActionDefaults', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Select two tasks to enable the bulk action button
      await app.selectTableRowByIndex(0);
      await app.selectTableRowByIndex(1);
      await app.expectSelectionAlertText(/2 items selected/i);

      await app.clickBulkActionButton(/Bulk Change Priority \(2\)/i);

      const dialog = page.getByRole('dialog', {
        name: /Bulk change priority/i,
      });
      await dialog.waitFor({ state: 'visible', timeout: 15_000 });

      // Select a priority value so the form is valid before executing
      await app.selectFirstOptionInDialog(/Bulk change priority/i, 'Priority');

      const executeBtn = dialog.getByRole('button', { name: /execute/i });
      await executeBtn.waitFor({ state: 'visible', timeout: 5_000 });
      await executeBtn.click();

      // Bulk actions default to blockingExecution: true — the dialog shows inline progress
      await expect(
        dialog.getByText(/being executed in the background/i),
      ).toBeVisible({ timeout: 20_000 });

      // After workflow success, the custom successMessage from bulkChangePriorityDefaults
      // must be shown instead of the generic "Completed successfully".
      await expect(
        dialog.getByText('Priority updated for all selected tasks'),
      ).toBeVisible({ timeout: 60_000 });

      // The green check-circle icon must be visible
      await expect(
        dialog.locator('[aria-label="check-circle"]').first(),
      ).toBeVisible({
        timeout: 5_000,
      });

      // Dialog auto-closes 2 s after success
      await expect(dialog).toBeHidden({ timeout: 15_000 });
    });
  });

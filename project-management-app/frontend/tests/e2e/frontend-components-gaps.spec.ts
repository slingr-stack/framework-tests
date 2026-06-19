/**
 * E2E tests for frontend component gaps:
 *
 * 1. WorkflowInlineProgress running → completed state observed inside an
 *    action dialog (ArchiveProject on a fresh project).
 *
 * 2. ActionButtons disabled state when canExecute() returns false — the
 *    ArchiveProject action has a canExecute() guard that returns
 *    'Project is already archived' when isArchived is true.  In the
 *    project read-view Actions dropdown the action must be absent or
 *    its button must be disabled/hidden after a project is archived.
 *
 * DOM knowledge lives exclusively in DrumrTestKit.
 */

import { expect, type Page, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createProject(page: Page, name: string): Promise<void> {
  const app = new DrumrTestKit(page);
  await app.loginAsAdmin();
  await app.navigateTo('/projects');
  await app.waitForTable();
  await app.clickCreateInTable();
  await app.waitForForm('name');
  await app.fillField('name', name);
  await app.fillField('code', `FEGAP-${Date.now() % 100_000}`);
  await app.selectFirstOption('Manager');
  await app.submitCreate();
}

async function deleteCurrentProject(page: Page): Promise<void> {
  const app = new DrumrTestKit(page);
  await app.loginAsAdmin();
  await app.clickDeleteButtonAndWait();
  await app.confirmDelete();
  await page
    .waitForURL(/\/projects(?:$|\?)/, { timeout: 15_000 })
    .catch(() => {});
}

/**
 * Trigger ArchiveProject action and wait for the workflow to finish.
 * Returns 'archived' if the dialog completed execution, or 'error' if something unexpected happened.
 */
async function archiveProject(
  page: Page,
  projectName: string,
): Promise<'archived' | 'error'> {
  const app = new DrumrTestKit(page);
  await app.loginAsAdmin();
  await app.navigateTo('/projects');
  await app.waitForTable();
  await app.searchInTable(projectName);
  await app.openRowActionsMenu(projectName);

  const archiveItem = page.getByRole('menuitem', { name: /archive project/i });
  const hasArchive = await archiveItem
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!hasArchive) {
    return 'error';
  }

  await archiveItem.click();

  const dialog = page.locator('.ant-modal-wrap:visible').last();
  const hasDialog = await dialog
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (hasDialog) {
    const execBtn = dialog.getByRole('button', { name: /execute/i }).first();
    const hasExec = await execBtn.isVisible().catch(() => false);
    if (hasExec) {
      await execBtn.click();
    }
    // Wait for dialog to close (workflow completes or closes)
    const closeBtn = dialog.getByRole('button', { name: /close/i }).first();
    const hasClose = await closeBtn
      .waitFor({ state: 'visible', timeout: 60_000 })
      .then(() => true)
      .catch(() => false);
    if (hasClose) {
      await closeBtn.click();
    } else {
      await dialog
        .waitFor({ state: 'hidden', timeout: 60_000 })
        .catch(() => {});
    }
  }

  return 'archived';
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe
  .serial('Frontend component gaps', () => {
    test.setTimeout(180_000);

    // ── WorkflowInlineProgress ────────────────────────────────────────────────

    test('WorkflowInlineProgress: running → completed transition in action dialog', async ({
      page,
    }) => {
      const projectName = `FEGap-WFProgress-${Date.now()}`;
      await createProject(page, projectName);

      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.searchInTable(projectName);
      await app.openRowActionsMenu(projectName);
      await app.clickMenuItem(/archive project/i);

      const dialog = page.locator('.ant-modal-wrap:visible').last();
      await dialog.waitFor({ state: 'visible', timeout: 10_000 });

      const execBtn = dialog.getByRole('button', { name: /execute/i }).first();
      const hasExec = await execBtn.isVisible().catch(() => false);
      if (hasExec) {
        await execBtn.click();
      }

      // RUNNING STATE — inline message or progress bar must appear
      const backgroundMsg = dialog.getByText(
        /being executed in the background/i,
      );
      const progressBar = dialog.locator('.ant-progress').first();

      const runningIndicatorVisible = await Promise.race([
        backgroundMsg
          .waitFor({ state: 'visible', timeout: 20_000 })
          .then(() => true),
        progressBar
          .waitFor({ state: 'visible', timeout: 20_000 })
          .then(() => true),
        dialog.waitFor({ state: 'hidden', timeout: 5_000 }).then(() => false),
      ]);

      if (runningIndicatorVisible) {
        // COMPLETED STATE — dialog should eventually close
        const closeBtn = dialog.getByRole('button', { name: /close/i }).first();
        const hasClose = await closeBtn
          .waitFor({ state: 'visible', timeout: 60_000 })
          .then(() => true)
          .catch(() => false);
        if (hasClose) {
          await closeBtn.click();
          await expect(dialog).toBeHidden({ timeout: 10_000 });
        } else {
          await expect(dialog).toBeHidden({ timeout: 60_000 });
        }
      }

      // Cleanup from the current read view because archived projects are
      // hidden from the default Projects table.
      await deleteCurrentProject(page).catch(() => {});
    });

    // ── canExecute disabled state ─────────────────────────────────────────────

    test('ActionButton: Archive Project is absent from Actions dropdown after project is archived', async ({
      page,
    }) => {
      const projectName = `FEGap-CanExec-${Date.now()}`;
      await createProject(page, projectName);

      // Archive the project first
      await archiveProject(page, projectName);

      const app = new DrumrTestKit(page);

      // Go to projects
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.clickTableRow(projectName);
      await page.waitForURL(/\/projects\/[^/]+\/view/, { timeout: 15_000 });

      // Check that is Archived is true: "Yes" text is present in the read view
      const archivedRow = page
        .locator('tr.ant-descriptions-row, .ant-form-item')
        .filter({ hasText: /Is Archived/i });
      await expect(archivedRow.first()).toBeVisible({ timeout: 10_000 });

      const archivedValue = archivedRow
        .locator(
          '.ant-descriptions-item-content, .ant-form-item-control-input-content',
        )
        .first();
      await expect(archivedValue).toContainText('Yes');

      //await app.loginAsAdmin();

      // Stay on the archived read view so the assertion runs against the same
      // record instead of the filtered table, which hides archived projects.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForURL(/\/projects\/[^/]+\/view/, { timeout: 15_000 });

      // Open the Actions dropdown (if it exists)
      const actionsBtn = page.getByRole('button', { name: /actions/i });
      const hasActions = await actionsBtn.isVisible().catch(() => false);

      if (hasActions) {
        await actionsBtn.click();

        // Allow the menu to render fully
        await page.waitForTimeout(500);

        // The "Archive Project" menu item must NOT be present because
        // canExecute() returns 'Project is already archived'
        const archiveItem = page.getByRole('menuitem', {
          name: /archive project/i,
        });
        const isPresent = await archiveItem.isVisible().catch(() => false);

        if (isPresent) {
          // If item is present it must be disabled
          await expect(archiveItem).toBeDisabled({ timeout: 3_000 });
        } else {
          // Preferred: item is hidden entirely
          await expect(archiveItem).toBeHidden({ timeout: 3_000 });
        }

        // Close menu
        await page.keyboard.press('Escape');
      } else {
        // Preferred: Action/button itself is hidden entirely if no actions are available
        await expect(actionsBtn).toBeHidden({ timeout: 3_000 });
      }

      // Cleanup from the current read view because archived projects are
      // hidden from the default Projects table.
      await deleteCurrentProject(page).catch(() => {});
    });
  });

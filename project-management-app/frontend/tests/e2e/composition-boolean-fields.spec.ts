import { expect, Locator, Page, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

/**
 * E2E test for composition fields with boolean (checkbox) sub-fields.
 *
 * The Task model has a `reviewChecks` composition (OneToOne → ReviewChecks)
 * with three BooleanFields: lintCode, testsCoverage, sampleAppImplementation.
 *
 * These tests verify that:
 *  1. Boolean fields inside a composition can be checked during task creation.
 *  2. The checked values are persisted and visible when re-opening the task.
 *  3. Unchecking a boolean and saving correctly persists the change.
 */

/** Locate a boolean checkbox within the Review Checks card by its accessible label. */
function compositionCheckbox(page: Page, label: string): Locator {
  return page.getByRole('checkbox', { name: label });
}

test.describe
  .serial('Composition boolean fields E2E', () => {
    test.setTimeout(180_000);

    // Use let + beforeAll so the value is fixed once per worker and survives serial retries.
    let TASK_TITLE: string;
    test.beforeAll(() => {
      TASK_TITLE = `E2E BoolComp ${Date.now()}`;
    });

    test('should create a task with composition boolean fields checked', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickCreateInTable();
      await app.waitForForm('title');
      await app.fillField('title', TASK_TITLE);
      await app.selectFirstOption('Project');

      // Delete the auto-generated Note item (it has required fields we don't need for this test).
      // Wait up to 8s for onRefresh (triggered by project selection) to potentially add a Note.
      await expect(
        page.getByText('Review Checks', { exact: true }).first(),
      ).toBeVisible();
      const notesCard = page
        .locator('.ant-card')
        .filter({ hasText: 'Notes' })
        .first();
      const deleteNoteBtn = notesCard
        .getByRole('button', { name: /delete/i })
        .first();
      const noteVisible = await deleteNoteBtn
        .waitFor({ state: 'visible', timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      if (noteVisible) {
        await deleteNoteBtn.click();
        await expect(deleteNoteBtn).not.toBeVisible();
      }

      // Scroll to the Review Checks composition section and check all booleans
      const reviewChecksSection = page
        .getByText('Review Checks', { exact: true })
        .first();
      await expect(reviewChecksSection).toBeVisible();
      await reviewChecksSection.scrollIntoViewIfNeeded();

      await expect(compositionCheckbox(page, 'Lint Code')).toBeVisible();
      for (const label of [
        'Lint Code',
        'Tests Coverage',
        'Sample App Implementation',
      ]) {
        await compositionCheckbox(page, label).check();
      }

      await app.submitCreate();

      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.expectTableContains(TASK_TITLE);
    });

    test('should verify boolean fields persisted after save', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Open the task in edit mode to verify checkbox state
      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      // Scroll to Review Checks section
      const reviewCard = page
        .locator('.ant-card')
        .filter({ hasText: 'Review Checks' });
      await reviewCard.scrollIntoViewIfNeeded();

      // All three checkboxes should be checked
      for (const label of [
        'Lint Code',
        'Tests Coverage',
        'Sample App Implementation',
      ]) {
        await expect(compositionCheckbox(page, label)).toBeChecked();
      }

      // Uncheck "Lint Code" and save
      await compositionCheckbox(page, 'Lint Code').uncheck();
      await app.submitSave();
      await app.expectTextVisible(TASK_TITLE);
    });

    test('should verify unchecked boolean field persisted', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Re-open in edit mode
      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      // Scroll to Review Checks section
      const reviewCard = page
        .locator('.ant-card')
        .filter({ hasText: 'Review Checks' });
      await reviewCard.scrollIntoViewIfNeeded();

      // Lint Code should now be unchecked; the others still checked
      await expect(compositionCheckbox(page, 'Lint Code')).not.toBeChecked();
      await expect(compositionCheckbox(page, 'Tests Coverage')).toBeChecked();
      await expect(
        compositionCheckbox(page, 'Sample App Implementation'),
      ).toBeChecked();
    });

    test('should delete the test task', async ({ page }) => {
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
  });

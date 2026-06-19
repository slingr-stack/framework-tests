import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.describe
  .serial('Task Estimate Workflow E2E', () => {
    let TASK_TITLE: string;

    test.beforeAll(() => {
      TASK_TITLE = `E2E Task Estimate ${Date.now()}`;
    });

    test('should complete dynamic task estimate workflow successfully', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Click "Estimate Task" in the page header
      const estimateButton = page
        .getByRole('button', { name: /estimate task/i })
        .first();
      await estimateButton.waitFor({ state: 'visible', timeout: 10_000 });
      await estimateButton.click();

      // Wait for the Estimate Task form to render
      await app.waitForForm('taskTitle');

      // Fill form fields
      await app.fillField('taskTitle', TASK_TITLE);

      // Select complexity
      await app.selectFirstOption('Complexity');

      // Fill estimated hours and story points
      await app.fillField('estimatedHours', '8');
      await app.fillField('storyPoints', '5');

      // Describe notes
      await app.fillTextarea(
        /describe assumptions or risks/i,
        'Estimation details from Playwright E2E',
      );

      // Click "Submit for review"
      const submitBtn = page
        .getByRole('button', { name: /submit for review/i })
        .first();
      await submitBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await submitBtn.click();

      // Fill Submit Estimate form inside action dialog
      await app.waitForDialog(/submit estimate/i);
      const dialog = page.getByRole('dialog').last();

      // Wait for dialog loading spinner/form refresh to settle
      await dialog
        .locator('.ant-spin')
        .waitFor({ state: 'hidden', timeout: 10_000 })
        .catch(() => {});

      // Fill notes in Submit Estimate form dialog
      const notesTextarea = dialog.getByPlaceholder(/reviewer notes/i).first();
      await notesTextarea.waitFor({ state: 'visible', timeout: 10_000 });
      await notesTextarea.fill('Approved by E2E reviewer');

      // Execute action
      const executeBtn = dialog
        .locator('.ant-modal-footer .ant-btn-primary')
        .first();
      await executeBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await executeBtn.click();

      // Assert that result modal appears (with Estimate Review title showing decision and message)
      const resultModal = page.getByRole('dialog', {
        name: /estimate review/i,
      });
      await resultModal.waitFor({ state: 'visible', timeout: 15_000 });

      // Verify confirmation message details (includes title and hours)
      await expect(
        resultModal.getByText(new RegExp(TASK_TITLE, 'i')),
      ).toBeVisible({ timeout: 10_000 });
      await expect(resultModal.getByText(/approved/i).first()).toBeVisible({
        timeout: 10_000,
      });
      await expect(resultModal.getByText(/8h/)).toBeVisible({
        timeout: 10_000,
      });

      // Close result metadata modal
      const okBtn = resultModal.getByRole('button', { name: /o\s*k/i }).first();
      await okBtn.click();

      // Dialog/modal should be closed now
      await expect(resultModal).toBeHidden({ timeout: 10_000 });
    });
  });

import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

/**
 * E2E test: EvaluateTaskPriority global action
 *
 * Verifies that the action form renders correctly using the `antdOptions` layout
 * mixing feature: the "Evaluator Code" field uses a horizontal layout (via
 * `antdOptions={{ layout: 'horizontal', labelCol: { span: 8 }, wrapperCol: { span: 16 } }}`)
 * while the "Task Title" field uses the default vertical layout.
 */
test.describe
  .serial('EvaluateTaskPriority — antdOptions layout mixing', () => {
    test.setTimeout(90_000);

    test('opens the action dialog and renders the Evaluator Code field with horizontal layout', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Open the Evaluate Priority dialog from the toolbar
      await page.getByRole('button', { name: /evaluate priority/i }).click();

      await app.waitForDialog(/evaluate task priority/i);
      const dialog = page.getByRole('dialog', {
        name: /evaluate task priority/i,
      });
      const evaluatorCodeItem = dialog.locator('.drumr-form-item-path-code');
      const taskTitleItem = dialog.locator('.drumr-form-item-path-taskTitle');

      // Wait for any loading spinner to disappear
      await dialog
        .locator('.ant-spin')
        .waitFor({ state: 'hidden', timeout: 10_000 })
        .catch(() => {});

      // The Evaluator Code field label should be visible
      await expect(
        evaluatorCodeItem.locator('label[title="Evaluator Code"]'),
      ).toBeVisible({ timeout: 10_000 });

      // The Task Title field label should also be visible
      await expect(
        taskTitleItem.locator('label[title="Task Title"]'),
      ).toBeVisible({ timeout: 10_000 });

      // The action mixes layouts per field: Evaluator Code is horizontal while Task Title remains vertical.
      await expect(evaluatorCodeItem).toHaveClass(/ant-form-item-horizontal/);
      await expect(taskTitleItem).toHaveClass(/ant-form-item-vertical/);

      // Close dialog
      const cancelBtn = dialog.getByRole('button', { name: /cancel/i });
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await expect(dialog).toBeHidden({ timeout: 10_000 });
    });

    test('fills in the form and executes the action successfully', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await page.getByRole('button', { name: /evaluate priority/i }).click();
      await app.waitForDialog(/evaluate task priority/i);
      const dialog = page.getByRole('dialog', {
        name: /evaluate task priority/i,
      });
      const evaluatorCodeItem = dialog.locator('.drumr-form-item-path-code');
      const taskTitleItem = dialog.locator('.drumr-form-item-path-taskTitle');

      // Wait for initial form refresh
      await dialog
        .locator('.ant-spin')
        .waitFor({ state: 'hidden', timeout: 10_000 })
        .catch(() => {});

      // Select "Urgent" from the Evaluator Code dropdown
      const codeDropdown = evaluatorCodeItem.getByRole('combobox');
      const urgentOption = page.locator(
        '.ant-select-dropdown:visible .ant-select-item-option[title="Urgent"]',
      );
      await codeDropdown.click();
      await expect(urgentOption).toBeVisible({ timeout: 10_000 });
      await urgentOption.click();

      // Fill Task Title
      const titleInput = taskTitleItem.locator('label[title="Task Title"]');
      await titleInput.fill('Fix critical bug');

      // Execute
      const executeBtn = dialog.getByRole('button', { name: /execute/i });
      await expect(executeBtn).toBeEnabled({ timeout: 10_000 });
      await executeBtn.click();

      // Dialog should close after successful execution
      await expect(dialog).toBeHidden({ timeout: 20_000 });
    });
  });

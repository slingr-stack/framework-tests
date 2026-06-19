import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

const ASSIGN_DIALOG_TITLE = /^assign(?:\s+task)?(?::|\b)/i;

test.describe
  .serial('Assign Task Action E2E', () => {
    let TASK_TITLE: string;
    test.beforeAll(() => {
      TASK_TITLE = `AssignTask-E2E-${Date.now()}`;
    });
    test.setTimeout(90_000);

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(120_000);
      const page = await browser.newPage();
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks/new');
      const titleInput = page.getByRole('textbox', { name: /title/i }).first();
      await titleInput.waitFor({ state: 'visible', timeout: 30_000 });
      await titleInput.fill(TASK_TITLE);
      await app.selectFirstOption('Project');
      await page.waitForTimeout(1500);
      // Set status to In Progress
      await app.selectOption('Status', 'In Progress');
      await app.fillDateField('startedAt', '2026-05-13');
      // Delete any auto-generated notes to avoid blocking creation
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
      await page.close();
    });

    test.afterAll(async ({ browser }) => {
      test.setTimeout(120_000);
      const page = await browser.newPage();
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/delete/i);
      await app.confirmDelete();
      await page.close();
    });

    test('assigns a task from the table view', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Search for our task then select it via checkbox
      await app.searchInTable(TASK_TITLE);
      await app.selectTableRowCheckbox(TASK_TITLE);
      await app.clickToolbarMoreButton();
      await app.clickMenuItem(/assign task/i);

      // Fill and execute the action dialog
      await app.waitForDialog(ASSIGN_DIALOG_TITLE);
      await app.selectFirstOptionInDialog(ASSIGN_DIALOG_TITLE, 'Assignee');
      await app.executeDialog(ASSIGN_DIALOG_TITLE);

      await app.expectFeedback('Task assigned successfully.');
    });

    test('assigns a task via Actions dropdown in ReadView', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Open the task's read view
      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.clickActionsDropdown();
      await app.clickActionOption(/assign task/i);

      // Fill and execute the action dialog
      await app.waitForDialog(ASSIGN_DIALOG_TITLE);
      await app.selectFirstOptionInDialog(ASSIGN_DIALOG_TITLE, 'Assignee');
      await app.executeDialog(ASSIGN_DIALOG_TITLE);

      await app.expectFeedback(/action assigntask executed successfully/i);
    });
  });

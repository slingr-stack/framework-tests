import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

const ASSIGN_DIALOG_TITLE = /^assign$/i;

test.describe
  .serial('Assign Task as Manager', () => {
    let TASK_TITLE: string;
    test.beforeAll(() => {
      TASK_TITLE = `AssignTask-Manager-E2E-${Date.now()}`;
    });
    test.setTimeout(90_000);

    // Create a test task as admin so the manager has something to assign
    test.beforeAll(async ({ browser }) => {
      test.setTimeout(120_000);
      const page = await browser.newPage();
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks/new');
      const titleInput = page.getByRole('textbox', { name: /title/i }).first();
      await titleInput.waitFor({ state: 'visible', timeout: 30_000 });
      await titleInput.fill(TASK_TITLE);
      await app.selectOption('Project', 'Mobile App Launch');
      await page.waitForTimeout(1500);
      await app.selectOption('Status', 'In Progress');
      await app.fillDateField('startedAt', '2026-05-13');
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

    test('manager can assign a task from the table view', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsManager();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.searchInTable(TASK_TITLE);
      await app.selectTableRowCheckbox(TASK_TITLE);
      await app.clickToolbarMoreButton();
      await app.clickMenuItem(/assign task/i);

      await app.waitForDialog(ASSIGN_DIALOG_TITLE);
      await app.selectFirstOptionInDialog(ASSIGN_DIALOG_TITLE, 'Assign to');
      await app.executeDialog(ASSIGN_DIALOG_TITLE);

      await app.expectFeedback('Task assigned successfully.');
    });
  });

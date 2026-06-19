import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

// Task created in beforeAll with a known assignee so openNestedView(/edit user/i) always finds it.

async function openTaskDetails(
  _page: import('@playwright/test').Page,
  app: DrumrTestKit,
  taskTitle: string,
): Promise<void> {
  // Navigate to tasks table and open the task by title to avoid dependency on captured URL id
  await app.navigateTo('/tasks');
  await app.waitForTable();
  await app.filterTable('Title', taskTitle);
  await app.waitForTable();
  await app.clickTableRow(taskTitle);
  await app.waitForDrawer();
}

async function ensureAssigneeTabSelected(
  page: import('@playwright/test').Page,
): Promise<void> {
  await expect(
    page.getByRole('tab', { name: 'Assignee', selected: true }),
  ).toBeVisible({ timeout: 10_000 });
}

test.describe
  .serial('Nested modal navigation E2E', () => {
    test.setTimeout(120_000);
    let TASK_TITLE: string;
    let SAVED_FIRST_NAME: string;
    let CANCELLED_FIRST_NAME: string;

    test.beforeAll(async ({ browser }) => {
      const UNIQUE_SUFFIX = Date.now().toString().slice(-4);
      TASK_TITLE = `NestedNavTask-${Date.now()}`;
      SAVED_FIRST_NAME = `Evelyn-Saved-${UNIQUE_SUFFIX}`;
      CANCELLED_FIRST_NAME = `Evelyn-Cancelled-${UNIQUE_SUFFIX}`;
      const page = await browser.newPage();
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      // Create a task and assign it to an existing user so the Assignee tab has an "Edit User" button
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickCreateInTable();
      await app.waitForForm('title');
      await app.fillField('title', TASK_TITLE);
      await app.selectFirstOption('Project');
      await app.selectFirstOption('Assignee');
      await app.submitCreate();
      await page.close();
    });

    test.afterAll(async ({ browser }) => {
      const page = await browser.newPage();
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.filterTable('Title', TASK_TITLE);
      await app.waitForTable();
      const firstRow = page
        .locator('.ant-table-tbody tr.ant-table-row')
        .first();
      const hasRow = await firstRow.isVisible().catch(() => false);
      if (!hasRow) {
        await page.close();
        return;
      }
      await firstRow.click();
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/delete/i);
      await app.confirmDelete();
      await page.close();
    });

    test('should keep task modal open while save then cancel preserves saved user name', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);

      await app.loginAsAdmin();

      // Open the task created in beforeAll (has a known assignee so "Edit User" tab is present)
      await openTaskDetails(page, app, TASK_TITLE);
      await app.expectOverlayOpen();
      await app.expectUrlMatches(/\/tasks(?:[/?#]|$)/);
      await app.clickTab(/assignee/i);
      await ensureAssigneeTabSelected(page);

      await test.step('Step 1: save user edit and verify saved value by re-opening task', async () => {
        await app.openNestedView(/edit user/i);

        const firstNameInput = page.locator('#drumr-field-firstName');
        await firstNameInput.waitFor({ state: 'visible', timeout: 10_000 });
        await firstNameInput.click();
        await page.keyboard.press('ControlOrMeta+a');
        await firstNameInput.fill(SAVED_FIRST_NAME);

        await app.submitSave();

        // Re-open the task and verify the saved name appears in the Assignee tab.
        await openTaskDetails(page, app, TASK_TITLE);
        await app.clickTab(/assignee/i);
        await ensureAssigneeTabSelected(page);
        await expect(page.getByText(SAVED_FIRST_NAME).first()).toBeVisible({
          timeout: 15_000,
        });
        await app.expectUrlMatches(/\/tasks(?:[/?#]|$)/);
        await app.expectUrlNotMatches(/\/users(?:[/?#]|$)/);
      });

      await test.step('Step 2: cancel user edit and verify saved value remains by re-opening task', async () => {
        await app.openNestedView(/edit user/i);

        const firstNameInput = page.locator('#drumr-field-firstName');
        await firstNameInput.waitFor({ state: 'visible', timeout: 10_000 });
        await firstNameInput.click();
        await page.keyboard.press('ControlOrMeta+a');
        await firstNameInput.fill(CANCELLED_FIRST_NAME);

        await app.clickOverlayButton(/cancel/i);

        // Re-open the task and verify the SAVED name persists (cancel had no effect).
        await openTaskDetails(page, app, TASK_TITLE);
        await app.clickTab(/assignee/i);
        await ensureAssigneeTabSelected(page);
        await expect(page.getByText(SAVED_FIRST_NAME).first()).toBeVisible({
          timeout: 15_000,
        });
        await expect(page.getByText(CANCELLED_FIRST_NAME)).toHaveCount(0);
        await app.expectUrlMatches(/\/tasks(?:[/?#]|$)/);
        await app.expectUrlNotMatches(/\/users(?:[/?#]|$)/);
      });

      // Final continuity check: drawer is open after re-entering the task.
      await app.expectOverlayOpen();
    });
  });

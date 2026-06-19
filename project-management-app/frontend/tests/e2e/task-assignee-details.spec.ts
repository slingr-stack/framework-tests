import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

const SEEDED_TASK_TITLE = 'Develop Login Feature';
const UNASSIGNED_TASK_TITLE = `E2E Unassigned Task ${Date.now()}`;

test.describe('Task row toolbar - assignee details', () => {
  test.setTimeout(120_000);

  test('shows Assignee details and opens the user read view in a right drawer for tasks with assignee', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);

    await app.loginAsAdmin();
    await app.navigateTo('/tasks');
    await app.waitForTable();
    await app.filterTable('Title', SEEDED_TASK_TITLE);
    await app.waitForTable();

    const row = page
      .locator('.ant-table-tbody tr.ant-table-row')
      .filter({ hasText: SEEDED_TASK_TITLE })
      .first();
    await row.waitFor({ state: 'visible', timeout: 10_000 });
    await row.hover();

    const assigneeDetailsButton = row.getByRole('button', {
      name: /assignee details/i,
    });
    await expect(assigneeDetailsButton).toBeVisible({ timeout: 5_000 });
    await assigneeDetailsButton.click();

    const drawer = page.locator('.ant-drawer.ant-drawer-right:visible').last();
    await expect(drawer).toBeVisible({ timeout: 15_000 });
    await expect(
      drawer.getByRole('tab', { name: /assigned tasks/i }),
    ).toBeVisible({ timeout: 15_000 });
    await app.expectUrlMatches(/\/tasks(?:[/?#]|$)/);
  });

  test('hides Assignee details for tasks without assignee', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    let created = false;

    await app.loginAsAdmin();
    await app.navigateTo('/tasks');
    await app.waitForTable();

    await app.clickCreateInTable();
    await app.waitForForm('title');
    await app.fillField('title', UNASSIGNED_TASK_TITLE);
    await app.fillTextarea(
      /enter task description/i,
      'Task without assignee for Assignee details visibility check',
    );
    await app.selectFirstOption('Project');
    await app.fillCompositionReferenceFieldIfPresent('Notes', 'Created By');
    await app.submitCreate();
    created = true;

    try {
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.filterTable('Title', UNASSIGNED_TASK_TITLE);
      await app.waitForTable();

      const row = page
        .locator('.ant-table-tbody tr.ant-table-row')
        .filter({ hasText: UNASSIGNED_TASK_TITLE })
        .first();
      await row.waitFor({ state: 'visible', timeout: 10_000 });
      await row.hover();

      const assigneeDetailsButton = row.getByRole('button', {
        name: /assignee details/i,
      });
      await expect(assigneeDetailsButton).toHaveCount(0);
    } finally {
      if (created) {
        await app.navigateTo('/tasks');
        await app.waitForTable();
        await app.filterTable('Title', UNASSIGNED_TASK_TITLE);
        await app.waitForTable();
        await app.clickTableRow(UNASSIGNED_TASK_TITLE);
        await app.waitForDrawer();
        await app.clickManageDropdown();
        await app.clickManageOption(/delete/i);
        await app.confirmDelete();

        await app.navigateTo('/tasks');
        await app.expectTableNotContains(UNASSIGNED_TASK_TITLE);
      }
    }
  });
});

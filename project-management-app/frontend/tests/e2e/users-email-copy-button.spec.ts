import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.describe
  .serial('DataTable row-click priority for interactive controls', () => {
    test.setTimeout(60_000);

    test('clicking "Copy email" does not trigger row navigation', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/users');
      await app.waitForTable();

      const rowWithEmail = page
        .locator('.ant-table-tbody tr')
        .filter({ hasText: /@/ })
        .first();
      await expect(rowWithEmail).toBeVisible({ timeout: 15_000 });

      const copyButton = rowWithEmail.getByTitle('Copy email').first();
      await expect(copyButton).toBeVisible({ timeout: 10_000 });

      const initialUrl = page.url();

      await copyButton.click();

      await expect(page).toHaveURL(initialUrl, { timeout: 5_000 });
      await expect(
        page.locator('.ant-drawer:visible, .ant-modal-wrap:visible'),
      ).toHaveCount(0);
    });

    test('clicking row selection checkbox does not trigger row navigation', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      const initialUrl = page.url();

      await app.selectTableRowByIndex(0);

      await expect(page).toHaveURL(initialUrl, { timeout: 5_000 });
      await app.expectSelectionAlertText(/1 item selected/i);
      await expect(
        page.locator('.ant-drawer:visible, .ant-modal-wrap:visible'),
      ).toHaveCount(0);
    });
  });

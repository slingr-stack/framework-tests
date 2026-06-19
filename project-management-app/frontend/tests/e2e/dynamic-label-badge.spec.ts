import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.describe
  .serial('Dynamic label badge on Tasks menu item', () => {
    test.setTimeout(60_000);

    test('shows a numeric badge after the task count has loaded', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);

      await app.loginAsAdmin();

      // Wait for the spinner to disappear — count fetch is complete.
      const tasksMenuItem = page.locator('.ant-menu-item', {
        hasText: 'Tasks',
      });
      const spinner = tasksMenuItem.locator('.anticon-loading');
      await expect(spinner).toBeHidden({ timeout: 25_000 });

      // The Ant Design Badge renders its count inside .ant-badge-count.
      // Verify that a non-empty numeric value is displayed.
      const badge = tasksMenuItem.locator('.ant-badge-count');
      await expect(badge).toBeVisible({ timeout: 5_000 });
      const text = await badge.innerText();
      expect(Number(text.replace('+', ''))).toBeGreaterThanOrEqual(0);
    });
  });

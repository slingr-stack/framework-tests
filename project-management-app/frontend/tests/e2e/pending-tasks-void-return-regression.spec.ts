import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.describe
  .serial('Pending Tasks action regression', () => {
    test.setTimeout(90_000);

    test('executes Pending Tasks without GraphQL union/runtime mismatch', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      const graphqlErrors: string[] = [];

      page.on('response', (response) => {
        if (
          !response.url().includes('/graphql') ||
          response.request().method() !== 'POST'
        ) {
          return;
        }

        void response
          .text()
          .then((body) => {
            const hasRuntimeMismatch =
              body.includes('Runtime Object type') &&
              body.includes('StringResult');
            const mentionsPendingTasksAction =
              body.includes('TaskGetPendingTasks') ||
              body.includes('Pending Tasks');
            if (hasRuntimeMismatch && mentionsPendingTasksAction) {
              graphqlErrors.push(body);
            }
          })
          .catch(() => {});
      });

      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      const directPendingTasksButton = page
        .getByRole('button', { name: /pending tasks/i })
        .first();
      const hasDirectPendingTasksButton = await directPendingTasksButton
        .isVisible()
        .catch(() => false);

      if (hasDirectPendingTasksButton) {
        await directPendingTasksButton.click();
      } else {
        await app.clickToolbarMoreButton();
        await app.clickMenuItem(/pending tasks/i);
      }

      const navigatedToPendingView = await page
        .waitForURL(/\/tasks\/pending/, { timeout: 10_000 })
        .then(() => true)
        .catch(() => false);

      if (navigatedToPendingView) {
        await expect(
          page.getByRole('heading', { name: /pending tasks/i }),
        ).toBeVisible({ timeout: 10_000 });
      } else {
        await app.waitForDialog(/pending tasks/i);
      }

      await expect(
        page.getByText(/Runtime Object type .* StringResult/i),
      ).toHaveCount(0);
      expect(graphqlErrors).toHaveLength(0);
    });
  });

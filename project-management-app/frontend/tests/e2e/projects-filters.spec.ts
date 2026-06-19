import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

const EXPECTED_PROJECT_FILTERS = [
  'Project Name',
  'Code',
  'Status',
  'Priority',
  'Manager',
  'Manager Roles',
  'Budget',
  'Completion',
  'Start Date',
];

test.describe
  .serial('Projects filters E2E', () => {
    test.setTimeout(60000);
    test('should show only the expected filters after expanding the filter panel', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      const queryFilter = page.locator('.ant-pro-query-filter');
      const expandToggle = queryFilter.getByText('Expand', { exact: true });
      const collapseToggle = queryFilter.getByText('Collapse', { exact: true });

      if (await collapseToggle.isVisible()) {
        await collapseToggle.click();
      }

      await expect(expandToggle).toBeVisible();
      await expandToggle.click();
      await expect(collapseToggle).toBeVisible();

      await expect
        .poll(async () => {
          return queryFilter
            .locator('.ant-pro-query-filter-row .ant-form-item-label')
            .evaluateAll((nodes) => {
              return nodes
                .map((node) => node.textContent?.trim())
                .filter((label): label is string => Boolean(label));
            });
        })
        .toEqual(EXPECTED_PROJECT_FILTERS);
    });
  });

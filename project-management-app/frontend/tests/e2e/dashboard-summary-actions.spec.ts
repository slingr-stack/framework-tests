import { expect, type Page, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

async function waitForTopDashboardModal(page: Page) {
  const modal = page
    .locator('.ant-modal-wrap:visible')
    .filter({ hasText: /dashboard summary|total users/i })
    .last();
  await modal.waitFor({ state: 'visible', timeout: 20_000 });
  await expect(modal).toContainText(/dashboard summary/i, { timeout: 20_000 });
  return modal;
}

async function closeDashboardModal(page: Page): Promise<void> {
  const modal = page.locator('.ant-modal-wrap:visible').last();
  const okButton = modal.getByRole('button', { name: /^ok$/i }).first();
  const hasOkButton = await okButton.isVisible().catch(() => false);

  if (hasOkButton) {
    await okButton.click();
    await expect(modal).toBeHidden({ timeout: 10_000 });
    return;
  }

  const closeButton = modal
    .locator(
      '.ant-modal-header [title="Close"], .ant-modal-header [aria-label="close"]',
    )
    .first();
  await closeButton.waitFor({ state: 'visible', timeout: 10_000 });
  await closeButton.click();
  await expect(modal).toBeHidden({ timeout: 10_000 });
}

async function openDashboardDropdown(page: Page): Promise<void> {
  const trigger = page
    .getByRole('button', { name: /dashboard summary/i })
    .first();
  await trigger.waitFor({ state: 'visible', timeout: 10_000 });
  await trigger.click();
}

async function clickDashboardMenuItem(
  page: Page,
  namePattern: RegExp,
): Promise<void> {
  const item = page.getByRole('menuitem', { name: namePattern });
  await item.waitFor({ state: 'visible', timeout: 10_000 });
  await item.click();
}

test.describe
  .serial('Dashboard summary actions E2E', () => {
    test.setTimeout(90_000);

    test('DATA API action renders a dashboard summary result modal', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await openDashboardDropdown(page);
      await clickDashboardMenuItem(page, /dashboard data api/i);

      const configModal = await waitForTopDashboardModal(page);
      const executeButton = configModal
        .getByRole('button', { name: /execute/i })
        .first();
      await executeButton.waitFor({ state: 'visible', timeout: 15_000 });
      await executeButton.click();

      const resultModal = page
        .locator('.ant-modal-wrap:visible')
        .filter({ hasText: /total users/i })
        .last();
      await resultModal.waitFor({ state: 'visible', timeout: 20_000 });
      await expect(resultModal).toContainText(/total users/i, {
        timeout: 10_000,
      });

      const descriptionsCount = await resultModal
        .locator('.ant-descriptions')
        .count();
      const dataFormCount = await resultModal.locator('.ant-form-item').count();
      expect(descriptionsCount + dataFormCount).toBeGreaterThan(0);

      await closeDashboardModal(page);
    });

    test('UI API action renders a DataForm filters modal', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await openDashboardDropdown(page);
      await clickDashboardMenuItem(page, /dashboard ui api/i);

      const resultModal = await waitForTopDashboardModal(page);
      const filterItems = resultModal.locator('.ant-form-item');
      await expect(
        filterItems.filter({ hasText: /project/i }).first(),
      ).toBeVisible({
        timeout: 20_000,
      });
      expect(await filterItems.count()).toBeGreaterThan(0);
      await expect(resultModal).toContainText(/filters/i, { timeout: 10_000 });
      await expect(resultModal).toContainText(/project/i, { timeout: 10_000 });
      await expect(resultModal).toContainText(/start date/i, {
        timeout: 10_000,
      });
      await expect(resultModal).toContainText(/end date/i, { timeout: 10_000 });
      await expect(
        resultModal.locator('.ant-descriptions').first(),
      ).toHaveCount(0);

      await closeDashboardModal(page);
    });

    test('queryBuilder custom action renders a Descriptions result modal', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await openDashboardDropdown(page);
      await clickDashboardMenuItem(page, /dashboard summary \(querybuilder\)/i);

      const resultModal = await waitForTopDashboardModal(page);
      await expect(
        resultModal.locator('.ant-descriptions').first(),
      ).toBeVisible({ timeout: 20_000 });
      await expect(resultModal).toContainText(/total users/i, {
        timeout: 10_000,
      });
      await expect(resultModal.locator('.ant-form-item')).toHaveCount(0);

      await closeDashboardModal(page);
    });
  });

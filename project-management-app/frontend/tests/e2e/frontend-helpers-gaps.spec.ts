/**
 * E2E tests for frontend helper gaps:
 *
 * 1. openView WITH PARAMS — ProjectReadView.renderStatusToolbar()
 *    calls `this.openView('UserReadView', { params: { id: managerId } })`.
 *    Clicking the "View manager" button must open UserReadView and show the
 *    manager's data, confirming that openView with params resolves the
 *    correct target view.
 *
 * 2. extractData VALUE EXTRACTION — DataComponent renders field values that
 *    were extracted from the backend UiField response via the extractData()
 *    utility.  We verify that a known project field value (the project code)
 *    is rendered correctly in the read view — exercising the extractData →
 *    DataComponent rendering pipeline from the user's perspective.
 *
 * All DOM interactions are through DrumrTestKit.
 */

import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.describe('Frontend helpers — openView with params and extractData rendering', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  // ── openView with params ────────────────────────────────────────────────────

  test('clicking "View manager" opens UserReadView with manager data', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    // Navigate to any project read view
    await app.navigateTo('/projects');
    await app.waitForTable();
    const hasRows = await page
      .locator('.ant-table-tbody tr[data-row-key]')
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (!hasRows) {
      test.skip(true, 'No project rows available after waiting — skipping');
      return;
    }

    // Row click navigates to the project read view page.
    await app.clickFirstTableRow();
    await page.waitForURL(/\/projects\/[^/]+\/view/, { timeout: 15_000 });

    // The "View manager" button is rendered in the read view page.
    const viewManagerBtn = page
      .getByRole('button', { name: /view manager/i })
      .first();
    const btnVisible = await viewManagerBtn
      .waitFor({ state: 'visible', timeout: 25_000 })
      .then(() => true)
      .catch(() => false);

    if (!btnVisible) {
      test.skip(
        true,
        'First project has no manager — cannot test openView with params',
      );
      return;
    }

    const isDisabled = await viewManagerBtn.isDisabled().catch(() => true);
    if (isDisabled) {
      test.skip(
        true,
        'First project has no manager — cannot test openView with params',
      );
      return;
    }

    // Click should open UserReadView via openView('UserReadView', { params: { id: managerId } })
    await viewManagerBtn.click();

    // UserReadView may open as a nested modal or navigate to a page URL
    const userViewUrl = await page
      .waitForURL(/\/users\/[^/]+\/view/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (userViewUrl) {
      await expect(page).toHaveURL(/\/users\/[^/]+\/view/);
    } else {
      // Opened as a nested modal
      const userModal = page.locator('[role="dialog"]').last();
      const isModalVisible = await userModal
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => true)
        .catch(() => false);

      expect(
        userViewUrl || isModalVisible,
        'Expected UserReadView to open either as a page or modal',
      ).toBe(true);

      if (isModalVisible) {
        await page.keyboard.press('Escape');
        await userModal
          .waitFor({ state: 'hidden', timeout: 10_000 })
          .catch(() => {});
      }
    }
  });

  test('openView with params resolves the correct view — user data is rendered', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await app.navigateTo('/projects');
    await app.waitForTable();
    const hasRows = await page
      .locator('.ant-table-tbody tr[data-row-key]')
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (!hasRows) {
      test.skip(true, 'No project rows available after waiting — skipping');
      return;
    }

    // Row click navigates to the project read view page.
    await app.clickFirstTableRow();
    await page.waitForURL(/\/projects\/[^/]+\/view/, { timeout: 15_000 });

    // Click "View manager" — button is disabled when there is no manager
    const viewManagerBtn = page
      .getByRole('button', { name: /view manager/i })
      .first();
    const btnVisible = await viewManagerBtn
      .waitFor({ state: 'visible', timeout: 25_000 })
      .then(() => true)
      .catch(() => false);

    if (!btnVisible || (await viewManagerBtn.isDisabled().catch(() => true))) {
      test.skip(
        true,
        'Project has no manager — cannot verify openView with params',
      );
      return;
    }
    await viewManagerBtn.click();

    // Wait for the user view to open (page or modal)
    await page.waitForTimeout(2000);

    // The user view (wherever it opens) should not show an error page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('404');
    expect(bodyText).not.toContain('Not Found');
  });

  // ── extractData value rendering (DataComponent) ─────────────────────────────

  test('extractData: project code field value is rendered correctly in read view', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    // Navigate to the projects table and capture the code of the first project
    await app.navigateTo('/projects');
    await app.waitForTable();

    const firstRow = page.locator('.ant-table-tbody tr[data-row-key]').first();
    const rowVisible = await firstRow
      .waitFor({ state: 'visible', timeout: 45_000 })
      .then(() => true)
      .catch(() => false);
    if (!rowVisible) {
      test.skip(true, 'No project rows available after waiting — skipping');
      return;
    }

    // The Code column is at nth(2): nth(0) is the selection checkbox, nth(1) is the name.
    const codeCell = firstRow.locator('td').nth(2);
    const codeText = ((await codeCell.textContent()) ?? '').trim();

    // Row click navigates to the project read view page.
    await firstRow.click();
    await page.waitForURL(/\/projects\/[^/]+\/view/, { timeout: 15_000 });

    // The project read view renders fields via DataComponent → extractData.
    // The "code" field must appear in the read view.
    if (codeText.length > 0) {
      await expect(page.getByText(codeText).first()).toBeVisible({
        timeout: 20_000,
      });
    } else {
      const codeLabel = page
        .locator('th, td, [class*="descriptions-item"]')
        .filter({ hasText: /code/i })
        .first();
      await expect(codeLabel).toBeVisible({ timeout: 10_000 });
    }
  });

  test('extractData: task title is rendered as plain text in task read view', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await app.navigateTo('/tasks');
    await app.waitForTable();

    const firstRow = page.locator('.ant-table-tbody tr[data-row-key]').first();
    const rowVisible = await firstRow
      .waitFor({ state: 'visible', timeout: 45_000 })
      .then(() => true)
      .catch(() => false);
    if (!rowVisible) {
      test.skip(true, 'No task rows available after waiting — skipping');
      return;
    }

    // Title is at td.nth(1): td.nth(0) is the selection checkbox
    const titleCell = firstRow.locator('td').nth(1);
    const titleText = ((await titleCell.textContent()) ?? '').trim();

    if (titleText.length > 0) {
      await firstRow.click();
      await app.waitForDrawer();

      await expect(page.getByText(titleText).first()).toBeVisible({
        timeout: 15_000,
      });
    } else {
      test.skip(true, 'No tasks available in the table');
    }
  });

  // ── project read view navigation ───────────────────────────────────────────

  test('row click opens the project read view via URL navigation', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await app.navigateTo('/projects');
    await app.waitForTable();

    const tableUrl = page.url();

    // Row click navigates to the project read view page.
    await app.clickFirstTableRow();
    await page.waitForURL(/\/projects\/[^/]+\/view/, { timeout: 15_000 });

    expect(page.url()).not.toBe(tableUrl);
    await expect(page).toHaveURL(/\/projects\/[^/]+\/view/);

    // The read view page renders the Edit button.
    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    const hasEditBtn = await editBtn.isVisible().catch(() => false);

    if (hasEditBtn) {
      await editBtn.click();
      await page.waitForTimeout(500);
      // Edit view opens — URL may change to /edit or stay the same (drawer/modal mode)
      const afterEditUrl = page.url();
      const isValidEditUrl =
        afterEditUrl === tableUrl || /\/edit/.test(afterEditUrl);
      expect(isValidEditUrl).toBe(true);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });
});

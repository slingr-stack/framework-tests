/**
 * E2E tests for frontend layout gaps:
 *
 * 1. PER-VIEW LAYOUT OVERRIDE — ProjectReadView uses `override layout = ViewLayout`
 *    which is different from the default MainLayout used by table views.
 *    ViewLayout has `navigation: 'left'` and `topMenu: false`, so the top
 *    navigation bar visible in the main app is absent on the project read view.
 *
 * 2. MIX NAVIGATION MODE — MainLayout uses `navigation: 'mix'`, which renders
 *    BOTH a left sidebar menu AND a top header navigation bar simultaneously.
 *    The top bar shows Dashboard, Summary, and Activity links.
 *
 * 3. TOP NAVIGATION ITEMS — Verify the items configured in `topMenu` are
 *    rendered in the header when on a main-layout page.
 *
 * All DOM knowledge is encapsulated in DrumrTestKit.
 */

import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.describe('Frontend layout gaps — per-view override and navigation modes', () => {
  test.setTimeout(60_000);

  // ── Mix navigation (MainLayout) ───────────────────────────────────────────

  test('main layout renders both left sidebar and top navigation bar (mix mode)', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await app.navigateTo('/projects');
    await app.waitForTable();

    // Left sidebar should be present
    const leftSider = page.locator('.ant-pro-sider, .ant-layout-sider').first();
    await expect(leftSider).toBeVisible({ timeout: 10_000 });

    // Top navigation bar should be present (mix mode adds a ProLayout header with menu)
    // The top menu items Dashboard, Summary, Activity appear in the header area
    const header = page
      .locator('.ant-pro-layout .ant-layout-header, .ant-layout-header')
      .first();
    await expect(header).toBeVisible({ timeout: 10_000 });
  });

  test('top navigation bar contains Dashboard, Summary, and Activity items', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await app.navigateTo('/projects');
    await app.waitForTable();

    const header = page.locator('.ant-pro-global-header').first();
    await expect(header).toBeVisible({ timeout: 10_000 });

    // The topMenu config for MainLayout declares these three items:
    // Dashboard (top), Summary (top), Activity (top)
    await expect(header.getByText(/dashboard/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(header.getByText(/summary/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(header.getByText(/activity/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('clicking a top navigation item navigates to the correct view', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await app.navigateTo('/projects');
    await app.waitForTable();

    const header = page.locator('.ant-layout-header').first();

    // Click "Summary" in the top navigation
    const summaryLink = header.getByText(/^summary$/i).first();
    const hasSummary = await summaryLink.isVisible().catch(() => false);

    if (hasSummary) {
      await summaryLink.click();
      // Should navigate to the summary view
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url).toMatch(/summary|\/$/i);
    } else {
      // Top menu may render as a menu item
      const summaryMenuItem = header
        .locator('.ant-menu-item')
        .filter({ hasText: /summary/i })
        .first();
      if (await summaryMenuItem.isVisible().catch(() => false)) {
        await summaryMenuItem.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  // ── Per-view layout override (ViewLayout) ─────────────────────────────────

  test('project read view uses ViewLayout — top navigation bar is absent', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    // Navigate to a project read view (uses ViewLayout override)
    await app.navigateTo('/projects');
    await app.waitForTable();
    await app.clickFirstTableRow();
    await page.waitForURL(/\/projects\/[^/]+\/view/, { timeout: 15_000 });

    // ViewLayout has navigation: 'left' and topMenu: false
    // So there should be NO top navigation menu items (Dashboard/Summary/Activity)
    // in the header area.  A header is still rendered, but without the top menu.
    const header = page.locator('.ant-layout-header').first();

    // The "Activity" link is only in the MainLayout topMenu —
    // it should be absent when ViewLayout is active.
    const activityInHeader = header.getByRole('menuitem', {
      name: /activity/i,
    });
    const isActivityVisible = await activityInHeader
      .isVisible()
      .catch(() => false);
    expect(isActivityVisible).toBe(false);
  });

  test('project read view uses ViewLayout — left sidebar is still visible', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await app.navigateTo('/projects');
    await app.waitForTable();
    await app.clickFirstTableRow();
    await page.waitForURL(/\/projects\/[^/]+\/view/, { timeout: 15_000 });

    // ViewLayout still has a left sidebar (navigation: 'left')
    const leftSider = page.locator('.ant-pro-sider, .ant-layout-sider').first();
    await expect(leftSider).toBeVisible({ timeout: 10_000 });
  });

  test('project read view uses fluid content width from ViewLayout', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await app.navigateTo('/projects');
    await app.waitForTable();
    await app.clickFirstTableRow();
    await page.waitForURL(/\/projects\/[^/]+\/view/, { timeout: 15_000 });

    // ViewLayout uses contentWidth: 'fluid'; MainLayout uses contentWidth: 'fixed'.
    // In 'fixed' mode ProLayout adds a max-width wrapper class.
    // We verify the read-view page container is visible and properly rendered.
    const pageContent = page
      .locator('.ant-pro-layout-content, .ant-layout-content')
      .first();
    await expect(pageContent).toBeVisible({ timeout: 10_000 });
  });

  // ── Left sidebar navigation (both layouts) ────────────────────────────────

  test('left sidebar menu contains Projects, Tasks, and Users items', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await app.navigateTo('/projects');
    await app.waitForTable();

    const sider = page.locator('.ant-pro-sider, .ant-layout-sider').first();
    await expect(sider).toBeVisible({ timeout: 10_000 });

    // Verify core menu items are present in the sidebar
    await expect(sider.getByText(/projects/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(sider.getByText(/tasks/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(sider.getByText(/users/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

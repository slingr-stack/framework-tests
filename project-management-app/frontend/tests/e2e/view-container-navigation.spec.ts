import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

/**
 * E2E tests for ViewContainer navigation isolation.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Click the page-level Back button (rendered by the framework page header). */
async function clickBackButton(
  page: import('@playwright/test').Page,
): Promise<void> {
  const backBtn = page.getByRole('button', { name: /back/i }).first();
  await backBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await backBtn.click();
  // Allow navigation state to settle
  await page.waitForTimeout(800);
}

/**
 * Click the back arrow of a view rendered *inside* a ViewContainer.
 * Nested views use PageContainer's onBack arrow (.ant-page-header-back-button)
 * rather than a labelled toolbar button — scoped to the nested content area
 * to avoid matching any outer page header arrows.
 */
async function clickNestedViewBackButton(
  page: import('@playwright/test').Page,
): Promise<void> {
  const nestedRoot = page
    .locator('.drumr-read-view__nested-content, .ant-tabs-tabpane-active')
    .first();
  await nestedRoot.waitFor({ state: 'visible', timeout: 10_000 });

  const candidates = [
    '.ant-page-header-back-button',
    '.ant-pro-page-container .ant-page-header-back',
    '.ant-pro-page-container .ant-page-header-back-button',
    '[aria-label*="back" i]',
  ];

  let clicked = false;
  for (const selector of candidates) {
    const btn = nestedRoot.locator(selector).first();
    if ((await btn.count()) === 0) continue;
    if (!(await btn.isVisible())) continue;
    await btn.click();
    clicked = true;
    break;
  }

  if (!clicked) {
    // Fallback: use an accessible back button if present inside the active tab panel.
    const roleBack = nestedRoot.getByRole('button', { name: /back/i }).first();
    await roleBack.waitFor({ state: 'visible', timeout: 5_000 });
    await roleBack.click();
  }

  await page.waitForTimeout(800);
}

/**
 * Navigate to the UserReadView of a user who is guaranteed to manage at least
 * one project, by reading the manager name from the first project's read view
 * and then searching for that user in the /users table via the Full Name filter.
 * Returns the URL of the resulting UserReadView.
 *
 * Note: the "View manager" button opens a details modal (URL-transparent), so
 * we navigate via the /users search filter instead of following that button.
 */
async function openUserReadView(
  page: import('@playwright/test').Page,
  app: DrumrTestKit,
): Promise<string> {
  // 1. Read the manager's full name from the first project's read view.
  //    We navigate into the read view and parse the accessible row text because
  //    the rendered DOM is not a stable th/td table structure.
  await app.navigateTo('/projects');
  await app.waitForTable();
  await app.clickFirstTableRow();
  await page.waitForURL(/\/projects\/[^/]+\/view/, { timeout: 15_000 });

  // The row text looks like:
  // "Priority Medium Manager Evelyn-Saved-6326 Company View manager"
  // Extract only the manager name between "Manager" and "View manager".
  const managerRow = page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: /view manager/i }) })
    .first();
  await managerRow.waitFor({ state: 'visible', timeout: 10_000 });
  const managerRowText =
    (await managerRow.textContent())?.replace(/\s+/g, ' ').trim() ?? '';
  const managerName =
    managerRowText.match(/Manager\s+(.+?)\s+View manager/i)?.[1]?.trim() ?? '';

  // 2. Navigate to /users and use the Full Name search filter to locate the
  //    manager. This avoids pagination issues (the user may not be on page 1).
  await app.navigateTo('/users');
  await app.waitForTable();

  if (managerName) {
    const searchInput = page
      .getByRole('textbox', { name: /full name/i })
      .first();
    await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
    await searchInput.fill(managerName);
    const filterBtn = page.getByRole('button', { name: /^filter$/i }).first();
    await filterBtn.click();

    const matchingUserRow = page
      .getByRole('row')
      .filter({ hasText: managerName })
      .first();
    await matchingUserRow.waitFor({ state: 'visible', timeout: 15_000 });
    await matchingUserRow.click();
  } else {
    await app.clickFirstTableRow();
  }

  await page.waitForURL(/\/users\/[^/]+\/view/, { timeout: 15_000 });
  return page.url();
}

/**
 * Given we are on a UserReadView, activate the first "Projects" nested tab
 * (managed projects) and click the first project row to open ProjectReadView
 * inside the container.
 */
async function openFirstProjectInContainer(
  page: import('@playwright/test').Page,
): Promise<void> {
  // Use case-insensitive match to tolerate title casing changes.
  const projectsTab = page
    .getByRole('tab', { name: /managed projects/i })
    .first();
  await projectsTab.waitFor({ state: 'visible', timeout: 15_000 });
  await projectsTab.click();
  await page.waitForTimeout(600);

  // Resolve the panel controlled by the specific "Managed Projects" tab instead of
  // using a generic .ant-tabs-tabpane-active selector, which can match unrelated tabs.
  const panelId = await projectsTab.getAttribute('aria-controls');
  if (!panelId) {
    throw new Error('Managed Projects tab is missing aria-controls');
  }

  const activePanel = page.locator(`#${panelId}`);
  await activePanel.waitFor({ state: 'visible', timeout: 10_000 });

  const firstRow = activePanel
    .locator('.ant-table-tbody tr[class*="ant-table-row"]')
    .first();
  await firstRow.waitFor({ state: 'visible', timeout: 15_000 });
  await firstRow.click();
  await page.waitForTimeout(800);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('ViewContainer navigation isolation', () => {
  test.setTimeout(90_000);

  /**
   * Bug fix: Root-level back navigation works when the ReadView has nested containers.
   *
   * Flow: /projects (table) → click row → /projects/:id/view (ReadView) → Back → /projects
   * ProjectReadView has a Tasks nested tab (ViewContainer). Before the fix, after the
   * tasks container entry was pushed, clicking Back on the ReadView was silently skipped
   * because shouldSkipNavigation=true (stale container entry as activeEntry, chain broken).
   */
  test('Back on ProjectReadView navigates to /projects list', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await app.navigateTo('/projects');
    await app.waitForTable();

    // Open the first project read view
    await app.clickFirstTableRow();
    await page.waitForURL(/\/projects\/[^/]+\/view/, { timeout: 15_000 });

    // Confirm we are on the read view
    await app.expectUrlMatches(/\/projects\/[^/]+\/view/);

    // Click Back — must return to /projects table
    await clickBackButton(page);

    await app.expectUrlMatches(/^[^?]*\/projects([?#]|$)/);
    await app.waitForTable();
  });

  /**
   * Sanity: navigating directly to /users → UserReadView → Back still works
   * (no container interactions involved).
   */
  test('Direct Back on UserReadView returns to /users list', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await openUserReadView(page, app);
    await app.expectUrlMatches(/\/users\/[^/]+\/view/);

    await clickBackButton(page);

    await app.expectUrlMatches(/\/users([?#]|$)/);
    await app.waitForTable();
  });
});

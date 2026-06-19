import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

const PROJECT_NAME = `BreadcrumbTestProject-${Date.now()}`;
const PROJECT_CODE = `BC-${Date.now() % 100000}`;
let testProjectId: string | undefined;

/**
 * E2E tests for custom breadcrumb configurations on Project views.
 *
 * These tests verify the breadcrumb trail rendered by the PageContainer header
 * across the four Project views, each using a different breadcrumb form:
 *
 * - ProjectTableView:  string          → "Projects"
 * - ProjectCreateView: string[]        → "Projects / New Project"
 * - ProjectEditView:   object[]        → "Projects (link) / Edit"
 * - ProjectReadView:   () => value     → "Projects (link) / <name> (link) / Details"
 */

const BREADCRUMB_SELECTOR = '.ant-breadcrumb';

async function openProjectReadViewFromTable(
  page: import('@playwright/test').Page,
  app: DrumrTestKit,
): Promise<void> {
  await app.navigateTo('/projects');
  await app.waitForTable();
  await app.filterTable('Project Name', PROJECT_NAME);
  await app.waitForTable();
  // Row click opens the read view as a modal (no URL change), so open it as a
  // page by navigating to its route — that is where the breadcrumb renders.
  await app.navigateTo(`/projects/${testProjectId}/view`);
  await page.waitForURL(/\/projects\/[^/]+\/view/, { timeout: 15_000 });
}

test.describe('Project Breadcrumb E2E', () => {
  test.setTimeout(60_000);

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await app.navigateTo('/projects');
    await app.waitForTable();
    await app.clickCreateInTable();
    await app.waitForForm('name');
    await app.fillField('name', PROJECT_NAME);
    await app.fillField('code', PROJECT_CODE);
    await app.selectFirstOption('Manager');
    await app.submitCreate();

    // Resolve the created project's id from the table flow, since create can
    // redirect back to the list instead of staying on the object view.
    await app.navigateTo('/projects');
    await app.waitForTable();
    await app.filterTable('Project Name', PROJECT_NAME);
    await app.waitForTable();
    // Row click opens a modal (no URL with the id), so read the id straight
    // from the table row's data-row-key attribute instead.
    testProjectId = await app.getRowId(PROJECT_NAME);
    expect(testProjectId).toBeTruthy();
    await page.close();
  }, 60_000);

  test.afterAll(async ({ browser }) => {
    if (!testProjectId) return;
    const page = await browser.newPage();
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await app.navigateTo(`/projects/${testProjectId}/view`);
    await app.clickDeleteButtonAndWait();
    await app.confirmDelete();
    await page.close();
  });

  test('TableView shows single string breadcrumb "Projects"', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await app.navigateTo('/projects');
    await app.waitForTable();

    const breadcrumb = page.locator(BREADCRUMB_SELECTOR).first();
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Projects');

    // Single string breadcrumb should not contain any links
    const links = breadcrumb.locator('a');
    await expect(links).toHaveCount(0);
  });

  test('CreateView shows array-of-strings breadcrumb "Projects / New Project"', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();
    await app.navigateTo('/projects/new');
    await app.waitForForm('name');

    const breadcrumb = page.locator(BREADCRUMB_SELECTOR).first();
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Projects');
    await expect(breadcrumb).toContainText('New Project');

    // Array of strings: none should be clickable links
    const links = breadcrumb.locator('a');
    await expect(links).toHaveCount(0);
  });

  test('EditView shows object-array breadcrumb with "Projects" as a link', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await openProjectReadViewFromTable(page, app);

    // Navigate to edit from the read view
    await app.clickEditButton('Project');
    await page.waitForURL(/\/projects\/[^/]+\/edit/);

    const breadcrumb = page.locator(BREADCRUMB_SELECTOR).first();
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Projects');
    await expect(breadcrumb).toContainText('Edit');

    // "Projects" should be a clickable link
    const projectsLink = breadcrumb
      .locator('a')
      .filter({ hasText: 'Projects' });
    await expect(projectsLink).toBeVisible();
  });

  test('ReadView shows dynamic breadcrumb with project name', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);
    await app.loginAsAdmin();

    await openProjectReadViewFromTable(page, app);
    const projectName = PROJECT_NAME;

    const breadcrumb = page.locator(BREADCRUMB_SELECTOR).first();
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Projects');
    await expect(breadcrumb).toContainText('Details');

    // "Projects" should be a clickable link (from the dynamic function)
    const projectsLink = breadcrumb
      .locator('a')
      .filter({ hasText: 'Projects' });
    await expect(projectsLink).toBeVisible();

    // "Details" is the current location, so it must NOT be a link
    await expect(
      breadcrumb.locator('a').filter({ hasText: 'Details' }),
    ).toHaveCount(0);

    // The project name segment should also appear
    if (projectName) {
      await expect(breadcrumb).toContainText(projectName);
    }
  });
});

import { expect, type Locator, type Page, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

const ACTIVE_PROJECTS = [
  'Website Redesign',
  'Internal Tools Upgrade',
  'API Integration',
];
const PLANNING_PROJECTS = ['Mobile App Launch', 'Customer Portal'];
// Use emails instead of display names — names can be mutated by nested-modal-navigation spec
const WEBSITE_REDESIGN_TEAM_MEMBERS = [
  'brian.lee@example.com',
  'chloe.smith@example.com',
];
const WEBSITE_REDESIGN_MANAGER = 'alice.johnson@example.com';
const TEAM_MEMBERS_PAGE_SIZE = 5;

// Two tasks created by this spec for the sort test — titles chosen so they always sort
// predictably (AAAA… < ZZZZ… alphabetically) regardless of other data in the DB.
const SORT_TASK_A = `AAAA-summary-sort-${Date.now()}`;
const SORT_TASK_Z = `ZZZZ-summary-sort-${Date.now()}`;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSummaryCard(page: Page, title: string): Locator {
  const exactTitle = new RegExp(`^${escapeRegExp(title)}$`, 'i');
  return page
    .locator('.ant-card')
    .filter({
      has: page.locator('.ant-card-head-title').filter({ hasText: exactTitle }),
    })
    .first();
}

async function waitForCardTable(card: Locator): Promise<void> {
  const table = card.locator('.drumr-data-table').first();
  await expect(table).toBeVisible({ timeout: 15_000 });

  const loadingOverlay = table
    .locator('.ant-spin-spinning, .drumr-data-table__loading')
    .first();
  await loadingOverlay
    .waitFor({ state: 'hidden', timeout: 15_000 })
    .catch(() => {});
}

async function waitForFrameworkTable(card: Locator): Promise<void> {
  const table = card.locator('.ant-table').first();
  await expect(table).toBeVisible({ timeout: 15_000 });

  const loadingOverlay = card
    .locator('.ant-spin-spinning, .drumr-data-table__loading')
    .first();
  await loadingOverlay
    .waitFor({ state: 'hidden', timeout: 15_000 })
    .catch(() => {});
}

async function waitForMaterialTable(card: Locator): Promise<void> {
  const table = card.locator('.MuiTable-root').first();
  await expect(table).toBeVisible({ timeout: 15_000 });

  const loadingOverlay = card.locator('.MuiLinearProgress-root').first();
  await loadingOverlay
    .waitFor({ state: 'hidden', timeout: 15_000 })
    .catch(() => {});
}

async function waitForTeamMembersCard(card: Locator): Promise<void> {
  const viewToggle = card.getByRole('switch').first();
  const isMaterial =
    (await viewToggle.isVisible().catch(() => false)) &&
    (await viewToggle.getAttribute('aria-checked')) === 'true';

  if (isMaterial) {
    await waitForMaterialTable(card);
  } else {
    await waitForFrameworkTable(card);
  }
}

async function waitForTeamMembersTable(card: Locator): Promise<void> {
  await waitForTeamMembersCard(card);
}

async function getVisibleRowCount(card: Locator): Promise<number> {
  const viewToggle = card.getByRole('switch').first();
  const isMaterial =
    (await viewToggle.isVisible().catch(() => false)) &&
    (await viewToggle.getAttribute('aria-checked')) === 'true';

  if (isMaterial) {
    return card.locator('.MuiTableBody-root tr.MuiTableRow-root').count();
  }

  return card.locator('.ant-table-tbody tr[class*="ant-table-row"]').count();
}

async function getVisibleListItemCount(card: Locator): Promise<number> {
  return getVisibleRowCount(card);
}

async function resetTeamMembersToFirstPage(card: Locator): Promise<void> {
  const firstPage = card.locator('.ant-pagination-item[title="1"]').first();
  const isVisible = await firstPage.isVisible().catch(() => false);

  if (!isVisible) {
    return;
  }

  const isActive = await firstPage
    .evaluate((element) =>
      element.classList.contains('ant-pagination-item-active'),
    )
    .catch(() => false);

  if (isActive) {
    return;
  }

  await firstPage.click();
  await waitForTeamMembersCard(card);
}

async function expectTeamMembersTextAcrossPages(
  card: Locator,
  text: string,
): Promise<void> {
  await resetTeamMembersToFirstPage(card);

  const visitedPages = new Set<string>();

  for (;;) {
    const currentText = await card.textContent();
    if (currentText?.includes(text)) {
      return;
    }

    const activePage =
      (await card
        .locator('.ant-pagination-item-active')
        .first()
        .textContent()
        .catch(() => null)) ?? `page-${visitedPages.size}`;

    if (visitedPages.has(activePage)) {
      break;
    }
    visitedPages.add(activePage);

    const nextButton = card.locator('.ant-pagination-next').first();
    const isDisabled = await nextButton
      .evaluate((element) => {
        const disabledByClass = element.classList.contains(
          'ant-pagination-disabled',
        );
        const ariaDisabled = element.getAttribute('aria-disabled') === 'true';
        return disabledByClass || ariaDisabled;
      })
      .catch(() => true);

    if (isDisabled) {
      break;
    }

    await nextButton.click();
    await waitForTeamMembersCard(card);
  }

  await expect(card).toContainText(text);
}

async function clickNextPage(card: Locator): Promise<void> {
  const nextButton = card.locator('.ant-pagination-next').first();
  await expect(nextButton).toBeVisible({ timeout: 10_000 });
  await expect(nextButton).not.toHaveClass(/ant-pagination-disabled/, {
    timeout: 10_000,
  });
  await nextButton.click();
  await waitForCardTable(card);
}

async function clickProjectRow(
  card: Locator,
  projectName: string,
): Promise<void> {
  const row = card
    .locator('.ant-table-tbody tr')
    .filter({ hasText: projectName })
    .first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.click();
}

async function applyChoiceFilter(
  page: Page,
  card: Locator,
  fieldLabel: string,
  optionLabel: string,
): Promise<void> {
  const filterForm = card.locator('.ant-pro-query-filter').first();
  await expect(filterForm).toBeVisible({ timeout: 10_000 });

  const formItem = filterForm
    .locator('.ant-form-item')
    .filter({ hasText: new RegExp(fieldLabel, 'i') })
    .first();
  await expect(formItem).toBeVisible({ timeout: 10_000 });

  const selectTrigger = formItem
    .locator('.ant-select-content, .ant-select-selector')
    .first();
  await expect(selectTrigger).toBeVisible({ timeout: 10_000 });
  await selectTrigger.click();

  const dropdown = page.locator('.ant-select-dropdown:visible').last();
  const option = dropdown
    .locator('.ant-select-item-option')
    .filter({ hasText: new RegExp(`^${escapeRegExp(optionLabel)}$`, 'i') })
    .first();
  await expect(option).toBeVisible({ timeout: 10_000 });
  await option.click();
  await page.keyboard.press('Escape').catch(() => {});

  const filterButton = filterForm
    .getByRole('button', { name: /filter/i })
    .first();
  await filterButton.click();
  await waitForCardTable(card);
}

async function getColumnTexts(
  card: Locator,
  columnIndex: number,
): Promise<string[]> {
  const rows = card.locator('.ant-table-tbody tr[class*="ant-table-row"]');
  const rowCount = await rows.count();
  const values: string[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const text = (
      await rows.nth(index).locator('td').nth(columnIndex).innerText()
    )
      .replace(/\s+/g, ' ')
      .trim();
    values.push(text);
  }

  return values;
}

async function openSummaryView(page: Page): Promise<{
  projectsCard: Locator;
  tasksCard: Locator;
  teamMembersCard: Locator;
}> {
  const app = new DrumrTestKit(page);
  await app.loginAsAdmin();
  await app.navigateTo('/summary');

  await expect(page.getByText('Table Summary', { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByText('No project filter', { exact: true }),
  ).toBeVisible({ timeout: 15_000 });

  const projectsCard = getSummaryCard(page, 'Projects Table');
  const tasksCard = getSummaryCard(page, 'Tasks Table');
  const teamMembersCard = getSummaryCard(page, 'Team Members Table');

  await expect(projectsCard).toBeVisible({ timeout: 15_000 });
  await expect(tasksCard).toBeVisible({ timeout: 15_000 });
  await expect(teamMembersCard).toBeVisible({ timeout: 15_000 });

  await waitForCardTable(projectsCard);
  await waitForCardTable(tasksCard);
  await waitForTeamMembersCard(teamMembersCard);

  return { projectsCard, tasksCard, teamMembersCard };
}

test.describe
  .serial('Summary view E2E', () => {
    test.setTimeout(90_000);

    /**
     * Ensure seeded projects that must appear as "Planning" have not been mutated by
     * previous test runs.  Runs once before the whole describe block.
     *
     * Note: the per-hook timeout (30s default) is too tight for this multi-step
     * UI flow on Linux/CI — each iteration does navigate + filter + edit + save,
     * and there are 2 projects to repair. Use the full describe timeout (90s).
     */
    test.beforeAll(async ({ browser }) => {
      test.setTimeout(120_000);
      const page = await browser.newPage();
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      for (const projectName of PLANNING_PROJECTS) {
        await app.navigateTo('/projects');
        await app.waitForTable();
        await app.filterTable('Project Name', projectName);
        await app.waitForTable();
        const row = page
          .locator('.ant-table-tbody tr.ant-table-row')
          .filter({ hasText: projectName })
          .first();
        const visible = await row.isVisible().catch(() => false);
        if (!visible) continue;
        await app.clickTableRow(projectName);
        await app.clickEditButton('Project');
        await app.waitForForm('name');
        await app.selectOption('Status', 'Planning');
        await app.submitSave();
      }

      await page.close();
    });

    test('renders the seeded summary tables and paginates tasks', async ({
      page,
    }) => {
      const { projectsCard, tasksCard, teamMembersCard } =
        await openSummaryView(page);

      await expect(projectsCard.locator('.ant-table-tbody')).toContainText(
        'Website Redesign',
      );
      await expect(projectsCard.locator('.ant-table-tbody')).toContainText(
        'Customer Portal',
      );
      await expect(teamMembersCard.locator('.ant-switch')).toHaveAttribute(
        'aria-checked',
        'false',
      );

      // Projects table has no pagination — it shows all records.
      // Team members now renders a paginated list with a default page size of 5.
      await expect
        .poll(() => getVisibleRowCount(projectsCard))
        .toBeGreaterThanOrEqual(5);
      // Tasks table has pageSize=3 so page 1 always shows exactly 3 when ≥3 tasks exist.
      await expect.poll(() => getVisibleRowCount(tasksCard)).toBe(3);

      await expectTeamMembersTextAcrossPages(teamMembersCard, 'Evelyn Turner');

      // Use email (immutable) instead of full name which may be mutated by other specs.
      // Alice is not guaranteed to be on the first page of the paginated team members list.
      await expectTeamMembersTextAcrossPages(
        teamMembersCard,
        'alice.johnson@example.com',
      );

      await clickNextPage(tasksCard);
      // Page 2 has ≥1 task (seeded data has 2, but extra tasks could fill a full page 2).
      await expect
        .poll(() => getVisibleRowCount(tasksCard))
        .toBeGreaterThanOrEqual(1);
    });

    test('toggles team members between framework table and material table', async ({
      page,
    }) => {
      const { teamMembersCard } = await openSummaryView(page);
      const viewToggle = teamMembersCard.getByRole('switch').first();

      await expect(viewToggle).toHaveAttribute('aria-checked', 'false');
      await expect(teamMembersCard.locator('.ant-table').first()).toBeVisible({
        timeout: 15_000,
      });
      await expect(teamMembersCard.locator('.ant-table-thead')).toContainText(
        'Full Name',
      );
      await expect(teamMembersCard.locator('.ant-table-thead')).toContainText(
        'Email',
      );
      await expect
        .poll(() => getVisibleRowCount(teamMembersCard))
        .toBe(TEAM_MEMBERS_PAGE_SIZE);

      await viewToggle.click();
      await waitForTeamMembersCard(teamMembersCard);

      await expect(viewToggle).toHaveAttribute('aria-checked', 'true');
      await expect(
        teamMembersCard.locator('.MuiTable-root').first(),
      ).toBeVisible({ timeout: 15_000 });
      await expect(teamMembersCard.locator('.MuiTableHead-root')).toContainText(
        'Full Name',
      );
      await expect(teamMembersCard.locator('.MuiTableHead-root')).toContainText(
        'Email',
      );
      await expect
        .poll(() => getVisibleRowCount(teamMembersCard))
        .toBe(TEAM_MEMBERS_PAGE_SIZE);

      await viewToggle.click();
      await waitForTeamMembersCard(teamMembersCard);

      await expect(viewToggle).toHaveAttribute('aria-checked', 'false');
      await expect(teamMembersCard.locator('.ant-table').first()).toBeVisible({
        timeout: 15_000,
      });
      await expect
        .poll(() => getVisibleRowCount(teamMembersCard))
        .toBe(TEAM_MEMBERS_PAGE_SIZE);
    });

    test('filters projects with the summary preset buttons', async ({
      page,
    }) => {
      const { projectsCard } = await openSummaryView(page);

      await projectsCard.getByRole('button', { name: 'Show Active' }).click();
      await waitForCardTable(projectsCard);

      await expect
        .poll(() => getVisibleRowCount(projectsCard))
        .toBeGreaterThanOrEqual(3);
      for (const projectName of ACTIVE_PROJECTS) {
        await expect(projectsCard.locator('.ant-table-tbody')).toContainText(
          projectName,
        );
      }
      for (const projectName of PLANNING_PROJECTS) {
        await expect(
          projectsCard.locator('.ant-table-tbody'),
        ).not.toContainText(projectName);
      }

      await projectsCard.getByRole('button', { name: 'Show Planning' }).click();
      await waitForCardTable(projectsCard);

      await expect
        .poll(() => getVisibleRowCount(projectsCard))
        .toBeGreaterThanOrEqual(2);
      for (const projectName of PLANNING_PROJECTS) {
        await expect(projectsCard.locator('.ant-table-tbody')).toContainText(
          projectName,
        );
      }
      for (const projectName of ACTIVE_PROJECTS) {
        await expect(
          projectsCard.locator('.ant-table-tbody'),
        ).not.toContainText(projectName);
      }

      await projectsCard.getByRole('button', { name: 'All' }).click();
      await waitForCardTable(projectsCard);
      await expect
        .poll(() => getVisibleRowCount(projectsCard))
        .toBeGreaterThanOrEqual(5);
    });

    test('selecting a project scopes tasks, team members, and manager details', async ({
      page,
    }) => {
      const { projectsCard, tasksCard, teamMembersCard } =
        await openSummaryView(page);

      await clickProjectRow(projectsCard, 'Website Redesign');
      await waitForCardTable(tasksCard);
      await waitForTeamMembersCard(teamMembersCard);

      await expect(
        page.getByText('Project filters active', { exact: true }),
      ).toBeVisible({ timeout: 15_000 });
      const projectFilterAlert = page
        .getByRole('alert')
        .filter({ hasText: /Project filters active/i })
        .first();
      await expect(projectFilterAlert).toContainText('Website Redesign');
      await expect(projectFilterAlert).toContainText(WEBSITE_REDESIGN_MANAGER);

      await expect.poll(() => getVisibleRowCount(tasksCard)).toBe(1);
      await expect(tasksCard.locator('.ant-table-tbody')).toContainText(
        'Design Homepage',
      );
      await expect(tasksCard.locator('.ant-table-tbody')).not.toContainText(
        'Develop Login Feature',
      );

      await expect.poll(() => getVisibleListItemCount(teamMembersCard)).toBe(2);
      for (const teamMember of WEBSITE_REDESIGN_TEAM_MEMBERS) {
        await expect(teamMembersCard).toContainText(teamMember);
      }
      await expect(teamMembersCard).not.toContainText(
        'alice.johnson@example.com',
      );

      const managerCard = getSummaryCard(page, 'Project Manager');
      await expect(managerCard).toBeVisible({ timeout: 10_000 });
      await expect(managerCard).toContainText(WEBSITE_REDESIGN_MANAGER);

      await page.getByRole('button', { name: 'Clear filter' }).click();
      await waitForCardTable(tasksCard);
      await waitForTeamMembersCard(teamMembersCard);

      await expect(
        page.getByText('No project filter', { exact: true }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(managerCard).toBeHidden({ timeout: 10_000 });
      await expect.poll(() => getVisibleRowCount(tasksCard)).toBe(3);
    });

    test('filters task status and sorts the filtered task rows by title', async ({
      page,
    }) => {
      test.setTimeout(180_000);
      // Create two tasks with predictable titles (AAAA… < ZZZZ… alphabetically) so the
      // sort assertion works regardless of what other data exists in the environment.
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      for (const title of [SORT_TASK_A, SORT_TASK_Z]) {
        await app.navigateTo('/tasks/new');
        await page
          .locator('label[title="Title"]')
          .waitFor({ state: 'visible', timeout: 15_000 });
        await app.fillField('title', title);
        await app.selectFirstOption('Project');
        await page.waitForTimeout(1500); // let onRefresh settle
        // Delete any auto-generated Note (required fields would block creation)
        const notesCard = page
          .locator('.ant-card')
          .filter({ hasText: /^Notes$/i })
          .first();
        let hasNoteDelete = await notesCard
          .getByRole('button', { name: /delete/i })
          .first()
          .waitFor({ state: 'visible', timeout: 6_000 })
          .then(() => true)
          .catch(() => false);
        while (hasNoteDelete) {
          await notesCard
            .getByRole('button', { name: /delete/i })
            .first()
            .click();
          await page.waitForTimeout(400);
          hasNoteDelete = await notesCard
            .getByRole('button', { name: /delete/i })
            .first()
            .isVisible()
            .catch(() => false);
        }
        await app.submitCreate();
      }

      // Open summary view and apply To Do filter
      const { tasksCard } = await openSummaryView(page);
      await applyChoiceFilter(page, tasksCard, 'Status', 'To Do');
      await expect
        .poll(() => getVisibleRowCount(tasksCard))
        .toBeGreaterThanOrEqual(2);

      // Navigate to page 1 of the tasks card before paginating, so collectAllTitles is always complete.
      const resetToFirstPage = async (): Promise<void> => {
        const firstPage = tasksCard.locator('.ant-pagination-item[title="1"]');
        const visible = await firstPage.isVisible().catch(() => false);
        if (visible) {
          const isActive = await firstPage.evaluate((el) =>
            el.classList.contains('ant-pagination-item-active'),
          );
          if (!isActive) {
            await firstPage.click();
            await waitForCardTable(tasksCard);
          }
        }
      };

      // Collect all titles across pages with current (default) sort
      const collectAllTitles = async (): Promise<string[]> => {
        await resetToFirstPage();
        const titles: string[] = [];
        let hasNext = true;
        while (hasNext) {
          titles.push(...(await getColumnTexts(tasksCard, 1)));
          const nextBtn = tasksCard.locator('.ant-pagination-next');
          const disabled = await nextBtn
            .getAttribute('aria-disabled')
            .catch(() => 'true');
          if (disabled === 'true') {
            hasNext = false;
          } else {
            await nextBtn.click();
            await waitForCardTable(tasksCard);
          }
        }
        return titles;
      };

      // Both created tasks must exist in the filtered list
      const initialTitles = await collectAllTitles();
      expect(initialTitles).toContain(SORT_TASK_A);
      expect(initialTitles).toContain(SORT_TASK_Z);
      await expect(tasksCard.locator('.ant-table-tbody')).not.toContainText(
        'Design Homepage',
      );

      // Sort ascending — AAAA… must come before ZZZZ…
      await tasksCard.getByRole('columnheader', { name: /title/i }).click();
      await waitForCardTable(tasksCard);
      const ascTitles = await collectAllTitles();
      const idxAasc = ascTitles.indexOf(SORT_TASK_A);
      const idxZasc = ascTitles.indexOf(SORT_TASK_Z);
      expect(
        idxAasc,
        `${SORT_TASK_A} not found after asc sort`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        idxZasc,
        `${SORT_TASK_Z} not found after asc sort`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        idxAasc,
        'AAAA task must come before ZZZZ task when sorted ascending',
      ).toBeLessThan(idxZasc);

      // Sort descending — ZZZZ… must come before AAAA…
      await tasksCard.getByRole('columnheader', { name: /title/i }).click();
      await waitForCardTable(tasksCard);
      const descTitles = await collectAllTitles();
      const idxAdesc = descTitles.indexOf(SORT_TASK_A);
      const idxZdesc = descTitles.indexOf(SORT_TASK_Z);
      expect(
        idxAdesc,
        `${SORT_TASK_A} not found after desc sort`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        idxZdesc,
        `${SORT_TASK_Z} not found after desc sort`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        idxZdesc,
        'ZZZZ task must come before AAAA task when sorted descending',
      ).toBeLessThan(idxAdesc);

      // Cleanup — delete the two tasks created by this test
      for (const title of [SORT_TASK_A, SORT_TASK_Z]) {
        await app.navigateTo('/tasks');
        await app.waitForTable();
        await app.clickTaskRowByTitle(title);
        await app.waitForDrawer();
        await app.clickManageDropdown();
        await app.clickManageOption(/delete/i);
        await app.confirmDelete();
      }
    });
  });

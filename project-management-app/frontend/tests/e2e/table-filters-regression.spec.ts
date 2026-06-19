import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

const SUFFIX = Date.now();
const FILTER_PROJECT_NAME = `FilterRegressionProject-${SUFFIX}`;
const FILTER_PROJECT_CODE = `FRP-${SUFFIX % 10_000}`;
const FILTER_TASK_TITLE = `FilterRegressionTask-${SUFFIX}`;
const DUE_DATE = '15-06-2099';

async function selectFirstMatchingOption(
  app: DrumrTestKit,
  patterns: RegExp[],
): Promise<void> {
  for (const pattern of patterns) {
    try {
      await app.selectTableFilterOption(pattern);
      return;
    } catch {
      // Try the next candidate label pattern.
    }
  }

  throw new Error(
    'No matching option found in the open table filter dropdown.',
  );
}

test.describe
  .serial('Tasks filters regression coverage', () => {
    test.setTimeout(120_000);

    test('setup: create project and task fixture', async ({ page }) => {
      const app = new DrumrTestKit(page);

      await app.loginAsAdmin();

      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.clickCreateInTable();
      await app.waitForForm('name');
      await app.fillField('name', FILTER_PROJECT_NAME);
      await app.fillField('code', FILTER_PROJECT_CODE);
      await app.selectFirstOption('Manager');
      await app.submitCreate();

      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickCreateInTable();
      await app.waitForForm('title');
      await app.fillField('title', FILTER_TASK_TITLE);
      await app.selectOption('Project', FILTER_PROJECT_NAME);
      await app.selectOption('Priority', /high/i);
      await app.fillDateField('dueDate', DUE_DATE);
      await app.clearReferenceFieldIfSet('Reporter');
      await app.fillCompositionReferenceFieldIfPresent('Notes', 'Created By');
      await app.submitCreate();

      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.expectTableContains(FILTER_TASK_TITLE);
    });

    test('enum filter auto-applies after selecting option', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);

      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.openTableReferenceFilter('Priority');
      await selectFirstMatchingOption(app, [/high/i]);

      // Regression target: select-like filters should auto-submit without clicking Filter.
      await app.waitForTable();
      await app.expectTableFilteredBy('Priority', /high/i);

      await app.clearTableFilters();
    });

    test('boolean filter auto-applies after selecting option', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);

      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.openTableReferenceFilter('Billable');
      await app.expectDropdownContainsOption(/true|false|yes|no/i);
      await selectFirstMatchingOption(app, [/yes/i, /true/i, /no/i, /false/i]);

      // Regression target: boolean select behaves like enum and auto-submits.
      await app.waitForTable();

      await app.clearTableFilters();
    });

    test('no-op Filter submits still refresh and never hang', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);

      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // First click with default/no criteria.
      await app.applyTableFilters();

      // Second click without changing anything: should still complete.
      await app.applyTableFilters();

      // Apply a real filter, then repeat no-op submit with the same criteria.
      await app.openTableReferenceFilter('Priority');
      await selectFirstMatchingOption(app, [/high/i]);
      await app.waitForTable();
      await app.applyTableFilters();

      // If no-op handling regresses, this call tends to hang with loading spinner.
      await app.applyTableFilters();

      await app.clearTableFilters();
    });

    test('date filter flow remains stable and clear restores table', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);

      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      const filterForm = page.locator('.ant-pro-query-filter');
      await filterForm.waitFor({ state: 'visible', timeout: 10_000 });

      const expandToggle = filterForm
        .getByText('Expand', { exact: true })
        .first();
      const canExpand = await expandToggle.isVisible().catch(() => false);
      if (canExpand) {
        await expandToggle.click();
      }

      const dueDateInput = filterForm
        .locator(
          'input[placeholder*="Due Date"], input[placeholder*="Search Due Date"], input[id*="dueDate"]',
        )
        .first();
      await dueDateInput.waitFor({ state: 'visible', timeout: 10_000 });
      await dueDateInput.click();
      await dueDateInput.fill(DUE_DATE);
      await dueDateInput.press('Enter').catch(() => {});
      await page.keyboard.press('Escape').catch(() => {});

      await app.applyTableFilters();

      // No-op submit after date criteria should still refresh and complete.
      await app.applyTableFilters();

      await app.clearTableFilters();
      await app.expectTableContains(FILTER_TASK_TITLE);
    });

    test('teardown: delete created task and project', async ({ page }) => {
      const app = new DrumrTestKit(page);

      await app.loginAsAdmin();

      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.filterTable('Title', FILTER_TASK_TITLE);
      await app.clickTableRow(FILTER_TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/delete/i);
      await app.confirmDelete();

      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.filterTable('Project Name', FILTER_PROJECT_NAME);
      await app.clickTableRow(FILTER_PROJECT_NAME);
      await app.clickDeleteButtonAndWait();
      await app.confirmDelete();
    });
  });

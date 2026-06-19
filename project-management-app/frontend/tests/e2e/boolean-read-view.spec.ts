import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

/**
 * E2E tests for issue #1441 — Boolean field components (toggle / checkbox)
 * must be non-interactive (disabled) when rendered inside a ReadView.
 *
 * Setup:
 *   - Task.isBillable   uses booleanToggle()  in read context  → renders <Switch disabled>
 *   - Project.isArchived uses booleanCheckbox() in read context → renders read-only Yes/No text
 */

const TASK_TITLE = `E2E BoolReadView ${Date.now()}`;
const PROJECT_NAME = `E2E BoolReadView ${Date.now()}`;
const PROJECT_CODE = `BR-${Date.now() % 1000}`;

test.describe
  .serial('Boolean fields should be disabled in ReadViews', () => {
    test.setTimeout(90_000);

    test('BooleanToggle (Switch) is disabled in Task ReadView', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      // Create a task so we have a record to read
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickCreateInTable();
      await app.waitForForm('title');
      await app.fillField('title', TASK_TITLE);
      await app.selectFirstOption('Project');
      await app.fillCompositionReferenceFieldIfPresent('Notes', 'Created By');
      await app.submitCreate();

      // Navigate back and open the task's ReadView (opens as a drawer)
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.expectTextVisible(TASK_TITLE);

      // Task ReadView is rendered inside a drawer with a dynamic title, so scope to
      // the visible overlay container and locate the switch through its field block.
      const readView = page
        .locator('.ant-drawer:visible, .ant-modal-wrap:visible')
        .first();
      const billableField = readView
        .locator(
          '.ant-form-item, .ant-descriptions-row, [class*="form-item"], .ant-form > div > div',
        )
        .filter({ hasText: /is billable/i })
        .first();
      await billableField.scrollIntoViewIfNeeded();
      const switchEl = billableField.getByRole('switch');
      await expect(billableField).toBeVisible({ timeout: 10_000 });
      await expect(switchEl).toBeVisible({ timeout: 10_000 });
      await expect(switchEl).toBeDisabled();
    });

    test('BooleanCheckbox renders read-only text in Project ReadView', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      // Create a project so we have a record to read
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.clickCreateInTable();
      await app.waitForForm('name');
      await app.fillField('name', PROJECT_NAME);
      await app.fillField('code', PROJECT_CODE);
      await app.selectFirstOption('Manager');
      await app.submitCreate();

      // Navigate back and open the project's ReadView
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.clickTableRow(PROJECT_NAME);
      await app.expectTextVisible(PROJECT_NAME);

      // ProjectReadView uses a custom Descriptions layout.
      // Find the row containing "Is Archived" label, then locate the checkbox inside it.
      const archivedRow = page
        .locator('tr.ant-descriptions-row, .ant-form-item')
        .filter({ hasText: /Is Archived/i });
      await expect(archivedRow.first()).toBeVisible({ timeout: 10_000 });

      // Newly created projects default to isArchived = false, so ReadView must
      // show the resolved boolean text instead of rendering a checkbox input.
      const archivedValue = archivedRow
        .locator(
          '.ant-descriptions-item-content, .ant-form-item-control-input-content',
        )
        .first();
      await expect(archivedRow.locator('input[type="checkbox"]')).toHaveCount(
        0,
      );
      await expect(archivedValue).toContainText('No');
    });

    // Cleanup: remove the test records
    test('cleanup: delete test task', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/delete/i);
      await app.confirmDelete();
    });

    test('cleanup: delete test project', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();
      await app.clickTableRow(PROJECT_NAME);
      await app.clickDeleteButtonAndWait();
      await app.confirmDelete();
    });
  });

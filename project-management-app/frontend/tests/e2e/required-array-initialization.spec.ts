import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.describe
  .serial('Required array initialization E2E', () => {
    test.setTimeout(120_000);

    test('CreateView: auto-adds first entry for required array and still allows adding more', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/project-reports/new');
      await app.waitForUiToSettle();

      // Wait for ProjectReport create form and required Sections array field.
      const sectionsField = page
        .locator('.ant-form-item')
        .filter({ hasText: /sections/i })
        .first();
      const sectionInputs = sectionsField.getByRole('textbox');
      await sectionInputs
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 });

      const initialSectionsCount = await sectionInputs.count();
      expect(initialSectionsCount).toBeGreaterThanOrEqual(1);

      // Add one more section item.
      const addSectionButton = sectionsField
        .getByRole('button', { name: /add/i })
        .first();
      await addSectionButton.scrollIntoViewIfNeeded();
      await addSectionButton.click();

      await expect
        .poll(async () => sectionsField.getByRole('textbox').count(), {
          timeout: 10_000,
        })
        .toBeGreaterThan(initialSectionsCount);
    });

    test('ActionView: auto-adds first entry for required array in dialog and allows multi-item editing', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await page.getByRole('button', { name: /generate report/i }).click();
      await app.waitForDialog(/generate report/i);

      const dialog = page.getByRole('dialog', { name: /generate report/i });
      const titleField = dialog
        .locator('.ant-form-item')
        .filter({ hasText: /report title/i })
        .first()
        .getByRole('textbox')
        .first();
      await expect(titleField).toBeVisible({ timeout: 10_000 });

      const sectionsField = dialog
        .locator('.ant-form-item')
        .filter({ hasText: /sections/i })
        .first();
      const sectionInputs = sectionsField.getByRole('textbox');

      await expect(sectionInputs.first()).toBeVisible({ timeout: 10_000 });

      const initialSectionsCount = await sectionInputs.count();
      expect(initialSectionsCount).toBeGreaterThanOrEqual(1);

      const addSectionButton = sectionsField
        .getByRole('button', { name: /add/i })
        .first();
      await addSectionButton.scrollIntoViewIfNeeded();
      await addSectionButton.click();

      await expect
        .poll(async () => sectionsField.getByRole('textbox').count(), {
          timeout: 10_000,
        })
        .toBeGreaterThan(initialSectionsCount);

      // Fill title + first two sections and execute on first attempt.
      await titleField.fill('E2E Required Array Report');

      const currentSectionInputs = sectionsField.getByRole('textbox');
      await currentSectionInputs.nth(0).fill('Summary');
      await currentSectionInputs.nth(1).fill('Timeline');

      const executeBtn = dialog.getByRole('button', { name: /execute/i });
      await expect(executeBtn).toBeEnabled({ timeout: 10_000 });
      await executeBtn.click();

      const backgroundMsg = dialog.getByText(
        /being executed in the background/i,
      );
      const executionResult = await Promise.race([
        backgroundMsg
          .waitFor({ state: 'visible', timeout: 20_000 })
          .then(() => 'background' as const),
        dialog
          .waitFor({ state: 'hidden', timeout: 20_000 })
          .then(() => 'closed' as const),
      ]);

      if (executionResult === 'background') {
        const closeButton = dialog
          .locator('.ant-modal-footer')
          .getByRole('button', { name: /close/i })
          .first();
        await expect(closeButton).toBeVisible({ timeout: 10_000 });
        await closeButton.click();
      }

      await expect(dialog).toBeHidden({ timeout: 10_000 });
    });
  });

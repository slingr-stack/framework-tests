import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.describe
  .serial('Generate Report Action E2E', () => {
    test.setTimeout(90_000);

    /**
     * Modal size E2E: verifies that a toolbar action with modalSize: 'small' opens
     * an Ant Design Modal whose rendered clientWidth is less than 700 px.
     * StartReportInBackgroundView has a required field so the form always renders.
     */
    test('opens Background Report modal with small width when modalSize is small', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await page.getByRole('button', { name: /background report/i }).click();

      // Wait for the action form dialog to appear
      const dialog = page.getByRole('dialog').first();
      await dialog.waitFor({ state: 'visible', timeout: 10_000 });

      const modal = page.locator('.ant-modal').first();
      const width = await modal.evaluate(
        (el) => (el as HTMLElement).clientWidth,
      );
      expect(width).toBeLessThan(700);

      await app.cancelDialog();
    });

    /**
     * Regression test: verifies that the "Generate Report" model action
     * can be executed on the FIRST attempt after filling the required
     * "Report Title" field.
     *
     * Previously, a stale validation error ("This field is required") was
     * cached from the initial blank-form server refresh and blocked the
     * first submission even when the field was already filled.
     */
    test('executes Generate Report on the first attempt without false validation errors', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      // Unique title so the verification step can find THIS run's report
      // and never collide with reports left over from previous runs.
      const REPORT_TITLE = `E2E Regression Report ${Date.now()}`;
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      // Click the "Generate Report" button directly in the toolbar
      await page.getByRole('button', { name: /generate report/i }).click();

      // Wait for the action dialog and let the initial form refresh settle.
      // The modal title renders as "GenerateReport" (no space), so the space is optional.
      await app.waitForDialog(/generate ?report/i);
      const dialog = page.getByRole('dialog', { name: /generate ?report/i });
      const titleField = dialog.locator('#drumr-field-title');
      await titleField.waitFor({ state: 'visible', timeout: 100_000 });
      // Wait for any loading/spinner inside the dialog to disappear,
      // indicating the initial server-side refresh has completed.
      await dialog
        .locator('.ant-spin')
        .waitFor({ state: 'hidden', timeout: 100_000 })
        .catch(() => {});

      await titleField.fill(REPORT_TITLE);

      // sections is required — the form renders one empty item by default, so we fill it directly.
      const firstSection = dialog.locator('#drumr-field-sections_0');
      await firstSection.waitFor({ state: 'visible', timeout: 10_000 });
      await firstSection.fill('Summary');

      // Wait for the Execute button to be enabled (form has registered the value)
      const executeBtn = dialog.getByRole('button', { name: /execute/i });
      await expect(executeBtn).toBeEnabled({ timeout: 10_000 });

      // Execute — this MUST succeed on the first click (the bug caused
      // a false "required" validation error here, requiring a second attempt).
      // GenerateReport is a WorkflowAction: after clicking Execute the dialog
      // transitions to a "running in background" state instead of closing.
      await executeBtn.click();

      // The background-execution message proves validation passed on the
      // first attempt — which is the exact regression we are guarding against.
      // Use Promise.race: the dialog may show a background message OR close directly.
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
        // Close the workflow progress dialog.
        // The button label is "Close" and may or may not include the icon's aria-label
        // ("close") in the accessible name depending on the Ant Design version, so we
        // use a case-insensitive regex to match either "Close" or "close Close".
        await dialog.getByRole('button', { name: /close/i }).first().click();
      }

      await expect(dialog).toBeHidden({ timeout: 10_000 });

      // The workflow runs in the background and creates a ProjectReport record.
      // Verify it actually landed by navigating to the reports table and polling
      // until this run's uniquely-titled report appears.
      await test.step('verify the report was created in the reports table', async () => {
        await app.navigateTo('/project-reports');
        await app.waitForTable();

        // Sort by "Generated At" descending so the freshly created report sits on
        // the first page. From the default unsorted state: 1st click = ascending,
        // 2nd click = descending.
        const generatedAtHeader = page
          .locator('th.ant-table-cell')
          .filter({ hasText: 'Generated At' })
          .first();
        await generatedAtHeader.click();
        await app.waitForTable();
        await generatedAtHeader.click();
        await app.waitForTable();

        // The background workflow takes ~10s+, so refresh-and-recheck until the
        // unique title shows up (it only matches THIS run's report). The reload
        // icon re-runs the server query while preserving the descending sort.
        const reloadIcon = page.locator('.anticon-reload').first();
        const reportRow = page.getByText(REPORT_TITLE).first();
        await expect
          .poll(
            async () => {
              await reloadIcon.click();
              await app.waitForTable();
              return reportRow.isVisible().catch(() => false);
            },
            { timeout: 60_000, intervals: [2_000, 3_000, 5_000] },
          )
          .toBe(true);
      });
    });
  });

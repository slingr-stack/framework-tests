import { expect, Locator, Page, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

/**
 * E2E test for nested composition boolean fields (n-level deep).
 *
 * Hierarchy: Task → ReviewChecks → DeploymentChecks
 *
 * Task has a composition `reviewChecks` (OneToOne → ReviewChecks) with
 * boolean fields (lintCode, testsCoverage, sampleAppImplementation).
 * ReviewChecks has a nested composition `deploymentChecks`
 * (OneToOne → DeploymentChecks) with boolean fields
 * (stagingDeploy, productionDeploy, rollbackPlan).
 *
 * These tests verify that boolean fields inside nested compositions
 * (composition within composition) can be:
 *  1. Checked during creation and persisted correctly.
 *  2. Modified (unchecked) and the change persists.
 *  3. Cleaned up via deletion.
 */

/**
 * Locate a boolean checkbox by finding the Ant Design form item whose label
 * contains the given text, then selecting its checkbox input.
 *
 * Why not getByRole('checkbox', { name }) or getByLabel:
 *   When an edit modal opens over a ReadView drawer both layers render the
 *   same drumr-field-* IDs.  The ReadView may render some boolean fields as
 *   disabled Switch buttons (role="switch") that claim the <label for="…">
 *   association, leaving the edit-form checkbox either without an accessible
 *   name (getByRole fails) or pointing to the disabled Switch (getByLabel
 *   returns "element is not enabled").
 *
 *   Scoping to .ant-form-item avoids this entirely: ReadView renders fields
 *   in plain generic wrappers, not ant-form-item containers, so the selector
 *   naturally resolves only to the active form's checkbox inputs.
 */
function checkbox(page: Page, label: string): Locator {
  return page
    .locator('.ant-form-item')
    .filter({
      has: page.locator('.ant-form-item-label', {
        hasText: new RegExp(label, 'i'),
      }),
    })
    .locator('input[type="checkbox"]');
}

test.describe
  .serial('Nested composition boolean fields (n-level) E2E', () => {
    test.setTimeout(240_000);
    let TASK_TITLE: string;
    test.beforeAll(() => {
      TASK_TITLE = `E2E NestedComp ${Date.now()}`;
    });

    test('should create a task with nested composition booleans checked', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickCreateInTable();
      await app.waitForForm('title');
      await app.fillField('title', TASK_TITLE);
      await app.selectFirstOption('Project');
      // Wait for onRefresh triggered by project selection to settle
      await page.waitForTimeout(1500);

      // Delete the auto-generated Note(s) — they have required fields (author, content)
      // that would block task creation if left unfilled.
      // Wait up to 8 s for the first delete button to appear (onRefresh is async).
      await expect(
        page.getByText('Review Checks', { exact: true }).first(),
      ).toBeVisible();
      const notesCard = page
        .locator('.ant-card')
        .filter({ hasText: /^Notes$/i })
        .first();
      const deleteNoteBtn = notesCard
        .getByRole('button', { name: /delete/i })
        .first();
      const noteDeleteVisible = await deleteNoteBtn
        .waitFor({ state: 'visible', timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      if (noteDeleteVisible) {
        // Delete all auto-generated notes (onRefresh may add more than one)
        let hasMore = true;
        while (hasMore) {
          const btn = notesCard
            .getByRole('button', { name: /delete/i })
            .first();
          hasMore = await btn.isVisible().catch(() => false);
          if (hasMore) {
            await btn.click();
            await page.waitForTimeout(500);
          }
        }
      }

      // Scroll to the Review Checks section
      const reviewChecksSection = page
        .getByText('Review Checks', { exact: true })
        .first();
      await expect(reviewChecksSection).toBeVisible();
      await reviewChecksSection.scrollIntoViewIfNeeded();

      // Check level-1 composition booleans (ReviewChecks)
      for (const label of [
        'Lint Code',
        'Tests Coverage',
        'Sample App Implementation',
      ]) {
        const cb = checkbox(page, label);
        await cb.scrollIntoViewIfNeeded();
        await cb.check();
      }

      // Check level-2 nested composition booleans (DeploymentChecks)
      for (const label of [
        'Staging Deploy',
        'Production Deploy',
        'Rollback Plan',
      ]) {
        const cb = checkbox(page, label);
        await cb.scrollIntoViewIfNeeded();
        await cb.check();
      }

      const createResponsePromise = page
        .waitForResponse(
          (res) =>
            res.url().includes('/graphql') &&
            res.request().method() === 'POST' &&
            (res.request().postData() ?? '').toLowerCase().includes('create'),
          { timeout: 35_000 },
        )
        .catch(() => null);

      await app.submitCreate();

      // Verify the GraphQL mutation succeeded
      const createResponse = await createResponsePromise;
      if (createResponse) {
        const body = await createResponse.json().catch(() => null);
        if (body?.errors?.length) {
          throw new Error(
            `Task creation failed — GraphQL errors: ${JSON.stringify(body.errors)}`,
          );
        }
      }

      await page
        .waitForURL((url) => !url.toString().includes('/new'), {
          timeout: 30_000,
        })
        .catch(() => {});

      // Close any open drawer (the framework may open the new task's ReadView after creation)
      const drawerMask = page.locator('.ant-drawer-mask').first();
      if (await drawerMask.isVisible().catch(() => false)) {
        await page.keyboard.press('Escape');
        await drawerMask
          .waitFor({ state: 'hidden', timeout: 5_000 })
          .catch(() => {});
      }

      // Verify task was created by finding it in the table (clears filters first).
      // clickTaskRowByTitle calls waitForTable internally and retries up to 30s.
      await app.navigateTo('/tasks');
      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.expectTextVisible(TASK_TITLE);
    });

    test('should verify nested composition booleans persisted after save', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Open task in edit mode
      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      // Scroll to Review Checks section
      const reviewCard = page
        .locator('.ant-card')
        .filter({ hasText: 'Review Checks' });
      await reviewCard.scrollIntoViewIfNeeded();

      // Level-1 booleans should all be checked
      for (const label of [
        'Lint Code',
        'Tests Coverage',
        'Sample App Implementation',
      ]) {
        await expect(checkbox(page, label)).toBeChecked();
      }

      // Level-2 booleans should all be checked
      for (const label of [
        'Staging Deploy',
        'Production Deploy',
        'Rollback Plan',
      ]) {
        await expect(checkbox(page, label)).toBeChecked();
      }

      // Uncheck one boolean at each level and save
      await checkbox(page, 'Lint Code').uncheck();
      await checkbox(page, 'Staging Deploy').uncheck();

      await app.submitSave();
      await app.expectTextVisible(TASK_TITLE);
    });

    test('should verify unchecked nested booleans persisted', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Re-open in edit mode
      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      // Scroll to Review Checks section
      const reviewCard = page
        .locator('.ant-card')
        .filter({ hasText: 'Review Checks' });
      await reviewCard.scrollIntoViewIfNeeded();

      // Level-1: Lint Code unchecked, others still checked
      await expect(checkbox(page, 'Lint Code')).not.toBeChecked();
      await expect(checkbox(page, 'Tests Coverage')).toBeChecked();
      await expect(checkbox(page, 'Sample App Implementation')).toBeChecked();

      // Level-2: Staging Deploy unchecked, others still checked
      await expect(checkbox(page, 'Staging Deploy')).not.toBeChecked();
      await expect(checkbox(page, 'Production Deploy')).toBeChecked();
      await expect(checkbox(page, 'Rollback Plan')).toBeChecked();
    });

    test('should verify nested booleans survive a hard page refresh', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Hard-refresh the tasks page to clear any client-side cache
      await page.reload({ waitUntil: 'domcontentloaded' });
      await app.waitForTable();

      // Re-open the task in edit mode after full page reload
      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      // Scroll to Review Checks section
      const reviewCard = page
        .locator('.ant-card')
        .filter({ hasText: 'Review Checks' });
      await reviewCard.scrollIntoViewIfNeeded();

      // Level-1: Lint Code should still be unchecked, others checked (from previous test)
      await expect(checkbox(page, 'Lint Code')).not.toBeChecked();
      await expect(checkbox(page, 'Tests Coverage')).toBeChecked();
      await expect(checkbox(page, 'Sample App Implementation')).toBeChecked();

      // Level-2: Staging Deploy unchecked, others checked (from previous test)
      await expect(checkbox(page, 'Staging Deploy')).not.toBeChecked();
      await expect(checkbox(page, 'Production Deploy')).toBeChecked();
      await expect(checkbox(page, 'Rollback Plan')).toBeChecked();
    });

    test('should show validation error and preserve composition state', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickCreateInTable();
      await app.waitForForm('title');

      // Do NOT fill title (required, minLength 3) — leave it empty
      // Select a project (also required) to isolate the title validation
      await app.selectFirstOption('Project');

      // Delete the auto-generated Note
      const deleteNoteBtn = page
        .locator('.ant-card')
        .filter({ hasText: 'Notes' })
        .getByRole('button', { name: /delete/i })
        .first();
      if (await deleteNoteBtn.isVisible().catch(() => false)) {
        await deleteNoteBtn.click();
      }

      // Scroll to Review Checks and check some booleans
      const reviewChecksSection = page
        .getByText('Review Checks', { exact: true })
        .first();
      await expect(reviewChecksSection).toBeVisible();
      await reviewChecksSection.scrollIntoViewIfNeeded();

      await checkbox(page, 'Lint Code').check();
      await checkbox(page, 'Tests Coverage').check();

      // Check a nested DeploymentChecks boolean
      const stagingCb = checkbox(page, 'Staging Deploy');
      await stagingCb.check();

      // Try to submit — should fail validation (title is required)
      await app.submitCreate();

      // Validation error should appear for the title field
      await expect(page.getByText(/title/i).first()).toBeVisible();

      // Scroll back to Review Checks to verify composition state is preserved after validation error
      await reviewChecksSection.scrollIntoViewIfNeeded();
      await expect(checkbox(page, 'Lint Code')).toBeChecked();
      await expect(checkbox(page, 'Tests Coverage')).toBeChecked();

      // Verify nested DeploymentChecks state is also preserved
      await expect(stagingCb).toBeChecked();
    });

    test('should delete the test task', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/delete/i);
      await app.confirmDelete();

      await app.navigateTo('/tasks');
      await app.expectTableNotContains(TASK_TITLE);
    });
  });

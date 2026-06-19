import { expect, type Page, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

/**
 * E2E regression test for Bug #2031:
 * UiUpdate fails when editing composition arrays.
 *
 * Verifies that when a user edits a record and appends a new item to an
 * existing composition array (Addresses on User), the framework generates
 * a UUID for the new item before validation so the request succeeds.
 *
 * Flow:
 *   1. Create a User with two addresses → succeeds (IDs auto-generated).
 *   2. Edit that User and add a third address → must NOT show a validation
 *      error about "Addresses → Id: This field is required".
 */
test.describe
  .serial('User composition-array edit regression (#2031)', () => {
    test.setTimeout(120_000);

    let USER_EMAIL: string;
    let USER_FIRST_NAME: string;
    /**
     * Captured after the create step so the edit step can navigate directly
     * to /users/:id/edit without relying on table search.
     */
    let userId: string | undefined;

    test.beforeAll(() => {
      const ts = Date.now();
      USER_FIRST_NAME = `E2E Bug2031`;
      USER_EMAIL = `e2e-bug2031-${ts}@example.com`;
    });

    // ── Helpers ────────────────────────────────────────────────────────────

    /**
     * Locate the Addresses form-item container.
     * The field renders as an .ant-form-item whose label is "Addresses".
     * It contains a tablist (Collapse accordion) and a "plus Add" button.
     * There is no ant-card / heading wrapper.
     */
    function addressesFormItem(page: Page) {
      return page
        .locator('.ant-form-item')
        .filter({
          has: page.locator('label').filter({ hasText: /^Addresses$/i }),
        })
        .first();
    }

    /**
     * Click "Add" in the Addresses form item, then expand the newly added
     * accordion panel so its inputs are in the DOM.
     *
     * Returns a locator scoped to the newly-added content box so that callers
     * can fill fields without relying on a global nth(index).
     *
     * Background: the framework auto-expands the newly added panel.
     * Ant Design 6 Collapse uses .ant-collapse-item as the panel wrapper.
     */
    async function addAddress(
      page: Page,
    ): Promise<import('@playwright/test').Locator> {
      const field = addressesFormItem(page);
      const addBtn = field.getByRole('button', { name: /add/i }).first();
      await addBtn.scrollIntoViewIfNeeded();

      const itemsBefore = await field.locator('.ant-collapse-item').count();

      await addBtn.click();

      // Wait for the new Collapse panel to appear
      await expect(field.locator('.ant-collapse-item')).toHaveCount(
        itemsBefore + 1,
        { timeout: 10_000 },
      );

      // The newly added panel is auto-expanded — wait for its content.
      // Scope to the last .ant-collapse-item (header + content) which we
      // already confirmed exists via the count check above.
      const newPanel = field.locator('.ant-collapse-item').last();
      await expect(
        newPanel.getByPlaceholder(/enter street address/i),
      ).toBeVisible({
        timeout: 10_000,
      });

      return newPanel;
    }

    /**
     * Fill all required fields for one address item.
     * @param panel - locator scoped to the address's content box (returned by addAddress)
     */
    async function fillAddress(
      panel: import('@playwright/test').Locator,
      street: string,
      city: string,
      postalCode: string,
      country: string,
    ) {
      await panel.getByPlaceholder(/enter street address/i).fill(street);
      await panel.getByPlaceholder(/enter city/i).fill(city);
      await panel
        .getByPlaceholder(/enter postal or ZIP code/i)
        .fill(postalCode);
      await panel.getByPlaceholder(/enter country/i).fill(country);
    }

    /**
     * Navigate to /users, filter by email, and return the user ID from the
     * matching row's data-row-key attribute.  Returns undefined if not found.
     */
    async function findUserIdByEmail(page: Page): Promise<string | undefined> {
      const app = new DrumrTestKit(page);
      await app.navigateTo('/users');
      await app.waitForTable();

      // Filter by Email. Use the kit's filterTable helper: the Email column is not
      // among the always-visible filters, so it lives behind the "Expand" toggle in
      // the query-filter bar — filterTable expands it and applies the filter.
      await app.filterTable('Email', USER_EMAIL);
      await app.waitForTable();

      const row = page
        .locator('.ant-table-tbody tr')
        .filter({ hasText: USER_EMAIL })
        .first();

      await row.waitFor({ state: 'visible', timeout: 15_000 });
      const rowKey = await row.getAttribute('data-row-key');
      return rowKey ?? undefined;
    }

    // ── Step 1: Create a User with two addresses ──────────────────────────

    test('should create a user with two addresses', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/users/new');
      await app.waitForForm('firstName');

      await app.fillField('firstName', USER_FIRST_NAME);
      await app.fillField('lastName', 'Regression');
      await app.fillField('email', USER_EMAIL);

      // Add the first address
      const addr0Panel = await addAddress(page);
      await fillAddress(
        addr0Panel,
        '123 First St',
        'Springfield',
        '62701',
        'USA',
      );

      // Add the second address
      const addr1Panel = await addAddress(page);
      await fillAddress(
        addr1Panel,
        '456 Second Ave',
        'Shelbyville',
        '62565',
        'USA',
      );

      // Intercept the create mutation response to verify no GraphQL errors
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

      // Confirm the app navigates away from /users/new
      await page.waitForURL((url) => !url.toString().includes('/users/new'), {
        timeout: 30_000,
      });

      const createResponse = await createResponsePromise;
      if (createResponse) {
        const body = await createResponse.json().catch(() => null);
        expect((body?.errors ?? []) as unknown[]).toHaveLength(0);
      }

      // Capture the user ID by searching in the table via the Email filter.
      // This is more reliable than parsing the mutation response body, whose
      // exact shape can vary depending on the framework version.
      userId = await findUserIdByEmail(page);
    });

    // ── Step 2: Edit the same user and add a third address ─────────────────

    test('should edit the user and add a third address without validation errors', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      if (userId) {
        // Happy path: navigate directly to /users/:id/edit
        await app.navigateTo(`/users/${userId}/edit`);
      } else {
        // Fallback: find the user row in the table by email text and extract
        // the ID from the resulting URL to reach the edit view.
        await app.navigateTo('/users');
        await app.waitForTable();
        await app.clickTableRow(USER_EMAIL);
        // After clicking a user row the framework navigates to /users/:id/view.
        await page
          .waitForURL(/\/users\/[^?#]+/, { timeout: 15_000 })
          .catch(() => {});
        const viewUrl = page.url();
        const idMatch = viewUrl.match(/\/users\/([^/?#]+)/);
        if (idMatch && idMatch[1] !== 'new') {
          await app.navigateTo(`/users/${idMatch[1]}/edit`);
        } else {
          // We may be in a left-side read panel — click the Edit button
          await page
            .getByRole('button', { name: /^edit$/i })
            .first()
            .click();
        }
      }

      await app.waitForForm('firstName');

      const field = addressesFormItem(page);

      // Wait until both existing address items are loaded from the DB
      await expect(field.locator('.ant-collapse-item')).toHaveCount(2, {
        timeout: 15_000,
      });

      // Expand both existing panels so their inputs are in the DOM.
      // Items are collapsed by default — active panels have .ant-collapse-item-active.
      for (let i = 0; i < 2; i++) {
        const item = field.locator('.ant-collapse-item').nth(i);
        const isActive = await item.evaluate((el) =>
          el.classList.contains('ant-collapse-item-active'),
        );
        if (!isActive) {
          await item.locator('.ant-collapse-header').click();
          // Wait until this panel's street input materializes in the DOM
          await expect
            .poll(
              () => field.getByPlaceholder(/enter street address/i).count(),
              { timeout: 10_000 },
            )
            .toBeGreaterThanOrEqual(i + 1);
        }
      }

      // Add a third address — this new item is created client-side without an id.
      // enrichCompositionIds must generate a UUID before the mutation is sent.
      const addr2Panel = await addAddress(page);
      await fillAddress(
        addr2Panel,
        '789 Third Blvd',
        'Capital City',
        '62960',
        'USA',
      );

      // Intercept the update mutation response BEFORE submitting
      const updateResponsePromise = page.waitForResponse(
        (res) =>
          res.url().includes('/graphql') &&
          res.request().method() === 'POST' &&
          (res.request().postData() ?? '').toLowerCase().includes('uiupdate'),
        { timeout: 35_000 },
      );

      await app.submitSave();

      const updateResponse = await updateResponsePromise.catch(() => null);
      if (updateResponse) {
        const body = await updateResponse.json().catch(() => null);

        // No GraphQL transport errors
        expect((body?.errors ?? []) as unknown[]).toHaveLength(0);

        // The uiUpdate result must not be a ValidationErrorType
        const result = Object.values(body?.data ?? {})[0] as
          | { __typename?: string; message?: string }
          | undefined;
        if (result?.__typename === 'ValidationErrorType') {
          throw new Error(
            `UiUpdate returned a validation error: ${result.message}`,
          );
        }
      }

      // Confirm no validation-error toast appeared in the UI
      await expect(page.locator('.ant-message-error').first()).not.toBeVisible({
        timeout: 5_000,
      });
    });

    // ── Cleanup: Delete the test user ──────────────────────────────────────

    test('should delete the test user', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/users');
      await app.waitForTable();

      // Filter by email so the row is unambiguously visible. The Email column lives
      // behind the "Expand" toggle in the query-filter bar; filterTable handles that.
      await app.filterTable('Email', USER_EMAIL);
      await app.waitForTable();

      await app.openRowActionsMenu(USER_EMAIL);
      await app.clickActionOption(/delete/i);
      await app.confirmDelete();
    });
  });

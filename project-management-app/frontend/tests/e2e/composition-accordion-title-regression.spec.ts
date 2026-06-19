import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

const SUFFIX = Date.now();
const FIRST_NAME = `Addr${SUFFIX}`;
const LAST_NAME = 'Accordion';
const EMAIL = `address.accordion.${SUFFIX}@example.com`;

test.describe
  .serial('User Create address accordion regression E2E', () => {
    test.setTimeout(120_000);

    test('keeps Address accordion expanded after typing first street character', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/users/new');
      await app.waitForForm('firstName');

      await app.fillField('firstName', FIRST_NAME);
      await app.fillField('lastName', LAST_NAME);
      await app.fillField('email', EMAIL);
      await app.selectOption('Roles', /admin/i);

      // The accordion renders a dashed "Add" button when the list is empty.
      const addAddressButton = page
        .locator('.ant-form-item')
        .filter({ hasText: /^Addresses/i })
        .getByRole('button', { name: /add/i })
        .first();
      await expect(addAddressButton).toBeVisible({ timeout: 15_000 });
      await addAddressButton.click();

      // ArrayAccordionEditor auto-expands newly added items — no tab click needed.
      const streetInput = page.getByPlaceholder('Enter street address').first();
      await expect(streetInput).toBeVisible({ timeout: 15_000 });

      await streetInput.fill('');
      await streetInput.type('A');

      // Regression assertion: changing the accordion title source field must not collapse the panel.
      await expect(streetInput).toBeVisible();
      await expect(streetInput).toHaveValue('A');
      await expect(
        page.getByPlaceholder('Enter city or locality').first(),
      ).toBeVisible();

      await streetInput.type('bc');
      await expect(streetInput).toHaveValue('Abc');

      await page
        .getByPlaceholder('Enter city or locality')
        .first()
        .fill('Buenos Aires');
      await page
        .getByPlaceholder('Enter postal or ZIP code')
        .first()
        .fill('1000');
      await page.getByPlaceholder('Enter country').first().fill('Argentina');

      // Final invariant: street field is still present/editable after label updates.
      await expect(streetInput).toBeVisible();
      await expect(streetInput).toHaveValue('Abc');
    });
  });

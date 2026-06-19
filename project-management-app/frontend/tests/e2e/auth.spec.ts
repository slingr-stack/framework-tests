import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe
  .serial('Authentication E2E', () => {
    test.setTimeout(60_000);

    test('login with valid credentials redirects to dashboard', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.expectLoggedIn();
    });

    test('login with invalid credentials stays on login page', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.login('notexist@company.com', 'wrongpassword', {
        expectSuccess: false,
      });
      await app.expectOnLoginPage();
    });

    test('session persists after reload', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.expectLoggedIn();
      await app.reload();
      await app.expectLoggedIn();
    });

    test('logout clears session and redirects to login', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.expectLoggedIn();
      await app.logout();
      await app.expectOnLoginPage();
    });
  });

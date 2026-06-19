import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

/**
 * E2E tests for the left-menu "open in new tab" feature.
 *
 * The framework wraps each navigable left-menu item label in an `<a href>`
 * element so that:
 *   - The browser context menu offers "Open link in new tab".
 *   - Middle-click opens the view in a new tab (native anchor behaviour).
 *   - Ctrl/Cmd+click opens the view in a new tab while SPA navigation is
 *     skipped in the originating tab.
 *   - Plain left-click still performs SPA navigation in the same tab.
 *
 * `openInNewTab` defaults to `true` in `LeftMenuConfig`, so no app-level
 * configuration is required for these tests.
 */
test.describe('Left menu — open in new tab E2E', () => {
  test.setTimeout(60_000);

  test('plain left-click on a left menu item performs SPA navigation in the same tab', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);

    await app.loginAsAdmin();
    await app.clickMainMenuItem('Projects');
    await app.expectUrlMatches(/\/projects/);
  });

  test('Ctrl+click on a left menu item opens the view in a new tab', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);

    await app.loginAsAdmin();

    const newPage = await app.ctrlClickLeftMenuItem('Projects');
    await app.expectNewTabNavigatedTo(newPage, '/projects');
  });

  test('middle-click on a left menu item opens the view in a new tab', async ({
    page,
  }) => {
    const app = new DrumrTestKit(page);

    await app.loginAsAdmin();

    const newPage = await app.middleClickLeftMenuItem('Tasks');
    await app.expectNewTabNavigatedTo(newPage, '/tasks');
  });
});

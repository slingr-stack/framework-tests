/**
 * E2E tests — Toolbar view guard
 *
 * The view guard (introduced in fix/1456) hides toolbar buttons when their
 * target view is not registered at runtime. These tests validate the guard
 * with the Users model:
 *
 *   Positive path  — All CRUD views (UserReadView, UserEditView, UserCreateView)
 *                    ARE registered → the corresponding toolbar buttons appear
 *                    in the row toolbar (container: 'page') and table toolbar.
 *   Delete exempt  — The Delete action never requires a view; it always appears.
 *
 * The negative path (buttons hidden when views are absent) is covered by unit
 * tests in ToolbarViewGuard.test.ts.
 */
import { test } from '@playwright/test';
import { DrumrTestKit } from '../../../../../qa/drumr-test-kit';

test.describe
  .serial('Toolbar view guard E2E', () => {
    test.setTimeout(90_000);

    /**
     * Row toolbar positive path.
     *
     * UserTableView uses toolbar<User>({ container: 'page' }) in the rowToolbar,
     * which should produce View Details, Edit and Delete because all CRUD views
     * are registered.
     */
    test('should show View Details, Edit and Delete in row toolbar when all CRUD views are registered', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/users');
      await app.waitForTable();

      // Hover first row to reveal the row toolbar
      const firstRow = page
        .locator('.ant-table-tbody tr[class*="ant-table-row"]')
        .first();
      await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
      const firstRowText = (await firstRow.textContent()) ?? '';

      // The row toolbar uses container: 'page' → buttons appear in a "more" dropdown
      await app.openRowActionsMenu(firstRowText.substring(0, 20).trim());

      // View Details, Edit and Delete should be present
      await app.expectRowActionVisible(/view details/i);
      await app.expectRowActionVisible(/edit/i);
      await app.expectRowActionVisible(/delete/i);
    });

    /**
     * Table toolbar Create button positive path.
     *
     * With `toolbar<User>({ actions: 'crud' })` in the table toolbar, the Create
     * button must appear because UserCreateView is registered.
     */
    test('should show Create button in table toolbar when CreateView is registered', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/users');
      await app.waitForTable();

      await app.expectBulkActionButtonVisible(/create/i);
    });
  });

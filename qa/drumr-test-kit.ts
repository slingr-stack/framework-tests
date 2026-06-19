/**
 * DrumrTestKit — Framework-aware E2E testing abstraction.
 *
 * This file is the SINGLE source of truth for all DOM selectors and UI
 * conventions used by the Drumr framework.  Every spec file interacts
 * with the application exclusively through this class, so:
 *
 *   • If the framework changes how it renders components, only this
 *     file needs to be updated — no spec rewrites.
 *   • Spec files read as plain business scenarios with zero DOM knowledge.
 *   • QA engineers never need to know about Ant Design internals.
 *
 * The API surface is organised by framework concept:
 *   - Authentication (login / logout / session)
 *   - Navigation (entity routes)
 *   - TableView (data tables, toolbar, row interaction)
 *   - CreateView / EditView (form fields, submit)
 *   - ReadView (detail page, Manage / Actions toolbars)
 *   - Action dialogs (modal forms triggered by actions)
 *   - Feedback (success / error messages)
 */
import { expect, type Locator, Page } from '@playwright/test';

interface CredentialSource {
  email: string;
  password: string;
}

interface CredentialResolutionOptions {
  role: string;
  identityEnvVars: string[];
  passwordEnvVars: string[];
}

function getFirstEnvValue(candidates: string[]): string | undefined {
  for (const envVar of candidates) {
    const value = process.env[envVar]?.trim();
    if (value) {
return value;
}
  }
  return undefined;
}

function resolveCredentials(options: CredentialResolutionOptions): CredentialSource {
  const { role, identityEnvVars, passwordEnvVars } = options;
  const email = getFirstEnvValue(identityEnvVars);
  const password = getFirstEnvValue(passwordEnvVars);

  if (email && password) {
    return { email, password };
  }

  const missing: string[] = [];
  if (!email) {
missing.push(`identity (${identityEnvVars.join(' or ')})`);
}
  if (!password) {
missing.push(`password (${passwordEnvVars.join(' or ')})`);
}

  throw new Error(
    [
      `Missing E2E ${role} credentials: ${missing.join(', ')}.`,
      'Credential resolution order:',
      `1) Environment variables (${identityEnvVars.join(' / ')} + ${passwordEnvVars.join(' / ')})`,
      '2) (Generation only) If you are generating tests via skill/agent, provide values through #tool:vscode/askQuestions.',
      '3) Runtime stops with this error when credentials are still unavailable.',
    ].join(' ')
  );
}

interface LoginOptions {
  expectSuccess?: boolean;
}

export class DrumrTestKit {
  /**
   * When form operations happen inside a drawer (e.g. EditView opened over
   * a ReadView drawer), this stores the drawer container so that form
   * field locators scope correctly and don't match identically-named
   * table-filter inputs on the underlying page.
   */
  private _formContainer: import('@playwright/test').Locator | null = null;
  private _openSelectDropdown: import('@playwright/test').Locator | null = null;

  constructor(private readonly page: Page) {}

  private getTopOverlayContainer(): import('@playwright/test').Locator {
    return this.page.locator('.ant-modal-wrap:visible, .ant-drawer:visible').last();
  }

  private async getSelectPopupId(trigger: Locator): Promise<string | null> {
    const directAriaControls = await trigger.getAttribute('aria-controls').catch(() => null);
    if (directAriaControls?.trim()) {
      return directAriaControls.trim();
    }

    const directAriaOwns = await trigger.getAttribute('aria-owns').catch(() => null);
    if (directAriaOwns?.trim()) {
      return directAriaOwns.trim();
    }

    const nestedControl = trigger.locator('[aria-controls], [aria-owns]').first();
    const nestedExists = await nestedControl.count().catch(() => 0);
    if (nestedExists === 0) {
      return null;
    }

    const nestedAriaControls = await nestedControl.getAttribute('aria-controls').catch(() => null);
    if (nestedAriaControls?.trim()) {
      return nestedAriaControls.trim();
    }

    const nestedAriaOwns = await nestedControl.getAttribute('aria-owns').catch(() => null);
    return nestedAriaOwns?.trim() || null;
  }

  private async bindOpenSelectDropdown(trigger: Locator, timeout: number = 10_000): Promise<Locator> {
    const popupId = await this.getSelectPopupId(trigger);

    if (popupId) {
      const popupMarker = this.page.locator(`[id="${popupId}"]`);
      const dropdownByPopupId = this.page
        .locator('.ant-select-dropdown')
        .filter({ has: popupMarker })
        .first();

      const matchedPopupVisible = await dropdownByPopupId
        .waitFor({ state: 'visible', timeout })
        .then(() => true)
        .catch(() => false);

      if (matchedPopupVisible) {
        this._openSelectDropdown = dropdownByPopupId;
        return dropdownByPopupId;
      }
    }

    const fallbackDropdown = this.page.locator('.ant-select-dropdown:visible').last();
    await fallbackDropdown.waitFor({ state: 'visible', timeout });
    this._openSelectDropdown = fallbackDropdown;
    return fallbackDropdown;
  }

  private getAppChrome(): Locator {
    return this.page.locator('.ant-pro-layout, .ant-layout, [class*="basicLayout"]').first();
  }

  private async waitForUiToSettle(delayMs: number = 500): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(delayMs);
  }

  private async waitForLoginForm(): Promise<void> {
    const timeout = process.env.CI ? 45_000 : 15_000;
    await this.page.locator('#email, input[name="email"]').first().waitFor({ state: 'visible', timeout });
    await this.page.locator('#password, input[name="password"]').first().waitFor({ state: 'visible', timeout });
  }

  private async isOnLoginPage(timeout: number = process.env.CI ? 5_000 : 1_500): Promise<boolean> {
    const outcome = await Promise.any([
      this.page
        .waitForURL((url: URL) => /\/login(?:\?|$)/.test(url.pathname + url.search), { timeout })
        .then(() => true),
      this.page
        .locator('#email, input[name="email"]')
        .first()
        .waitFor({ state: 'visible', timeout })
        .then(() => true),
    ]).catch(() => false);

    return outcome === true;
  }

  private async ensureOnLoginPage(): Promise<void> {
    if (await this.isOnLoginPage()) {
      await this.waitForLoginForm();
      return;
    }

    try {
      await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
    } catch (error) {
      if (!(await this.isOnLoginPage())) {
        throw error;
      }
    }

    await this.waitForLoginForm();
  }

  private async tryReuseStoredSession(): Promise<boolean> {
    const timeout = process.env.CI ? 12_000 : 5_000;

    await this.page.goto('/', { waitUntil: 'domcontentloaded' });

    const outcome = await Promise.any([
      this.getAppChrome()
        .waitFor({ state: 'visible', timeout })
        .then(() => 'authenticated' as const),
      this.page
        .waitForURL((url: URL) => /\/login(?:\?|$)/.test(url.pathname + url.search), { timeout })
        .then(() => 'login' as const),
      this.page
        .locator('#email, input[name="email"]')
        .first()
        .waitFor({ state: 'visible', timeout })
        .then(() => 'login' as const),
    ]).catch(() => null);

    return outcome === 'authenticated';
  }

  // ─── Authentication ───────────────────────────────────────────────────

  /** Navigate to the login page, fill credentials and submit. */
  async login(email: string, password: string, options: LoginOptions = {}): Promise<void> {
    const { expectSuccess = true } = options;

    if (expectSuccess && (await this.tryReuseStoredSession())) {
      await this.expectLoggedIn();
      return;
    }

    await this.ensureOnLoginPage();
    await this.page.locator('#email, input[name="email"]').first().fill(email);
    await this.page.locator('#password, input[name="password"]').first().fill(password);

    const loginResponsePromise = this.page
      .waitForResponse(response => response.url().includes('/auth/login') && response.request().method() === 'POST', {
        timeout: 20_000,
      })
      .catch(() => null);

    await this.page.getByRole('button', { name: /login/i }).click();
    const loginResponse = await loginResponsePromise;

    if (expectSuccess && loginResponse && !loginResponse.ok()) {
      const errorPayload = await loginResponse.text().catch(() => '');
      throw new Error(
        `Login failed for "${email}" (HTTP ${loginResponse.status()}): ${errorPayload || loginResponse.statusText}`
      );
    }

    if (!expectSuccess && loginResponse?.ok()) {
      throw new Error('Login succeeded unexpectedly.');
    }

    if (expectSuccess) {
      await this.expectLoggedIn();
      return;
    }

    await this.expectOnLoginPage();
    await this.page
      .locator('.ant-alert-error')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => {});
  }

  /** Login with configured admin credentials. */
  async loginAsAdmin(): Promise<void> {
    const credentials = resolveCredentials({
      role: 'admin',
      identityEnvVars: ['E2E_EMAIL', 'E2E_USERNAME', 'E2E_ADMIN_EMAIL'],
      passwordEnvVars: ['E2E_PASSWORD', 'E2E_ADMIN_PASSWORD'],
    });
    await this.login(credentials.email, credentials.password);
  }

  /** Login with configured manager credentials. */
  async loginAsManager(): Promise<void> {
    const credentials = resolveCredentials({
      role: 'manager',
      identityEnvVars: ['E2E_MANAGER_EMAIL', 'E2E_MANAGER_USERNAME', 'E2E_EMAIL', 'E2E_USERNAME'],
      passwordEnvVars: ['E2E_MANAGER_PASSWORD', 'E2E_PASSWORD'],
    });
    await this.login(credentials.email, credentials.password);
  }

  /** Login with configured developer credentials. */
  async loginAsDeveloper(): Promise<void> {
    const credentials = resolveCredentials({
      role: 'developer',
      identityEnvVars: ['E2E_DEVELOPER_EMAIL', 'E2E_DEVELOPER_USERNAME'],
      passwordEnvVars: ['E2E_DEVELOPER_PASSWORD'],
    });
    await this.login(credentials.email, credentials.password);
  }

  /** The configured manager email (for test data setup/teardown). */
  get managerEmail(): string {
    const identityEnvVars = ['E2E_MANAGER_EMAIL', 'E2E_MANAGER_USERNAME', 'E2E_EMAIL', 'E2E_USERNAME'];
    const email = getFirstEnvValue(identityEnvVars);
    if (email) {
      return email;
    }
    throw new Error(`Missing E2E manager identity (set one of: ${identityEnvVars.join(' or ')}).`);
  }

  /** Assert the user is authenticated (not on login page, app chrome visible). */
  async expectLoggedIn(): Promise<void> {
    await this.page.waitForURL((url: URL) => !/\/login(?:\?|$)/.test(url.pathname + url.search), { timeout: 20_000 });
    await this.waitForUiToSettle();
    // After login the framework renders ProLayout with header/menu
    await this.getAppChrome().waitFor({ state: 'visible', timeout: 20_000 });
  }

  /** Assert the user is on the login page (logged out). */
  async expectOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/, { timeout: 10_000 });
    await this.waitForLoginForm();
    await this.page.getByRole('button', { name: /login/i }).waitFor({ state: 'visible', timeout: 10_000 });
  }

  /**
   * Assert the current page is the permission-denied page (`/permission-denied`).
   * Waits up to 15 s for the ViewPermissionGuard redirect to complete.
   */
  async expectOnPermissionDeniedPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/permission-denied/, { timeout: 15_000 });
    await this.waitForUiToSettle();
  }

  /** Open the avatar dropdown and click logout. */
  async logout(): Promise<void> {
    const avatar = this.page.locator('.ant-avatar, [class*="avatar"], [class*="user-info"]').first();
    await avatar.waitFor({ state: 'visible', timeout: 10_000 });
    await avatar.click();

    const logoutMenuItem = this.page.getByRole('menuitem', { name: /logout|sign out|log out/i });
    await logoutMenuItem.waitFor({ state: 'visible', timeout: 10_000 });
    await logoutMenuItem.click();

    await this.expectOnLoginPage();
  }

  /** Reload current page and wait for network. */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.waitForUiToSettle();
  }

  // ─── Navigation ───────────────────────────────────────────────────────

  /** Navigate to a framework entity path (e.g. '/tasks', '/projects'). */
  async navigateTo(entityPath: string): Promise<void> {
    this._formContainer = null; // reset drawer scope on navigation
    this._openSelectDropdown = null;
    await this.page.goto(entityPath, { waitUntil: 'domcontentloaded' });
    await this.waitForUiToSettle();
  }

  // ─── TableView ────────────────────────────────────────────────────────

  /** Wait for the Drumr data-table component to be visible. */
  async waitForTable(): Promise<void> {
    const table = this.page.locator('.drumr-data-table');
    await table.waitFor({ state: 'visible', timeout: 15_000 });

    const loadingOverlay = table.locator('.ant-spin-spinning, .drumr-data-table__loading').first();
    await loadingOverlay.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
  }

  /**
   * Navigate to the last page of the current table by clicking the Ant Design
   * pagination "last page" button (the rightmost numbered item before the next
   * arrow). No-op when the table has only one page.
   */
  async goToLastTablePage(): Promise<void> {
    const lastPageBtn = this.page.locator('.ant-pagination-item').last();
    const isVisible = await lastPageBtn.isVisible().catch(() => false);
    if (!isVisible) {
      return;
    }
    const isActive = ((await lastPageBtn.getAttribute('class')) ?? '').includes('ant-pagination-item-active');
    if (isActive) {
      return;
    }
    await lastPageBtn.click();
    await this.waitForUiToSettle();
  }

  /**
   * Wait for a Drawer or Modal to appear (used when row click opens a view
   * in a modal/drawer container instead of navigating by URL).
   */
  async waitForDrawer(): Promise<void> {
    // CI runners are noticeably slower than local: the backend GET behind the
    // drawer can take 10–20s on a cold cache, so a 15s timeout is borderline.
    const timeout = process.env.CI ? 40_000 : 15_000;
    const drawer = this.page
      .locator('.ant-drawer:visible, .ant-modal-wrap:visible')
      .first();
    await drawer.waitFor({ state: 'visible', timeout });
    // Wait for the drawer's own loading spinner (covering the ReadView while
    // its data + toolbar actions resolve) to disappear. This used to be a
    // hard sleep of 2–4s on every drawer open; replacing it with a
    // conditional wait returns early on a fast backend and still bounds
    // wall time on a slow one.
    const settleCap = process.env.CI ? 4_000 : 2_000;
    await drawer
      .locator('.ant-spin-spinning')
      .first()
      .waitFor({ state: 'hidden', timeout: settleCap })
      .catch(() => {});
  }

  /**
   * Wait for a page-level ReadView to appear (used when row click opens a view
   * via container: 'page' navigation instead of a drawer/modal).
   */
  async waitForReadView(): Promise<void> {
    const timeout = process.env.CI ? 40_000 : 15_000;
    const readView = this.page.locator('.drumr-read-view').first();
    await readView.waitFor({ state: 'visible', timeout });
    const settleCap = process.env.CI ? 4_000 : 2_000;
    await readView
      .locator('.ant-spin-spinning')
      .first()
      .waitFor({ state: 'hidden', timeout: settleCap })
      .catch(() => {});
  }

  /** Assert that at least one visible drawer/modal container is open. */
  async expectOverlayOpen(): Promise<void> {
    await expect(this.getTopOverlayContainer()).toBeVisible({ timeout: 10_000 });
  }

  /** Click a visible tab in the topmost drawer/modal by accessible name. */
  async clickTab(namePattern: RegExp): Promise<void> {
    const container = this.getTopOverlayContainer();
    const tab = container.getByRole('tab', { name: namePattern }).first();
    await tab.waitFor({ state: 'visible', timeout: 10_000 });
    await tab.click();
    await this.waitForUiToSettle(300);
  }

  /** Assert a tab is visible in the topmost drawer/modal. */
  async expectTabVisible(namePattern: RegExp): Promise<void> {
    const container = this.getTopOverlayContainer();
    await expect(container.getByRole('tab', { name: namePattern }).first()).toBeVisible({ timeout: 10_000 });
  }

  /** Open a nested view by tab name or button label in the topmost drawer/modal. */
  async openNestedView(namePattern: RegExp): Promise<void> {
    const container = this.getTopOverlayContainer();

    const tab = container.getByRole('tab', { name: namePattern }).first();
    const hasTab = await tab.isVisible().catch(() => false);
    if (hasTab) {
      await tab.click();
      await this.waitForUiToSettle(300);
      return;
    }

    const button = container.getByRole('button', { name: namePattern }).first();
    await button.waitFor({ state: 'visible', timeout: 10_000 });
    await button.click();
    await this.waitForUiToSettle(300);
  }

  /** Click a visible button in the topmost drawer/modal by accessible name. */
  async clickOverlayButton(namePattern: RegExp): Promise<void> {
    const container = this.getTopOverlayContainer();
    const button = container.getByRole('button', { name: namePattern }).first();
    await button.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(button).toBeEnabled({ timeout: 10_000 });
    await button.click();
    await this.waitForUiToSettle();
  }

  /** Click the "Create <Entity>" button in the table toolbar. */
  async clickCreateInTable(): Promise<void> {
    const toolbarContainers = [
      this.page.locator('.ant-pro-table-toolbar').first(),
      this.page.locator('.ant-page-header-heading-extra, [class*="page-header"]').first(),
    ];

    for (const container of toolbarContainers) {
      const isVisible = await container.isVisible().catch(() => false);
      if (!isVisible) {
        continue;
      }

      const createButton = container.getByRole('button', { name: /create/i }).first();
      const hasButton = await createButton.isVisible().catch(() => false);
      if (hasButton) {
        await createButton.click();
        await this.waitForUiToSettle();
        return;
      }
    }

    await this.page.getByRole('button', { name: /create/i }).first().click();
    await this.waitForUiToSettle();
  }

  /**
   * Search for a record in the table using the first search/filter input,
   * then click Search to apply the filter.
   */
  async searchInTable(text: string): Promise<void> {
    // The framework can render either a generic search box or form-based
    // table filters. Use the first visible search-like input.
    const candidateInputs = this.page.locator('input[placeholder*="Search"], .ant-pro-table-search input[type="text"]');
    const count = await candidateInputs.count();
    let searchInput: import('@playwright/test').Locator | null = null;

    for (let i = 0; i < count; i += 1) {
      const candidate = candidateInputs.nth(i);
      const visible = await candidate.isVisible().catch(() => false);
      if (visible) {
        searchInput = candidate;
        break;
      }
    }

    if (!searchInput) {
      return;
    }

    const isSearchVisible = await searchInput.isVisible().catch(() => false);
    if (isSearchVisible) {
      const searchArea = searchInput.locator('xpath=ancestor::*[contains(@class, "ant-pro-table-search")][1]').first();

      const clearButton = searchArea.getByRole('button', { name: /clear/i }).first();
      const hasClearButton = await clearButton.isVisible().catch(() => false);
      if (hasClearButton) {
        await clearButton.click();
        await this.waitForUiToSettle();
      }

      await searchInput.clear();
      await searchInput.fill(text);
      const applyButton = searchArea.getByRole('button', { name: /filter|search/i }).first();
      const hasApplyButton = await applyButton.isVisible().catch(() => false);
      if (hasApplyButton) {
        await applyButton.click();
      } else {
        await searchInput.press('Enter').catch(() => {});
      }
      await this.waitForUiToSettle();
      await this.page.waitForTimeout(1500);
    }
  }

  /** Click a table row that contains the given text. */
  async clickTableRow(text: string): Promise<void> {
    // Use longer timeouts in CI where the environment is slower.
    const rowVisibilityTimeout = process.env.CI ? 10_000 : 5_000;
    let row = this.page.locator('.ant-table-tbody tr').filter({ hasText: text }).first();
    // Give the table data time to load before falling back to a title-based search
    let isVisible = await row
      .waitFor({ state: 'visible', timeout: rowVisibilityTimeout })
      .then(() => true)
      .catch(() => false);
    if (!isVisible) {
      await this.searchInTable(text);
      row = this.page.locator('.ant-table-tbody tr').filter({ hasText: text }).first();
      isVisible = await row
        .waitFor({ state: 'visible', timeout: rowVisibilityTimeout })
        .then(() => true)
        .catch(() => false);
    }

    if (!isVisible) {
      const nextPage = this.page.locator('.ant-pagination-next').first();
      for (let i = 0; i < 20; i += 1) {
        const nextVisible = await nextPage.isVisible().catch(() => false);
        if (!nextVisible) {
          break;
        }

        const nextClass = (await nextPage.getAttribute('class')) ?? '';
        const ariaDisabled = await nextPage.getAttribute('aria-disabled');
        const isDisabled = nextClass.includes('ant-pagination-disabled') || ariaDisabled === 'true';
        if (isDisabled) {
          break;
        }

        await nextPage.click();
        await this.waitForUiToSettle();

        row = this.page.locator('.ant-table-tbody tr').filter({ hasText: text }).first();
        isVisible = await row
          .waitFor({ state: 'visible', timeout: rowVisibilityTimeout })
          .then(() => true)
          .catch(() => false);
        if (isVisible) {
          break;
        }
      }
    }

    if (!isVisible) {
      throw new Error(`Table row containing "${text}" was not found after search and pagination.`);
    }

    await row.click();
    await this.waitForUiToSettle();
  }

  /**
   * Open a row in Task table by title using the title filter input.
   * This is more deterministic for specs that create a new task and need
   * to immediately find it in tables with multiple active filters.
   */
  async clickTaskRowByTitle(title: string): Promise<void> {
    await this.waitForTable();

    const searchArea = this.page.locator('.ant-pro-table-search').first();
    const clearButton = searchArea.getByRole('button', { name: /clear/i }).first();
    const hasClearButton = await clearButton.isVisible().catch(() => false);
    if (hasClearButton) {
      await clearButton.click();
      await this.waitForUiToSettle();
    }

    const titleInput = this.page.locator('input[placeholder*="Search Title"], input[placeholder*="Title"]').first();
    await titleInput.waitFor({ state: 'visible', timeout: 10_000 });
    await titleInput.clear();
    await titleInput.fill(title);

    const filterButton = searchArea.getByRole('button', { name: /filter|search/i }).first();
    const hasFilterButton = await filterButton.isVisible().catch(() => false);
    if (hasFilterButton) {
      await filterButton.click();
    } else {
      await titleInput.press('Enter').catch(() => {});
    }
    await this.waitForUiToSettle();
    await this.page.waitForTimeout(1000);

    let row = this.page.locator('.ant-table-tbody tr').filter({ hasText: title }).first();
    let isVisible = false;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      row = this.page.locator('.ant-table-tbody tr').filter({ hasText: title }).first();
      isVisible = await row
        .waitFor({ state: 'visible', timeout: 2_500 })
        .then(() => true)
        .catch(() => false);

      if (isVisible) {
        break;
      }

      if (attempt === 2) {
        await this.reload();
        await this.waitForTable();
      }

      const titleInputRetry = this.page
        .locator('input[placeholder*="Search Title"], input[placeholder*="Title"]')
        .first();
      await titleInputRetry.waitFor({ state: 'visible', timeout: 10_000 });
      await titleInputRetry.clear();
      await titleInputRetry.fill(title);

      if (hasFilterButton) {
        await filterButton.click();
      } else {
        await titleInputRetry.press('Enter').catch(() => {});
      }

      await this.waitForUiToSettle();
      await this.page.waitForTimeout(1000);
    }

    await expect(isVisible, `Task row containing "${title}" should be visible in table`).toBe(true);
    await row.click();
    await this.waitForUiToSettle();
  }

  /** Click the first data row in the table (no text filter). */
  async clickFirstTableRow(): Promise<void> {
    const firstRow = this.page.locator('.ant-table-tbody tr[class*="ant-table-row"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
    await firstRow.click();
    await this.waitForUiToSettle();
  }

  /**
   * Read the record ID from the `data-row-key` attribute of the table row
   * that contains the given text.
   *
   * Use this when a row click opens a modal instead of navigating by URL —
   * the framework sets `data-row-key` to `record.id` via Ant Design's
   * `rowKey` prop, making it a reliable ID source regardless of container mode.
   */
  async getRowId(text: string): Promise<string> {
    const row = this.page
      .locator('.ant-table-tbody tr[data-row-key]')
      .filter({ hasText: text })
      .first();
    await row.waitFor({ state: 'visible', timeout: 10_000 });
    const id = await row.getAttribute('data-row-key');
    if (!id) {
      throw new Error(`Could not read data-row-key from table row containing "${text}".`);
    }
    return id;
  }

  /** Check the checkbox of a table row that contains the given text. */
  async selectTableRowCheckbox(text: string): Promise<void> {
    let row = this.page.locator('.ant-table-tbody tr[class*="ant-table-row"]').filter({ hasText: text }).first();
    const isVisible = await row
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!isVisible) {
      await this.searchInTable(text);
      row = this.page.locator('.ant-table-tbody tr[class*="ant-table-row"]').filter({ hasText: text }).first();
    }
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.locator('td').first().locator('input[type="checkbox"], .ant-checkbox-input').first().check();
    await this.page.waitForTimeout(1000);
  }

  /** Check the checkbox of the first data row in the table. */
  async selectFirstRowCheckbox(): Promise<void> {
    const firstRow = this.page.locator('.ant-table-tbody tr[class*="ant-table-row"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
    await firstRow.locator('td').first().locator('input[type="checkbox"], .ant-checkbox-input').first().check();
    await this.page.waitForTimeout(1000);
  }

  /** Assert the table body contains the given text.  Searches first to handle pagination. */
  async expectTableContains(text: string): Promise<void> {
    await this.waitForTable();
    await this.searchInTable(text);
    let row = this.page.locator('.ant-table-tbody tr').filter({ hasText: text }).first();
    let isVisible = await row
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (!isVisible) {
      await this.reload();
      await this.searchInTable(text);
      row = this.page.locator('.ant-table-tbody tr').filter({ hasText: text }).first();
      isVisible = await row
        .waitFor({ state: 'visible', timeout: 3_000 })
        .then(() => true)
        .catch(() => false);
    }

    if (!isVisible) {
      const nextPage = this.page.locator('.ant-pagination-next').first();
      for (let i = 0; i < 20; i += 1) {
        const nextVisible = await nextPage.isVisible().catch(() => false);
        if (!nextVisible) {
          break;
        }

        const nextClass = (await nextPage.getAttribute('class')) ?? '';
        const ariaDisabled = await nextPage.getAttribute('aria-disabled');
        const isDisabled = nextClass.includes('ant-pagination-disabled') || ariaDisabled === 'true';
        if (isDisabled) {
          break;
        }

        await nextPage.click();
        await this.waitForUiToSettle();

        row = this.page.locator('.ant-table-tbody tr').filter({ hasText: text }).first();
        isVisible = await row
          .waitFor({ state: 'visible', timeout: 3_000 })
          .then(() => true)
          .catch(() => false);
        if (isVisible) {
          break;
        }
      }
    }

    await expect(isVisible, `Table row containing \"${text}\" should be visible after search + pagination`).toBe(true);
  }

  /** Assert the table body does NOT contain the given text.  Searches first to handle pagination. */
  async expectTableNotContains(text: string): Promise<void> {
    await this.searchInTable(text);
    const row = this.page.locator('.ant-table-tbody tr').filter({ hasText: text }).first();
    await expect(row).toBeHidden({ timeout: 15_000 });
  }

  // ─── Form (CreateView / EditView) ─────────────────────────────────────

  private getFieldIdCandidates(fieldId: string): string[] {
    if (fieldId.startsWith('drumr-field-')) {
      return [fieldId];
    }

    return Array.from(
      new Set([fieldId, `drumr-field-${fieldId.replace(/[^a-zA-Z0-9_]/g, '_')}`]),
    );
  }

  private getFieldLocator(container: Page | Locator, fieldId: string, tagName?: string): Locator {
    const prefix = tagName ? `${tagName}` : '';
    const selector = this.getFieldIdCandidates(fieldId)
      .map((candidate) => `${prefix}[id="${candidate}"]`)
      .join(', ');
    return container.locator(selector).first();
  }

  private getDatePickerLocator(container: Page | Locator, fieldId: string): Locator {
    const selector = this.getFieldIdCandidates(fieldId)
      .map((candidate) => `.ant-picker:has(input[id="${candidate}"])`)
      .join(', ');
    return container.locator(selector).first();
  }

  /**
   * Wait for a form field to appear (indicating the form has rendered).
   * When drawers/modals are open, automatically scopes to the topmost container
   * to avoid matching table-filter inputs that share the same field ID.
   */
  async waitForForm(fieldId: string = 'title'): Promise<void> {
    // Allow any in-progress drawer/modal animation to start
    await this.page.waitForTimeout(500);

    // If an overlay (drawer or modal) is visible, prefer resolving the form
    // there first. When switching from a ReadView drawer to EditView, the
    // topmost overlay locator is lazy and can follow the transition from the
    // old overlay to the new one. If no form field appears and an overlay is
    // still open, do not fall through to page-level table filters.
    const overlayContainer = this.getTopOverlayContainer();
    const hasOverlay = await overlayContainer.isVisible().catch(() => false);
    if (hasOverlay) {
      const overlayField = this.getFieldLocator(overlayContainer, fieldId);
      const overlayOutcome = await Promise.race([
        overlayField
          .waitFor({ state: 'visible', timeout: 15_000 })
          .then(() => 'field' as const)
          .catch(() => null),
        overlayContainer
          .waitFor({ state: 'hidden', timeout: 15_000 })
          .then(() => 'closed' as const)
          .catch(() => null),
      ]);

      if (overlayOutcome === 'field') {
        this._formContainer = overlayContainer;
        this._openSelectDropdown = null;
        return;
      }

      const overlayStillVisible = await overlayContainer.isVisible().catch(() => false);
      if (overlayStillVisible) {
        throw new Error(
          `waitForForm(\"${fieldId}\") did not find the field inside the active overlay. ` +
          'Page-level fallback was skipped to avoid matching table filter inputs.',
        );
      }
    }

    // No drawer or field not inside a drawer (e.g. CreateView as a page)
    await this.getFieldLocator(this.page, fieldId).waitFor({ state: 'visible', timeout: 10_000 });
    this._formContainer = null;
    this._openSelectDropdown = null;
  }

  /** Fill a text/number input field by its id attribute. */
  async fillField(fieldId: string, value: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    await this.getFieldLocator(container, fieldId).fill(value);
  }

  /** Clear a field and type a new value (for edit flows).
   *  Uses keyboard-level selection + type so Ant Design ProForm
   *  picks up the change in its internal form store.
   */
  async clearAndFillField(fieldId: string, value: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    const input = this.getFieldLocator(container, fieldId);
    await input.click();
    // Select-all then type triggers React onChange properly
    await this.page.keyboard.press('ControlOrMeta+a');
    await input.pressSequentially(value, { delay: 30 });
  }

  /** Read current value from a text/number input field by id. */
  async getFieldValue(fieldId: string): Promise<string> {
    const container = this._formContainer ?? this.page;
    const input = this.getFieldLocator(container, fieldId);
    await input.waitFor({ state: 'visible', timeout: 10_000 });
    return input.inputValue();
  }

  /** Assert a form field is not visible in the current page/drawer context. */
  async expectFieldNotVisible(fieldId: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    const visibleFields = container.locator(
      this.getFieldIdCandidates(fieldId)
        .map((candidate) => `[id="${candidate}"]:visible`)
        .join(', ')
    );
    await expect(visibleFields).toHaveCount(0, { timeout: 10_000 });
  }

  /** Fill a <textarea> field matched by its placeholder text. */
  async fillTextarea(placeholderPattern: RegExp, value: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    await container.getByPlaceholder(placeholderPattern).fill(value);
  }

  private async blurActiveElement(): Promise<void> {
    await this.page
      .locator('body')
      .click({ position: { x: 8, y: 8 } })
      .catch(() => {});
    await this.page.waitForTimeout(200);
  }

  private async selectFirstOptionInContainer(
    container: import('@playwright/test').Locator | Page,
    fieldLabel: string
  ): Promise<void> {
    const labelledCombobox = container.getByRole('combobox', { name: new RegExp(fieldLabel, 'i') }).first();
    const comboboxVisible = await labelledCombobox.isVisible().catch(() => false);

    if (comboboxVisible) {
      await labelledCombobox.click();
    } else {
      const labelledField = container
        .locator('.ant-form-item')
        .filter({ hasText: new RegExp(fieldLabel, 'i') })
        .locator('.ant-select, .ant-select-selector')
        .first();

      await labelledField.waitFor({ state: 'visible', timeout: 10_000 });
      await labelledField.click();
    }

    const dropdown = this.page.locator('.ant-select-dropdown:visible').last();
    await dropdown.waitFor({ state: 'visible', timeout: 10_000 });

    const option = dropdown.locator('.ant-select-item-option').first();
    await option.waitFor({ state: 'visible', timeout: 10_000 });
    await option.click();

    await this.page.waitForTimeout(300);
    await this.blurActiveElement();
    await this.waitForUiToSettle(300);
  }

  /**
   * Clear an Ant Select field (identified by its label text) by hovering to
   * reveal the clear icon and clicking it.  Works for ChoiceField & ReferenceField
   * when `allowClear` is enabled (the default in Drumr).
   */
  async clearReferenceField(fieldLabel: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    const formItem = container
      .locator('.ant-form-item')
      .filter({ hasText: new RegExp(fieldLabel, 'i') })
      .first();
    const select = formItem.locator('.ant-select').first();
    await select.hover();
    const clearIcon = select.locator('.ant-select-clear');
    await clearIcon.waitFor({ state: 'visible', timeout: 5_000 });
    await clearIcon.click();
    await this.waitForUiToSettle(200);
  }

  /** Clear a reference field only if it currently has a value selected. No-op otherwise. */
  async clearReferenceFieldIfSet(fieldLabel: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    const formItem = container
      .locator('.ant-form-item')
      .filter({ hasText: new RegExp(fieldLabel, 'i') })
      .first();
    const select = formItem.locator('.ant-select').first();
    await select.hover();
    const clearIcon = select.locator('.ant-select-clear');
    const isVisible = await clearIcon.isVisible().catch(() => false);
    if (isVisible) {
      await clearIcon.click();
      await this.waitForUiToSettle(200);
    }
  }

  /**
   * Click an Ant Select field (identified by its label text) and pick the
   * first option from the dropdown.  Works for ChoiceField & ReferenceField.
   */
  async selectFirstOption(fieldLabel: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    await this.selectFirstOptionInContainer(container, fieldLabel);
  }

  /**
   * Click an Ant Select field (identified by label text) and pick a specific
   * option by visible text. Useful when option order is unstable.
   */
  async selectOption(fieldLabel: string, optionText: string | RegExp): Promise<void> {
    const container = this._formContainer ?? this.page;

    const labelledCombobox = container.getByRole('combobox', { name: new RegExp(fieldLabel, 'i') }).first();
    const comboboxVisible = await labelledCombobox.isVisible().catch(() => false);

    if (comboboxVisible) {
      await labelledCombobox.click();
    } else {
      const labelledField = container
        .locator('.ant-form-item')
        .filter({ hasText: new RegExp(fieldLabel, 'i') })
        .locator('.ant-select, .ant-select-selector')
        .first();

      await labelledField.waitFor({ state: 'visible', timeout: 10_000 });
      await labelledField.click();
    }

    const dropdown = this.page.locator('.ant-select-dropdown:visible').last();
    await dropdown.waitFor({ state: 'visible', timeout: 10_000 });

    // If the Select is searchable, filter options first to avoid relying on
    // virtualized list visibility/order.
    const searchInput = dropdown.locator('input[type="search"], input.ant-select-selection-search-input').first();
    const hasSearchInput = await searchInput.isVisible().catch(() => false);
    if (hasSearchInput && typeof optionText === 'string') {
      await searchInput.fill(optionText);
      await this.page.waitForTimeout(300);
    }

    const option =
      typeof optionText === 'string'
        ? dropdown.locator('.ant-select-item-option').filter({ hasText: optionText }).first()
        : dropdown.locator('.ant-select-item-option').filter({ hasText: optionText }).first();

    await option.waitFor({ state: 'visible', timeout: 10_000 });
    await option.click();

    await this.page.waitForTimeout(300);
    await this.blurActiveElement();
    await this.waitForUiToSettle(300);
  }

  /**
   * Inside a composition panel (e.g. Notes), select the first option for
   * a ReferenceField identified by its placeholder text.
   * Useful when the framework auto-generates nested records with required fields.
   */
  async selectFirstOptionByPlaceholder(placeholder: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    const select = container.locator('.ant-select').filter({ hasText: placeholder }).first();
    await select.waitFor({ state: 'visible', timeout: 10_000 });
    await select.locator('.ant-select-selector').first().click();

    const dropdown = this.page.locator('.ant-select-dropdown:visible').last();
    await dropdown.waitFor({ state: 'visible', timeout: 10_000 });
    await dropdown.locator('.ant-select-item-option').first().click();

    await this.page.waitForTimeout(300);
    await this.blurActiveElement();
    await this.waitForUiToSettle(300);
  }

  /**
   * Wait for an auto-generated composition item to appear (e.g. a Note
   * created by onRefresh), then fill a required reference field inside it
   * by selecting the first dropdown option.
   */
  async fillCompositionReferenceField(sectionTitle: string, fieldLabel: string): Promise<void> {
    // Wait for the section heading to appear (the framework renders a Card with a Title)
    const heading = this.page.getByRole('heading', { name: new RegExp(sectionTitle, 'i') }).first();
    await heading.waitFor({
      state: 'visible',
      timeout: 10_000,
    });
    // Wait for the refresh to finish rendering the nested fields
    await this.page.waitForTimeout(1500);

    const sectionContainer = heading.locator('xpath=ancestor::*[contains(@class, "ant-card")][1]');
    await this.selectFirstOptionInContainer(sectionContainer, fieldLabel);
  }

  /**
   * Best-effort variant of fillCompositionReferenceField.
   * Returns false when the composition section is not rendered.
   */
  async fillCompositionReferenceFieldIfPresent(sectionTitle: string, fieldLabel: string): Promise<boolean> {
    const heading = this.page.getByRole('heading', { name: new RegExp(sectionTitle, 'i') }).first();
    const isVisible = await heading.isVisible().catch(() => false);

    if (!isVisible) {
      return false;
    }

    await this.page.waitForTimeout(1500);
    const sectionContainer = heading.locator('xpath=ancestor::*[contains(@class, "ant-card")][1]');

    try {
      await this.selectFirstOptionInContainer(sectionContainer, fieldLabel);
      return true;
    } catch {
      return false;
    }
  }

  /** Click the Add button inside a specific composition section/card. */
  async addCompositionItem(sectionTitle: string): Promise<void> {
    const heading = this.page.getByRole('heading', { name: new RegExp(sectionTitle, 'i') });
    await heading.waitFor({ state: 'visible', timeout: 10_000 });

    const sectionContainer = heading.locator('xpath=ancestor::*[contains(@class, "ant-card")][1]');
    const addButton = sectionContainer.getByRole('button', { name: /add/i }).first();
    await addButton.scrollIntoViewIfNeeded();
    await addButton.click();
    await this.waitForUiToSettle(800);
  }

  /** Fill a text input by placeholder inside a specific composition section/card. */
  async fillCompositionFieldByPlaceholder(
    sectionTitle: string,
    placeholderPattern: string | RegExp,
    value: string
  ): Promise<void> {
    const heading = this.page.getByRole('heading', { name: new RegExp(sectionTitle, 'i') });
    await heading.waitFor({ state: 'visible', timeout: 10_000 });

    const sectionContainer = heading.locator('xpath=ancestor::*[contains(@class, "ant-card")][1]');
    const input = sectionContainer.getByPlaceholder(placeholderPattern).last();
    await input.waitFor({ state: 'visible', timeout: 10_000 });
    await input.fill(value);
  }

  /** Click the "Create" submit button (icon prefix: "plus"). */
  async submitCreate(): Promise<void> {
    const currentUrl = this.page.url();

    // Determine the narrowest container that holds the submit button:
    //
    // • Modal open  → button is in .ant-modal-footer (table behind stays in DOM with its own Create)
    // • Drawer open → button is in .ant-drawer-footer / .ant-drawer-content
    // • Full page   → @CreateView renders Create in both page-header AND page-footer (pageFooterFn),
    //                 so there are always 2 buttons; .first() is safe because both submit the form.
    //
    // We never touch the table-toolbar Create button this way.
    const modalFooter = this.page.locator('.ant-modal-wrap:visible .ant-modal-footer');
    const drawerContent = this.page.locator('.ant-drawer-open .ant-drawer-body, .ant-drawer-open .ant-drawer-footer');

    if (await modalFooter.isVisible().catch(() => false)) {
      await modalFooter.getByRole('button', { name: /plus create/i }).click();
    } else if (await drawerContent.first().isVisible().catch(() => false)) {
      await drawerContent.first().getByRole('button', { name: /plus create/i }).click();
    } else {
      // Full-page CreateView: two identical buttons (header + footer), both submit the form.
      await this.page.getByRole('button', { name: /plus create/i }).first().click();
    }

    // Wait for the framework to navigate away from the create form
    await this.page.waitForURL((url: URL) => url.toString() !== currentUrl, { timeout: 30_000 }).catch(() => {});
    await this.waitForUiToSettle();
    await this.page.waitForTimeout(2000);
  }

  /** Click the "Save" button in an edit form. */
  async submitSave(): Promise<void> {
    const modalFooter = this.page.locator('.ant-modal-wrap:visible .ant-modal-footer');
    // Use :visible (consistent with getTopOverlayContainer) instead of .ant-drawer-open
    // which is unreliable in Ant Design 6. Use .last() to target the topmost (innermost)
    // open drawer when drawers are nested — the outer drawer's mask intercepts clicks otherwise.
    const drawerContent = this.page.locator('.ant-drawer:visible .ant-drawer-body, .ant-drawer:visible .ant-drawer-footer');
    const drawerSaveButton = drawerContent.last().getByRole('button', { name: /save/i });
    if (await modalFooter.isVisible().catch(() => false)) {
      await modalFooter.getByRole('button', { name: /save/i }).click();
    } else if (await drawerContent.last().isVisible().catch(() => false) && await drawerSaveButton.isVisible().catch(() => false)) {
      await drawerSaveButton.click();
    } else {
      // Full-page EditView: two identical Save buttons (header + footer), both submit the form.
      // Wait for any lingering drawer masks to clear first (e.g. a parent task drawer that is
      // in the process of closing when a nested user-edit page opens), then click normally.
      await this.page.locator('.ant-drawer-mask').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
      await this.page.getByRole('button', { name: /save/i }).first().click();
    }
    await this.waitForUiToSettle();
    await this.page.waitForTimeout(2000);
    this._formContainer = null;
  }

  // ─── ReadView ─────────────────────────────────────────────────────────

  /** Assert some text is visible on the current page. */
  async expectTextVisible(text: string): Promise<void> {
    await expect(this.page.getByText(text).first()).toBeVisible({ timeout: 10_000 });
  }

  /** Open the "Manage" dropdown in a ReadView toolbar. Waits for the button to be visible (toolbar actions load asynchronously in drawers). */
  async clickManageDropdown(): Promise<void> {
    const btn = this.page.getByRole('button', { name: /manage/i });
    await btn.waitFor({ state: 'visible', timeout: 15_000 });
    await btn.click();
  }

  /** Click an item inside the Manage dropdown (e.g. "Edit", "Delete"). */
  async clickManageOption(namePattern: RegExp): Promise<void> {
    const popupMenu = this.page
      .locator('.ant-dropdown:visible')
      .filter({ has: this.page.getByRole('menuitem', { name: namePattern }) })
      .last();

    const popupVisible = await popupMenu
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    const visibleMenu = popupVisible
      ? popupMenu
      : this.page
          .locator('.ant-menu:visible')
          .filter({ has: this.page.getByRole('menuitem', { name: namePattern }) })
          .last();

    await visibleMenu.waitFor({ state: 'visible', timeout: 10_000 });

    const item = visibleMenu.getByRole('menuitem', { name: namePattern }).last();
    await item.waitFor({ state: 'visible', timeout: 10_000 });
    // Antd menus animate in: clicking the moment the item becomes visible
    // sometimes lands on a still-animating element and the menu closes
    // without firing its onClick. A short stabilisation pause prevents the
    // "Delete clicked but confirm modal never appears" flake seen in CI.
    await this.page.waitForTimeout(150);
    await item.scrollIntoViewIfNeeded().catch(() => {});
    await item.click();

    const menuClosed = await visibleMenu
      .waitFor({ state: 'hidden', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);

    if (!menuClosed) {
      await item.click({ force: true });
      await visibleMenu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    }

    await this.waitForUiToSettle();
  }

  /** Open the "Actions" dropdown in a ReadView toolbar. */
  async clickActionsDropdown(): Promise<void> {
    await this.page.getByRole('button', { name: /actions/i }).click();
  }

  /** Click an item inside the Actions dropdown. */
  async clickActionOption(namePattern: RegExp): Promise<void> {
    await this.page.getByRole('menuitem', { name: namePattern }).click();
  }

  /** Click "Edit" or "Update" button directly (for views that expose it as a button). */
  async clickEditButton(entityName?: string): Promise<void> {
    const pattern = entityName
      ? new RegExp(`edit.*(edit|update).*${entityName}|edit.*edit`, 'i')
      : /edit.*edit|edit.*update/i;
    await this.page.getByRole('button', { name: pattern }).click();
    await this.waitForUiToSettle();
  }

  /** Click "Delete" button directly (for views that expose it as a button). */
  async clickDeleteButton(entityName?: string): Promise<void> {
    const pattern = entityName
      ? new RegExp(`delete.*(delete|remove).*${entityName}|delete.*delete`, 'i')
      : /delete.*delete|delete.*remove/i;
    await this.page.getByRole('button', { name: pattern }).click();
  }

  /** Click the "More" button inside the page header or table list toolbar. */
  async clickToolbarMoreButton(): Promise<void> {
    const containers = [
      '.ant-page-header-heading-extra',
      '[class*="page-header"]',
      '.ant-pro-table-list-toolbar',
      '.drumr-data-table',
    ];
    const combinedSelector = containers.join(', ');
    const moreBtn = this.page
      .locator(combinedSelector)
      .getByRole('button', { name: /more/i })
      .first();

    await moreBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    if (await moreBtn.isVisible().catch(() => false)) {
      await moreBtn.click();
    } else {
      await this.page.getByRole('button', { name: /more/i }).first().click();
    }
    await this.page.waitForTimeout(500);
  }

  // ─── Row actions dropdown (table row toolbar) ─────────────────────────

  /**
   * Hover a table row containing `rowText`, then click its "…" (MoreOutlined)
   * row-actions button to open the dropdown menu.
   *
   * The row toolbar renders as a single Ant Design dropdown button with only
   * the MoreOutlined icon (accessible name "more").  Hover is required because
   * row toolbar buttons are only visible on row hover.
   */
  async openRowActionsMenu(rowText: string): Promise<void> {
    const row = this.page.locator('.ant-table-tbody tr').filter({ hasText: rowText }).first();
    await row.waitFor({ state: 'visible', timeout: 10_000 });
    await row.hover();
    const moreBtn = row.getByRole('button', { name: /more/i });
    await moreBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await moreBtn.click();
    await this.page.locator('.ant-dropdown:visible').waitFor({ state: 'visible', timeout: 10_000 });
    await this.waitForUiToSettle(300);
  }

  /** Click a visible row-toolbar button inside the row that contains `rowText`. */
  async clickRowToolbarButton(rowText: string, namePattern: string | RegExp): Promise<void> {
    const row = this.page.locator('.ant-table-tbody tr').filter({ hasText: rowText }).first();
    await row.waitFor({ state: 'visible', timeout: 10_000 });
    await row.hover();

    const button = row.getByRole('button', { name: namePattern }).first();
    await button.waitFor({ state: 'visible', timeout: 10_000 });
    await button.click();
    await this.waitForUiToSettle();
  }

  /**
   * Assert that the currently open row actions dropdown contains the given label.
   * Call after `openRowActionsMenu()`.
   */
  async expectRowActionVisible(label: string | RegExp): Promise<void> {
    const menu = this.page.locator('.ant-dropdown:visible .ant-dropdown-menu');
    await expect(menu).toContainText(label, { timeout: 5_000 });
  }

  /**
   * Assert that the currently open row actions dropdown does NOT contain the given label.
   * Call after `openRowActionsMenu()`.
   */
  async expectRowActionNotVisible(label: string | RegExp): Promise<void> {
    const menu = this.page.locator('.ant-dropdown:visible .ant-dropdown-menu');
    await expect(menu).not.toContainText(label, { timeout: 3_000 });
  }

  /** Click a menu item by name pattern (generic — works in any dropdown/menu). */
  async clickMenuItem(namePattern: RegExp): Promise<void> {
    await this.page.getByRole('menuitem', { name: namePattern }).click();
  }

  /**
   * Confirm a delete dialog.
   * The framework uses Modal.confirm with submitterLabel 'Delete' for
   * single-record deletes and 'Execute' for generic action confirmations.
   */
  async confirmDelete(): Promise<void> {
    // Wait for the Ant Design confirmation modal to appear
    const modal = this.page.locator('.ant-modal-confirm');
    await modal.waitFor({ state: 'visible', timeout: 10_000 });
    // Click the primary/danger confirm button (text: "Delete" or "Execute")
    const okBtn = modal.getByRole('button', { name: /delete|execute/i });
    await okBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await okBtn.click();
    // Wait for the confirm modal to actually dismiss instead of sleeping 2s
    // unconditionally. The modal stays mounted while the backend processes
    // the delete; capping at 10s lets a slow runner finish but doesn't
    // make every fast call wait.
    await modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await this.waitForUiToSettle();
  }

  /** Click the delete button and wait for it to become enabled before clicking. */
  async clickDeleteButtonAndWait(buttonName: string = 'Delete'): Promise<void> {
    const btn = this.page.getByRole('button', { name: new RegExp(buttonName, 'i') });
    // Wait for the button to be visible and enabled (not in loading state)
    await btn.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(btn).toBeEnabled({ timeout: 30_000 });
    await btn.click();
  }

  // ─── Action dialogs ───────────────────────────────────────────────────

  private async resolveDialog(dialogName: RegExp): Promise<import('@playwright/test').Locator> {
    const namedDialog = this.page.getByRole('dialog', { name: dialogName }).last();
    const namedVisible = await namedDialog.isVisible().catch(() => false);
    if (namedVisible) {
      return namedDialog;
    }

    const visibleDialogs = this.page.locator('[role="dialog"]:visible');
    const fallbackDialog = visibleDialogs.last();
    await fallbackDialog.waitFor({ state: 'visible', timeout: 10_000 });

    return fallbackDialog;
  }

  /** Wait for an action dialog (modal) with the given title pattern to appear. */
  async waitForDialog(namePattern: RegExp): Promise<void> {
    await this.resolveDialog(namePattern);
  }

  /**
   * Inside the currently visible dialog, click a select field and pick
   * the first option.
   */
  async selectFirstOptionInDialog(dialogName: RegExp, fieldLabel: string): Promise<void> {
    const dialog = await this.resolveDialog(dialogName);

    const labelledField = dialog
      .locator('.ant-form-item')
      .filter({ hasText: new RegExp(fieldLabel, 'i') })
      .locator('.ant-select, .ant-select-selector')
      .first();

    const labelledFieldVisible = await labelledField
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    const field = labelledFieldVisible
      ? labelledField
      : dialog.locator('.ant-form-item .ant-select, .ant-form-item .ant-select-selector').first();

    await field.waitFor({ state: 'visible', timeout: 10_000 });
    await field.click();

    const dropdown = this.page.locator('.ant-select-dropdown:visible').last();
    await dropdown.waitFor({ state: 'visible', timeout: 10_000 });
    await dropdown.locator('.ant-select-item-option').first().click();
    await this.waitForUiToSettle(300);
  }

  /** Click the "Execute" button inside a named dialog. */
  async executeDialog(dialogName: RegExp): Promise<void> {
    const dialog = await this.resolveDialog(dialogName);

    const executeBtn = dialog.getByRole('button', { name: /execute/i }).first();
    const executeVisible = await executeBtn.isVisible().catch(() => false);
    if (executeVisible) {
      await expect(executeBtn).toBeEnabled({ timeout: 10_000 });
      await executeBtn.click();
    } else {
      // Generic fallback for dialogs where the primary submit button has
      // different accessible text but keeps Ant Design's primary footer style.
      const primaryBtn = dialog.locator('.ant-modal-footer .ant-btn-primary:visible').first();
      await primaryBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await expect(primaryBtn).toBeEnabled({ timeout: 10_000 });
      await primaryBtn.click();
    }

    await this.waitForUiToSettle();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
  }

  // ─── Table row selection ──────────────────────────────────────────────

  /**
   * Click the checkbox of a table row at the given 0-based index.
   * Uses the .ant-table-selection-column cell inside tbody rows.
   */
  async selectTableRowByIndex(index: number): Promise<void> {
    const checkbox = this.page
      .locator('.ant-table-tbody tr:not(.ant-table-measure-row)')
      .nth(index)
      .locator('td.ant-table-selection-column input[type="checkbox"], td:first-child input[type="checkbox"]')
      .first();
    await checkbox.waitFor({ state: 'visible', timeout: 10_000 });
    await checkbox.click({ force: true });
    await this.page.waitForTimeout(300);
  }

  /**
   * Click the custom header checkbox in the selection column.
   * This cycles through the 3-state logic (empty → all-visible → all-global → clear).
   */
  async clickHeaderCheckbox(): Promise<void> {
    const headerCell = this.page.locator('.ant-table-thead .ant-table-selection-column').first();
    await headerCell.waitFor({ state: 'visible', timeout: 10_000 });

    const visibleCheckbox = headerCell.locator('.ant-checkbox-wrapper, .ant-checkbox').first();
    const hasVisibleCheckbox = await visibleCheckbox.isVisible().catch(() => false);

    if (hasVisibleCheckbox) {
      await visibleCheckbox.click();
    } else {
      const fallbackTarget = headerCell.getByRole('checkbox').first();
      await fallbackTarget.waitFor({ state: 'visible', timeout: 10_000 });
      await fallbackTarget.click();
    }

    await this.waitForUiToSettle(300);
  }

  /**
   * Click the ProTable reload/refresh icon button in the top-right options bar.
   */
  async clickTableRefresh(): Promise<void> {
    const reloadBtn = this.page
      .locator('.ant-pro-table-toolbar .anticon-reload, .ant-pro-toolbar .anticon-reload')
      .first();
    await reloadBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await reloadBtn.click();
    await this.waitForTable();
  }

  /**
   * Click the "Clear" link inside the ProTable selection alert bar.
   */
  async clearTableSelection(): Promise<void> {
    const clearLink = this.page.locator('.ant-pro-table-alert-info-option a');
    await clearLink.waitFor({ state: 'visible', timeout: 10_000 });
    await clearLink.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Assert the ProTable selection alert shows the expected text
   * (e.g. "3 items selected" or "All 2004 rows selected").
   */
  async expectSelectionAlertText(textPattern: string | RegExp): Promise<void> {
    const alert = this.page.locator('.ant-pro-table-alert');
    await alert.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(alert).toContainText(textPattern, { timeout: 5_000 });
  }

  /**
   * Assert no ProTable selection alert banner is currently visible.
   */
  async expectNoSelectionAlert(): Promise<void> {
    const alert = this.page.locator('.ant-pro-table-alert');
    const isVisible = await alert.isVisible().catch(() => false);
    if (isVisible) {
      // Alert may take a moment to clear after a bulk background action
      await expect(alert).not.toBeVisible({ timeout: 30_000 });
    }
  }

  /**
   * Assert that the header selection checkbox is in the orange (all-global) state.
   * In antd 6 the color is applied via CSS variable --ant-color-primary set by
   * the ConfigProvider wrapper. We detect the orange state by checking for the
   * title rendered only in the all-rows-selected state and then verify the CSS
   * variable resolves to the orange value.
   */
  async expectHeaderCheckboxOrange(): Promise<void> {
    const headerCell = this.page.locator('.ant-table-thead .ant-table-selection-column').first();
    await headerCell.waitFor({ state: 'visible', timeout: 10_000 });

    // The all-rows-selected state renders a title only on the custom orange checkbox.
    const titledCheckbox = headerCell.locator('[title*="rows selected"]').first();
    await titledCheckbox.waitFor({ state: 'visible', timeout: 10_000 });

    // Secondary: verify the ConfigProvider CSS variable override is orange.
    // antd 6 sets --ant-color-primary on an ancestor via ConfigProvider scope.
    const isOrange = await titledCheckbox.evaluate(el => {
      let node: Element | null = el;
      while (node) {
        const val = window.getComputedStyle(node).getPropertyValue('--ant-color-primary').trim();
        if (val) {
          return val === '#fa8c16' || val === 'rgb(250, 140, 22)';
        }
        node = node.parentElement;
      }
      return false;
    });
    expect(isOrange).toBe(true);
  }

  // ─── Bulk action toolbar helpers ──────────────────────────────────────

  /**
   * Click a toolbar button (anywhere on the page) whose accessible name
   * matches the given pattern. Works for both the page-header toolbar and
   * the ProTable toolbar (e.g. "Bulk Change Priority (2)", "Delete (3)").
   */
  async clickBulkActionButton(namePattern: RegExp): Promise<void> {
    const btn = this.page.getByRole('button', { name: namePattern });
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    await btn.click();
    await this.waitForUiToSettle();
  }

  /**
   * Assert that a toolbar button whose accessible name matches the given
   * pattern is visible on the page.
   */
  async expectBulkActionButtonVisible(namePattern: RegExp): Promise<void> {
    await expect(this.page.getByRole('button', { name: namePattern })).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Assert that no toolbar button whose accessible name matches the given
   * pattern is visible on the page.
   */
  async expectBulkActionButtonNotVisible(namePattern: RegExp): Promise<void> {
    await expect(this.page.getByRole('button', { name: namePattern })).toBeHidden({ timeout: 5_000 });
  }

  /**
   * Cancel the currently open dialog or confirmation modal.
   * Prefers scoping to `.ant-modal-confirm` if one is present.
   */
  async cancelDialog(): Promise<void> {
    const confirmModal = this.page.locator('.ant-modal-confirm');
    const isConfirmModal = await confirmModal.isVisible().catch(() => false);

    if (isConfirmModal) {
      const cancelBtn = confirmModal.getByRole('button', { name: /cancel/i });
      await cancelBtn.waitFor({ state: 'visible', timeout: 5_000 });
      await cancelBtn.click();
    } else {
      // Action view modals render a Cancel button whose accessible name may include
      // an icon aria-label (e.g. "close Cancel"), so we use a loose contains-match.
      const cancelBtn = this.page.getByRole('button', { name: /cancel/i }).last();
      await cancelBtn.waitFor({ state: 'visible', timeout: 5_000 });
      await cancelBtn.click();
    }
    await this.waitForUiToSettle();
  }

  // ─── Feedback / assertions ────────────────────────────────────────────

  /** Assert a success/info message matching the pattern is visible. */
  async expectFeedback(textPattern: string | RegExp): Promise<void> {
    const feedback = this.page
      .locator('.ant-message-notice:visible, .ant-notification-notice:visible')
      .filter({ hasText: textPattern })
      .first();

    await expect(feedback).toBeVisible({ timeout: 10_000 });
  }

  /** Assert a success toast/notification is visible without relying on specific text. */
  async expectSuccessFeedback(): Promise<void> {
    const successToast = this.page
      .locator('.ant-message-notice')
      .filter({ has: this.page.locator('.anticon-check-circle, .anticon-check-circle-filled') })
      .first();

    const notificationSuccess = this.page.locator('.ant-notification-notice-success').first();

    const toastVisible = await successToast.isVisible().catch(() => false);
    if (toastVisible) {
      await expect(successToast).toBeVisible({ timeout: 10_000 });
      return;
    }

    await expect(notificationSuccess).toBeVisible({ timeout: 10_000 });
  }

  /** Assert current URL matches the given pattern. */
  async expectUrlMatches(pattern: RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern, { timeout: 10_000 });
  }

  /** Assert current URL does not match the given pattern. */
  async expectUrlNotMatches(pattern: RegExp): Promise<void> {
    await expect(this.page).not.toHaveURL(pattern, { timeout: 10_000 });
  }

  /** Assert a form-item label area contains a non-empty value. */
  async expectFieldHasValue(fieldLabel: string): Promise<void> {
    const formItem = this.page
      .locator('.ant-form-item:not(.ant-form-item-hidden)')
      .filter({ hasText: new RegExp(fieldLabel, 'i') });
    await expect(formItem.first()).toBeVisible({ timeout: 10_000 });
    const value = await formItem.first().locator('.ant-form-item-control-input-content').first().textContent();
    expect((value ?? '').trim().length).toBeGreaterThan(0);
  }

  // ─── Date / DateTime field helpers ────────────────────────────────────

  /**
   * Fill a date or dateTime picker field by clicking its input, typing the value
   * character-by-character, and pressing Enter to confirm.
   * Ant Design DatePicker inputs don't support Playwright's `.fill()` because
   * they manage focus/selection internally.
   *
   * @param fieldId - The HTML id of the input rendered by Form.Item (e.g. 'dueDate')
   * @param value   - Date string in the display format (e.g. '15-06-2099')
   */
  async fillDateField(fieldId: string, value: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    const input = container.locator(`.drumr-form-item-path-${fieldId} input`).first();
    // The field may be below the fold inside a scrollable drawer/modal,
    // so scroll it into view before waiting for visibility.
    await input.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await input.waitFor({ state: 'visible', timeout: 10_000 });
    await input.scrollIntoViewIfNeeded();
    await input.click();
    // Select all existing text so typing replaces it
    await this.page.keyboard.press('ControlOrMeta+a');
    await input.pressSequentially(value, { delay: 50 });
    await this.page.keyboard.press('Enter');
    await this.waitForUiToSettle(300);
  }

  /**
   * Clear a date or dateTime picker field by clicking the Ant Design clear (✕) button.
   * Scoped to the current form container (drawer/modal) if one is active.
   *
   * @param fieldId - The HTML id of the hidden input rendered by Form.Item (e.g. 'dueDate')
   */
  async clearDateField(fieldId: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    // The ant-picker wrapping our field has an input whose id matches the fieldId
    const picker = container.locator(`.drumr-form-item-path-${fieldId} .ant-picker`).first();
    await picker.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await picker.waitFor({ state: 'visible', timeout: 10_000 });
    // Hover to reveal the clear icon
    await picker.hover();
    const clearBtn = picker.locator('.ant-picker-clear').first();
    await clearBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await clearBtn.click();
    await this.waitForUiToSettle(300);
  }

  /**
   * Assert a date/dateTime picker field is empty (shows placeholder, no value).
   *
   * @param fieldId - The HTML id of the hidden input (e.g. 'dueDate')
   */
  async expectDateFieldEmpty(fieldId: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    const input = container.locator(`.drumr-form-item-path-${fieldId} input`).first();
    await input.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await input.waitFor({ state: 'visible', timeout: 10_000 });
    const value = await input.inputValue();
    expect(value.trim(), `Expected date field #${fieldId} to be empty`).toBe('');
  }

  /**
   * Assert a date/dateTime picker field contains a non-empty value.
   *
   * @param fieldId - The HTML id of the hidden input (e.g. 'dueDate')
   */
  async expectDateFieldNotEmpty(fieldId: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    const input = container.locator(`.drumr-form-item-path-${fieldId} input`).first();
    await input.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await input.waitFor({ state: 'visible', timeout: 10_000 });
    const value = await input.inputValue();
    expect(value.trim().length, `Expected date field #${fieldId} to have a value`).toBeGreaterThan(0);
  }

  // ─── Table filter helpers ─────────────────────────────────────────────

  /**
   * Type text into a table filter input **without** clicking the Filter button.
   * This simulates a user typing in the filter bar and then navigating away
   * (e.g. opening a record) before applying the filter.
   *
   * @param placeholder - Partial placeholder text or field name to find the input
   * @param value       - The text to type
   */
  async typeInFilterWithoutApplying(placeholder: string, value: string): Promise<void> {
    const searchArea = this.page.locator('.ant-pro-table-search').first();
    await searchArea.waitFor({ state: 'visible', timeout: 10_000 });
    const input = searchArea.locator(`input[placeholder*="${placeholder}"], input[id="${placeholder}"]`).first();
    await input.waitFor({ state: 'visible', timeout: 10_000 });
    await input.clear();
    await input.fill(value);
    // Do NOT click Filter — leave the text in the input
  }

  // ─── Reference components (ReferenceDropdown / ReferenceBoxSelector) ──

  /**
   * Click the Ant Select widget for a reference field, opening its option
   * dropdown.  The dropdown remains open after this call so the caller
   * can assert options with expectDropdownContainsOption().
   */
  async openReferenceDropdown(fieldLabel: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    const combobox = container.getByRole('combobox', { name: new RegExp(fieldLabel, 'i') }).first();
    const comboboxVisible = await combobox.isVisible().catch(() => false);

    if (comboboxVisible) {
      await combobox.click();
      await this.bindOpenSelectDropdown(combobox);
    } else {
      // :has(.ant-select) skips read-only form items (ReferenceLabel, etc.)
      // that share the same label but contain no Select widget.
      const formItem = container
        .locator('.ant-form-item:not(.ant-form-item-hidden):has(.ant-select)')
        .filter({ hasText: new RegExp(fieldLabel, 'i') })
        .first();
      await formItem.waitFor({ state: 'attached', timeout: 10_000 });
      await formItem.scrollIntoViewIfNeeded().catch(() => {});
      // antd 6 renamed .ant-select-selector → .ant-select-content.
      // Dispatch via JS to bypass Playwright's coordinate-based actionability
      // check (zero bounding box when inside a scrollable drawer).
      const found = await formItem.evaluate((el) => {
        const trigger =
          el.querySelector('.ant-select-content') ??
          el.querySelector('.ant-select-selector');
        if (!trigger) {
return false;
}
        trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        trigger.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
      });
      if (!found) {
        throw new Error(
          `openReferenceDropdown: click target (.ant-select-content / .ant-select-selector) not found for "${fieldLabel}"`,
        );
      }
      await this.bindOpenSelectDropdown(formItem);
    }

    // Allow the refetch triggered by focus/open to resolve
    await this.page.waitForTimeout(800);
  }

  /**
   * Assert that the currently open Ant Select dropdown contains an option
   * whose text matches the given string or regex.
   */
  async expectDropdownContainsOption(optionText: string | RegExp): Promise<void> {
    const dropdown = this._openSelectDropdown ?? this.page.locator('.ant-select-dropdown:visible').last();
    const option = dropdown.locator('.ant-select-item-option').filter({ hasText: optionText }).first();
    await expect(option).toBeVisible({ timeout: 10_000 });
  }

  /** Close the currently open Ant Select dropdown without selecting anything. */
  async closeOpenDropdown(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
    this._openSelectDropdown = null;
  }

  // ─── Table filter bar (ProTable query filter form) ────────────────────

  /**
   * Open a reference filter dropdown in the DataTable query filter bar.
   *
   * Finds the form item labelled `fieldLabel` inside the ProTable query
   * filter form and clicks its Select widget to open the option list.
   * Waits for options to load before returning so callers can immediately
   * assert with `expectDropdownContainsOption()`.
   *
   * @param fieldLabel - The column title as shown in the filter bar (e.g. 'Project', 'Assignee')
   */
  async openTableReferenceFilter(fieldLabel: string): Promise<void> {
    const filterForm = this.page.locator('.ant-pro-query-filter');
    await filterForm.waitFor({ state: 'visible', timeout: 10_000 });

    const formItem = await this.getVisibleTableFilterFormItem(fieldLabel);

    // antd 6 renamed .ant-select-selector to .ant-select-content
    const selectContent = formItem.locator('.ant-select-content').first();
    await selectContent.waitFor({ state: 'visible', timeout: 10_000 });
    await selectContent.click();

    // Wait for the dropdown portal and for options to load
    await this.bindOpenSelectDropdown(formItem, 15_000);
    await this.page.waitForTimeout(600);
  }

  /**
   * Select an option from the currently open table filter dropdown.
   *
   * @param optionText - Exact text or regex to match against visible option labels
   */
  async selectTableFilterOption(optionText: string | RegExp): Promise<void> {
    const dropdown = this._openSelectDropdown ?? this.page.locator('.ant-select-dropdown:visible').last();
    const option = dropdown.locator('.ant-select-item-option').filter({ hasText: optionText }).first();
    await option.waitFor({ state: 'visible', timeout: 10_000 });
    await option.click();
    // Antd Select closes on Escape without clearing the selected value.
    // This is more reliable than waiting for the portal's CSS visibility to change.
    await this.page.keyboard.press('Escape');
    await this.waitForUiToSettle(300);
    this._openSelectDropdown = null;
  }

  /**
   * Apply the current table filters by clicking the "Filter" submit button
   * in the ProTable query filter bar.  Waits for the table to finish loading.
   */
  async applyTableFilters(): Promise<void> {
    const filterForm = this.page.locator('.ant-pro-query-filter');
    await filterForm.waitFor({ state: 'visible', timeout: 10_000 });
    // Wait for any prior request to finish — if the Filter button is still in
    // its loading state, clicking it causes the form to detach and re-mount
    // mid-click ("element is not stable / detached from DOM").
    await filterForm
      .locator('.ant-btn-loading')
      .first()
      .waitFor({ state: 'hidden', timeout: 15_000 })
      .catch(() => {});

    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const filterBtn = filterForm.getByRole('button', { name: /filter/i }).first();
      try {
        await filterBtn.waitFor({ state: 'visible', timeout: 10_000 });
        await filterBtn.click({ timeout: 10_000 });
        break;
      } catch (err) {
        if (attempt === maxAttempts - 1) {
          throw err;
        }
        // Filter form re-rendered between waitFor and click — re-acquire and retry.
        await this.page.waitForTimeout(500);
      }
    }
    await this.waitForTable();
  }

  /**
   * Clear all active table filters by clicking the "Clear" reset button
   * in the ProTable query filter bar.  Waits for the table to finish loading.
   */
  async clearTableFilters(): Promise<void> {
    const filterForm = this.page.locator('.ant-pro-query-filter');
    await filterForm.waitFor({ state: 'visible', timeout: 10_000 });
    const clearBtn = filterForm.getByRole('button', { name: /clear/i }).first();
    await clearBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await clearBtn.click();
    await this.waitForTable();
  }

  // ─── File upload (FileDropZone / FileInput) ───────────────────────────

  /**
   * Upload one or more files to a FileDropZone (or FileInput) component
   * identified by the label of the form field it belongs to.
   *
   * Playwright triggers the hidden `<input type="file">` directly, which
   * works regardless of whether the component is a drag-and-drop zone or
   * a plain upload button — Ant Design uses the same hidden input for both.
   *
   * @param fieldLabel  The visible label of the form field (case-insensitive).
   * @param files       Absolute path(s) to the file(s) to upload.
   */
  async uploadFileToDropZone(fieldLabel: string, files: string | string[]): Promise<void> {
    const container = this._formContainer ?? this.page;
    const formItem = container
      .locator('.ant-form-item')
      .filter({ hasText: new RegExp(fieldLabel, 'i') })
      .first();
    const fileInput = formItem.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 10_000 });

    const fileArray = Array.isArray(files) ? files : [files];
    await fileInput.setInputFiles(fileArray);

    // Wait for ALL uploaded files to reach 'done' status, not just the first.
    // Waiting only for the first item would return while other parallel uploads
    // are still in progress, causing flaky follow-up assertions.
    await this.page.waitForFunction(
      (expected: number) => {
        return document.querySelectorAll('.ant-upload-list-item-done').length >= expected;
      },
      fileArray.length,
      { timeout: 30_000 }
    );
  }

  /**
   * Assert that the FileDropZone for the given field label shows a file
   * with the given name in its uploaded-files list.
   */
  async expectDropZoneFileVisible(fieldLabel: string, fileName: string): Promise<void> {
    const container = this._formContainer ?? this.page;
    const formItem = container
      .locator('.ant-form-item')
      .filter({ hasText: new RegExp(fieldLabel, 'i') })
      .first();
    const fileItem = formItem.locator('.ant-upload-list-item-name').filter({ hasText: fileName });
    await expect(fileItem.first()).toBeVisible({ timeout: 10_000 });
  }

  
  /**
   * Fill a filter in the ProTable query filter bar and apply it.
   *
   * Works for both text-input filters (scalar fields) and Select filters
   * (reference/choice fields):
   *   - If the form item for `fieldLabel` contains a visible text input,
   *     clears it and fills `value`, then applies.
   *   - Otherwise falls back to openTableReferenceFilter +
   *     selectTableFilterOption (for Select-based filters), then applies.
   *
   * @param fieldLabel - Column title as shown in the filter bar (case-insensitive).
   * @param value      - The text or option label to filter by.
   */
  async filterTable(fieldLabel: string, value: string): Promise<void> {
    const filterForm = this.page.locator('.ant-pro-query-filter');
    await filterForm.waitFor({ state: 'visible', timeout: 10_000 });

    const formItem = await this.getVisibleTableFilterFormItem(fieldLabel);
    // Try text input (covers scalar/text column filters)
    const textInput = formItem
      .locator('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])')
      .first();
    const isEditableTextInput = await textInput.isEditable().catch(() => false);

    if (isEditableTextInput) {
      await textInput.clear();
      await textInput.fill(value);
    } else {
      // Select-based filter (reference / choice field)
      await this.openTableReferenceFilter(fieldLabel);
      await this.selectTableFilterOption(value);
    }

    await this.applyTableFilters();
  }

  private async getVisibleTableFilterFormItem(fieldLabel: string): Promise<import('@playwright/test').Locator> {
    const filterForm = this.page.locator('.ant-pro-query-filter');
    await filterForm.waitFor({ state: 'visible', timeout: 10_000 });

    const labelPattern = new RegExp(fieldLabel, 'i');
    let matchingItems = filterForm.locator('.ant-form-item').filter({ hasText: labelPattern });
    const initialVisibleItem = await this.findVisibleLocator(matchingItems);
    if (initialVisibleItem) {
      return initialVisibleItem;
    }

    const expandToggle = filterForm.getByText('Expand', { exact: true }).first();
    const canExpand = await expandToggle.isVisible().catch(() => false);
    if (canExpand) {
      await expandToggle.click();
      await this.waitForUiToSettle(300);
      matchingItems = filterForm.locator('.ant-form-item').filter({ hasText: labelPattern });
      const expandedVisibleItem = await this.findVisibleLocator(matchingItems);
      if (expandedVisibleItem) {
        return expandedVisibleItem;
      }
    }

    throw new Error(`Visible table filter field "${fieldLabel}" was not found.`);
  }

  private async findVisibleLocator(
    candidates: import('@playwright/test').Locator,
  ): Promise<import('@playwright/test').Locator | null> {
    const count = await candidates.count();
    for (let i = 0; i < count; i += 1) {
      const candidate = candidates.nth(i);
      const isVisible = await candidate.isVisible().catch(() => false);
      if (isVisible) {
        return candidate;
      }
    }
    return null;
  }

  /**
   * Delete the first visible row in the data table.
   *
   * Prefers an inline Delete icon button rendered in the row's action column.
   * Falls back to opening the row (drawer/ReadView) and using Manage → Delete
   * when no inline button is found.  Always calls confirmDelete() to dismiss
   * the confirmation modal.
   */
  async deleteFirstRow(): Promise<void> {
    const firstRow = this.page.locator('.ant-table-tbody tr[class*="ant-table-row"]').first();
    await firstRow.waitFor({ state: 'visible', timeout: 10_000 });

    // Look for an inline delete icon button in the row's action column
    const deleteBtn = firstRow
      .locator('button')
      .filter({ has: this.page.locator('.anticon-delete') })
      .first();
    const hasDeleteBtn = await deleteBtn.isVisible().catch(() => false);

    if (hasDeleteBtn) {
      await deleteBtn.click();
    } else {
      // Fallback: open the row and use Manage > Delete
      await firstRow.click();
      await this.waitForDrawer();
      await this.clickManageDropdown();
      await this.clickManageOption(/delete/i);
    }

    await this.confirmDelete();
  }

  // ─── Main menu navigation ─────────────────────────────────────────────

  /**
   * Click a main menu item by its visible label text.
   * Waits for the item to be visible before clicking, then waits for
   * the UI to settle (table / page load).
   *
   * @param label - Exact string or regex matching the menu item label
   */
  async clickMainMenuItem(label: string | RegExp): Promise<void> {
    const item = this.page.locator('.ant-menu-item, .ant-menu-submenu-title').filter({ hasText: label }).first();
    await item.waitFor({ state: 'visible', timeout: 10_000 });
    const beforeUrl = this.page.url();
    await item.click();
    // Menu navigation is SPA-routed (no domcontentloaded fires), so explicitly
    // wait for the URL to change before falling through to waitForUiToSettle.
    // Otherwise callers' subsequent waitForTable() can resolve against the
    // *previous* page's table that is mid-unmount.
    await this.page
      .waitForFunction((prev) => window.location.href !== prev, beforeUrl, { timeout: 5_000 })
      .catch(() => {});
    await this.waitForUiToSettle();
  }

  /**
   * Assert the visible label of a main menu item matches the expected text.
   *
   * @param itemLabel   - Partial text that uniquely identifies the menu item container
   * @param expectedText - String or regex the rendered label must satisfy
   */
  async expectMainMenuItemLabel(itemLabel: string | RegExp, expectedText: string | RegExp): Promise<void> {
    const item = this.page.locator('.ant-menu-item').filter({ hasText: itemLabel }).first();
    await item.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(item).toContainText(expectedText, { timeout: 10_000 });
  }

  // ─── Menu item visibility ──────────────────────────────────────────────

  /**
   * Assert a main menu item (left sidebar or top header) with the given label
   * is visible. Waits up to 10 s for the menu to render.
   *
   * @param label - Exact string or regex matching the menu item label.
   */
  async expectMenuItemVisible(label: string | RegExp): Promise<void> {
    const item = this.page
      .locator('.ant-menu-item, .ant-menu-submenu-title')
      .filter({ hasText: label })
      .first();
    await expect(item).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Assert no visible main menu item (left sidebar or top header) with the
   * given label exists. Polls for up to 15 s to allow the view-permission
   * prefetch and menu re-render cycle to complete before asserting.
   *
   * View-permission filtering removes denied items entirely from the React
   * tree; this method treats both "element hidden" and "element absent from
   * DOM" as passing.
   *
   * @param label - Exact string or regex matching the menu item label.
   */
  async expectMenuItemNotVisible(label: string | RegExp): Promise<void> {
    const items = this.page
      .locator('.ant-menu-item, .ant-menu-submenu-title')
      .filter({ hasText: label });
    // Permissions are prefetched in the background; the menu re-renders once
    // the prefetch finishes. Poll until no matching item is present or visible.
    await expect
      .poll(
        async () => {
          const count = await items.count();
          let visibleCount = 0;
          for (let i = 0; i < count; i++) {
            if (await items.nth(i).isVisible()) {
              visibleCount++;
            }
          }
          return visibleCount;
        },
        { timeout: 15_000, intervals: [500, 1000, 2000] },
      )
      .toBe(0);
  }

  // ─── Left menu new-tab helpers ────────────────────────────────────────

  /**
   * Locate the `<a>` anchor element inside a left-sidebar menu item identified
   * by its visible label text.  The anchor is added by the framework's
   * `openInNewTab` feature so the browser context menu and modifier-clicks work.
   */
  private async getLeftMenuItemAnchor(labelText: string): Promise<import('@playwright/test').Locator> {
    const sider = this.page.locator('.ant-pro-sider').first();
    const menuItem = sider
      .locator('.ant-menu-item')
      .filter({ hasText: new RegExp(labelText, 'i') })
      .first();
    await menuItem.waitFor({ state: 'visible', timeout: 10_000 });
    const anchor = menuItem.locator('a').first();
    await anchor.waitFor({ state: 'attached', timeout: 5_000 });
    return anchor;
  }


  /**
   * Ctrl/Cmd+click a left-sidebar menu item and return the new `Page`
   * (browser tab) that opens.  Pass the returned page to
   * `expectNewTabNavigatedTo()` to assert the destination.
   *
   * @param labelText - Visible text of the menu item to click
   */
  async ctrlClickLeftMenuItem(labelText: string): Promise<Page> {
    const anchor = await this.getLeftMenuItemAnchor(labelText);
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page', { timeout: 10_000 }),
      anchor.click({ modifiers: ['ControlOrMeta'] }),
    ]);
    return newPage;
  }

  /**
   * Middle-click a left-sidebar menu item and return the new `Page`
   * (browser tab) that opens.  Pass the returned page to
   * `expectNewTabNavigatedTo()` to assert the destination.
   *
   * @param labelText - Visible text of the menu item to click
   */
  async middleClickLeftMenuItem(labelText: string): Promise<Page> {
    const anchor = await this.getLeftMenuItemAnchor(labelText);
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page', { timeout: 10_000 }),
      anchor.click({ button: 'middle' }),
    ]);
    return newPage;
  }

  /**
   * Assert that a `Page` opened in a new browser tab has navigated to the
   * expected path, then close it.
   *
   * @param newPage      - The `Page` returned by `ctrlClickLeftMenuItem` / `middleClickLeftMenuItem`
   * @param expectedPath - The URL pathname to expect (e.g. `'/projects'`)
   */
  async expectNewTabNavigatedTo(newPage: Page, expectedPath: string): Promise<void> {
    await newPage.waitForURL(
      (url: URL) => url.pathname === expectedPath || url.pathname.startsWith(expectedPath + '/'),
      { timeout: 20_000 }
    );
    await newPage.close();
  }

  // ─── Table column content assertions ─────────────────────────────────

  // ─── WorkflowNotificationCenter ──────────────────────────────────────

  /**
   * Click the workflow notification bell icon rendered in the app header.
   * Opens the WorkflowNotificationCenter dropdown panel.
   */
  async clickWorkflowNotificationBell(): Promise<void> {
    const bell = this.page.locator('[aria-label="bell"]').first();
    await bell.waitFor({ state: 'visible', timeout: 10_000 });
    await bell.click();
    await this.waitForWorkflowNotificationPanel();
  }

  /**
   * Wait for the workflow notification panel to be visible (call after
   * clickWorkflowNotificationBell()).
   */
  async waitForWorkflowNotificationPanel(): Promise<void> {
    const panel = this.page.locator('.ant-dropdown:visible').last();
    await panel.waitFor({ state: 'visible', timeout: 10_000 });
  }

  /**
   * Close the workflow notification panel by pressing Escape.
   */
  async closeWorkflowNotificationPanel(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.locator('.ant-dropdown:visible').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  }

  /**
   * Assert the notification bell badge count equals the given value.
   * Pass 0 to assert no active (non-terminal) workflows are running.
   * When count > 0, waits up to 15 s for the badge to appear.
   */
  async expectWorkflowNotificationBadgeCount(count: number): Promise<void> {
    // The badge wraps the bell icon directly.
    const bellWrapper = this.page
      .locator('.ant-badge')
      .filter({ has: this.page.locator('[aria-label="bell"]') })
      .first();

    const badgeCount = bellWrapper.locator('.ant-badge-count').first();

    if (count === 0) {
      // antd hides the badge or sets it to '0' when count is 0 — both are acceptable.
      const isVisible = await badgeCount.isVisible().catch(() => false);
      if (isVisible) {
        const text = (await badgeCount.textContent()) ?? '';
        expect(text.trim()).toMatch(/^0?$/);
      }
    } else {
      await expect(badgeCount).toBeVisible({ timeout: 15_000 });
      await expect(badgeCount).toContainText(String(count), { timeout: 5_000 });
    }
  }

  /**
   * In the open notification panel, assert an entry for the given action name is visible.
   * Waits up to 30 s to accommodate long-running workflows.
   */
  async expectWorkflowEntryInPanel(actionNamePattern: RegExp): Promise<void> {
    const panel = this.page.locator('.ant-dropdown:visible').last();
    const entry = panel.locator('div').filter({ hasText: actionNamePattern }).first();
    await expect(entry).toBeVisible({ timeout: 30_000 });
  }

  /**
   * In the open notification panel, wait until the entry for the given action
   * name shows the success (green checkmark) icon.
   * Waits up to 60 s — queue-backed workflows can take several seconds.
   */
  async waitForWorkflowSuccessInPanel(actionNamePattern: RegExp): Promise<void> {
    const panel = this.page.locator('.ant-dropdown:visible').last();
    // Use CSS :has() to avoid locator-scoping issues with chained filter({ has: ... })
    const successEntry = panel
      .locator('div:has(.anticon-check-circle)')
      .filter({ hasText: actionNamePattern })
      .first();
    await successEntry.waitFor({ state: 'visible', timeout: 60_000 });
  }

  /**
   * In the open notification panel, wait until the entry for the given action
   * name shows the error (red X) icon.
   */
  async waitForWorkflowErrorInPanel(actionNamePattern: RegExp): Promise<void> {
    const panel = this.page.locator('.ant-dropdown:visible').last();
    // Use CSS :has() to avoid locator-scoping issues with chained filter({ has: ... })
    const errorEntry = panel
      .locator('div:has(.anticon-close-circle)')
      .filter({ hasText: actionNamePattern })
      .first();
    await errorEntry.waitFor({ state: 'visible', timeout: 60_000 });
  }

  /**
   * Click the "Clear all" button inside the open workflow notification panel.
   */
  async clearWorkflowNotifications(): Promise<void> {
    const panel = this.page.locator('.ant-dropdown:visible').last();
    const clearBtn = panel.getByRole('button', { name: /clear all/i });
    await clearBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await clearBtn.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Assert the open notification panel shows the "No actions" empty state.
   */
  async expectWorkflowNotificationPanelEmpty(): Promise<void> {
    const panel = this.page.locator('.ant-dropdown:visible').last();
    await expect(panel.getByText(/no actions/i).first()).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Assert that every visible data row in the table contains `value` in the
   * column headed by `columnTitle`.
   *
   * Finds the column index from the header, then checks each `<td>` at that
   * index in every `<tbody>` row.  Useful for verifying that a queryParam
   * filter was applied correctly (e.g. all rows show the same assignee).
   *
   * @param columnTitle - The column header text (exact match, case-insensitive)
   * @param value       - String or regex every cell in that column must contain
   */
  async expectTableFilteredBy(columnTitle: string | RegExp, value: string | RegExp): Promise<void> {
    const table = this.page.locator('.drumr-data-table, .ant-table-wrapper').first();
    await table.waitFor({ state: 'visible', timeout: 15_000 });

    // Resolve column index from header cells
    const headers = table.locator('.ant-table-thead th');
    const headerCount = await headers.count();
    let columnIndex = -1;
    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).textContent();
      const matches =
        typeof columnTitle === 'string'
          ? (text ?? '').toLowerCase().includes(columnTitle.toLowerCase())
          : columnTitle.test(text ?? '');
      if (matches) {
        columnIndex = i;
        break;
      }
    }
    expect(columnIndex, `Column "${columnTitle}" not found in table headers`).toBeGreaterThanOrEqual(0);

    // Assert every data row's cell at that index contains the expected value
    const rows = table.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();
    expect(rowCount, `Expected at least one data row in the table`).toBeGreaterThan(0);

    for (let i = 0; i < rowCount; i++) {
      const cell = rows.nth(i).locator('td').nth(columnIndex);
      await expect(cell).toContainText(value, { timeout: 5_000 });
    }
  }
}

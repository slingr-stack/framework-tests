"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlingrTestKit = void 0;
/**
 * SlingrTestKit — Framework-aware E2E testing abstraction.
 *
 * This file is the SINGLE source of truth for all DOM selectors and UI
 * conventions used by the Slingr framework.  Every spec file interacts
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
const test_1 = require("@playwright/test");
// ── Default credentials ─────────────────────────────────────────────────
const DEFAULT_ADMIN = {
    email: process.env.E2E_ADMIN_EMAIL ?? 'sys@app.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? '12345678',
};
const DEFAULT_MANAGER = {
    email: process.env.E2E_MANAGER_EMAIL ?? 'brian.lee@example.com',
    password: process.env.E2E_MANAGER_PASSWORD ?? '12345678',
};
class SlingrTestKit {
    page;
    /**
     * When form operations happen inside a drawer (e.g. EditView opened over
     * a ReadView drawer), this stores the drawer container so that form
     * field locators scope correctly and don't match identically-named
     * table-filter inputs on the underlying page.
     */
    _formContainer = null;
    constructor(page) {
        this.page = page;
    }
    getTopOverlayContainer() {
        return this.page.locator('.ant-modal-wrap:visible, .ant-drawer:visible').last();
    }
    async waitForUiToSettle(delayMs = 500) {
        await this.page.waitForLoadState('domcontentloaded').catch(() => { });
        await this.page.waitForTimeout(delayMs);
    }
    async waitForLoginForm() {
        const timeout = process.env.CI ? 45_000 : 15_000;
        await this.page.locator('#email, input[name="email"]').first().waitFor({ state: 'visible', timeout });
        await this.page.locator('#password, input[name="password"]').first().waitFor({ state: 'visible', timeout });
    }
    // ─── Authentication ───────────────────────────────────────────────────
    /** Navigate to the login page, fill credentials and submit. */
    async login(email, password, options = {}) {
        const { expectSuccess = true } = options;
        await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
        // If storageState is pre-loaded, the SPA redirects away from /login after
        // its startup JS runs — which happens after domcontentloaded. Wait briefly
        // to let that redirect fire before deciding whether to fill the form.
        const alreadyAuthenticated = await this.page
            .waitForURL(url => !/\/login(?:\?|$)/.test(url.pathname + url.search), { timeout: 4_000 })
            .then(() => true)
            .catch(() => false);
        if (expectSuccess && alreadyAuthenticated) {
            await this.expectLoggedIn();
            return;
        }
        await this.waitForLoginForm();
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
            throw new Error(`Login failed for "${email}" (HTTP ${loginResponse.status()}): ${errorPayload || loginResponse.statusText}`);
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
            .catch(() => { });
    }
    /** Login with the default admin account. */
    async loginAsAdmin() {
        await this.login(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password);
    }
    /** Login with the default manager account. */
    async loginAsManager() {
        await this.login(DEFAULT_MANAGER.email, DEFAULT_MANAGER.password);
    }
    /** The default manager's email (for test data setup/teardown). */
    get managerEmail() {
        return DEFAULT_MANAGER.email;
    }
    /** Assert the user is authenticated (not on login page, app chrome visible). */
    async expectLoggedIn() {
        await this.page.waitForURL((url) => !/\/login(?:\?|$)/.test(url.pathname + url.search), { timeout: 20_000 });
        await this.waitForUiToSettle();
        // After login the framework renders ProLayout with header/menu
        await this.page
            .locator('.ant-pro-layout, .ant-layout, [class*="basicLayout"]')
            .first()
            .waitFor({ state: 'visible', timeout: 20_000 });
    }
    /** Assert the user is on the login page (logged out). */
    async expectOnLoginPage() {
        await (0, test_1.expect)(this.page).toHaveURL(/\/login/, { timeout: 10_000 });
        await this.waitForLoginForm();
        await this.page.getByRole('button', { name: /login/i }).waitFor({ state: 'visible', timeout: 10_000 });
    }
    /** Open the avatar dropdown and click logout. */
    async logout() {
        const avatar = this.page.locator('.ant-avatar, [class*="avatar"], [class*="user-info"]').first();
        await avatar.waitFor({ state: 'visible', timeout: 10_000 });
        await avatar.click();
        const logoutMenuItem = this.page.getByRole('menuitem', { name: /logout|sign out|log out/i });
        await logoutMenuItem.waitFor({ state: 'visible', timeout: 10_000 });
        await logoutMenuItem.click();
        await this.expectOnLoginPage();
    }
    /** Reload current page and wait for network. */
    async reload() {
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.waitForUiToSettle();
    }
    // ─── Navigation ───────────────────────────────────────────────────────
    /** Navigate to a framework entity path (e.g. '/tasks', '/projects'). */
    async navigateTo(entityPath) {
        this._formContainer = null; // reset drawer scope on navigation
        await this.page.goto(entityPath, { waitUntil: 'domcontentloaded' });
        await this.waitForUiToSettle();
    }
    // ─── TableView ────────────────────────────────────────────────────────
    /** Wait for the Slingr data-table component to be visible. */
    async waitForTable() {
        const table = this.page.locator('.slingr-data-table');
        await table.waitFor({ state: 'visible', timeout: 15_000 });
        const loadingOverlay = table.locator('.ant-spin-spinning, .slingr-data-table__loading').first();
        await loadingOverlay.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => { });
    }
    /**
     * Navigate to the last page of the current table by clicking the Ant Design
     * pagination "last page" button (the rightmost numbered item before the next
     * arrow). No-op when the table has only one page.
     */
    async goToLastTablePage() {
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
    async waitForDrawer() {
        await this.page
            .locator('.ant-drawer:visible, .ant-modal-wrap:visible')
            .first()
            .waitFor({ state: 'visible', timeout: 15_000 });
        // Wait for content (including toolbar actions) to finish rendering
        await this.page.waitForTimeout(2000);
    }
    /** Assert that at least one visible drawer/modal container is open. */
    async expectOverlayOpen() {
        await (0, test_1.expect)(this.getTopOverlayContainer()).toBeVisible({ timeout: 10_000 });
    }
    /** Click a visible tab in the topmost drawer/modal by accessible name. */
    async clickTab(namePattern) {
        const container = this.getTopOverlayContainer();
        const tab = container.getByRole('tab', { name: namePattern }).first();
        await tab.waitFor({ state: 'visible', timeout: 10_000 });
        await tab.click();
        await this.waitForUiToSettle(300);
    }
    /** Assert a tab is visible in the topmost drawer/modal. */
    async expectTabVisible(namePattern) {
        const container = this.getTopOverlayContainer();
        await (0, test_1.expect)(container.getByRole('tab', { name: namePattern }).first()).toBeVisible({ timeout: 10_000 });
    }
    /** Open a nested view by tab name or button label in the topmost drawer/modal. */
    async openNestedView(namePattern) {
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
    async clickOverlayButton(namePattern) {
        const container = this.getTopOverlayContainer();
        const button = container.getByRole('button', { name: namePattern }).first();
        await button.waitFor({ state: 'visible', timeout: 10_000 });
        await (0, test_1.expect)(button).toBeEnabled({ timeout: 10_000 });
        await button.click();
        await this.waitForUiToSettle();
    }
    /** Click the "Create <Entity>" button in the table toolbar. */
    async clickCreateInTable() {
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
    async searchInTable(text) {
        // The framework can render either a generic search box or form-based
        // table filters. Use the first visible search-like input.
        const candidateInputs = this.page.locator('input[placeholder*="Search"], .ant-pro-table-search input[type="text"]');
        const count = await candidateInputs.count();
        let searchInput = null;
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
            }
            else {
                await searchInput.press('Enter').catch(() => { });
            }
            await this.waitForUiToSettle();
            await this.page.waitForTimeout(1500);
        }
    }
    /** Click a table row that contains the given text. */
    async clickTableRow(text) {
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
    async clickTaskRowByTitle(title) {
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
        }
        else {
            await titleInput.press('Enter').catch(() => { });
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
            }
            else {
                await titleInputRetry.press('Enter').catch(() => { });
            }
            await this.waitForUiToSettle();
            await this.page.waitForTimeout(1000);
        }
        await (0, test_1.expect)(isVisible, `Task row containing "${title}" should be visible in table`).toBe(true);
        await row.click();
        await this.waitForUiToSettle();
    }
    /** Click the first data row in the table (no text filter). */
    async clickFirstTableRow() {
        const firstRow = this.page.locator('.ant-table-tbody tr[class*="ant-table-row"]').first();
        await (0, test_1.expect)(firstRow).toBeVisible({ timeout: 10_000 });
        await firstRow.click();
        await this.waitForUiToSettle();
    }
    /** Check the checkbox of a table row that contains the given text. */
    async selectTableRowCheckbox(text) {
        let row = this.page.locator('.ant-table-tbody tr[class*="ant-table-row"]').filter({ hasText: text }).first();
        const isVisible = await row
            .waitFor({ state: 'visible', timeout: 5_000 })
            .then(() => true)
            .catch(() => false);
        if (!isVisible) {
            await this.searchInTable(text);
            row = this.page.locator('.ant-table-tbody tr[class*="ant-table-row"]').filter({ hasText: text }).first();
        }
        await (0, test_1.expect)(row).toBeVisible({ timeout: 10_000 });
        await row.locator('td').first().locator('input[type="checkbox"], .ant-checkbox-input').first().check();
        await this.page.waitForTimeout(1000);
    }
    /** Check the checkbox of the first data row in the table. */
    async selectFirstRowCheckbox() {
        const firstRow = this.page.locator('.ant-table-tbody tr[class*="ant-table-row"]').first();
        await (0, test_1.expect)(firstRow).toBeVisible({ timeout: 10_000 });
        await firstRow.locator('td').first().locator('input[type="checkbox"], .ant-checkbox-input').first().check();
        await this.page.waitForTimeout(1000);
    }
    /** Assert the table body contains the given text.  Searches first to handle pagination. */
    async expectTableContains(text) {
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
        await (0, test_1.expect)(isVisible, `Table row containing \"${text}\" should be visible after search + pagination`).toBe(true);
    }
    /** Assert the table body does NOT contain the given text.  Searches first to handle pagination. */
    async expectTableNotContains(text) {
        await this.searchInTable(text);
        const row = this.page.locator('.ant-table-tbody tr').filter({ hasText: text }).first();
        await (0, test_1.expect)(row).toBeHidden({ timeout: 15_000 });
    }
    // ─── Form (CreateView / EditView) ─────────────────────────────────────
    /**
     * Wait for a form field to appear (indicating the form has rendered).
     * When drawers are open, automatically scopes to the topmost drawer
     * to avoid matching table-filter inputs that share the same field ID.
     */
    async waitForForm(fieldId = 'title') {
        // Allow any in-progress drawer/modal animation to start
        await this.page.waitForTimeout(500);
        // If a drawer is visible, try to find the field inside the LAST
        // (topmost) drawer.  Playwright locators are lazy, so .last()
        // re-evaluates as new drawers mount during the wait.
        const hasDrawer = await this.page
            .locator('.ant-drawer')
            .first()
            .isVisible()
            .catch(() => false);
        if (hasDrawer) {
            const drawerField = this.page.locator('.ant-drawer-body').last().locator(`#${fieldId}`);
            try {
                await drawerField.waitFor({ state: 'visible', timeout: 15_000 });
                this._formContainer = this.page.locator('.ant-drawer-body').last();
                return;
            }
            catch {
                // Field not found in any drawer — fall through to page-level
            }
        }
        // No drawer or field not inside a drawer (e.g. CreateView as a page)
        await this.page.locator(`#${fieldId}`).waitFor({ state: 'visible', timeout: 10_000 });
        this._formContainer = null;
    }
    /** Fill a text/number input field by its id attribute. */
    async fillField(fieldId, value) {
        const container = this._formContainer ?? this.page;
        await container.locator(`#${fieldId}`).fill(value);
    }
    /** Clear a field and type a new value (for edit flows).
     *  Uses keyboard-level selection + type so Ant Design ProForm
     *  picks up the change in its internal form store.
     */
    async clearAndFillField(fieldId, value) {
        const container = this._formContainer ?? this.page;
        const input = container.locator(`#${fieldId}`);
        await input.click();
        // Select-all then type triggers React onChange properly
        await this.page.keyboard.press('ControlOrMeta+a');
        await input.pressSequentially(value, { delay: 30 });
    }
    /** Read current value from a text/number input field by id. */
    async getFieldValue(fieldId) {
        const container = this._formContainer ?? this.page;
        const input = container.locator(`#${fieldId}`);
        await input.waitFor({ state: 'visible', timeout: 10_000 });
        return input.inputValue();
    }
    /** Assert a form field is not visible in the current page/drawer context. */
    async expectFieldNotVisible(fieldId) {
        const visibleField = this.page.locator(`#${fieldId}:visible`);
        await (0, test_1.expect)(visibleField).toHaveCount(0, { timeout: 10_000 });
    }
    /** Fill a <textarea> field matched by its placeholder text. */
    async fillTextarea(placeholderPattern, value) {
        const container = this._formContainer ?? this.page;
        await container.getByPlaceholder(placeholderPattern).fill(value);
    }
    async blurActiveElement() {
        await this.page
            .locator('body')
            .click({ position: { x: 8, y: 8 } })
            .catch(() => { });
        await this.page.waitForTimeout(200);
    }
    async selectFirstOptionInContainer(container, fieldLabel) {
        const labelledCombobox = container.getByRole('combobox', { name: new RegExp(fieldLabel, 'i') }).first();
        const comboboxVisible = await labelledCombobox.isVisible().catch(() => false);
        if (comboboxVisible) {
            await labelledCombobox.click();
        }
        else {
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
     * when `allowClear` is enabled (the default in Slingr).
     */
    async clearReferenceField(fieldLabel) {
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
    async clearReferenceFieldIfSet(fieldLabel) {
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
    async selectFirstOption(fieldLabel) {
        const container = this._formContainer ?? this.page;
        await this.selectFirstOptionInContainer(container, fieldLabel);
    }
    /**
     * Click an Ant Select field (identified by label text) and pick a specific
     * option by visible text. Useful when option order is unstable.
     */
    async selectOption(fieldLabel, optionText) {
        const container = this._formContainer ?? this.page;
        const labelledCombobox = container.getByRole('combobox', { name: new RegExp(fieldLabel, 'i') }).first();
        const comboboxVisible = await labelledCombobox.isVisible().catch(() => false);
        if (comboboxVisible) {
            await labelledCombobox.click();
        }
        else {
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
        const option = typeof optionText === 'string'
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
    async selectFirstOptionByPlaceholder(placeholder) {
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
    async fillCompositionReferenceField(sectionTitle, fieldLabel) {
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
    async fillCompositionReferenceFieldIfPresent(sectionTitle, fieldLabel) {
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
        }
        catch {
            return false;
        }
    }
    /** Click the Add button inside a specific composition section/card. */
    async addCompositionItem(sectionTitle) {
        const heading = this.page.getByRole('heading', { name: new RegExp(sectionTitle, 'i') });
        await heading.waitFor({ state: 'visible', timeout: 10_000 });
        const sectionContainer = heading.locator('xpath=ancestor::*[contains(@class, "ant-card")][1]');
        const addButton = sectionContainer.getByRole('button', { name: /add/i }).first();
        await addButton.scrollIntoViewIfNeeded();
        await addButton.click();
        await this.waitForUiToSettle(800);
    }
    /** Fill a text input by placeholder inside a specific composition section/card. */
    async fillCompositionFieldByPlaceholder(sectionTitle, placeholderPattern, value) {
        const heading = this.page.getByRole('heading', { name: new RegExp(sectionTitle, 'i') });
        await heading.waitFor({ state: 'visible', timeout: 10_000 });
        const sectionContainer = heading.locator('xpath=ancestor::*[contains(@class, "ant-card")][1]');
        const input = sectionContainer.getByPlaceholder(placeholderPattern).last();
        await input.waitFor({ state: 'visible', timeout: 10_000 });
        await input.fill(value);
    }
    /** Click the "Create" submit button (icon prefix: "plus"). */
    async submitCreate() {
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
        }
        else if (await drawerContent.first().isVisible().catch(() => false)) {
            await drawerContent.first().getByRole('button', { name: /plus create/i }).click();
        }
        else {
            // Full-page CreateView: two identical buttons (header + footer), both submit the form.
            await this.page.getByRole('button', { name: /plus create/i }).first().click();
        }
        // Wait for the framework to navigate away from the create form
        await this.page.waitForURL((url) => url.toString() !== currentUrl, { timeout: 30_000 }).catch(() => { });
        await this.waitForUiToSettle();
        await this.page.waitForTimeout(2000);
    }
    /** Click the "Save" button in an edit form. */
    async submitSave() {
        const modalFooter = this.page.locator('.ant-modal-wrap:visible .ant-modal-footer');
        // Use :visible (consistent with getTopOverlayContainer) instead of .ant-drawer-open
        // which is unreliable in Ant Design 6. Use .last() to target the topmost (innermost)
        // open drawer when drawers are nested — the outer drawer's mask intercepts clicks otherwise.
        const drawerContent = this.page.locator('.ant-drawer:visible .ant-drawer-body, .ant-drawer:visible .ant-drawer-footer');
        const drawerSaveButton = drawerContent.last().getByRole('button', { name: /save/i });
        if (await modalFooter.isVisible().catch(() => false)) {
            await modalFooter.getByRole('button', { name: /save/i }).click();
        }
        else if (await drawerContent.last().isVisible().catch(() => false) && await drawerSaveButton.isVisible().catch(() => false)) {
            await drawerSaveButton.click();
        }
        else {
            // Full-page EditView: two identical Save buttons (header + footer), both submit the form.
            // Wait for any lingering drawer masks to clear first (e.g. a parent task drawer that is
            // in the process of closing when a nested user-edit page opens), then click normally.
            await this.page.locator('.ant-drawer-mask').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => { });
            await this.page.getByRole('button', { name: /save/i }).first().click();
        }
        await this.waitForUiToSettle();
        await this.page.waitForTimeout(2000);
        this._formContainer = null;
    }
    // ─── ReadView ─────────────────────────────────────────────────────────
    /** Assert some text is visible on the current page. */
    async expectTextVisible(text) {
        await (0, test_1.expect)(this.page.getByText(text).first()).toBeVisible({ timeout: 10_000 });
    }
    /** Open the "Manage" dropdown in a ReadView toolbar. Waits for the button to be visible (toolbar actions load asynchronously in drawers). */
    async clickManageDropdown() {
        const btn = this.page.getByRole('button', { name: /manage/i });
        await btn.waitFor({ state: 'visible', timeout: 15_000 });
        await btn.click();
    }
    /** Click an item inside the Manage dropdown (e.g. "Edit", "Delete"). */
    async clickManageOption(namePattern) {
        const item = this.page.getByRole('menuitem', { name: namePattern });
        await item.waitFor({ state: 'visible', timeout: 10_000 });
        await item.click();
        await this.waitForUiToSettle();
    }
    /** Open the "Actions" dropdown in a ReadView toolbar. */
    async clickActionsDropdown() {
        await this.page.getByRole('button', { name: /actions/i }).click();
    }
    /** Click an item inside the Actions dropdown. */
    async clickActionOption(namePattern) {
        await this.page.getByRole('menuitem', { name: namePattern }).click();
    }
    /** Click "Edit" or "Update" button directly (for views that expose it as a button). */
    async clickEditButton(entityName) {
        const pattern = entityName
            ? new RegExp(`edit.*(edit|update).*${entityName}|edit.*edit`, 'i')
            : /edit.*edit|edit.*update/i;
        await this.page.getByRole('button', { name: pattern }).click();
        await this.waitForUiToSettle();
    }
    /** Click "Delete" button directly (for views that expose it as a button). */
    async clickDeleteButton(entityName) {
        const pattern = entityName
            ? new RegExp(`delete.*(delete|remove).*${entityName}|delete.*delete`, 'i')
            : /delete.*delete|delete.*remove/i;
        await this.page.getByRole('button', { name: pattern }).click();
    }
    /** Click the "More" button in the page header toolbar. */
    async clickToolbarMoreButton() {
        await this.page
            .locator('.ant-page-header-heading-extra, [class*="page-header"]')
            .first()
            .getByRole('button', { name: /more/i })
            .click();
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
    async openRowActionsMenu(rowText) {
        const row = this.page.locator('.ant-table-tbody tr').filter({ hasText: rowText }).first();
        await row.waitFor({ state: 'visible', timeout: 10_000 });
        await row.hover();
        const moreBtn = row.getByRole('button', { name: /more/i });
        await moreBtn.waitFor({ state: 'visible', timeout: 5_000 });
        await moreBtn.click();
        await this.page.locator('.ant-dropdown:visible').waitFor({ state: 'visible', timeout: 10_000 });
        await this.waitForUiToSettle(300);
    }
    /**
     * Assert that the currently open row actions dropdown contains the given label.
     * Call after `openRowActionsMenu()`.
     */
    async expectRowActionVisible(label) {
        const menu = this.page.locator('.ant-dropdown:visible .ant-dropdown-menu');
        await (0, test_1.expect)(menu).toContainText(label, { timeout: 5_000 });
    }
    /**
     * Assert that the currently open row actions dropdown does NOT contain the given label.
     * Call after `openRowActionsMenu()`.
     */
    async expectRowActionNotVisible(label) {
        const menu = this.page.locator('.ant-dropdown:visible .ant-dropdown-menu');
        await (0, test_1.expect)(menu).not.toContainText(label, { timeout: 3_000 });
    }
    /** Click a menu item by name pattern (generic — works in any dropdown/menu). */
    async clickMenuItem(namePattern) {
        await this.page.getByRole('menuitem', { name: namePattern }).click();
    }
    /**
     * Confirm a delete dialog.
     * The framework uses Modal.confirm with submitterLabel 'Delete' for
     * single-record deletes and 'Execute' for generic action confirmations.
     */
    async confirmDelete() {
        // Wait for the Ant Design confirmation modal to appear
        const modal = this.page.locator('.ant-modal-confirm');
        await modal.waitFor({ state: 'visible', timeout: 10_000 });
        // Click the primary/danger confirm button (text: "Delete" or "Execute")
        const okBtn = modal.getByRole('button', { name: /delete|execute/i });
        await okBtn.waitFor({ state: 'visible', timeout: 5_000 });
        await okBtn.click();
        await this.waitForUiToSettle();
        await this.page.waitForTimeout(2000);
    }
    /** Click the delete button and wait for it to become enabled before clicking. */
    async clickDeleteButtonAndWait(buttonName = 'Delete') {
        const btn = this.page.getByRole('button', { name: new RegExp(buttonName, 'i') });
        // Wait for the button to be visible and enabled (not in loading state)
        await btn.waitFor({ state: 'visible', timeout: 15_000 });
        await (0, test_1.expect)(btn).toBeEnabled({ timeout: 30_000 });
        await btn.click();
    }
    // ─── Action dialogs ───────────────────────────────────────────────────
    /** Wait for an action dialog (modal) with the given title pattern to appear. */
    async waitForDialog(namePattern) {
        await this.page.getByRole('dialog', { name: namePattern }).waitFor({ state: 'visible', timeout: 10_000 });
    }
    /**
     * Inside the currently visible dialog, click a select field and pick
     * the first option.
     */
    async selectFirstOptionInDialog(dialogName, fieldLabel) {
        const dialog = this.page.getByRole('dialog', { name: dialogName });
        const field = dialog.locator('.ant-form-item').filter({ hasText: fieldLabel }).locator('.ant-select');
        await field.click();
        await this.page.waitForTimeout(1000);
        await this.page.locator('.ant-select-dropdown:visible .ant-select-item').first().click();
        await this.page.waitForTimeout(500);
    }
    /** Click the "Execute" button inside a named dialog. */
    async executeDialog(dialogName) {
        const dialog = this.page.getByRole('dialog', { name: dialogName });
        await dialog.getByRole('button', { name: /execute/i }).click();
        await this.waitForUiToSettle();
        await (0, test_1.expect)(dialog).toBeHidden({ timeout: 10_000 });
    }
    // ─── Table row selection ──────────────────────────────────────────────
    /**
     * Click the checkbox of a table row at the given 0-based index.
     * Uses the .ant-table-selection-column cell inside tbody rows.
     */
    async selectTableRowByIndex(index) {
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
    async clickHeaderCheckbox() {
        const headerCell = this.page.locator('.ant-table-thead .ant-table-selection-column').first();
        await headerCell.waitFor({ state: 'visible', timeout: 10_000 });
        const visibleCheckbox = headerCell.locator('.ant-checkbox-wrapper, .ant-checkbox').first();
        const hasVisibleCheckbox = await visibleCheckbox.isVisible().catch(() => false);
        if (hasVisibleCheckbox) {
            await visibleCheckbox.click();
        }
        else {
            const fallbackTarget = headerCell.getByRole('checkbox').first();
            await fallbackTarget.waitFor({ state: 'visible', timeout: 10_000 });
            await fallbackTarget.click();
        }
        await this.waitForUiToSettle(300);
    }
    /**
     * Click the ProTable reload/refresh icon button in the top-right options bar.
     */
    async clickTableRefresh() {
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
    async clearTableSelection() {
        const clearLink = this.page.locator('.ant-pro-table-alert-info-option a');
        await clearLink.waitFor({ state: 'visible', timeout: 10_000 });
        await clearLink.click();
        await this.page.waitForTimeout(300);
    }
    /**
     * Assert the ProTable selection alert shows the expected text
     * (e.g. "3 items selected" or "All 2004 rows selected").
     */
    async expectSelectionAlertText(textPattern) {
        const alert = this.page.locator('.ant-pro-table-alert');
        await alert.waitFor({ state: 'visible', timeout: 10_000 });
        await (0, test_1.expect)(alert).toContainText(textPattern, { timeout: 5_000 });
    }
    /**
     * Assert no ProTable selection alert banner is currently visible.
     */
    async expectNoSelectionAlert() {
        const alert = this.page.locator('.ant-pro-table-alert');
        const isVisible = await alert.isVisible().catch(() => false);
        if (isVisible) {
            // Alert may take a moment to clear after a bulk background action
            await (0, test_1.expect)(alert).not.toBeVisible({ timeout: 30_000 });
        }
    }
    /**
     * Assert that the header selection checkbox is in the orange (all-global) state.
     * In antd 6 the color is applied via CSS variable --ant-color-primary set by
     * the ConfigProvider wrapper. We detect the orange state by checking for the
     * title rendered only in the all-rows-selected state and then verify the CSS
     * variable resolves to the orange value.
     */
    async expectHeaderCheckboxOrange() {
        const headerCell = this.page.locator('.ant-table-thead .ant-table-selection-column').first();
        await headerCell.waitFor({ state: 'visible', timeout: 10_000 });
        // The all-rows-selected state renders a title only on the custom orange checkbox.
        const titledCheckbox = headerCell.locator('[title*="rows selected"]').first();
        await titledCheckbox.waitFor({ state: 'visible', timeout: 10_000 });
        // Secondary: verify the ConfigProvider CSS variable override is orange.
        // antd 6 sets --ant-color-primary on an ancestor via ConfigProvider scope.
        const isOrange = await titledCheckbox.evaluate(el => {
            let node = el;
            while (node) {
                const val = window.getComputedStyle(node).getPropertyValue('--ant-color-primary').trim();
                if (val) {
                    return val === '#fa8c16' || val === 'rgb(250, 140, 22)';
                }
                node = node.parentElement;
            }
            return false;
        });
        (0, test_1.expect)(isOrange).toBe(true);
    }
    // ─── Bulk action toolbar helpers ──────────────────────────────────────
    /**
     * Click a toolbar button (anywhere on the page) whose accessible name
     * matches the given pattern. Works for both the page-header toolbar and
     * the ProTable toolbar (e.g. "Bulk Change Priority (2)", "Delete (3)").
     */
    async clickBulkActionButton(namePattern) {
        const btn = this.page.getByRole('button', { name: namePattern });
        await btn.waitFor({ state: 'visible', timeout: 10_000 });
        await btn.click();
        await this.waitForUiToSettle();
    }
    /**
     * Assert that a toolbar button whose accessible name matches the given
     * pattern is visible on the page.
     */
    async expectBulkActionButtonVisible(namePattern) {
        await (0, test_1.expect)(this.page.getByRole('button', { name: namePattern })).toBeVisible({ timeout: 10_000 });
    }
    /**
     * Assert that no toolbar button whose accessible name matches the given
     * pattern is visible on the page.
     */
    async expectBulkActionButtonNotVisible(namePattern) {
        await (0, test_1.expect)(this.page.getByRole('button', { name: namePattern })).toBeHidden({ timeout: 5_000 });
    }
    /**
     * Cancel the currently open dialog or confirmation modal.
     * Prefers scoping to `.ant-modal-confirm` if one is present.
     */
    async cancelDialog() {
        const confirmModal = this.page.locator('.ant-modal-confirm');
        const isConfirmModal = await confirmModal.isVisible().catch(() => false);
        if (isConfirmModal) {
            const cancelBtn = confirmModal.getByRole('button', { name: /cancel/i });
            await cancelBtn.waitFor({ state: 'visible', timeout: 5_000 });
            await cancelBtn.click();
        }
        else {
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
    async expectFeedback(textPattern) {
        const feedback = this.page
            .locator('.ant-message-notice:visible, .ant-notification-notice:visible')
            .filter({ hasText: textPattern })
            .first();
        await (0, test_1.expect)(feedback).toBeVisible({ timeout: 10_000 });
    }
    /** Assert a success toast/notification is visible without relying on specific text. */
    async expectSuccessFeedback() {
        const successToast = this.page
            .locator('.ant-message-notice')
            .filter({ has: this.page.locator('.anticon-check-circle, .anticon-check-circle-filled') })
            .first();
        const notificationSuccess = this.page.locator('.ant-notification-notice-success').first();
        const toastVisible = await successToast.isVisible().catch(() => false);
        if (toastVisible) {
            await (0, test_1.expect)(successToast).toBeVisible({ timeout: 10_000 });
            return;
        }
        await (0, test_1.expect)(notificationSuccess).toBeVisible({ timeout: 10_000 });
    }
    /** Assert current URL matches the given pattern. */
    async expectUrlMatches(pattern) {
        await (0, test_1.expect)(this.page).toHaveURL(pattern, { timeout: 10_000 });
    }
    /** Assert current URL does not match the given pattern. */
    async expectUrlNotMatches(pattern) {
        await (0, test_1.expect)(this.page).not.toHaveURL(pattern, { timeout: 10_000 });
    }
    /** Assert a form-item label area contains a non-empty value. */
    async expectFieldHasValue(fieldLabel) {
        const formItem = this.page
            .locator('.ant-form-item:not(.ant-form-item-hidden)')
            .filter({ hasText: new RegExp(fieldLabel, 'i') });
        await (0, test_1.expect)(formItem.first()).toBeVisible({ timeout: 10_000 });
        const value = await formItem.first().locator('.ant-form-item-control-input-content').first().textContent();
        (0, test_1.expect)((value ?? '').trim().length).toBeGreaterThan(0);
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
    async fillDateField(fieldId, value) {
        const container = this._formContainer ?? this.page;
        const input = container.locator(`input#${fieldId}`).first();
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
    async clearDateField(fieldId) {
        const container = this._formContainer ?? this.page;
        // The ant-picker wrapping our field has an input whose id matches the fieldId
        const picker = container.locator(`.ant-picker:has(input#${fieldId})`).first();
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
    async expectDateFieldEmpty(fieldId) {
        const container = this._formContainer ?? this.page;
        const input = container.locator(`input#${fieldId}`).first();
        await input.scrollIntoViewIfNeeded({ timeout: 10_000 });
        await input.waitFor({ state: 'visible', timeout: 10_000 });
        const value = await input.inputValue();
        (0, test_1.expect)(value.trim(), `Expected date field #${fieldId} to be empty`).toBe('');
    }
    /**
     * Assert a date/dateTime picker field contains a non-empty value.
     *
     * @param fieldId - The HTML id of the hidden input (e.g. 'dueDate')
     */
    async expectDateFieldNotEmpty(fieldId) {
        const container = this._formContainer ?? this.page;
        const input = container.locator(`input#${fieldId}`).first();
        await input.scrollIntoViewIfNeeded({ timeout: 10_000 });
        await input.waitFor({ state: 'visible', timeout: 10_000 });
        const value = await input.inputValue();
        (0, test_1.expect)(value.trim().length, `Expected date field #${fieldId} to have a value`).toBeGreaterThan(0);
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
    async typeInFilterWithoutApplying(placeholder, value) {
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
    async openReferenceDropdown(fieldLabel) {
        const container = this._formContainer ?? this.page;
        const combobox = container.getByRole('combobox', { name: new RegExp(fieldLabel, 'i') }).first();
        const comboboxVisible = await combobox.isVisible().catch(() => false);
        if (comboboxVisible) {
            await combobox.click();
        }
        else {
            const selectWidget = container
                .locator('.ant-form-item')
                .filter({ hasText: new RegExp(fieldLabel, 'i') })
                .locator('.ant-select')
                .first();
            await selectWidget.waitFor({ state: 'visible', timeout: 10_000 });
            await selectWidget.click();
        }
        await this.page.locator('.ant-select-dropdown:visible').waitFor({ state: 'visible', timeout: 10_000 });
        // Allow the refetch triggered by focus/open to resolve
        await this.page.waitForTimeout(800);
    }
    /**
     * Assert that the currently open Ant Select dropdown contains an option
     * whose text matches the given string or regex.
     */
    async expectDropdownContainsOption(optionText) {
        const dropdown = this.page.locator('.ant-select-dropdown:visible').last();
        await (0, test_1.expect)(dropdown).toContainText(optionText, { timeout: 10_000 });
    }
    /** Close the currently open Ant Select dropdown without selecting anything. */
    async closeOpenDropdown() {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(300);
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
    async openTableReferenceFilter(fieldLabel) {
        const filterForm = this.page.locator('.ant-pro-query-filter');
        await filterForm.waitFor({ state: 'visible', timeout: 10_000 });
        const formItem = await this.getVisibleTableFilterFormItem(fieldLabel);
        // antd 6 renamed .ant-select-selector to .ant-select-content
        const selectContent = formItem.locator('.ant-select-content').first();
        await selectContent.waitFor({ state: 'visible', timeout: 10_000 });
        await selectContent.click();
        // Wait for the dropdown portal and for options to load
        await this.page.locator('.ant-select-dropdown:visible').waitFor({ state: 'visible', timeout: 15_000 });
        await this.page.waitForTimeout(600);
    }
    /**
     * Select an option from the currently open table filter dropdown.
     *
     * @param optionText - Exact text or regex to match against visible option labels
     */
    async selectTableFilterOption(optionText) {
        const dropdown = this.page.locator('.ant-select-dropdown:visible').last();
        const option = dropdown.locator('.ant-select-item-option').filter({ hasText: optionText }).first();
        await option.waitFor({ state: 'visible', timeout: 10_000 });
        await option.click();
        // Antd Select closes on Escape without clearing the selected value.
        // This is more reliable than waiting for the portal's CSS visibility to change.
        await this.page.keyboard.press('Escape');
        await this.waitForUiToSettle(300);
    }
    /**
     * Apply the current table filters by clicking the "Filter" submit button
     * in the ProTable query filter bar.  Waits for the table to finish loading.
     */
    async applyTableFilters() {
        const filterForm = this.page.locator('.ant-pro-query-filter');
        await filterForm.waitFor({ state: 'visible', timeout: 10_000 });
        const filterBtn = filterForm.getByRole('button', { name: /filter/i }).first();
        await filterBtn.waitFor({ state: 'visible', timeout: 10_000 });
        await filterBtn.click();
        await this.waitForTable();
    }
    /**
     * Clear all active table filters by clicking the "Clear" reset button
     * in the ProTable query filter bar.  Waits for the table to finish loading.
     */
    async clearTableFilters() {
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
    async uploadFileToDropZone(fieldLabel, files) {
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
        await this.page.waitForFunction((expected) => {
            return document.querySelectorAll('.ant-upload-list-item-done').length >= expected;
        }, fileArray.length, { timeout: 30_000 });
    }
    /**
     * Assert that the FileDropZone for the given field label shows a file
     * with the given name in its uploaded-files list.
     */
    async expectDropZoneFileVisible(fieldLabel, fileName) {
        const container = this._formContainer ?? this.page;
        const formItem = container
            .locator('.ant-form-item')
            .filter({ hasText: new RegExp(fieldLabel, 'i') })
            .first();
        const fileItem = formItem.locator('.ant-upload-list-item-name').filter({ hasText: fileName });
        await (0, test_1.expect)(fileItem.first()).toBeVisible({ timeout: 10_000 });
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
    async filterTable(fieldLabel, value) {
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
        }
        else {
            // Select-based filter (reference / choice field)
            await this.openTableReferenceFilter(fieldLabel);
            await this.selectTableFilterOption(value);
        }
        await this.applyTableFilters();
    }
    async getVisibleTableFilterFormItem(fieldLabel) {
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
    async findVisibleLocator(candidates) {
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
    async deleteFirstRow() {
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
        }
        else {
            // Fallback: open the row and use Manage > Delete
            await firstRow.click();
            await this.waitForDrawer();
            await this.clickManageDropdown();
            await this.clickManageOption(/delete/i);
        }
        await this.confirmDelete();
    }
    // ─── Row toolbar actions ──────────────────────────────────────────────
    /**
     * Hover a table row and click a button in its inline row toolbar.
     *
     * Row toolbars are rendered per-row (e.g. via `rowToolbar: { buttons: toolbar() }`)
     * and only become visible on hover. This helper reveals the toolbar and
     * clicks the first matching button without navigating away from the table.
     *
     * @param rowText      - Text that uniquely identifies the target row
     * @param buttonPattern - Regex (or string) matching the button's accessible name
     */
    async clickRowToolbarButton(rowText, buttonPattern) {
        const row = this.page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: rowText }).first();
        await row.waitFor({ state: 'visible', timeout: 10_000 });
        await row.hover();
        await this.page.waitForTimeout(300);
        const btn = row.getByRole('button', { name: buttonPattern });
        await btn.waitFor({ state: 'visible', timeout: 5_000 });
        await btn.click();
        await this.waitForUiToSettle();
    }
    // ─── Main menu navigation ─────────────────────────────────────────────
    /**
     * Click a main menu item by its visible label text.
     * Waits for the item to be visible before clicking, then waits for
     * the UI to settle (table / page load).
     *
     * @param label - Exact string or regex matching the menu item label
     */
    async clickMainMenuItem(label) {
        const item = this.page.locator('.ant-menu-item, .ant-menu-submenu-title').filter({ hasText: label }).first();
        await item.waitFor({ state: 'visible', timeout: 10_000 });
        await item.click();
        await this.waitForUiToSettle();
    }
    /**
     * Assert the visible label of a main menu item matches the expected text.
     *
     * @param itemLabel   - Partial text that uniquely identifies the menu item container
     * @param expectedText - String or regex the rendered label must satisfy
     */
    async expectMainMenuItemLabel(itemLabel, expectedText) {
        const item = this.page.locator('.ant-menu-item').filter({ hasText: itemLabel }).first();
        await item.waitFor({ state: 'visible', timeout: 10_000 });
        await (0, test_1.expect)(item).toContainText(expectedText, { timeout: 10_000 });
    }
    // ─── Left menu new-tab helpers ────────────────────────────────────────
    /**
     * Locate the `<a>` anchor element inside a left-sidebar menu item identified
     * by its visible label text.  The anchor is added by the framework's
     * `openInNewTab` feature so the browser context menu and modifier-clicks work.
     */
    async getLeftMenuItemAnchor(labelText) {
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
    async ctrlClickLeftMenuItem(labelText) {
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
    async middleClickLeftMenuItem(labelText) {
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
    async expectNewTabNavigatedTo(newPage, expectedPath) {
        await newPage.waitForURL((url) => url.pathname === expectedPath || url.pathname.startsWith(expectedPath + '/'), { timeout: 20_000 });
        await newPage.close();
    }
    // ─── Table column content assertions ─────────────────────────────────
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
    async expectTableFilteredBy(columnTitle, value) {
        const table = this.page.locator('.slingr-data-table, .ant-table-wrapper').first();
        await table.waitFor({ state: 'visible', timeout: 15_000 });
        // Resolve column index from header cells
        const headers = table.locator('.ant-table-thead th');
        const headerCount = await headers.count();
        let columnIndex = -1;
        for (let i = 0; i < headerCount; i++) {
            const text = await headers.nth(i).textContent();
            const matches = typeof columnTitle === 'string'
                ? (text ?? '').toLowerCase().includes(columnTitle.toLowerCase())
                : columnTitle.test(text ?? '');
            if (matches) {
                columnIndex = i;
                break;
            }
        }
        (0, test_1.expect)(columnIndex, `Column "${columnTitle}" not found in table headers`).toBeGreaterThanOrEqual(0);
        // Assert every data row's cell at that index contains the expected value
        const rows = table.locator('.ant-table-tbody tr.ant-table-row');
        const rowCount = await rows.count();
        (0, test_1.expect)(rowCount, `Expected at least one data row in the table`).toBeGreaterThan(0);
        for (let i = 0; i < rowCount; i++) {
            const cell = rows.nth(i).locator('td').nth(columnIndex);
            await (0, test_1.expect)(cell).toContainText(value, { timeout: 5_000 });
        }
    }
}
exports.SlingrTestKit = SlingrTestKit;
//# sourceMappingURL=slingr-test-kit.js.map
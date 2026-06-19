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
import { Page } from '@playwright/test';
interface LoginOptions {
    expectSuccess?: boolean;
}
export declare class SlingrTestKit {
    private readonly page;
    /**
     * When form operations happen inside a drawer (e.g. EditView opened over
     * a ReadView drawer), this stores the drawer container so that form
     * field locators scope correctly and don't match identically-named
     * table-filter inputs on the underlying page.
     */
    private _formContainer;
    constructor(page: Page);
    private getTopOverlayContainer;
    private waitForUiToSettle;
    private waitForLoginForm;
    /** Navigate to the login page, fill credentials and submit. */
    login(email: string, password: string, options?: LoginOptions): Promise<void>;
    /** Login with the default admin account. */
    loginAsAdmin(): Promise<void>;
    /** Login with the default manager account. */
    loginAsManager(): Promise<void>;
    /** The default manager's email (for test data setup/teardown). */
    get managerEmail(): string;
    /** Assert the user is authenticated (not on login page, app chrome visible). */
    expectLoggedIn(): Promise<void>;
    /** Assert the user is on the login page (logged out). */
    expectOnLoginPage(): Promise<void>;
    /** Open the avatar dropdown and click logout. */
    logout(): Promise<void>;
    /** Reload current page and wait for network. */
    reload(): Promise<void>;
    /** Navigate to a framework entity path (e.g. '/tasks', '/projects'). */
    navigateTo(entityPath: string): Promise<void>;
    /** Wait for the Slingr data-table component to be visible. */
    waitForTable(): Promise<void>;
    /**
     * Navigate to the last page of the current table by clicking the Ant Design
     * pagination "last page" button (the rightmost numbered item before the next
     * arrow). No-op when the table has only one page.
     */
    goToLastTablePage(): Promise<void>;
    /**
     * Wait for a Drawer or Modal to appear (used when row click opens a view
     * in a modal/drawer container instead of navigating by URL).
     */
    waitForDrawer(): Promise<void>;
    /** Assert that at least one visible drawer/modal container is open. */
    expectOverlayOpen(): Promise<void>;
    /** Click a visible tab in the topmost drawer/modal by accessible name. */
    clickTab(namePattern: RegExp): Promise<void>;
    /** Assert a tab is visible in the topmost drawer/modal. */
    expectTabVisible(namePattern: RegExp): Promise<void>;
    /** Open a nested view by tab name or button label in the topmost drawer/modal. */
    openNestedView(namePattern: RegExp): Promise<void>;
    /** Click a visible button in the topmost drawer/modal by accessible name. */
    clickOverlayButton(namePattern: RegExp): Promise<void>;
    /** Click the "Create <Entity>" button in the table toolbar. */
    clickCreateInTable(): Promise<void>;
    /**
     * Search for a record in the table using the first search/filter input,
     * then click Search to apply the filter.
     */
    searchInTable(text: string): Promise<void>;
    /** Click a table row that contains the given text. */
    clickTableRow(text: string): Promise<void>;
    /**
     * Open a row in Task table by title using the title filter input.
     * This is more deterministic for specs that create a new task and need
     * to immediately find it in tables with multiple active filters.
     */
    clickTaskRowByTitle(title: string): Promise<void>;
    /** Click the first data row in the table (no text filter). */
    clickFirstTableRow(): Promise<void>;
    /** Check the checkbox of a table row that contains the given text. */
    selectTableRowCheckbox(text: string): Promise<void>;
    /** Check the checkbox of the first data row in the table. */
    selectFirstRowCheckbox(): Promise<void>;
    /** Assert the table body contains the given text.  Searches first to handle pagination. */
    expectTableContains(text: string): Promise<void>;
    /** Assert the table body does NOT contain the given text.  Searches first to handle pagination. */
    expectTableNotContains(text: string): Promise<void>;
    /**
     * Wait for a form field to appear (indicating the form has rendered).
     * When drawers are open, automatically scopes to the topmost drawer
     * to avoid matching table-filter inputs that share the same field ID.
     */
    waitForForm(fieldId?: string): Promise<void>;
    /** Fill a text/number input field by its id attribute. */
    fillField(fieldId: string, value: string): Promise<void>;
    /** Clear a field and type a new value (for edit flows).
     *  Uses keyboard-level selection + type so Ant Design ProForm
     *  picks up the change in its internal form store.
     */
    clearAndFillField(fieldId: string, value: string): Promise<void>;
    /** Read current value from a text/number input field by id. */
    getFieldValue(fieldId: string): Promise<string>;
    /** Assert a form field is not visible in the current page/drawer context. */
    expectFieldNotVisible(fieldId: string): Promise<void>;
    /** Fill a <textarea> field matched by its placeholder text. */
    fillTextarea(placeholderPattern: RegExp, value: string): Promise<void>;
    private blurActiveElement;
    private selectFirstOptionInContainer;
    /**
     * Clear an Ant Select field (identified by its label text) by hovering to
     * reveal the clear icon and clicking it.  Works for ChoiceField & ReferenceField
     * when `allowClear` is enabled (the default in Slingr).
     */
    clearReferenceField(fieldLabel: string): Promise<void>;
    /** Clear a reference field only if it currently has a value selected. No-op otherwise. */
    clearReferenceFieldIfSet(fieldLabel: string): Promise<void>;
    /**
     * Click an Ant Select field (identified by its label text) and pick the
     * first option from the dropdown.  Works for ChoiceField & ReferenceField.
     */
    selectFirstOption(fieldLabel: string): Promise<void>;
    /**
     * Click an Ant Select field (identified by label text) and pick a specific
     * option by visible text. Useful when option order is unstable.
     */
    selectOption(fieldLabel: string, optionText: string | RegExp): Promise<void>;
    /**
     * Inside a composition panel (e.g. Notes), select the first option for
     * a ReferenceField identified by its placeholder text.
     * Useful when the framework auto-generates nested records with required fields.
     */
    selectFirstOptionByPlaceholder(placeholder: string): Promise<void>;
    /**
     * Wait for an auto-generated composition item to appear (e.g. a Note
     * created by onRefresh), then fill a required reference field inside it
     * by selecting the first dropdown option.
     */
    fillCompositionReferenceField(sectionTitle: string, fieldLabel: string): Promise<void>;
    /**
     * Best-effort variant of fillCompositionReferenceField.
     * Returns false when the composition section is not rendered.
     */
    fillCompositionReferenceFieldIfPresent(sectionTitle: string, fieldLabel: string): Promise<boolean>;
    /** Click the Add button inside a specific composition section/card. */
    addCompositionItem(sectionTitle: string): Promise<void>;
    /** Fill a text input by placeholder inside a specific composition section/card. */
    fillCompositionFieldByPlaceholder(sectionTitle: string, placeholderPattern: string | RegExp, value: string): Promise<void>;
    /** Click the "Create" submit button (icon prefix: "plus"). */
    submitCreate(): Promise<void>;
    /** Click the "Save" button in an edit form. */
    submitSave(): Promise<void>;
    /** Assert some text is visible on the current page. */
    expectTextVisible(text: string): Promise<void>;
    /** Open the "Manage" dropdown in a ReadView toolbar. Waits for the button to be visible (toolbar actions load asynchronously in drawers). */
    clickManageDropdown(): Promise<void>;
    /** Click an item inside the Manage dropdown (e.g. "Edit", "Delete"). */
    clickManageOption(namePattern: RegExp): Promise<void>;
    /** Open the "Actions" dropdown in a ReadView toolbar. */
    clickActionsDropdown(): Promise<void>;
    /** Click an item inside the Actions dropdown. */
    clickActionOption(namePattern: RegExp): Promise<void>;
    /** Click "Edit" or "Update" button directly (for views that expose it as a button). */
    clickEditButton(entityName?: string): Promise<void>;
    /** Click "Delete" button directly (for views that expose it as a button). */
    clickDeleteButton(entityName?: string): Promise<void>;
    /** Click the "More" button in the page header toolbar. */
    clickToolbarMoreButton(): Promise<void>;
    /**
     * Hover a table row containing `rowText`, then click its "…" (MoreOutlined)
     * row-actions button to open the dropdown menu.
     *
     * The row toolbar renders as a single Ant Design dropdown button with only
     * the MoreOutlined icon (accessible name "more").  Hover is required because
     * row toolbar buttons are only visible on row hover.
     */
    openRowActionsMenu(rowText: string): Promise<void>;
    /**
     * Assert that the currently open row actions dropdown contains the given label.
     * Call after `openRowActionsMenu()`.
     */
    expectRowActionVisible(label: string | RegExp): Promise<void>;
    /**
     * Assert that the currently open row actions dropdown does NOT contain the given label.
     * Call after `openRowActionsMenu()`.
     */
    expectRowActionNotVisible(label: string | RegExp): Promise<void>;
    /** Click a menu item by name pattern (generic — works in any dropdown/menu). */
    clickMenuItem(namePattern: RegExp): Promise<void>;
    /**
     * Confirm a delete dialog.
     * The framework uses Modal.confirm with submitterLabel 'Delete' for
     * single-record deletes and 'Execute' for generic action confirmations.
     */
    confirmDelete(): Promise<void>;
    /** Click the delete button and wait for it to become enabled before clicking. */
    clickDeleteButtonAndWait(buttonName?: string): Promise<void>;
    /** Wait for an action dialog (modal) with the given title pattern to appear. */
    waitForDialog(namePattern: RegExp): Promise<void>;
    /**
     * Inside the currently visible dialog, click a select field and pick
     * the first option.
     */
    selectFirstOptionInDialog(dialogName: RegExp, fieldLabel: string): Promise<void>;
    /** Click the "Execute" button inside a named dialog. */
    executeDialog(dialogName: RegExp): Promise<void>;
    /**
     * Click the checkbox of a table row at the given 0-based index.
     * Uses the .ant-table-selection-column cell inside tbody rows.
     */
    selectTableRowByIndex(index: number): Promise<void>;
    /**
     * Click the custom header checkbox in the selection column.
     * This cycles through the 3-state logic (empty → all-visible → all-global → clear).
     */
    clickHeaderCheckbox(): Promise<void>;
    /**
     * Click the ProTable reload/refresh icon button in the top-right options bar.
     */
    clickTableRefresh(): Promise<void>;
    /**
     * Click the "Clear" link inside the ProTable selection alert bar.
     */
    clearTableSelection(): Promise<void>;
    /**
     * Assert the ProTable selection alert shows the expected text
     * (e.g. "3 items selected" or "All 2004 rows selected").
     */
    expectSelectionAlertText(textPattern: string | RegExp): Promise<void>;
    /**
     * Assert no ProTable selection alert banner is currently visible.
     */
    expectNoSelectionAlert(): Promise<void>;
    /**
     * Assert that the header selection checkbox is in the orange (all-global) state.
     * In antd 6 the color is applied via CSS variable --ant-color-primary set by
     * the ConfigProvider wrapper. We detect the orange state by checking for the
     * title rendered only in the all-rows-selected state and then verify the CSS
     * variable resolves to the orange value.
     */
    expectHeaderCheckboxOrange(): Promise<void>;
    /**
     * Click a toolbar button (anywhere on the page) whose accessible name
     * matches the given pattern. Works for both the page-header toolbar and
     * the ProTable toolbar (e.g. "Bulk Change Priority (2)", "Delete (3)").
     */
    clickBulkActionButton(namePattern: RegExp): Promise<void>;
    /**
     * Assert that a toolbar button whose accessible name matches the given
     * pattern is visible on the page.
     */
    expectBulkActionButtonVisible(namePattern: RegExp): Promise<void>;
    /**
     * Assert that no toolbar button whose accessible name matches the given
     * pattern is visible on the page.
     */
    expectBulkActionButtonNotVisible(namePattern: RegExp): Promise<void>;
    /**
     * Cancel the currently open dialog or confirmation modal.
     * Prefers scoping to `.ant-modal-confirm` if one is present.
     */
    cancelDialog(): Promise<void>;
    /** Assert a success/info message matching the pattern is visible. */
    expectFeedback(textPattern: string | RegExp): Promise<void>;
    /** Assert a success toast/notification is visible without relying on specific text. */
    expectSuccessFeedback(): Promise<void>;
    /** Assert current URL matches the given pattern. */
    expectUrlMatches(pattern: RegExp): Promise<void>;
    /** Assert current URL does not match the given pattern. */
    expectUrlNotMatches(pattern: RegExp): Promise<void>;
    /** Assert a form-item label area contains a non-empty value. */
    expectFieldHasValue(fieldLabel: string): Promise<void>;
    /**
     * Fill a date or dateTime picker field by clicking its input, typing the value
     * character-by-character, and pressing Enter to confirm.
     * Ant Design DatePicker inputs don't support Playwright's `.fill()` because
     * they manage focus/selection internally.
     *
     * @param fieldId - The HTML id of the input rendered by Form.Item (e.g. 'dueDate')
     * @param value   - Date string in the display format (e.g. '15-06-2099')
     */
    fillDateField(fieldId: string, value: string): Promise<void>;
    /**
     * Clear a date or dateTime picker field by clicking the Ant Design clear (✕) button.
     * Scoped to the current form container (drawer/modal) if one is active.
     *
     * @param fieldId - The HTML id of the hidden input rendered by Form.Item (e.g. 'dueDate')
     */
    clearDateField(fieldId: string): Promise<void>;
    /**
     * Assert a date/dateTime picker field is empty (shows placeholder, no value).
     *
     * @param fieldId - The HTML id of the hidden input (e.g. 'dueDate')
     */
    expectDateFieldEmpty(fieldId: string): Promise<void>;
    /**
     * Assert a date/dateTime picker field contains a non-empty value.
     *
     * @param fieldId - The HTML id of the hidden input (e.g. 'dueDate')
     */
    expectDateFieldNotEmpty(fieldId: string): Promise<void>;
    /**
     * Type text into a table filter input **without** clicking the Filter button.
     * This simulates a user typing in the filter bar and then navigating away
     * (e.g. opening a record) before applying the filter.
     *
     * @param placeholder - Partial placeholder text or field name to find the input
     * @param value       - The text to type
     */
    typeInFilterWithoutApplying(placeholder: string, value: string): Promise<void>;
    /**
     * Click the Ant Select widget for a reference field, opening its option
     * dropdown.  The dropdown remains open after this call so the caller
     * can assert options with expectDropdownContainsOption().
     */
    openReferenceDropdown(fieldLabel: string): Promise<void>;
    /**
     * Assert that the currently open Ant Select dropdown contains an option
     * whose text matches the given string or regex.
     */
    expectDropdownContainsOption(optionText: string | RegExp): Promise<void>;
    /** Close the currently open Ant Select dropdown without selecting anything. */
    closeOpenDropdown(): Promise<void>;
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
    openTableReferenceFilter(fieldLabel: string): Promise<void>;
    /**
     * Select an option from the currently open table filter dropdown.
     *
     * @param optionText - Exact text or regex to match against visible option labels
     */
    selectTableFilterOption(optionText: string | RegExp): Promise<void>;
    /**
     * Apply the current table filters by clicking the "Filter" submit button
     * in the ProTable query filter bar.  Waits for the table to finish loading.
     */
    applyTableFilters(): Promise<void>;
    /**
     * Clear all active table filters by clicking the "Clear" reset button
     * in the ProTable query filter bar.  Waits for the table to finish loading.
     */
    clearTableFilters(): Promise<void>;
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
    uploadFileToDropZone(fieldLabel: string, files: string | string[]): Promise<void>;
    /**
     * Assert that the FileDropZone for the given field label shows a file
     * with the given name in its uploaded-files list.
     */
    expectDropZoneFileVisible(fieldLabel: string, fileName: string): Promise<void>;
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
    filterTable(fieldLabel: string, value: string): Promise<void>;
    private getVisibleTableFilterFormItem;
    private findVisibleLocator;
    /**
     * Delete the first visible row in the data table.
     *
     * Prefers an inline Delete icon button rendered in the row's action column.
     * Falls back to opening the row (drawer/ReadView) and using Manage → Delete
     * when no inline button is found.  Always calls confirmDelete() to dismiss
     * the confirmation modal.
     */
    deleteFirstRow(): Promise<void>;
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
    clickRowToolbarButton(rowText: string, buttonPattern: string | RegExp): Promise<void>;
    /**
     * Click a main menu item by its visible label text.
     * Waits for the item to be visible before clicking, then waits for
     * the UI to settle (table / page load).
     *
     * @param label - Exact string or regex matching the menu item label
     */
    clickMainMenuItem(label: string | RegExp): Promise<void>;
    /**
     * Assert the visible label of a main menu item matches the expected text.
     *
     * @param itemLabel   - Partial text that uniquely identifies the menu item container
     * @param expectedText - String or regex the rendered label must satisfy
     */
    expectMainMenuItemLabel(itemLabel: string | RegExp, expectedText: string | RegExp): Promise<void>;
    /**
     * Locate the `<a>` anchor element inside a left-sidebar menu item identified
     * by its visible label text.  The anchor is added by the framework's
     * `openInNewTab` feature so the browser context menu and modifier-clicks work.
     */
    private getLeftMenuItemAnchor;
    /**
     * Ctrl/Cmd+click a left-sidebar menu item and return the new `Page`
     * (browser tab) that opens.  Pass the returned page to
     * `expectNewTabNavigatedTo()` to assert the destination.
     *
     * @param labelText - Visible text of the menu item to click
     */
    ctrlClickLeftMenuItem(labelText: string): Promise<Page>;
    /**
     * Middle-click a left-sidebar menu item and return the new `Page`
     * (browser tab) that opens.  Pass the returned page to
     * `expectNewTabNavigatedTo()` to assert the destination.
     *
     * @param labelText - Visible text of the menu item to click
     */
    middleClickLeftMenuItem(labelText: string): Promise<Page>;
    /**
     * Assert that a `Page` opened in a new browser tab has navigated to the
     * expected path, then close it.
     *
     * @param newPage      - The `Page` returned by `ctrlClickLeftMenuItem` / `middleClickLeftMenuItem`
     * @param expectedPath - The URL pathname to expect (e.g. `'/projects'`)
     */
    expectNewTabNavigatedTo(newPage: Page, expectedPath: string): Promise<void>;
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
    expectTableFilteredBy(columnTitle: string | RegExp, value: string | RegExp): Promise<void>;
}
export {};

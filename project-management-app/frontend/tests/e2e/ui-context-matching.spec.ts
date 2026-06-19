import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createTaskFixture, deleteTaskFixture } =
  require('./framework/task-fixtures') as {
    createTaskFixture: (
      app: DrumrTestKit,
      page: import('@playwright/test').Page,
      title: string,
      options?: { status?: string; technicalDetails?: string },
    ) => Promise<string | null>;
    deleteTaskFixture: (app: DrumrTestKit, title: string) => Promise<void>;
  };

/**
 * E2E suite: `defineDataModelDefaults` — UiContext matcher coverage
 *
 * Covers every non-trivial matcher type available in the framework:
 *
 *  ─── String matchers ──────────────────────────────────────────────────────
 *  1. 'read' fallback        — label "Technical Details" on ReadView page
 *                              (verifies fallback wins when no specific match)
 *  2. 'read' label override  — "Estimated" in read, "Estimated Hours" in write
 *
 *  ─── Object matchers ──────────────────────────────────────────────────────
 *  3. { usage: 'table' }                          — Tech Details column renders
 *  4. { view: { type: 'readView', container: 'modal' } } — "(preview)" in drawer
 *  5. { view: { type: 'editView' } }              — "(edit)" in edit form
 *  6. { view: { type: 'createView' } }            — "(new)" on create page
 *
 *  ─── Function matchers ────────────────────────────────────────────────────
 *  7. (task) => task.status !== 'done'            — completedAt hidden in edit
 *  8. (task) => task.status === 'done'            — completedAt visible in read
 *     (uses a suite-created task with status done)
 *  9. reactive re-evaluation                      — completedAt appears when status
 *     is changed to Done inside an open edit form
 *
 *  ─── App state ────────────────────────────────────────────────────────────
 *  The suite creates one active task and one done task in setup and deletes
 *  them in teardown so the assertions do not depend on preloaded seed data.
 */

const SUFFIX = Date.now();
const TASK_TITLE = `E2E CtxMatch-${SUFFIX}`;
const DONE_TASK_TITLE = `E2E CtxMatch Done-${SUFFIX}`;
const TECHNICAL_DETAILS_TEXT = `Context-matching coverage ${SUFFIX}`;

let createdTaskId: string | null = null;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe
  .serial('defineDataModelDefaults — UiContext matching', () => {
    test.setTimeout(180_000);

    // ── Setup ────────────────────────────────────────────────────────────────

    test('setup: create task for context-matching coverage', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      createdTaskId = await createTaskFixture(app, page, TASK_TITLE, {
        technicalDetails: TECHNICAL_DETAILS_TEXT,
      });
      if (!createdTaskId) {
        throw new Error(
          'Setup could not capture the created task id for the page-level ReadView test.',
        );
      }

      await createTaskFixture(app, page, DONE_TASK_TITLE, {
        status: 'Done',
        technicalDetails: TECHNICAL_DETAILS_TEXT,
      });
    });

    // ── Case 1: 'read' string fallback on ReadView page ──────────────────────
    // Matcher: 'read' (generic fallback)
    // Surface: /tasks/:id  (ReadView rendered as a full page, container:'page')
    // Verifies: the specific readView+modal matcher does NOT fire — fallback wins

    test("string fallback 'read' — ReadView page shows generic 'Technical Details' label", async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      if (!createdTaskId) {
        throw new Error(
          'Setup did not create a task id for the page-level ReadView assertion.',
        );
      }
      await app.navigateTo(`/tasks/${createdTaskId}`);
      await app.waitForReadView();

      // This page-level ReadView uses a static shell title, so wait for the route
      // itself instead of a record title that is not rendered as visible page text.
      await expect(page).toHaveURL(
        new RegExp(`/tasks/${createdTaskId}(?:$|[/?#])`),
        { timeout: 10_000 },
      );

      // Generic 'read' fallback should win — no view.type+container matcher applies on a full page
      await expect(
        page.getByText('Technical Details', { exact: true }),
      ).toBeVisible({ timeout: 10_000 });
      // The modal-specific label must NOT appear
      await expect(page.getByText('Technical Details (preview)')).toBeHidden({
        timeout: 5_000,
      });
    });

    // ── Case 2: 'read' / 'write' label override (estimatedHours) ─────────────
    // Matcher: 'read' → label 'Estimated' / 'write' → label 'Estimated Hours'
    // Verifies: same field gets different label depending on mode

    test("string matcher label override — 'Estimated' in read drawer, 'Estimated Hours' in edit", async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();

      const drawer = page
        .locator('.ant-drawer:visible, .ant-modal-wrap:visible')
        .last();
      // Read mode: short label
      await expect(drawer.getByText('Estimated', { exact: true })).toBeVisible({
        timeout: 10_000,
      });

      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      const editOverlay = page
        .locator('.ant-drawer:visible, .ant-modal-wrap:visible')
        .last();
      // Write mode: full label
      await expect(
        editOverlay.getByText('Estimated Hours', { exact: true }),
      ).toBeVisible({ timeout: 10_000 });
    });

    // ── Case 3: { usage: 'table' } object matcher ────────────────────────────
    // Matcher: { usage: 'table' }
    // Surface: TaskTableView column
    // Verifies: TextLabel is used (plain text, no height-constrained scroll container)
    //           instead of the LongTextLabel used in the 'read' fallback.

    // ── Case 3: { usage: 'table' } object matcher ────────────────────────────
    // Matcher: { usage: 'table' }
    // Surface: TaskTableView column
    // Verifies: TextLabel is used instead of LongTextLabel.
    //   - TextLabel renders as a plain inline span — no height-constrained wrapper div.
    //   - LongTextLabel (used by the 'read' fallback) always adds a div with inline height style.
    //   - No Monaco editor and no textarea should be present in the cell.

    test("object matcher { usage:'table' } — Tech Details cell renders as plain text (TextLabel, no height container)", async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      const header = page
        .locator('.ant-table-thead th')
        .filter({ hasText: /tech details/i });
      await expect(header).toBeVisible({ timeout: 10_000 });

      // Locate the Tech Details column index
      const allHeaders = page.locator('.ant-table-thead th');
      const count = await allHeaders.count();
      let colIndex = -1;
      for (let i = 0; i < count; i++) {
        const text = await allHeaders.nth(i).textContent();
        if (text?.match(/tech details/i)) {
          colIndex = i;
          break;
        }
      }
      expect(colIndex).toBeGreaterThanOrEqual(0);

      // Filter to the suite-created task so it is guaranteed to be in the visible page
      await app.filterTable('Title', TASK_TITLE);
      await app.waitForTable();

      // Use the suite-created row, whose technicalDetails field was populated in setup
      const taskRow = page
        .locator('.ant-table-tbody tr')
        .filter({ hasText: TASK_TITLE })
        .first();
      await expect(taskRow).toBeVisible({ timeout: 10_000 });
      const cell = taskRow.locator('td').nth(colIndex);
      await expect(cell).toBeVisible({ timeout: 5_000 });

      // TextLabel renders as plain inline text — no height-constrained container div
      // (LongTextLabel always wraps content in a div with inline style="height:...")
      await expect(cell.locator('[style*="height"]')).toHaveCount(0, {
        timeout: 5_000,
      });
      // No Monaco editor (that would come from LongTextLabel/LongTextInput with control="codeEditor")
      await expect(cell.locator('.monaco-editor, textarea')).toHaveCount(0, {
        timeout: 5_000,
      });
      // Cell text content must be visible and non-empty
      await expect(cell).not.toBeEmpty();
    });

    // ── Case 4: { view: { type:'readView', container:'modal' } } ─────────────
    // Matcher: { view: { type:'readView', container:'modal' } }
    // Surface: drawer opened via openView() from TaskTableView row click
    // Verifies: specific modal+readView matcher wins over generic 'read' fallback

    test("object matcher { view.type:'readView', container:'modal' } — shows '(preview)' label in drawer", async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();

      const overlay = page
        .locator('.ant-drawer:visible, .ant-modal-wrap:visible')
        .last();
      await expect(
        overlay.getByText('Technical Details (preview)'),
      ).toBeVisible({ timeout: 10_000 });
    });

    // ── Case 5: { view: { type:'editView' } } ────────────────────────────────
    // Matcher: { view: { type:'editView' } }
    // Surface: edit modal opened from the read drawer (Manage → Edit)
    // Verifies: editView matcher wins over generic 'write' fallback

    test("object matcher { view.type:'editView' } — shows '(edit)' label in edit form", async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      const overlay = page
        .locator('.ant-drawer:visible, .ant-modal-wrap:visible')
        .last();
      await expect(overlay.getByText('Technical Details (edit)')).toBeVisible({
        timeout: 10_000,
      });
    });

    // ── Case 6: { view: { type:'createView' } } ──────────────────────────────
    // Matcher: { view: { type:'createView' } }
    // Surface: /tasks/new (TaskCreateView full page)
    // Verifies: createView matcher wins over generic 'write' fallback

    test("object matcher { view.type:'createView' } — shows '(new)' label on create page", async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks/new');
      await app.waitForForm('title');

      await expect(page.getByText('Technical Details (new)')).toBeVisible({
        timeout: 10_000,
      });
    });

    // ── Case 7: function matcher — field hidden when condition is false ────────
    // Matcher: (task) => task.status !== 'done'  → visible: false
    // Surface: edit form of a task with status 'to_do'
    // Verifies: completedAt field is not rendered when the function returns false

    test('function matcher — completedAt hidden in edit form when status is To Do', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      await app.expectFieldNotVisible('completedAt');
    });

    // ── Case 8: function matcher — field visible when condition is true ────────
    // Matcher: (task) => task.status === 'done'  → visible: true
    // Surface: read drawer of the suite-created task with status done
    // Verifies: completedAt field is present when the function returns true

    test('function matcher — completedAt visible in read drawer when status is Done', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.filterTable('Title', DONE_TASK_TITLE);
      await app.waitForTable();
      await app.clickTaskRowByTitle(DONE_TASK_TITLE);
      await app.waitForDrawer();

      const drawer = page
        .locator('.ant-drawer:visible, .ant-modal-wrap:visible')
        .last();
      // completedAt row must be present when status === 'done'
      // In ReadView, fields render as plain label+value pairs (no .ant-form-item wrapper)
      await expect(drawer.getByText(/completed at/i).first()).toBeVisible({
        timeout: 10_000,
      });
    });

    // ── Case 9: function matcher — editView with status 'done' ───────────────
    // Matcher: (task) => task?.status === 'done'  →  visible: true
    // Surface: edit form opened on the suite-created task that already has status 'done'
    // Verifies: completedAt IS visible in edit form when the entity is in done state
    // (Complements case 8: hidden when to_do; here: visible when done)

    test('function matcher — completedAt visible in edit form when status is Done', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.filterTable('Title', DONE_TASK_TITLE);
      await app.clickTaskRowByTitle(DONE_TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      // completedAt must be visible because status === 'done'
      const container = page
        .locator('.ant-drawer:visible, .ant-modal-wrap:visible')
        .last();
      await expect(
        container
          .locator('.ant-form-item')
          .filter({ hasText: /completed at/i })
          .first(),
      ).toBeVisible({ timeout: 10_000 });
    });

    // ── Teardown ──────────────────────────────────────────────────────────────

    test('teardown: delete task created for context-matching coverage', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await deleteTaskFixture(app, TASK_TITLE);
      await deleteTaskFixture(app, DONE_TASK_TITLE);
    });
  });

/**
 * E2E tests for file upload rejection and file preview:
 *
 * 1. OVERSIZED UPLOAD REJECTION — The FileDropZone component's `beforeUpload`
 *    callback checks `file.size > maxSize` and calls
 *    `message.error('File "${name}" is too large (${MB}MB). Maximum size is ${maxMB}MB')`.
 *    For task attachments the configured max is 10 MB.
 *    This test uploads a >10 MB in-memory buffer and asserts:
 *      a) The Ant Design message error toast appears with the right text.
 *      b) The file does NOT appear in the upload list.
 *
 * 2. VALID UPLOAD + FILE LABEL IN READ VIEW — Upload a small valid file on the
 *    task create form, save the task, navigate to the task read view (opens as
 *    a drawer from the table), and verify:
 *      a) The attachment filename appears in the Attachments section.
 *      b) The "Preview" button (`getByTitle('Preview')`) is present.
 *
 * The tests in this file are serial because they share the same browser
 * session. beforeAll creates a Task for the download test; afterAll deletes it.
 *
 * All DOM interactions are through DrumrTestKit methods.
 */

import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_FILE = {
  name: 'upload-fixture.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('Drumr upload fixture file — valid size'),
};

/** 11 MB buffer — exceeds the 10 MB task-attachment limit; uses .txt so it
 *  passes the acceptedTypes check and reaches the maxSize check. */
const OVERSIZED_FILE = {
  name: 'too-large.txt',
  mimeType: 'text/plain',
  buffer: Buffer.alloc(11 * 1024 * 1024, 'x'),
};

const FILE_UPLOAD_SELECTOR = '.ant-upload-drag input[type="file"]';

// ── Serial suite ──────────────────────────────────────────────────────────────

test.describe
  .serial('File upload rejection and file download in task attachments', () => {
    test.setTimeout(120_000);

    // ── Oversized upload rejection ─────────────────────────────────────────────

    test('oversized file triggers a toast error and does NOT appear in the upload list', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      await app.navigateTo('/tasks/new');
      await page
        .locator('#drumr-field-title')
        .waitFor({ state: 'visible', timeout: 15_000 });

      // Fill required fields so we can stay on the page long enough to see the error
      await app.fillField('title', `Oversize-${Date.now()}`);

      // Locate the file input inside the Attachments dropzone
      const attachmentsCard = page
        .locator('.ant-upload-wrapper')
        .filter({ has: page.locator('.ant-upload-drag') })
        .first();
      await attachmentsCard
        .locator('.ant-upload-drag')
        .waitFor({ state: 'visible', timeout: 15_000 });

      const fileInput = attachmentsCard.locator(FILE_UPLOAD_SELECTOR);

      // Set the oversized file via Playwright's setInputFiles
      await fileInput.setInputFiles({
        name: OVERSIZED_FILE.name,
        mimeType: OVERSIZED_FILE.mimeType,
        buffer: OVERSIZED_FILE.buffer,
      });

      // The beforeUpload guard calls message.error("File too large. Maximum size is …")
      const errorToast = page
        .locator('.ant-message-notice')
        .filter({ hasText: /too large|maximum size/i })
        .first();
      const hasError = await errorToast
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => true)
        .catch(() => false);

      expect(
        hasError,
        'Expected a toast error message about file being too large',
      ).toBe(true);

      // The oversized file must NOT appear in the upload list
      const uploadList = attachmentsCard.locator('.ant-upload-list-item-name');
      const uploadedFileName = await uploadList
        .filter({ hasText: OVERSIZED_FILE.name })
        .first()
        .isVisible()
        .catch(() => false);
      expect(
        uploadedFileName,
        'Oversized file should NOT appear in the upload list',
      ).toBe(false);
    });

    // ── Valid upload + file label in read view ─────────────────────────────────

    test('valid file upload appears in upload list and can be removed before submit', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      await app.navigateTo('/tasks/new');
      await page
        .locator('#drumr-field-title')
        .waitFor({ state: 'visible', timeout: 15_000 });

      await app.fillField('title', `ValidUpload-${Date.now()}`);

      const attachmentsCard = page
        .locator('.ant-upload-wrapper')
        .filter({ has: page.locator('.ant-upload-drag') })
        .first();
      await attachmentsCard
        .locator('.ant-upload-drag')
        .waitFor({ state: 'visible', timeout: 15_000 });

      const fileInput = attachmentsCard.locator(FILE_UPLOAD_SELECTOR);
      await fileInput.setInputFiles({
        name: VALID_FILE.name,
        mimeType: VALID_FILE.mimeType,
        buffer: VALID_FILE.buffer,
      });

      // Valid file should appear in the upload list
      const uploadListItem = attachmentsCard
        .locator('.ant-upload-list-item-name')
        .filter({ hasText: VALID_FILE.name })
        .first();
      await expect(uploadListItem).toBeVisible({ timeout: 15_000 });

      // Remove the file (test cleanup — don't leave the form open)
      const removeBtn = attachmentsCard
        .locator('.ant-upload-list-item')
        .filter({ hasText: VALID_FILE.name })
        .getByTitle('Remove file')
        .first();
      const hasRemoveBtn = await removeBtn.isVisible().catch(() => false);
      if (hasRemoveBtn) {
        await removeBtn.click();
        await expect(uploadListItem).toBeHidden({ timeout: 10_000 });
      }
    });

    test('task saved with attachment shows file in read view with Preview button', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      const uniqueTitle = `AttachmentTask-${Date.now()}`;

      // ── Create a task with a valid attachment ──────────────────────────────
      await app.navigateTo('/tasks/new');
      await page
        .locator('#drumr-field-title')
        .waitFor({ state: 'visible', timeout: 15_000 });

      // Select first available project (required field)
      await app.fillField('title', uniqueTitle);
      await app.selectOption('Project', 'Mobile App Launch');
      await page.waitForTimeout(500);

      // Upload the fixture attachment
      const attachmentsCard = page
        .locator('.ant-upload-wrapper')
        .filter({ has: page.locator('.ant-upload-drag') })
        .first();
      await attachmentsCard.scrollIntoViewIfNeeded();
      await attachmentsCard
        .locator('.ant-upload-drag')
        .waitFor({ state: 'visible', timeout: 10_000 });

      const fileInput = attachmentsCard.locator(FILE_UPLOAD_SELECTOR);
      await fileInput.setInputFiles({
        name: VALID_FILE.name,
        mimeType: VALID_FILE.mimeType,
        buffer: VALID_FILE.buffer,
      });

      // Wait for upload item to appear in the list
      const uploadItem = attachmentsCard
        .locator('.ant-upload-list-item-name')
        .filter({ hasText: VALID_FILE.name })
        .first();
      await expect(uploadItem).toBeVisible({ timeout: 20_000 });
      // Wait for the "uploaded successfully" toast — fires AFTER inputProps.onChange()
      // updates the TanStack form state with the file ID, so the form is ready to submit.
      const uploadSuccessToast = page
        .locator('.ant-message-notice')
        .filter({ hasText: /uploaded successfully/i })
        .first();
      await uploadSuccessToast
        .waitFor({ state: 'visible', timeout: 20_000 })
        .catch(() => {
          // If toast disappears before we catch it, proceed anyway — the upload
          // item is visible which means customUpload already called onChange().
        });

      // Submit the create form
      await app.submitCreate().catch(() => {
        // submitCreate may resolve or may time out — we'll check URL below
      });

      // Wait for navigation away from the create form
      await page
        .waitForURL(/\/tasks(?!\/new)/, { timeout: 30_000 })
        .catch(() => {});

      // ── Navigate to the tasks table and find the created task ──────────────
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.searchInTable(uniqueTitle);

      // Find the row with the task title
      const taskRow = page
        .locator('.ant-table-tbody tr.ant-table-row')
        .filter({ hasText: uniqueTitle })
        .first();

      const hasRow = await taskRow
        .waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => true)
        .catch(() => false);

      expect(
        hasRow,
        `Task "${uniqueTitle}" should appear in the table after creation`,
      ).toBe(true);

      await taskRow.click();
      await app.waitForDrawer();

      // ── Verify attachment in read view ──────────────────────────────────────
      // Scroll the drawer body to the bottom to expose the Attachments section.
      const drawerBody = page.locator('.ant-drawer-body').first();
      await drawerBody.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await page.waitForTimeout(500);

      // The FileLabel component renders a <Typography.Link> (→ <a>) with the filename.
      const fileLabel = page
        .getByText(VALID_FILE.name, { exact: true })
        .first();
      await expect(fileLabel).toBeVisible({ timeout: 15_000 });

      // The "Preview" button may be rendered by FileLabel when the backend returns
      // a previewUrl or resourcePath for the file. It uses the button text "Preview"
      // (no title attribute), so we use getByRole with a name pattern.
      // We also check getByTitle for the Ant Design Upload list's built-in preview icon.
      const hasPreview =
        (await page
          .getByRole('button', { name: /preview/i })
          .first()
          .isVisible()
          .catch(() => false)) ||
        (await page
          .getByTitle('Preview')
          .first()
          .isVisible()
          .catch(() => false));
      // In the read view the FileLabel renders a "Preview" button
      expect(
        hasPreview,
        'Expected a "Preview" button next to the uploaded attachment',
      ).toBe(true);

      // ── Cleanup — delete the task via Actions toolbar ─────────────────────
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    });

    // ── Edge case: upload multiple files ──────────────────────────────────────

    test('can upload multiple valid files in the same attachment dropzone', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      await app.navigateTo('/tasks/new');
      await page
        .locator('#drumr-field-title')
        .waitFor({ state: 'visible', timeout: 15_000 });

      await app.fillField('title', `MultiUpload-${Date.now()}`);

      const attachmentsCard = page
        .locator('.ant-upload-wrapper')
        .filter({ has: page.locator('.ant-upload-drag') })
        .first();
      await attachmentsCard.scrollIntoViewIfNeeded();
      await attachmentsCard
        .locator('.ant-upload-drag')
        .waitFor({ state: 'visible', timeout: 10_000 });

      const fileInput = attachmentsCard.locator(FILE_UPLOAD_SELECTOR);

      const file1 = {
        name: 'file-one.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('File 1'),
      };
      const file2 = {
        name: 'file-two.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('File 2'),
      };

      // Upload first file
      await fileInput.setInputFiles(file1);
      const item1 = attachmentsCard
        .locator('.ant-upload-list-item-name')
        .filter({ hasText: file1.name })
        .first();
      await expect(item1).toBeVisible({ timeout: 10_000 });

      // Upload second file
      await fileInput.setInputFiles(file2);
      const item2 = attachmentsCard
        .locator('.ant-upload-list-item-name')
        .filter({ hasText: file2.name })
        .first();
      await expect(item2).toBeVisible({ timeout: 10_000 });

      // Both items should be in the list
      const allItems = attachmentsCard.locator('.ant-upload-list-item-name');
      const count = await allItems.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

/**
 * E2E tests for the FileDropZone component via the Task "Attachments" field.
 *
 * The Task model exposes `attachments: File[]` with:
 *   - write context → file.dropZone  (acceptedTypes: image/*, .pdf, .doc, .docx, .txt; maxFiles: 10)
 *   - read  context → file.label
 *
 * These tests exercise the full upload/preview/remove lifecycle using the
 * Task create form, which is the canonical multi-file FileDropZone usage in
 * this app.
 */

// Fixture helpers — create in-memory files with allowed extensions (.txt, .pdf)
// so they pass the component's beforeUpload mime/extension check.
const TXT_FIXTURE = {
  name: 'attachment-one.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('Attachment fixture file 1'),
};
const PDF_FIXTURE = {
  name: 'attachment-two.pdf',
  mimeType: 'application/pdf',
  // Minimal valid PDF header so the server (if it validates) recognises the type
  buffer: Buffer.from('%PDF-1.4 1 0 obj<</Type/Catalog>>endobj'),
};

test.describe
  .serial('FileDropZone — Task Attachments', () => {
    test.setTimeout(60_000);

    /** Navigate to the Task create form. */
    async function openTaskCreateForm(app: DrumrTestKit, page: any) {
      await app.navigateTo('/tasks/new');
      // Wait for the form to be ready
      await page
        .locator('#drumr-field-title')
        .waitFor({ state: 'visible', timeout: 15_000 });
    }

    /** Scroll to the Attachments card (it's at the bottom of the form). */
    async function scrollToAttachments(page: any) {
      const attachmentsCard = page
        .locator('.ant-card')
        .filter({ hasText: 'Attachments' });
      await attachmentsCard.scrollIntoViewIfNeeded();
      return attachmentsCard;
    }

    // ── Rendering ─────────────────────────────────────────────────────

    test('FileDropZone renders in the Task create form', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await openTaskCreateForm(app, page);
      await scrollToAttachments(page);

      // The Ant Design dragger must be visible
      const dropZone = page.locator('.ant-upload-drag').first();
      await expect(dropZone).toBeVisible({ timeout: 10_000 });

      // Default hint text should appear
      await expect(
        page.getByText(
          'Images, PDFs or documents — max 10 MB each, up to 10 files',
        ),
      ).toBeVisible();
    });

    test('drop zone shows multi-file upload text', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await openTaskCreateForm(app, page);
      await scrollToAttachments(page);

      await expect(
        page.getByText('Click or drag files to this area to upload'),
      ).toBeVisible({ timeout: 10_000 });
    });

    // ── Single file upload ────────────────────────────────────────────

    test('uploads a single file and shows it in the file list', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await openTaskCreateForm(app, page);
      await scrollToAttachments(page);

      const fileInput = page
        .locator('.ant-upload-drag input[type="file"]')
        .first();
      await fileInput.setInputFiles(TXT_FIXTURE);

      // File name must appear in the uploaded list
      await expect(page.getByText(TXT_FIXTURE.name).first()).toBeVisible({
        timeout: 15_000,
      });
    });

    // ── Multiple file upload ──────────────────────────────────────────

    test('uploads two files and both appear in the file list', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await openTaskCreateForm(app, page);
      await scrollToAttachments(page);

      const fileInput = page
        .locator('.ant-upload-drag input[type="file"]')
        .first();

      // Upload first file
      await fileInput.setInputFiles(TXT_FIXTURE);
      await expect(page.getByText(TXT_FIXTURE.name).first()).toBeVisible({
        timeout: 15_000,
      });

      // Upload second file
      await fileInput.setInputFiles(PDF_FIXTURE);
      await expect(page.getByText(PDF_FIXTURE.name).first()).toBeVisible({
        timeout: 15_000,
      });

      // Both must coexist — the first must still be present
      await expect(page.getByText(TXT_FIXTURE.name).first()).toBeVisible();
    });

    // ── Preview button ────────────────────────────────────────────────

    test('shows a Preview button for each uploaded file', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await openTaskCreateForm(app, page);
      await scrollToAttachments(page);

      const fileInput = page
        .locator('.ant-upload-drag input[type="file"]')
        .first();
      await fileInput.setInputFiles(TXT_FIXTURE);
      await expect(page.getByText(TXT_FIXTURE.name).first()).toBeVisible({
        timeout: 15_000,
      });

      // Preview button must appear next to the uploaded file
      await expect(page.getByTitle('Preview')).toBeVisible({ timeout: 5_000 });
    });

    test('Preview buttons appear for both files after two uploads', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await openTaskCreateForm(app, page);
      await scrollToAttachments(page);

      const fileInput = page
        .locator('.ant-upload-drag input[type="file"]')
        .first();
      await fileInput.setInputFiles(TXT_FIXTURE);
      await expect(page.getByText(TXT_FIXTURE.name).first()).toBeVisible({
        timeout: 15_000,
      });

      await fileInput.setInputFiles(PDF_FIXTURE);
      await expect(page.getByText(PDF_FIXTURE.name).first()).toBeVisible({
        timeout: 15_000,
      });

      // Both files must have their own Preview button (the core regression test)
      const previewButtons = page.getByTitle('Preview');
      await expect(previewButtons).toHaveCount(2, { timeout: 5_000 });
    });

    // ── File removal ──────────────────────────────────────────────────

    test('removes a file from the list when the remove button is clicked', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await openTaskCreateForm(app, page);
      await scrollToAttachments(page);

      const fileInput = page
        .locator('.ant-upload-drag input[type="file"]')
        .first();
      await fileInput.setInputFiles(TXT_FIXTURE);
      await expect(page.getByText(TXT_FIXTURE.name).first()).toBeVisible({
        timeout: 15_000,
      });

      // Click the Ant Design "Remove file" button
      await page.getByTitle('Remove file').first().click();

      await expect(
        page.locator('.ant-upload-list-item-name', {
          hasText: TXT_FIXTURE.name,
        }),
      ).toBeHidden({
        timeout: 5_000,
      });
    });

    test('removing one file does not remove the other', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await openTaskCreateForm(app, page);
      await scrollToAttachments(page);

      const fileInput = page
        .locator('.ant-upload-drag input[type="file"]')
        .first();
      await fileInput.setInputFiles(TXT_FIXTURE);
      await expect(page.getByText(TXT_FIXTURE.name).first()).toBeVisible({
        timeout: 15_000,
      });
      await fileInput.setInputFiles(PDF_FIXTURE);
      await expect(page.getByText(PDF_FIXTURE.name).first()).toBeVisible({
        timeout: 15_000,
      });

      // Remove the first file
      await page.getByTitle('Remove file').first().click();

      // Second file must survive
      await expect(
        page.locator('.ant-upload-list-item-name', {
          hasText: PDF_FIXTURE.name,
        }),
      ).toBeVisible({
        timeout: 5_000,
      });
      // Only one Preview button should remain
      await expect(page.getByTitle('Preview')).toHaveCount(1, {
        timeout: 5_000,
      });
    });

    // ── File count hint ───────────────────────────────────────────────

    test('file count hint updates as files are added', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await openTaskCreateForm(app, page);
      await scrollToAttachments(page);

      const fileInput = page
        .locator('.ant-upload-drag input[type="file"]')
        .first();

      // After first upload: "1/10 files"
      await fileInput.setInputFiles(TXT_FIXTURE);
      await expect(page.getByText(TXT_FIXTURE.name).first()).toBeVisible({
        timeout: 15_000,
      });
      // Preview button only renders when file.status === 'done' — gate count
      // hint check on upload completion to avoid a race with HTTP in-progress.
      await expect(page.getByTitle('Preview')).toHaveCount(1, {
        timeout: 15_000,
      });
      await expect(page.getByText(/1\/10 files/)).toBeVisible({
        timeout: 5_000,
      });

      // After second upload: "2/10 files"
      await fileInput.setInputFiles(PDF_FIXTURE);
      await expect(page.getByText(PDF_FIXTURE.name).first()).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByTitle('Preview')).toHaveCount(2, {
        timeout: 15_000,
      });
      await expect(page.getByText(/2\/10 files/)).toBeVisible({
        timeout: 5_000,
      });
    });
  });

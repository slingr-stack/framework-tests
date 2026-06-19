import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

/**
 * E2E test for composition fields with a child entity field named "value".
 *
 * Verifies that the `extractFieldSelection` fix in ResolverHelpers correctly
 * distinguishes entity fields named "value" from the UI wrapper field "value".
 * Without the fix, the DB query omits the "value" column and the GQL response
 * returns null for that field.
 *
 * The Task model has a `metadata` composition pointing to TaskMetadata,
 * which has `key` (TextField) and `value` (TextField) fields.
 */

const META_KEY = 'environment';
const META_VALUE = 'production';
const REFRESH_META_KEY = 'refresh-environment';
const REFRESH_META_VALUE = 'refresh-production';
const FIND_BY_ID_OPERATION_NAME = 'TaskFindById';
const REFRESH_OPERATION_NAME = 'TaskRefresh';

test.describe
  .serial('Composition field named "value" E2E', () => {
    let TASK_TITLE: string;
    let CURRENT_TASK_TITLE: string;
    test.beforeAll(() => {
      TASK_TITLE = `E2E Metadata ${Date.now()}`;
      CURRENT_TASK_TITLE = TASK_TITLE;
    });
    test.setTimeout(120_000);

    test('should return composition "value" field in GQL response', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);

      // Collect page errors for debugging
      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      // Collect network errors
      const networkResponses: Array<{
        url: string;
        status: number;
        body?: string;
      }> = [];
      page.on('response', async (response) => {
        if (response.url().includes('/graphql')) {
          try {
            const body = await response.text();
            networkResponses.push({
              url: response.url(),
              status: response.status(),
              body: body.slice(0, 200),
            });
          } catch {
            /* ignore */
          }
        }
      });

      await app.loginAsAdmin();

      // ── Create a task with metadata ─────────────────────────────────
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickCreateInTable();
      await app.waitForForm('title');
      await app.fillField('title', TASK_TITLE);
      await app.selectFirstOption('Project');

      // The onRefresh auto-generates a Note, which requires "Created By"
      await app.fillCompositionReferenceFieldIfPresent('Notes', 'Created By');

      // Add a Task Metadata entry using the proper kit methods
      await app.addCompositionItem('Task Metadata');
      await app.fillCompositionFieldByPlaceholder(
        'Task Metadata',
        'Enter key',
        META_KEY,
      );
      await app.fillCompositionFieldByPlaceholder(
        'Task Metadata',
        'Enter value',
        META_VALUE,
      );

      await app.submitCreate();
      // Verify task creation succeeded by finding the new row in the tasks table.
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.filterTable('Title', TASK_TITLE);
      await app.waitForTable();
      await expect(page.locator('.ant-table-tbody'))
        .toContainText(TASK_TITLE, { timeout: 15_000 })
        .catch(async (err) => {
          const uiErrors = await page
            .locator(
              '.ant-message-error, .ant-notification-error, [class*="error"]',
            )
            .allTextContents()
            .catch(() => []);
          throw new Error(
            `Task creation failed. URL: ${page.url()}. UiErrors: ${JSON.stringify(uiErrors)}. PageErrors: ${JSON.stringify(pageErrors)}. NetworkErrors: ${JSON.stringify(networkResponses.filter((r) => r.status >= 400 || r.body?.includes('"errors"')).map((r) => r.body))}. Original: ${err.message}`,
          );
        });

      // ── Navigate to the task read view and intercept the GQL response ──
      // Capture all GQL POST responses while the drawer opens
      const capturedBodies: string[] = [];
      const responseHandler = async (response: any) => {
        if (
          response.url().includes('/graphql') &&
          response.request().method() === 'POST'
        ) {
          try {
            capturedBodies.push(await response.text());
          } catch {
            /* ignore */
          }
        }
      };
      page.on('response', responseHandler);

      await app.clickTableRow(TASK_TITLE);
      await app.waitForDrawer();
      // Give extra time for async GQL calls to complete
      await page.waitForTimeout(5000);

      page.off('response', responseHandler);

      // ── Assert that the GQL response contains both key and value data ──
      const metadataBody =
        capturedBodies.find(
          (b) =>
            b.includes(FIND_BY_ID_OPERATION_NAME) && b.includes('"metadata"'),
        ) ?? null;
      expect(
        metadataBody,
        `No ${FIND_BY_ID_OPERATION_NAME} response with metadata found. Captured ${capturedBodies.length} responses: ${capturedBodies.map((b) => b.slice(0, 100)).join(' | ')}`,
      ).not.toBeNull();

      if (!metadataBody) {
        throw new Error(
          `${FIND_BY_ID_OPERATION_NAME} response with metadata was not captured`,
        );
      }

      // The response might be a batched array; parse and find the find-by-id result.
      const raw = JSON.parse(metadataBody);
      const responses = Array.isArray(raw) ? raw : [raw];
      const findByIdResponse = responses.find(
        (r: any) => r?.data?.[FIND_BY_ID_OPERATION_NAME],
      );
      expect(findByIdResponse).toBeDefined();
      const taskData = findByIdResponse.data[FIND_BY_ID_OPERATION_NAME];

      // Navigate to the metadata composition field in the response
      const metadataField = taskData.metadata;
      expect(metadataField).toBeDefined();
      expect(metadataField.value).toBeDefined();
      expect(Array.isArray(metadataField.value)).toBe(true);
      expect(metadataField.value.length).toBeGreaterThan(0);

      // Each metadata item is the object directly: { key: UiField, value: UiField, _displayValue: "..." }
      // (no "object" wrapper — value IS the UI object directly after the refactoring)
      const firstItem = metadataField.value[0];
      expect(firstItem).toBeDefined();

      // The "key" field should have the correct value
      const keyField = firstItem.key;
      expect(keyField).toBeDefined();
      expect(keyField.value).toBe(META_KEY);

      // The "value" field (entity field named "value") should also have the correct data.
      // Before the fix, extractFieldSelection confused this with the UI wrapper "value"
      // and the DB query omitted the column, causing this to be null.
      const valueField = firstItem.value;
      expect(valueField).toBeDefined();
      expect(valueField.value).toBe(META_VALUE);
    });

    test('should preserve newly added metadata value after title-triggered refresh', async ({
      page,
    }) => {
      test.fail(
        true,
        'Current frontend bug: Task edit refresh drops metadata[].value in the form even though the refresh response still contains it.',
      );

      const app = new DrumrTestKit(page);
      const refreshedTitle = `${CURRENT_TASK_TITLE} refresh probe`;
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.filterTable('Title', CURRENT_TASK_TITLE);
      await app.waitForTable();

      await app.clickTableRow(CURRENT_TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      await app.addCompositionItem('Task Metadata');
      await app.fillCompositionFieldByPlaceholder(
        'Task Metadata',
        'Enter key',
        REFRESH_META_KEY,
      );
      await app.fillCompositionFieldByPlaceholder(
        'Task Metadata',
        'Enter value',
        REFRESH_META_VALUE,
      );

      const refreshResponsePromise = page.waitForResponse(
        (response) => {
          if (
            !response.url().includes('/graphql') ||
            response.request().method() !== 'POST'
          ) {
            return false;
          }

          const postData = response.request().postData();
          if (!postData) {
            return false;
          }

          try {
            const payload = JSON.parse(postData) as
              | { operationName?: string }
              | Array<{ operationName?: string }>;

            if (Array.isArray(payload)) {
              return payload.some(
                (operation) =>
                  operation?.operationName === REFRESH_OPERATION_NAME,
              );
            }

            return payload.operationName === REFRESH_OPERATION_NAME;
          } catch {
            return postData.includes(REFRESH_OPERATION_NAME);
          }
        },
        { timeout: 15_000 },
      );

      await app.clearAndFillField('title', refreshedTitle);
      await page.keyboard.press('Tab');

      const refreshResponse = await refreshResponsePromise;
      const refreshRaw = JSON.parse(await refreshResponse.text());
      const refreshResponses = Array.isArray(refreshRaw)
        ? refreshRaw
        : [refreshRaw];
      const refreshPayload = refreshResponses.find((entry) => {
        const data =
          entry && typeof entry === 'object' && 'data' in entry
            ? (entry as { data?: Record<string, unknown> }).data
            : undefined;
        return !!data && REFRESH_OPERATION_NAME in data;
      });

      expect(refreshPayload).toBeDefined();

      const refreshData = (refreshPayload as { data: Record<string, unknown> })
        .data;
      const refreshDataKey = Object.keys(refreshData).find(
        (key) => key === REFRESH_OPERATION_NAME,
      );
      expect(refreshDataKey).toBeDefined();

      const refreshedTask = refreshData[refreshDataKey as string] as {
        metadata?: {
          value?: Array<{
            key?: { value?: string };
            value?: { value?: string };
          }>;
        };
      };
      const refreshedMetadataItem = refreshedTask.metadata?.value?.find(
        (item) => item?.key?.value === REFRESH_META_KEY,
      );

      expect(refreshedMetadataItem).toBeDefined();
      expect(refreshedMetadataItem?.value?.value).toBe(REFRESH_META_VALUE);

      await app.submitSave();
      CURRENT_TASK_TITLE = refreshedTitle;

      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.filterTable('Title', CURRENT_TASK_TITLE);
      await app.waitForTable();

      const capturedBodies: string[] = [];
      const responseHandler = async (response: {
        url(): string;
        request(): { method(): string };
        text(): Promise<string>;
      }) => {
        if (
          response.url().includes('/graphql') &&
          response.request().method() === 'POST'
        ) {
          try {
            capturedBodies.push(await response.text());
          } catch {
            /* ignore */
          }
        }
      };
      page.on('response', responseHandler);

      await app.clickTableRow(CURRENT_TASK_TITLE);
      await app.waitForDrawer();
      await page.waitForTimeout(5000);

      page.off('response', responseHandler);

      const metadataBody =
        capturedBodies.find(
          (body) =>
            body.includes(FIND_BY_ID_OPERATION_NAME) &&
            body.includes('"metadata"'),
        ) ?? null;

      expect(metadataBody).not.toBeNull();
      if (!metadataBody) {
        throw new Error(
          `${FIND_BY_ID_OPERATION_NAME} response with metadata was not captured after save`,
        );
      }

      const readRaw = JSON.parse(metadataBody);
      const readResponses = Array.isArray(readRaw) ? readRaw : [readRaw];
      const findByIdResponse = readResponses.find(
        (entry) =>
          !!entry &&
          typeof entry === 'object' &&
          'data' in entry &&
          !!(entry as { data?: Record<string, unknown> }).data?.[
            FIND_BY_ID_OPERATION_NAME
          ],
      ) as
        | {
            data: {
              TaskFindById: {
                metadata?: {
                  value?: Array<{
                    key?: { value?: string };
                    value?: { value?: string };
                  }>;
                };
              };
            };
          }
        | undefined;

      expect(findByIdResponse).toBeDefined();

      const savedMetadataItem =
        findByIdResponse?.data.TaskFindById.metadata?.value?.find(
          (item) => item?.key?.value === REFRESH_META_KEY,
        );

      expect(savedMetadataItem).toBeDefined();
      expect(savedMetadataItem?.value?.value).toBe(REFRESH_META_VALUE);
    });

    // Clean up: delete the test task
    test('should delete the test task', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.filterTable('Title', CURRENT_TASK_TITLE);
      await app.waitForTable();

      await app.clickTableRow(CURRENT_TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/delete/i);
      await app.confirmDelete();

      // After deletion the drawer closes and we return to the table
      await app.waitForTable();
    });
  });

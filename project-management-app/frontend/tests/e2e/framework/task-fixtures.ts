import { type Page } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

export interface CreateTaskFixtureOptions {
  status?: string;
  technicalDetails?: string;
  startedAt?: string;
  completedAt?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeStatus(status: string | undefined): string | null {
  return status?.trim().toLowerCase() ?? null;
}

function toDayMonthYearDate(value: string): string {
  const trimmed = value.trim();
  const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoDateMatch) {
    return trimmed;
  }

  const [, year, month, day] = isoDateMatch;
  return `${day}-${month}-${year}`;
}

async function fillCodeEditorCard(
  page: Page,
  sectionTitle: string,
  value: string,
): Promise<void> {
  const sectionContainer = page
    .locator('.ant-card')
    .filter({
      has: page.getByRole('heading', {
        name: new RegExp(`^${escapeRegExp(sectionTitle)}$`),
      }),
    })
    .first();

  await sectionContainer.waitFor({ state: 'visible', timeout: 15_000 });
  await sectionContainer.scrollIntoViewIfNeeded();

  const editor = sectionContainer.locator('.monaco-editor').first();
  await editor.waitFor({ state: 'visible', timeout: 15_000 });
  await editor.click({ position: { x: 24, y: 24 } });
  await page.keyboard.press('ControlOrMeta+a').catch(() => {});
  await page.keyboard.press('Backspace').catch(() => {});
  await page.keyboard.insertText(value);
  await page
    .locator('body')
    .click({ position: { x: 8, y: 8 } })
    .catch(() => {});
}

export async function createTaskFixture(
  app: DrumrTestKit,
  page: Page,
  title: string,
  options: CreateTaskFixtureOptions = {},
): Promise<string | null> {
  const normalizedStatus = normalizeStatus(options.status);
  const startedAt = options.startedAt ?? '2026-01-01';
  const completedAt = toDayMonthYearDate(options.completedAt ?? '2026-01-02');

  await app.navigateTo('/tasks');
  await app.waitForTable();
  await app.clickCreateInTable();
  await app.waitForForm('title');
  await app.fillField('title', title);
  await app.selectFirstOption('Project');

  if (options.status) {
    await app.selectOption('Status', options.status);
  }

  if (
    normalizedStatus === 'in progress' ||
    normalizedStatus === 'in review' ||
    normalizedStatus === 'blocked' ||
    normalizedStatus === 'done'
  ) {
    await app.fillDateField('startedAt', startedAt);
  }

  if (normalizedStatus === 'done') {
    await app.fillDateField('completedAt', completedAt);
  }

  if (options.technicalDetails) {
    await fillCodeEditorCard(
      page,
      'Technical Details',
      options.technicalDetails,
    );
  }

  await app.fillCompositionReferenceFieldIfPresent('Notes', 'Created By');

  const createResponsePromise = page
    .waitForResponse(
      (res) =>
        res.url().includes('/graphql') &&
        res.request().method() === 'POST' &&
        (res.request().postData() ?? '').toLowerCase().includes('create'),
      { timeout: 35_000 },
    )
    .catch(() => null);

  await app.submitCreate();

  const createResponse = await createResponsePromise;
  if (createResponse) {
    const body = await createResponse.json().catch(() => null);
    const errors = (body as { errors?: unknown[] } | null)?.errors ?? [];
    if (errors.length) {
      throw new Error(
        `Task creation failed — GraphQL errors: ${JSON.stringify(errors)}`,
      );
    }
  }

  await app.navigateTo('/tasks');
  await app.expectTableContains(title);

  return app.getRowId(title);
}

export async function deleteTaskFixture(
  app: DrumrTestKit,
  title: string,
): Promise<void> {
  await app.navigateTo('/tasks');
  await app.waitForTable();
  await app.filterTable('Title', title);
  await app.waitForTable();
  await app.deleteFirstRow();
}

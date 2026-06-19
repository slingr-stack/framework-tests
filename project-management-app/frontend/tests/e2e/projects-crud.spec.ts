import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.describe
  .serial('Projects CRUD E2E', () => {
    let PROJECT_NAME: string;
    let PROJECT_NAME_EDITED: string;
    let PROJECT_CODE: string;
    test.beforeAll(() => {
      PROJECT_NAME = `E2E Project ${Date.now()}`;
      PROJECT_NAME_EDITED = `${PROJECT_NAME} Edited`;
      PROJECT_CODE = `PR-${Date.now() % 1000}`;
    });
    test.setTimeout(90_000);

    test('should create a new project', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await app.clickCreateInTable();
      await app.waitForForm('name');
      await app.fillField('name', PROJECT_NAME);
      await app.fillField('code', PROJECT_CODE);
      await app.selectFirstOption('Manager');
      await app.submitCreate();

      await app.navigateTo('/projects');
      await app.expectTableContains(PROJECT_NAME);
    });

    test('should read/view a project', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await app.filterTable('Project Name', PROJECT_NAME);
      await app.waitForTable();
      await app.clickTableRow(PROJECT_NAME);
      await app.waitForReadView();
      await app.expectTextVisible(PROJECT_NAME);
      await app.expectTextVisible(PROJECT_CODE);
    });

    test('should edit an existing project', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await app.filterTable('Project Name', PROJECT_NAME);
      await app.waitForTable();
      await app.clickTableRow(PROJECT_NAME);
      await app.clickEditButton('Project');
      await app.waitForForm('name');
      await app.clearAndFillField('name', PROJECT_NAME_EDITED);
      await app.submitSave();

      await app.navigateTo('/projects');
      await app.expectTableContains(PROJECT_NAME_EDITED);
    });

    test('should delete a project', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/projects');
      await app.waitForTable();

      await app.filterTable('Project Name', PROJECT_NAME_EDITED);
      await app.waitForTable();
      await app.clickTableRow(PROJECT_NAME_EDITED);
      await app.clickDeleteButtonAndWait();
      await app.confirmDelete();

      await app.navigateTo('/projects');
      await app.expectTableNotContains(PROJECT_NAME_EDITED);
    });
  });

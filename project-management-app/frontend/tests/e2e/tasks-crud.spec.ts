import { expect, test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.describe
  .serial('Tasks CRUD E2E', () => {
    let TASK_TITLE: string;
    let TASK_TITLE_EDITED: string;
    test.beforeAll(() => {
      TASK_TITLE = `E2E Task ${Date.now()}`;
      TASK_TITLE_EDITED = `${TASK_TITLE} Edited`;
    });
    // "persist a cleared date" runs three full open-edit-save cycles back to
    // back, which can exceed 90s on resource-constrained CI runners.
    test.setTimeout(180_000);

    test('should create a new task', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      await app.clickCreateInTable();
      await app.waitForForm('title');
      await app.fillField('title', TASK_TITLE);
      await app.fillTextarea(
        /enter task description/i,
        'Task created by Playwright E2E test',
      );
      await app.selectFirstOption('Project');

      // Selecting a Project auto-generates a Note with a required "Created By" field
      await app.fillCompositionReferenceFieldIfPresent('Notes', 'Created By');

      await app.submitCreate();

      await app.navigateTo('/tasks');
      await app.expectTableContains(TASK_TITLE);
    });

    test('should read/view a task', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Task ReadView opens as a Drawer (not URL navigation)
      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.expectTextVisible(TASK_TITLE);
    });

    test('should edit an existing task', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Task ReadView opens as a Drawer (not URL navigation)
      await app.clickTaskRowByTitle(TASK_TITLE);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');
      await app.clearAndFillField('title', TASK_TITLE_EDITED);
      await app.submitSave();

      // Confirm the save completed — the drawer transitions back to ReadView
      // showing the updated title before we navigate away
      await app.expectTextVisible(TASK_TITLE_EDITED);

      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.expectTableContains(TASK_TITLE_EDITED);
    });

    test('should persist a cleared date field as null', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Open task and set a dueDate
      await app.clickTaskRowByTitle(TASK_TITLE_EDITED);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');
      await app.fillDateField('dueDate', '15-06-2099');
      await app.submitSave();
      await app.expectTextVisible(TASK_TITLE_EDITED);

      // Re-open and verify the date was saved
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickTaskRowByTitle(TASK_TITLE_EDITED);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');
      await app.expectDateFieldNotEmpty('dueDate');

      // Clear the date and save
      await app.clearDateField('dueDate');
      await app.expectDateFieldEmpty('dueDate');
      await app.submitSave();
      await app.expectTextVisible(TASK_TITLE_EDITED);

      // Re-open and verify the date stays cleared
      await app.navigateTo('/tasks');
      await app.waitForTable();
      await app.clickTaskRowByTitle(TASK_TITLE_EDITED);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');
      await app.expectDateFieldEmpty('dueDate');
    });

    test('should not leak filter text into task edit form', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Type something into the table filter but do NOT click the Filter button
      const filterText = 'FILTER_LEAK_PROBE';
      await app.typeInFilterWithoutApplying('Title', filterText);

      // Open a task for editing
      await app.clickTaskRowByTitle(TASK_TITLE_EDITED);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/edit/i);
      await app.waitForForm('title');

      // The title must still be the real value, not the filter text
      const titleValue = await app.getFieldValue('title');
      expect(titleValue).toBe(TASK_TITLE_EDITED);
      expect(titleValue).not.toContain(filterText);
    });

    test('should delete a task', async ({ page }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();
      await app.navigateTo('/tasks');
      await app.waitForTable();

      // Task ReadView opens as a Drawer (not URL navigation)
      await app.clickTaskRowByTitle(TASK_TITLE_EDITED);
      await app.waitForDrawer();
      await app.clickManageDropdown();
      await app.clickManageOption(/delete/i);
      await app.confirmDelete();

      await app.navigateTo('/tasks');
      await app.expectTableNotContains(TASK_TITLE_EDITED);
    });
  });

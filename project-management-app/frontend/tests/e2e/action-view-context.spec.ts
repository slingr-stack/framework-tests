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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe
  .serial('Action views — context-driven rendering', () => {
    test.setTimeout(120_000);
    let ASSIGN_TASK_TITLE: string;
    let COMPLETE_TASK_TITLE: string;
    test.beforeAll(() => {
      const SUFFIX = Date.now();
      ASSIGN_TASK_TITLE = `AssignViewE2E-${SUFFIX}`;
      COMPLETE_TASK_TITLE = `CompleteViewE2E-${SUFFIX}`;
    });

    test('setup: create tasks for AssignTask and CompleteTask action views', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      await test.step('Create task used to verify AssignTaskView header context', async () => {
        await createTaskFixture(app, page, ASSIGN_TASK_TITLE);
      });

      await test.step('Create task used to verify CompleteTaskView custom warning form', async () => {
        await createTaskFixture(app, page, COMPLETE_TASK_TITLE);
      });
    });

    test('AssignTaskView uses the target task title in the dialog header', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      await test.step('Open the generated task from the Tasks table', async () => {
        // Expected behavior: opening the row should load the record drawer so
        // object actions receive the selected task as target context.
        await app.navigateTo('/tasks');
        await app.waitForTable();
        await app.clickTaskRowByTitle(ASSIGN_TASK_TITLE);
        await app.waitForDrawer();
      });

      await test.step('Launch AssignTask from the drawer Actions menu', async () => {
        // Expected behavior: the standard object action entry should open a
        // dialog whose title uses the selected task title.
        await app.clickActionsDropdown();
        await app.clickActionOption(/assign task/i);
      });

      const dialog = page.getByRole('dialog', {
        name: new RegExp(`Assign: ${escapeRegExp(ASSIGN_TASK_TITLE)}`, 'i'),
      });
      await test.step('Verify AssignTask dialog title and required assignee field', async () => {
        // Expected behavior: custom AssignTaskView should interpolate the task
        // title in the dialog header and render the assignee field.
        await dialog.waitFor({ state: 'visible', timeout: 25_000 });

        const assigneeField = dialog
          .locator('.ant-form-item')
          .filter({ hasText: /assignee/i })
          .first();
        await expect(assigneeField).toBeVisible({ timeout: 10_000 });
      });

      await test.step('Close AssignTask dialog cleanly', async () => {
        await app.cancelDialog();
        await expect(dialog).toBeHidden({ timeout: 10_000 });
      });
    });

    test('CompleteTaskView uses the target task title in the drawer header and renders its custom warning form', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      await test.step('Filter Tasks table to the generated CompleteTask record', async () => {
        // Expected behavior: table should narrow to the exact generated title so
        // the inline row toolbar acts on only one visible task.
        await app.navigateTo('/tasks');
        await app.waitForTable();
        await app.filterTable('Title', COMPLETE_TASK_TITLE);
        await app.waitForTable();
        await app.expectTableContains(COMPLETE_TASK_TITLE);
      });

      await test.step('Launch CompleteTask from the inline row toolbar', async () => {
        // Expected behavior: clicking the inline "Complete task" action should
        // open the custom CompleteTaskView dialog for this filtered record.
        // We use the row toolbar here because the drawer Actions menu also
        // exposes the separate demo entry labeled "Complete (headless)".
        await app.clickRowToolbarButton(COMPLETE_TASK_TITLE, /complete task/i);
      });

      const dialog = page.getByRole('dialog', {
        name: new RegExp(`Complete: ${escapeRegExp(COMPLETE_TASK_TITLE)}`, 'i'),
      });
      await test.step('Verify CompleteTask dialog title, warning copy, and note field', async () => {
        // Expected behavior:
        // 1. dialog title includes the selected task title
        // 2. warning copy explains completion is not reversible
        // 3. custom Completion Note field is rendered
        await dialog.waitFor({ state: 'visible', timeout: 25_000 });

        await expect(dialog).toContainText(/you cannot undo this action/i, {
          timeout: 10_000,
        });
        const noteField = dialog
          .locator('.ant-form-item')
          .filter({ hasText: /completion note/i })
          .first();
        await expect(noteField).toBeVisible({ timeout: 10_000 });
      });

      await test.step('Close CompleteTask dialog without executing the action', async () => {
        // Expected behavior: cancelling should dismiss the dialog and leave the
        // task unchanged because this test only verifies rendering/context.
        await app.cancelDialog();
        await expect(dialog).toBeHidden({ timeout: 10_000 });
      });
    });

    test('teardown: delete tasks created for action view coverage', async ({
      page,
    }) => {
      const app = new DrumrTestKit(page);
      await app.loginAsAdmin();

      await test.step('Delete task created for AssignTaskView coverage', async () => {
        await deleteTaskFixture(app, ASSIGN_TASK_TITLE);
      });

      await test.step('Delete task created for CompleteTaskView coverage', async () => {
        await deleteTaskFixture(app, COMPLETE_TASK_TITLE);
      });
    });
  });

# Examples: Automation coder output

> Sample `QAAutomationCoderResult` and the generated spec file content. Based on the task creation test cases in `testing-test-generator/examples.md`.

---

## Input

`qa-outputs/task-creation/stage-2-test-cases.json` — `QATestGeneratorResult` with `id: "qa-generator-001"`, 5 test cases for Task entity.

---

## Output (`QAAutomationCoderResult`)

```json
{
  "id": "qa-coder-001",
  "generatorId": "qa-generator-001",
  "generatedFiles": [
    {
      "filePath": "apps/project-management-app/frontend/tests/e2e/Task.spec.ts",
      "content": "..."
    }
  ],
  "generatedAt": "2026-06-18T00:00:00.000Z"
}
```

---

## Generated spec file (`Task.spec.ts`)

```typescript
import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

const TASK_TITLE = `E2E Task ${Date.now()}`;
const LONG_TITLE = 'A'.repeat(256);

test.describe('Task Management', () => {
  let kit: DrumrTestKit;

  test.beforeEach(async ({ page }) => {
    kit = new DrumrTestKit(page);
    await kit.loginAsAdmin();
    await kit.navigateTo('/tasks');
  });

  test('Task requires a title to be saved', async ({ page }) => {
    // TC-001 → TB-001
    await kit.clickCreateInTable();
    await kit.fillField('title', TASK_TITLE);
    await kit.submitCreate();
    await kit.expectSuccessFeedback();
    await kit.expectRowInTable(TASK_TITLE);
  });

  test('Task must be linked to a project', async ({ page }) => {
    // TC-002 → TB-002
    await kit.clickCreateInTable();
    await kit.fillField('title', TASK_TITLE);
    await kit.selectOption('project', 'Default Project');
    await kit.submitCreate();
    await kit.expectSuccessFeedback();
    await kit.expectRowInTable(TASK_TITLE);
  });

  test('Task title must not exceed 255 characters', async ({ page }) => {
    // TC-003 → TB-003
    await kit.clickCreateInTable();
    await kit.fillField('title', LONG_TITLE);
    await kit.submitCreate();
    await kit.expectValidationError('title');
    await kit.expectRowNotInTable(LONG_TITLE);
  });

  test('Only authenticated users can create tasks', async ({ page }) => {
    // TC-004 → TB-004
    // Login and navigation already performed in beforeEach
    await kit.clickCreateInTable();
    await kit.expectFormVisible();
  });

  test('Invalid task submission shows validation error', async ({ page }) => {
    // TC-005 → TB-005
    await kit.clickCreateInTable();
    await kit.submitCreate();
    await kit.expectValidationError('title');
    await kit.expectRowNotInTable(TASK_TITLE);
  });
});
```

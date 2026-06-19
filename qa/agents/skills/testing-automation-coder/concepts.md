# Concepts: Gherkin-to-Playwright translation

## Translation model

Each `TestCaseDefinition` maps to one `test(...)` block. The `GherkinStep` keywords drive the Playwright call selection.

### Keyword → `DrumrTestKit` mapping

| Gherkin keyword | Typical step text pattern | `DrumrTestKit` call |
|-----------------|--------------------------|----------------------|
| `Given` | "I am authenticated and on the X list page" | `testKit.loginAsAdmin()` (in `beforeEach`), `testKit.navigateTo(path)` |
| `Given` | "at least one X exists" | Seed data via `beforeEach` setup (not a kit call) |
| `When` | "I open the Create X form" | `testKit.clickCreateInTable()` |
| `When` | "I fill in the title" | `testKit.fillField(fieldId, value)` |
| `When` | "I select a Y from the Z field" | `testKit.selectOption(fieldId, label)` |
| `When` | "I submit the form" | `testKit.submitCreate()` or `testKit.submitSave()` |
| `When` | "I click X row" | `testKit.clickRowByText(text)` |
| `Then` | "the task is visible in the list" | `testKit.expectRowInTable(text)` |
| `Then` | "a success notification is shown" | `testKit.expectSuccessFeedback()` |
| `Then` | "a validation error is shown" | `testKit.expectValidationError(fieldId)` |
| `But` | "the record is not saved" | `testKit.expectRowNotInTable(text)` |

**When a required `DrumrTestKit` method is missing:** add it to `qa/drumr-test-kit.ts` first (following `testing-dom/best-practices.md`), then generate the call. Never work around a missing method inside the spec.

## Spec file structure

```typescript
import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';

test.describe('<Entity> Management', () => {
  let kit: DrumrTestKit;

  test.beforeEach(async ({ page }) => {
    kit = new DrumrTestKit(page);
    await kit.loginAsAdmin();
  });

  test('<TC-001 title>', async ({ page }) => {
    // Given steps (navigation, preconditions already set in beforeEach)
    await kit.navigateTo('/tasks');

    // When steps (single actor action)
    await kit.clickCreateInTable();
    await kit.fillField('title', 'My Task');
    await kit.submitCreate();

    // Then steps (assertions)
    await kit.expectSuccessFeedback();
    await kit.expectRowInTable('My Task');
  });
});
```

## Grouping strategy

- Group all `TestCaseDefinition` records from one `QATestGeneratorResult` into a **single `test.describe` block** per entity.
- Use a single `beforeEach` for common setup (login, navigation) shared across most tests.
- If a test case requires a different login role, override inside the individual `test(...)` with a separate `kit.login(...)` call — do not create nested `describe` blocks for auth variants unless there are 3+ such tests.

## `preconditions` handling

`TestCaseDefinition.preconditions` that describe data state ("At least one project exists") must be implemented in `beforeEach` or a `test.beforeAll` setup block — not as in-test navigation steps.

## Negative and boundary test cases

For `type: 'negative'` or `type: 'boundary'`, map `But` steps to `expectRowNotInTable` or `expectValidationError` depending on context. Always verify the disallowed outcome explicitly — never omit the negative assertion.

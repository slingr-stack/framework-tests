# Best practices: Automation coder

## Always inspect the kit before generating

Read the live `DrumrTestKit` source (`qa/drumr-test-kit.ts`) before writing a single line of spec code. Do not rely on memory or previous generations — the kit evolves, and stale method names cause runtime failures that do not appear at compile time.

If an app-level kit wrapper exists at `apps/<app-name>/frontend/tests/e2e/framework/drumr-test-kit.ts`, use it in preference to the shared package.

## Import style is non-negotiable

```typescript
import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';
```

Never use relative imports (`./framework/slingr-test-kit`), path aliases, or dynamic requires. Shared kit import style must be consistent across all generated specs.

## Compile hygiene

Generated files must:
- Have no TypeScript errors (`tsc --noEmit`)
- Pass Biome format on first check (`pnpm run biome:check`)
- Have no unused imports or variables
- Not suppress errors with `@ts-ignore` or `eslint-disable`

Run before committing:
```bash
cd apps/<app-name>/frontend && pnpm run biome:check
```

## No raw Playwright in specs

Generated spec files must never contain:
- `page.locator(...)`
- `page.getByRole(...)`
- `page.getByText(...)`
- CSS selectors or Ant Design class names
- Direct `expect(page.locator(...))` assertions

All interaction and assertion must go through `DrumrTestKit` methods.

## One `test.describe` per entity

Group all test cases for a single entity in one `describe` block. Do not split by `type` (positive/negative/boundary) — the spec should read as a unified behavior document, not a testing-category list.

## Traceability comment

Add a one-line comment at the top of each `test(...)` referencing the behavior and test case IDs:

```typescript
test('Task requires a title to be saved', async ({ page }) => {
  // TC-001 → TB-001
  ...
});
```

## Unique, stable test data

Use timestamp suffixes for created entity names to avoid cross-test pollution:

```typescript
const TASK_TITLE = `E2E Task ${Date.now()}`;
```

Never use hardcoded names that could collide between parallel runs.

## Kit extension discipline

If you need a `DrumrTestKit` method that does not exist:
1. Add it to `qa/drumr-test-kit.ts` following `testing-dom/best-practices.md`
2. Update `core/skills/testing-e2e/SKILL.md` to reflect the new method
3. Then generate the call in the spec

Do not work around a missing method inline in the spec — that defeats the DOM-agnostic contract.

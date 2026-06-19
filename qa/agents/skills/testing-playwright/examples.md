# Examples: Playwright Configuration

---

## playwright.config.ts (full template)

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  workers: 4,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

---

## package.json scripts

```json
{
  "scripts": {
    "test:e2e": "npx playwright test",
    "test:e2e:headed": "npx playwright test --headed",
    "test:e2e:debug": "npx playwright test --headed --debug",
    "test:e2e:codegen": "npx playwright codegen http://localhost:8000"
  }
}
```

---

## Error context analysis example

When a test fails, Playwright writes an accessibility tree to `test-results/`:

```yaml
# test-results/tasks-crud-should-delete-a-task-chromium/error-context.md
- role: dialog
  name: "Delete Confirmation"
  children:
    - role: button
      name: "Execute"     # ← kit expected "Delete" — update confirmDelete() pattern
    - role: button
      name: "Cancel"
```

Use this file as the first diagnostic step. It tells you exactly what was rendered at the point of failure.

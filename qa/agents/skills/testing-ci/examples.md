# Examples: CI Configuration

---

## GitHub Actions E2E workflow

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on:
  workflow_dispatch:
  issue_comment:
    types: [created]

jobs:
  e2e:
    if: >
      github.event_name == 'workflow_dispatch' ||
      (github.event.issue.pull_request && contains(github.event.comment.body, '/run-e2e'))
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm run install:all

      - name: Build all packages
        run: npm run build:all

      - name: Install Playwright browsers
        run: cd apps/project-management-app && npx playwright install chromium

      - name: Start application
        run: |
          cd apps/project-management-app
          npm start &
          until curl -s http://localhost:8000/health > /dev/null; do
            echo "Waiting for app..."
            sleep 2
          done
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run E2E tests
        run: cd apps/project-management-app && npx playwright test
        env:
          E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}
          E2E_ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/project-management-app/playwright-report/
          retention-days: 7

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: apps/project-management-app/test-results/
          retention-days: 7
```

---

## CI-aware playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,   // Allow 1 retry in CI for infrastructure flakiness
  workers: process.env.CI ? 2 : 4,   // Fewer workers in CI
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

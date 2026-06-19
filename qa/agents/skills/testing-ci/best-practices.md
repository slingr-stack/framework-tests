# Best Practices: CI Pipeline

> Pipeline structure, artifact upload, and environment configuration for Slingr E2E in CI.

---

## Pipeline Structure

A well-structured E2E CI job:

1. **Checks out the code** — always `actions/checkout@v4`
2. **Sets up Node.js** — use the version specified in `.nvmrc` or `engines`
3. **Installs dependencies** — `npm run install:all`
4. **Builds all packages** — `npm run build:all`
5. **Installs Playwright browsers** — `npx playwright install chromium` (only Chromium)
6. **Starts the application** — app server + database must be ready before tests run
7. **Runs E2E tests** — `npx playwright test`
8. **Uploads artifacts** — screenshots, videos, and HTML report on failure

---

## Artifact Upload (GitHub Actions)

```yaml
- name: Upload Playwright report
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: apps/<app-name>/playwright-report/
    retention-days: 7

- name: Upload test results
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: apps/<app-name>/test-results/
    retention-days: 7
```

---

## Environment Variables in CI

Set these as GitHub Actions secrets and reference them in the workflow:

```yaml
env:
  E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}
  E2E_ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
```

---

## Workers for CI

Use fewer workers on CI runners than locally to avoid resource contention:

```typescript
// playwright.config.ts — CI-aware workers
workers: process.env.CI ? 2 : 4,
```

---

## App Startup Readiness

Never run E2E tests before the app is ready. Use a health check loop:

```bash
# Wait for app to be ready
until curl -s http://localhost:8000/health > /dev/null; do
  echo "Waiting for app..."
  sleep 2
done
```

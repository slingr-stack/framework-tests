# Skill: testing-playwright

> Playwright configuration, debugging workflows, and failure analysis for Drumr E2E tests.

## Scope

This skill covers everything needed to configure, run, and debug Playwright tests in a Drumr application context.

| Topic | File |
|-------|------|
| Failure patterns and debug workflow | [concepts.md](./concepts.md) |
| Artifacts, retry strategy, and run commands | [best-practices.md](./best-practices.md) |
| `playwright.config.ts` template | [examples.md](./examples.md) |

---

## Configuration Template

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

### Key configuration decisions

| Setting | Value | Rationale |
|---------|-------|-----------|
| `fullyParallel` | `true` | Maximizes throughput for isolated specs |
| `workers` | `4` (or CI-tuned) | Fast feedback while preserving stability |
| `retries` | `0` | Forces deterministic tests (flaky = bug) |
| `baseURL` | `http://localhost:8000` | Default Drumr dev server port |
| `trace` | `on-first-retry` | Keeps artifacts small |
| `screenshot` | `only-on-failure` | Useful for CI debugging |
| `video` | `retain-on-failure` | Shows exact interaction on failure |

---

## NPM Scripts

```json
{
  "test:e2e": "npx playwright test",
  "test:e2e:headed": "npx playwright test --headed",
  "test:e2e:debug": "npx playwright test --headed --debug",
  "test:e2e:codegen": "npx playwright codegen http://localhost:8000"
}
```

---

## Debugging a Failing Test

### Step 1 — Read the error context file

Located at `test-results/<test-name>-chromium/error-context.md`. Contains a YAML accessibility tree snapshot.

Look for:
- Is the target element present?
- Do element names match what DrumrTestKit expects?
- Is the element inside a drawer/modal requiring scoping?
- Is the element disabled or hidden?

### Step 2 — Cross-reference with the DOM skill

Read `../testing-dom/SKILL.md` to check framework rendering conventions for the failing element type (drawer, toolbar, select, etc.).

### Step 3 — Run in headed debug mode

```bash
npx playwright test tasks-crud.spec.ts --headed --debug
```

The Playwright Inspector pauses before each action. Step through to find the exact failing interaction.

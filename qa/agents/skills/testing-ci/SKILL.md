# Skill: testing-ci

> CI pipeline integration, commands, and artifact collection for Slingr E2E tests.

## Scope

This skill covers how E2E tests fit into the monorepo CI pipeline, how to run them in headless mode, and how to collect artifacts and coverage reports.

| Topic | File |
|-------|------|
| Coverage, pre-push checklist, and pipeline ordering | [concepts.md](./concepts.md) |
| Pipeline structure best practices | [best-practices.md](./best-practices.md) |
| GitHub Actions workflow YAML | [examples.md](./examples.md) |

---

## Monorepo CI Pipeline

The Slingr monorepo uses GitHub Actions. CI is triggered by commenting `/run-tests` on a PR.

### Test execution order

```
1. Linting (npm run lint)             ← Blocking
2. Building (build:framework → cli)  ← Blocking
3. Testing                            ← Blocking
   ├── npm run test:cli
   ├── npm run coverage:framework
   └── npm run coverage:cli
4. Security audit (npm audit)         ← Non-blocking
```

### Root-level commands

```bash
npm test                          # All packages sequentially
npm run test:framework            # Framework (SQLite + PostgreSQL)
npm run test:framework:sqlite     # Fast — use during development
npm run test:framework:postgres   # Requires running PostgreSQL
npm run test:cli                  # CLI tests (Mocha)
npm run coverage                  # All coverage reports
```

---

## E2E Tests in CI

E2E tests require a running Slingr app with a database. They are not included in the default CI pipeline but can be triggered separately.

### Running E2E headless (CI-ready)

```bash
cd apps/<app-name>
npx playwright test                # Headless, single worker
```

### Required infrastructure

| Component | Requirement |
|-----------|-------------|
| App server | Running at `http://localhost:8000` |
| Database | PostgreSQL with seeded data |
| Browser | Chromium (Playwright auto-installs) |

### Artifact collection

Configure in `playwright.config.ts`:

```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry',
},
```

Artifacts are saved to `test-results/` — add to `.gitignore`.

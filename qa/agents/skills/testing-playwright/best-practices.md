# Best Practices: Playwright

> Artifact collection, retry strategy, and run command reference.

---

## Artifact Strategy

| Artifact | When saved | Purpose |
|----------|-----------|---------|
| Screenshot | On failure | Visual state at failure point |
| Video | On failure | Full interaction replay |
| Trace | On first retry | Network, DOM, console timeline |
| Error context | On failure | YAML accessibility tree snapshot |

Artifacts are saved to `test-results/`. Add this directory to `.gitignore`.

---

## Retry Strategy

Set `retries: 0`. Flaky tests must be fixed, not retried. A test that needs retries indicates:
- Non-deterministic waits (use kit methods with built-in waits)
- Shared state between tests (each test must log in and navigate independently)
- External dependency (seed data or DB state — use dataset-backed setup)

If a test is genuinely flaky due to infrastructure (CI network), adjust `workers` and timeouts before enabling retries.

---

## Run Commands Reference

| Command | Use |
|---------|-----|
| `npm run test:e2e` | Headless, all tests |
| `npm run test:e2e:headed` | Visible browser, all tests |
| `npm run test:e2e:debug` | Step-by-step with Playwright Inspector |
| `npm run test:e2e:codegen` | Record interactions and generate code |
| `npx playwright test file.spec.ts -g "test name"` | Run single test by name |
| `npx playwright show-report` | Open HTML report |

---

## Pre-Run Checklist

Before running E2E tests:
- [ ] App server is running at `http://localhost:8000`
- [ ] PostgreSQL is available and seeded with required data
- [ ] Env vars for credentials are set (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`)
- [ ] Playwright browsers are installed (`npx playwright install chromium`)

---

## .gitignore Entries

```
test-results/
playwright-report/
```

---

## Workers Tuning

| Environment | Recommended workers |
|-------------|---------------------|
| Local development | `4` |
| CI (GitHub Actions, 2-core runner) | `2` |
| CI (4-core runner) | `4` |

Lower worker counts reduce parallelism but avoid resource contention in constrained environments.

# Concepts: CI Integration

> Coverage reporting, pre-push validation, and pipeline ordering for Slingr E2E tests.

---

## Pre-Push Validation Checklist

Before pushing E2E-related changes:

- [ ] Run `npm run lint` — zero warnings required
- [ ] Run `npm run test:framework:sqlite` — fast local check
- [ ] Run `npm run test:e2e` locally against a running app instance
- [ ] Verify `test-results/` is in `.gitignore`
- [ ] Verify no raw Playwright selectors were added to spec files
- [ ] Verify new kit methods follow selector priority order (ARIA > ID > placeholder > CSS)

---

## Coverage Reporting

E2E tests do not produce coverage reports — they test the full stack via browser interactions. Coverage comes from unit and integration tests.

| Test type | Coverage command |
|-----------|-----------------|
| Framework unit | `npm run coverage:framework` |
| CLI unit | `npm run coverage:cli` |
| E2E | No coverage — full-stack browser tests |

---

## Pipeline trigger

The CI pipeline is triggered by commenting `/run-tests` on a pull request. E2E tests are not part of the default CI pipeline; run them locally or via a dedicated E2E workflow (see `examples.md`). A `/run-e2e` trigger may be added in future CI configuration.

---

## Infrastructure Dependencies

E2E tests have external infrastructure dependencies that unit tests do not:

| Dependency | Unit tests | E2E tests |
|-----------|-----------|-----------|
| PostgreSQL | No (SQLite in-memory) | Yes (seeded DB) |
| Running app server | No | Yes (`localhost:8000`) |
| Browser (Chromium) | No | Yes |
| Env credentials | No | Yes (`E2E_ADMIN_*`) |

This is why E2E tests are currently run locally or via a dedicated CI job, not as part of the default PR pipeline.

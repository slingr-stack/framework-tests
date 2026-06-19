# Best Practices: E2E Testing

> Naming, structure, isolation, credential safety, and timeout strategy for Drumr E2E tests.

---

## Core Rules

1. **DOM-agnostic specs** — spec files NEVER contain `page.locator()`, CSS selectors, Ant Design class names, or any DOM structure knowledge.
2. **DrumrTestKit-first** — all UI interaction goes through `DrumrTestKit`. If a needed method is missing, add it to the kit — never work around it in the spec.
3. **Business-readable** — every test should read like a plain English scenario understandable by a non-technical stakeholder.
4. **Deterministic waits** — every `DrumrTestKit` method must include the necessary waits. No arbitrary `waitForTimeout` in spec files.
5. **Collision-safe data** — use `Date.now()` plus worker-aware suffixes (e.g., `testInfo.parallelIndex`) to avoid collisions under parallel workers.
6. **Spec isolation** — each test starts with `loginAsAdmin()` + `navigateTo()`. No shared state between tests.
7. **Parallel by default** — keep tests independent so they run in parallel. Use `test.describe.serial` only when dependency cannot be removed.
8. **No auth skip fallback** — never generate `test.skip(...)` for missing credentials. Missing preflight credentials is a generation-time fail-fast error.
9. **No speculative login adapters** — never cast `DrumrTestKit` to `unknown`/`any` to probe multiple login signatures. Use the concrete, current API only.
10. **No runtime credential resolvers in specs** — do not emit `process.env.E2E_*` checks plus `throw new Error(...)` inside spec code. Credentials must be resolved at generation time.

---

## Credential Preflight (Mandatory Blocking Gate)

Credential preflight is required before generating any auth-required spec code. It is a blocking gate — no spec content may be emitted until resolved.

**Resolution order:**
1. Environment variables: `E2E_EMAIL`, `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`
2. `#tool:vscode/askQuestions` — request the email/username source and password strategy
3. If still unresolved: fail fast with an actionable error listing the supported env vars

**What is not acceptable:**
- `test.skip(...)` for missing credentials
- Placeholder or hardcoded credentials
- Invented or default credentials
- Any `.spec.ts` code emitted before preflight resolves

---

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Spec file | `<entity-or-feature>.spec.ts` | `tasks-crud.spec.ts` |
| Describe block | `'<Entity> CRUD E2E'` | `'Tasks CRUD E2E'` |
| Test name | `'should <action> a <entity>'` | `'should create a new task'` |
| Test data | `` `E2E <Entity> ${Date.now()}` `` | `` `E2E Task ${Date.now()}` `` |

---

## File Organization

```
tests/e2e/
  framework/
    drumr-test-kit.ts          # Single source of truth for DOM interactions
  auth.spec.ts                  # Authentication tests
  <entity>-crud.spec.ts         # Entity CRUD lifecycle tests
  <action-name>.spec.ts         # Action-specific tests
```

---

## Test Body Pattern

Every test follows this structure:

```typescript
test('should <verb> a <entity>', async ({ page }) => {
  const app = new DrumrTestKit(page);

  // 1. Authenticate
  await app.loginAsAdmin();

  // 2. Navigate
  await app.navigateTo('/<entities>');
  await app.waitForTable();

  // 3. Act (business action)
  // ...

  // 4. Assert (verify outcome)
  // ...
});
```

Login goes in **every test**, not in `beforeEach`. Serial tests do not share browser state in Playwright.

---

## Serial vs Parallel

- **Prefer default parallel** for independent scenarios (auth tests, standalone action tests, CRUD tests with per-test setup).
- **Use `test.describe.serial` only as fallback** when a strict lifecycle dependency is intentional and cannot be isolated.
- **Never rely on file-level mutable shared variables** for test data when `fullyParallel` is enabled.

---

## Timeout Strategy

| Suite type | Timeout |
|-----------|---------|
| CRUD lifecycle (4 tests) | `test.setTimeout(90_000)` |
| Action tests (1–2 tests) | `test.setTimeout(60_000)` |
| Auth tests | `test.setTimeout(60_000)` |

---

## Parallel-Safe Data Pattern

Use a run-level seed and derive test-local values:

```typescript
const RUN_ID = Date.now().toString(36);

test('should create', async ({ page }, testInfo) => {
  const name = `E2E Task ${RUN_ID}-w${testInfo.parallelIndex}-r${testInfo.retry}`;
  // ...
});
```

---

## Decision Framework (when generating tests)

1. **Read the app's model** — understand entities, fields, relationships, required fields, and actions.
2. **Read the view source** — determine how each view opens (page, drawer, modal), what toolbar actions exist.
3. **Check `DrumrTestKit`** — verify the kit has the methods you need; add them if not.
4. **Write the spec** — express only business intent, never DOM details.
5. **Navigate back after mutations** — after create/edit, navigate back to the list and verify with `expectTableContains()`.

---

## What you must never do

- Use `page.locator()`, `page.getByRole()`, `page.getByText()`, or any raw Playwright selector in a spec file.
- Guess selectors without reading the framework source code.
- Hardcode test data that could collide with existing records.
- Skip waits or use `waitForTimeout` in spec files (waits belong in the kit).
- Leave a test that depends on another test's browser state without using `test.describe.serial`.
- Emit `test.skip(...)` for missing auth credentials.
- Cast `DrumrTestKit` to `unknown`/`any` to probe multiple login signatures.

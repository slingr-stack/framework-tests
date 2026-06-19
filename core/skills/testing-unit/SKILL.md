---
name: testing-unit
description: Essential skill for Drumr Framework unit tests. Teaches how to write isolated, deterministic unit tests using DrumrUnitTestKit and shared testing conventions, and how to execute/run them in the app.
metadata:
  applies-to:
    - qa/drumr-unit-test-kit.ts
---

# Skill: Unit

> How to design and generate unit tests for Drumr applications using app-level subclasses of DrumrUnitTestKit.

## What This Skill Covers

- Unit scope definition (backend services, actions, pure helpers, frontend components)
- Test isolation strategy (mock ORM/DB, isolate DI services, inject base context)
- Frontend unit wrappers (`renderWithProviders`, event simulation)
- App-level extension of `DrumrUnitTestKit`
- Optional runtime injection (`expect`, `mockFactory`, auto-reset policy)
- Naming/context helper configuration (`suiteName`, `caseName`, `useContext`)
- Naming and structure conventions for deterministic, maintainable unit tests

---

## Core Rules

1. **Framework kit stays agnostic** — `qa/drumr-unit-test-kit.ts` must never include app business logic.
2. **Apps extend, never fork** — app repositories should create subclasses (for fixtures/helpers) instead of editing framework kit.
3. **One test, one responsibility** — each unit test validates a single behavior.
4. **Deterministic tests** — avoid network, real DB, and wall-clock dependencies.
5. **Explicit mocking** — mock collaborators via `backend.mockDatabase()` / `backend.isolateService()` patterns.
6. **Context first** — inject base app context in setup and override per test with `withContext()`.

---

## Recommended File Organization

```text
<app>/tests/unit/
  backend/
    <service>.spec.ts
    <action>.spec.ts
  frontend/
    <component>.spec.tsx
  test-kit/
    app-unit-test-kit.ts        # extends DrumrUnitTestKit
```

## App-Level Extension Pattern

```typescript
import { DrumrUnitTestKit } from '@drumr/framework-qa/drumr-unit-test-kit';

export class AppUnitTestKit extends DrumrUnitTestKit<MyAppContext> {
  withAdminContext(): this {
    return this.withContext({ user: { role: 'admin' } } as Partial<MyAppContext>);
  }
}
```

## Test Lifecycle Pattern

```typescript
const kit = new AppUnitTestKit({ backend, frontend, context: baseContext });

beforeEach(async () => {
  await kit.setup();
});

afterEach(async () => {
  await kit.teardown();
});
```

## Backend Unit Pattern

- Arrange: isolate service dependencies and DB/ORM calls
- Act: execute unit under test
- Assert: validate output + interaction expectations

## Frontend Unit Pattern

- Arrange: render using `frontend.renderWithProviders(...)`
- Act: simulate user interaction with `frontend.fireEvent(...)`
- Assert: verify UI state/output via the test framework assertion layer

## Optional Runtime Configuration

`DrumrUnitTestKit` can also be used as a pure abstract API without subclassing by passing optional runtime settings:

- `runtime.expect`: inject assertion API from Jest/Vitest.
- `runtime.mockFactory`: inject generic mock creation strategy.
- `runtime.autoReset`: choose `teardown` (default) or `manual` reset behavior.
- `runtime.naming`: configure `suitePrefix` and `casePrefix` for naming helpers.
- `runtime.contextHelpers`: define reusable named context patches used via `kit.useContext(name)`.

---

## What You Must NEVER Do

- Put app-specific entities/workflows inside framework `DrumrUnitTestKit`.
- Couple unit tests to E2E selectors, Playwright APIs, or DOM internals from E2E kit.
- Share mutable global state across unit tests.
- Depend on test execution order.

---

## Related Skills

- `testing` — E2E test structure and naming
- `dom` — DrumrTestKit DOM abstraction for E2E only
- `playwright` — E2E runtime/debugging (not unit runtime)
- `testing-integration` — Integration test rules and DrumrIntegrationTestKit

## Usage & Execution

For detailed instructions on how to properly execute unit tests within applications (frontend and backend, a specific test, or the whole suite), refer to the definitive guide:

- [Test Execution Guide](./usage/usage.md)

## Examples

- [backend-service.md](./examples/backend-service.md) — service unit test with mocked dependencies
- [frontend-component.md](./examples/frontend-component.md) — component unit test with provider/event wrappers

Quick guide:

- If the unit under test is a backend service/action/helper, start with `backend-service.md`.
- If the unit under test is a React component/view helper, start with `frontend-component.md`.

---

## Prompt: Generate Unit Tests

> Use this prompt when generating or refactoring backend/frontend unit tests that must use an app-specific subclass of DrumrUnitTestKit.

### Input Variables

| Variable | Description | Example |
| --- | --- | --- |
| `{SCOPE}` | Unit scope (`backend`, `frontend`, or `full-stack unit`) | `backend` |
| `{TARGET}` | Unit under test | `TaskService.createTask` |
| `{DEPENDENCIES}` | Collaborators to mock/isolate | `TaskRepository, NotificationService` |
| `{CONTEXT}` | Required execution context | `tenantId, user role` |
| `{ASSERTIONS}` | Expected outputs/effects | `returns DTO, calls notifier once` |
| `{TEST_PATH}` | Output test file path | `tests/unit/backend/task-service.spec.ts` |

---

### Prompt Template

```text
Generate unit tests for {TARGET} in the Drumr app.

### Context
- Scope: {SCOPE}
- Dependencies to isolate/mock: {DEPENDENCIES}
- Required context: {CONTEXT}
- Expected assertions: {ASSERTIONS}
- Output path: {TEST_PATH}

### Requirements
1. Use an app-level subclass of `DrumrUnitTestKit` (do not modify framework base kit).
2. Use kit lifecycle (`setup` / `teardown`) and context injection (`withContext`) patterns.
3. Isolate backend collaborators with kit backend helpers (`mockDatabase`, `isolateService`, `reset`).
4. For frontend unit tests, render with `renderWithProviders` and simulate events via `fireEvent` wrapper.
5. Keep tests deterministic and independent (no real network/DB).
6. Keep assertions focused on business behavior, not implementation details.
7. If needed, configure runtime options (`expect`, `mockFactory`, `autoReset`, naming/context helpers) instead of adding app logic to the framework kit.
8. If helper APIs are missing, add them to the app-level subclass first.

### Output
- A complete unit test file in {TEST_PATH}
- If needed, a small update to app-level unit test kit subclass file
```

---

### Usage Example

```text
Generate unit tests for TaskService.updatePriority in the Drumr app.

### Context
- Scope: backend
- Dependencies to isolate/mock: TaskRepository, PermissionService
- Required context: tenantId=acme, user role=manager
- Expected assertions: updates priority, persists changes, throws when unauthorized
- Output path: tests/unit/backend/task-service.spec.ts

### Requirements
[...as above...]
```

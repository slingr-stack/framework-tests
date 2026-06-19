---
name: testing-integration
description: Essential skill for Drumr Framework integration tests. Teaches how to write deterministic backend and frontend integration tests using DrumrIntegrationTestKit, and how to execute/run them in the app.
metadata:
  applies-to:
    - qa/drumr-integration-test-kit.ts
---

# Skill: Integration

> How to write, structure, and review integration tests for Drumr applications — covering both backend and frontend layers.

## What This Skill Covers

- What integration tests are and where they sit between Unit and E2E
- Backend integration scope (actions, services, data models, DI, mocked boundaries)
- Headless backend bootstrap with `App.resolve(TestApp).initTestContext({ dataSet })`
- Dataset-backed fixtures, including `AppFile` binaries loaded through `__path`
- Frontend integration scope (views, components, mocked services, React Testing Library)
- Folder and naming conventions
- `DrumrIntegrationTestKit` usage guidance
- Quality checklist and warnings policy
- Validation commands

---

## 1. Purpose

Integration tests validate interactions between multiple application layers **without** browser automation. They sit between Unit tests (isolated single-function logic) and E2E tests (full browser-driven flows).

- They prove that two or more internal layers cooperate correctly.
- They mock only external boundaries (databases, third-party APIs), not the interaction under test.
- They run in Node.js (backend) or jsdom (frontend) — never in a real browser.

---

## 2. Scope

### Backend Integration Tests

Backend integration tests cover real interactions such as:

- **Action → Service → Data Model / Data Source** — an action invokes a service that queries or mutates a data model.
- **Dependency Injection → Service / Action behavior** — the DI container resolves real dependencies and the action/service behaves correctly.
- **Request context → Action / Service behavior** — actions that depend on user context, permissions, or request metadata.
- **Mocked external boundary + real internal flow** — third-party APIs, email services, or external data sources are stubbed; internal logic is real.
- **App test context + Service / Action / Data interactions** — the app's `TestApp` or equivalent test harness boots the relevant container slice.

### Frontend Integration Tests

Frontend integration tests cover real interactions such as:

- **View + mocked service boundary** — a real view component renders, but API/data-service calls are mocked.
- **Real view / component composition** — parent and child components render together, not in isolation.
- **Lifecycle hooks** — `beforeSave`, `afterSaved`, `onRender`, or similar hooks fire and produce expected side effects.
- **Form flow + validation + submit behavior** — filling fields, triggering validation, and submitting the form through the component tree.
- **Custom view filtering or state transitions** — tab switches, filter changes, or internal state machines behave correctly.
- **Mocked backend / API / data-service boundary** — GraphQL queries, REST calls, or data-service layers are stubbed at the network or service level.

---

## 3. What Integration Tests Are NOT

| Integration tests are NOT | Why |
| --- | --- |
| E2E / Playwright / browser automation | Those belong in the `testing` + `dom` + `playwright` skills and use `DrumrTestKit`. |
| Raw DOM selector tests | Integration specs should use React Testing Library queries, not CSS selectors or `page.locator()`. |
| Pure unit tests | A unit test isolates a single function with all dependencies mocked. Integration tests exercise real collaboration. |
| Snapshot-only tests | A snapshot is not an integration assertion. Snapshots may complement, but never replace, behavioral checks. |
| Placeholder tests | Every test must assert real behavior of real modules. |
| Tests for non-existing modules | Only test code that exists in the codebase today. |
| Production code changes | Integration test PRs must not modify production source unless explicitly in scope. |

---

## 4. Folder and Naming Conventions

### Backend

```text
backend/
  tests/
    integration/
      <action-or-feature>.integration.spec.ts
      mocks/           # optional — shared stubs/fixtures
```

| Element        | Convention                      | Example                                 |
| -------------- | ------------------------------- | --------------------------------------- |
| Spec file      | `<feature>.integration.spec.ts` | `initializeProject.integration.spec.ts` |
| Describe block | `'<Feature> — Integration'`     | `'initializeProject — Integration'`     |
| Test name      | `'should <expected behavior>'`  | `'should set status to IN_PROGRESS'`    |

### Frontend

```text
frontend/
  tests/
    integration/
      <view-or-feature>.integration.spec.tsx
      mocks/           # optional — shared stubs/fixtures
```

| Element        | Convention                     | Example                                           |
| -------------- | ------------------------------ | ------------------------------------------------- |
| Spec file      | `<view>.integration.spec.tsx`  | `summaryView.integration.spec.tsx`                |
| Describe block | `'<ViewName> — Integration'`   | `'SummaryView — Integration'`                     |
| Test name      | `'should <expected behavior>'` | `'should render project cards from service data'` |

### Support files

- Mocks may live under `tests/integration/mocks/`.
- Test app/context helpers may live directly under `tests/integration/`.

---

## 5. TestKit Usage

| Test type   | TestKit                    | When to use                     |
| ----------- | -------------------------- | ------------------------------- |
| E2E         | `DrumrTestKit`            | Browser-driven Playwright specs |
| Unit        | `DrumrUnitTestKit`        | Isolated single-function logic  |
| Integration | `DrumrIntegrationTestKit` | Cross-layer interaction tests   |

### `DrumrIntegrationTestKit` Guidance

- **Use it where it adds value.** The kit provides status assertions (`expectOk`, `expectClientError`), body assertions (`expectBodyContains`, `expectBodyArray`, `expectRequiredKeys`), error message assertions (`expectErrorMessage`), and setup/cleanup lifecycle helpers (`runWithCleanup`, `withSetupAndCleanup`).
- **Avoid forcing it** into pure React Testing Library assertions if it makes the test less clear. RTL's `screen.getByText()` / `expect(element).toBeInTheDocument()` is often more readable for DOM-level checks.
- **Do not add app-specific helpers** to the generic kit. App-specific setup belongs in the app's own test helpers.
- **Import path:** `import { DrumrIntegrationTestKit } from '@drumr/qa';` or a local copy, depending on the app's package setup.

---

## 6. Backend Integration Patterns

### Test Context / TestApp

If the app provides a `TestApp`, prefer the framework's headless bootstrap API. It initializes the real Drumr backend runtime and can load a dataset before the first assertion:

```typescript
import type { Express } from 'express';
import { App, app } from '@drumr/framework-backend';
import { TestApp } from './TestApp';

let server: Express;

beforeAll(async () => {
  server = await App.resolve(TestApp).initTestContext({ dataSet: 'test-api' });
});

afterAll(async () => {
  await app.stop();
});
```

- `initTestContext({ dataSet })` boots the app without binding an HTTP port, then loads `backend/src/config/data-sources/datasets/<datasource-id>/<dataSet>/`.
- Prefer isolated dataset names such as `test-api`, `test-auth`, or `test-loading`.

### Dataset-backed integration tests

Use dataset-backed setup when a spec needs stable relational fixtures, pre-seeded users, or persistent `AppFile` binaries:

```text
backend/
  src/
    config/
      data-sources/
        datasets/
          mainDs/
            test-loading/
              User.jsonl
              Project.jsonl
              Task.jsonl
              File.jsonl
              datasetOptions.json
```

- Keep datasets minimal and deterministic.
- Use stable IDs whenever the test asserts relationships, file storage paths, or nested references.
- Prefer dedicated `test-*` datasets over mutating broad shared fixtures like `default`.

### GraphQL integration over HTTP

When a test must validate the full GraphQL API path (queries, mutations, union responses), use the `initTestContext()` + `supertest` pattern. This boots the app in-process and sends HTTP-like requests directly to Express — no port binding needed.

```typescript
import 'reflect-metadata';
import type { Express } from 'express';
import request from 'supertest';
import { App, app } from '@drumr/framework-backend';
import { TestApp } from './TestApp';

describe('My Action — GraphQL Integration', () => {
  let server: Express;
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = App.resolve(TestApp);
    // Always start from a clean guest-permissions baseline to avoid leakage
    // from previous suites running in the same Jest worker.
    app.defineGuestPermissions(() => {});
    server = await testApp.initTestContext();
    app.defineGuestPermissions(({ can }) => {
      can('manage', 'all');
    });
  });

  afterAll(async () => {
    // Reset guest permissions again so this suite does not leak to the next one.
    app.defineGuestPermissions(() => {});
    await testApp.stop();
  });

  it('executes GetDashboardSummary query', async () => {
    const query = `query {
      GetDashboardSummary {
        ... on DashboardSummaryResult { totalTasks completedTasks }
      }
    }`;

    const res = await request(server).post('/graphql').send({ query });
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.GetDashboardSummary.totalTasks).toBeGreaterThanOrEqual(0);
  });

  it('executes CreateTask mutation with variables', async () => {
    const query = `mutation($title: String!) {
      CreateTask(input: { title: $title }) {
        ... on Task { id title }
      }
    }`;

    const res = await request(server)
      .post('/graphql')
      .send({ query, variables: { title: 'New task' } });
    expect(res.status).toBe(200);
    expect(res.body.data.CreateTask.title).toBe('New task');
  });
});
```

Key points:
- `initTestContext()` returns the Express app directly — no real port binding or network overhead.
- `supertest` sends requests as if they come over HTTP (validates status, headers, body).
- Guest permissions default pattern: `can('manage', 'all')` grants full access for test isolation.
- For permission-sensitive suites, explicitly set `app.defineGuestPermissions(() => {})` in both `beforeAll` and `afterAll` to prevent permission leakage between suites.
- Write GraphQL queries as strings with union spreads (`... on TypeName { fields }`).
- Always call `testApp.stop()` in `afterAll` to clean up datasources.
- For dataset-loaded tests, pass `{ dataSet: 'my-dataset' }` to `initTestContext()`.

### `AppFile` fixtures and `__path`

For models that extend `AppFile`, JSONL records may include the reserved metadata field `__path`:

```json
{"id":"44444444-4444-4444-8444-444444444444","name":"sample.pdf","fileType":"application/pdf","__path":"../../tests/integration/files/sample.pdf"}
```

- `__path` must be a non-empty relative path.
- The path is resolved relative to the JSONL file directory.
- `__path` is stripped before `fromJSON()` and persistence, so it is never stored as a model field.
- After the `AppFile` record is saved, the loader copies the binary into `process.env.STORAGE_PATH ?? 'files'`.

### DI Container

Resolve the action or service under test from the container — do not instantiate it manually:

```typescript
const action = app.container.resolve(InitializeProjectAction);
```

### Mocking Boundaries

- Mock only the **external** boundary (data source, third-party API, email sender).
- Keep the internal flow **real** — that is the interaction you are testing.
- Use `jest.spyOn()` or manual stubs, not deep mocks that replace the entire dependency tree.

### Success and Failure Cases

Every integration spec should include at least:

1. A **success case** — the happy path through the interaction.
2. A **failure / guard case** — invalid input, missing dependency, permission denied, or error propagation.

### Cleanup / Reset

- Use `beforeEach` / `afterEach` to reset mutable state between tests.
- If using `DrumrIntegrationTestKit`, use `runWithCleanup` or `withSetupAndCleanup` for scoped lifecycle.
- For headless backend tests started with `initTestContext()`, always call `app.stop()` in `afterAll`.
- Avoid shared mutable state across `describe` blocks.

---

## 7. Frontend Integration Patterns

### React Testing Library

When the app uses React Testing Library (RTL), prefer its query methods:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

### Rendering Real Views

Render the actual view component, not a simplified stub:

```typescript
render(<SummaryView projects={mockProjects} />);
```

Wrap in necessary providers (router, theme, context) if the component requires them.

### Mocking Service Boundaries

Mock the data/service layer, not the component internals:

```typescript
jest.mock('../../src/services/projectService', () => ({
  fetchProjects: jest.fn().mockResolvedValue(mockProjects),
}));
```

### User-Facing Assertions

Assert what the user sees, not implementation details:

```typescript
// Good — user-facing
expect(screen.getByText('My Project')).toBeInTheDocument();

// Bad — implementation detail
expect(component.state.projects).toHaveLength(1);
```

### Avoiding Playwright / Page Usage

Frontend integration tests run in jsdom via Jest. **Never** import Playwright `Page`, `Locator`, or browser APIs. If a test needs browser automation, it belongs in the E2E path.

### Avoiding Global Console Suppression

Do not add blanket `jest.spyOn(console, 'error').mockImplementation(() => {})` at the top level. If a specific test expects a console warning, suppress it narrowly within that test only.

### Async Helpers and `act()` Warnings

- Use RTL's `waitFor`, `findByText`, `findByRole` for async assertions.
- Wrap async state updates in `act()` only when RTL utilities are insufficient.
- If `act()` warnings appear, fix the root cause (missing `await`, missing `waitFor`) rather than suppressing the warning.

---

## 8. Quality Checklist

Before submitting an integration test PR, verify every item:

- [ ] Test targets real existing modules (actions, services, views, components).
- [ ] Test validates interaction across at least two layers.
- [ ] Success case included.
- [ ] Failure / error / edge case included where feasible.
- [ ] External dependencies mocked or stubbed where appropriate.
- [ ] No production logic modified (unless explicitly in scope).
- [ ] No E2E / Playwright usage.
- [ ] Naming and location follow convention (`*.integration.spec.ts(x)` in `tests/integration/`).
- [ ] Test is deterministic — no random failures, no timing dependencies.
- [ ] Validation command passes (see § 10).

---

## 9. Warnings Policy

| Warning type | Policy |
| --- | --- |
| **React `act()` warnings** | Fix if possible with minimal test-side changes (proper `await`, `waitFor`). Do not suppress globally. |
| **Production deprecation warnings** (e.g., Ant Design, TypeORM) | Do NOT fix inside integration-test PRs unless explicitly in scope. Document them as pre-existing if they appear in CI output. |
| **Test-local console warnings** | Suppress narrowly within the specific test if expected. Never suppress globally across a `describe` block. |
| **Framework startup warnings** (e.g., TypeORM hash-index) | Document as pre-existing and non-blocking. Do not attempt to fix in test code. |

---

## 10. Validation Commands

### Backend

```bash
cd apps/<app-name>/backend && pnpm test:integration
```

### Frontend

```bash
cd apps/<app-name>/frontend && pnpm test:integration
```

### QA Package (if the kit changed)

```bash
cd qa && npx tsc --project tsconfig.build.json
```

---

## Related Skills

- `testing` — E2E test rules, naming, patterns, DrumrTestKit-first specs
- `dom` — DrumrTestKit API, selector strategy, framework rendering
- `playwright` — Configuration, debugging, failure analysis
- `ci` — Running tests in CI, coverage
- `testing-unit` — Unit test scope, DrumrUnitTestKit rules and patterns
- `backend-app` — `TestApp`, `App.resolve(TestApp).initTestContext(...)`, backend lifecycle hooks, `ConfigService`, and service overrides used during backend test bootstrap

## Usage & Execution

For detailed instructions on how to properly execute integration tests within applications (frontend and backend, a specific test, or the whole suite), refer to the definitive guide:

- [Test Execution Guide](./usage/usage.md)

## Examples

Use the local examples in this same skill folder:

- [backend-action-integration.md](./examples/backend-action-integration.md) — backend integration flow (action/service with mocked external boundary)
- [frontend-view-integration.md](./examples/frontend-view-integration.md) — frontend integration flow (real view + mocked service boundary)

Quick guide:

- If you are testing action/service/DI behavior, start with `backend-action-integration.md`.
- If you are testing rendered UI behavior with RTL, start with `frontend-view-integration.md`.

---

## Prompt: Generate Integration Tests

> Use this prompt when you need to generate backend and/or frontend integration tests for a Drumr application.

### Input Variables

| Variable         | Description                                    | Example                                 |
| ---------------- | ---------------------------------------------- | --------------------------------------- |
| `{APP_NAME}`     | Application display name                       | `Project Management App`                |
| `{APP_DIR}`      | Application directory path                     | `apps/project-management-app`           |
| `{TARGET_LAYER}` | Which layers to cover                          | `backend`, `frontend`, or `both`        |
| `{MODULES}`      | Specific modules/features to target (optional) | `initializeProject action, SummaryView` |
| `{ISSUE}`        | Related issue number (optional)                | `#1366`                                 |

---

### Prompt Template

```
Generate integration tests for the {APP_NAME} Drumr app.

### Context
- App directory: {APP_DIR}
- Target layer: {TARGET_LAYER}
- Specific modules: {MODULES}
- Related issue: {ISSUE}
- Read the integration skill at `core/skills/testing-integration/SKILL.md`

### Scope
- Integration tests validate interactions between multiple app layers.
- They sit between Unit (isolated logic) and E2E (browser-driven).
- Backend: action → service → data model interactions, DI resolution, mocked external boundaries.
- Frontend: view + mocked service boundary, real component composition, form flow + validation.

### Hard Constraints
1. Do NOT modify production source code.
2. Do NOT modify existing Unit or E2E tests.
3. Do NOT use Playwright, Page, Locator, or browser APIs.
4. Do NOT create snapshot-only tests.
5. Do NOT create placeholder tests or tests for non-existing modules.
6. Do NOT globally suppress console warnings.
7. Do NOT add app-specific helpers to `DrumrIntegrationTestKit`.
8. Every test must target real modules that exist in the codebase.
9. Every test must validate a real cross-layer interaction.

### Audit Phase — No Edits
Before writing any test:
1. Read `{APP_DIR}/package.json` and `{APP_DIR}/backend/package.json` and `{APP_DIR}/frontend/package.json` — identify test scripts, test frameworks, and existing dependencies.
2. List existing test directories: `{APP_DIR}/backend/tests/` and `{APP_DIR}/frontend/tests/`.
3. If integration tests already exist, read them to understand existing patterns and avoid duplication.
4. Read the source modules you plan to test — actions, services, views, components.
5. Identify real integration candidates: flows that cross at least two layers.
6. Propose the exact file list before creating any files.

### Backend Integration Generation Phase
For each backend integration candidate:
1. Create spec at `backend/tests/integration/<feature>.integration.spec.ts`.
2. Use the app's existing `TestApp` or test context if available.
3. Resolve actions/services from the DI container — do not instantiate manually.
4. Mock only external boundaries (data sources, third-party APIs).
5. Include at least one success case and one failure/guard case.
6. Add cleanup/reset in `afterEach` or `afterAll` as needed.
7. Use `DrumrIntegrationTestKit` for response/body assertions where it adds clarity.

### Frontend Integration Generation Phase
For each frontend integration candidate:
1. Create spec at `frontend/tests/integration/<view>.integration.spec.tsx`.
2. Use React Testing Library (`render`, `screen`, `waitFor`, `userEvent`).
3. Render real view/component — not a simplified stub.
4. Mock service/API boundaries at the module or network level.
5. Assert what the user sees (`getByText`, `getByRole`), not implementation details.
6. Include at least one success case and one empty/error/edge case.
7. Use async RTL utilities (`findByText`, `waitFor`) to avoid `act()` warnings.
8. Do NOT use Playwright Page or browser APIs.

### TestKit Guidance
- Use `DrumrIntegrationTestKit` only where it adds value (status checks, body assertions, lifecycle helpers).
- Do NOT force the kit into pure RTL assertions where `screen.getByText()` is clearer.
- Do NOT add app-specific logic to the generic kit.
- If the kit is insufficient, use plain Jest assertions — do not extend the kit in this task.

### Warning Cleanup Policy
- Fix React `act()` warnings with proper `await` / `waitFor` if possible.
- Do NOT fix pre-existing production deprecation warnings (Ant Design, TypeORM, etc.) unless explicitly in scope.
- Document any non-blocking pre-existing warnings in the final report.

### Validation
Run these commands and confirm they pass:

Backend:
  cd {APP_DIR}/backend && pnpm test:integration

Frontend:
  cd {APP_DIR}/frontend && pnpm test:integration

QA package (only if kit was modified):
  cd qa && npx tsc --project tsconfig.build.json

### Final Report
Return:
1. Files added (with paths).
2. Files modified (with paths) — should be empty for test-only changes.
3. Test count: suites and individual tests per layer.
4. Validation results: all commands and their pass/fail status.
5. Pre-existing warnings observed (non-blocking).
6. Assumptions made.
7. Whether the PR is ready to commit.
```

---

### Usage Example

```
Generate integration tests for the Project Management App Drumr app.

### Context
- App directory: apps/project-management-app
- Target layer: both
- Specific modules: initializeProject action, completeTask action, evaluateTaskPriority action, SummaryView, TaskEditView
- Related issue: #1366
- Read the integration skill at `core/skills/testing-integration/SKILL.md`

### Requirements
[...as above...]
```

# Frontend testing guide

This document is the reference for app developers writing frontend tests in `project-management-app`.

## 1) What to test

### Unit tests (`tests/unit`)

Use unit tests for isolated logic and small UI helpers/services.

Examples in this app:

- `tests/unit/services/SummaryTableDataService.spec.ts`
- `tests/unit/services/DashboardDataService.spec.ts`
- `tests/unit/services/GraphQLClientService.spec.ts`
- `tests/unit/components/formFooterHelpers.spec.tsx`

### Integration tests (`tests/integration`)

Use integration tests for real view/component behavior with mocked service boundaries.

Examples in this app:

- `tests/integration/summaryView.integration.spec.tsx`
- `tests/integration/taskEditView.integration.spec.tsx`

## 2) Naming and location conventions

- Unit tests: `tests/unit/<area>/<feature>.spec.ts(x)`
- Integration tests: `tests/integration/<feature>.integration.spec.tsx`

Use behavior-oriented names:

- `it('applies active project filters and refreshes table data', ...)`
- `it('blocks saving done tasks and shows warning', ...)`

## 3) Test style recommendations

- Prefer user-observable assertions (`screen.getByText`, `getByRole`, `findByText`).
- Keep Arrange / Act / Assert structure explicit.
- Mock API/service boundaries, not component internals.
- Use deterministic data and avoid timing flakiness.

For unit tests, you can use direct `DrumrUnitTestKit` composition where it improves clarity.

## 4) Commands

Run commands from `apps/project-management-app/frontend`.

- Run all frontend tests:

```bash
npm test
```

- Run only frontend integration tests:

```bash
npm run test:integration
```

- Run tests in watch mode:

```bash
npm run test:watch
```

- Run only frontend unit tests:

```bash
npm test -- --testPathPatterns='tests/unit'
```

- Run a single unit test file:

```bash
npm test -- --runTestsByPath tests/unit/services/SummaryTableDataService.spec.ts
```

- Run a single integration test file:

```bash
npm test -- --runTestsByPath tests/integration/summaryView.integration.spec.tsx
```

- Unit coverage example:

```bash
npm test -- --testPathPatterns='tests/unit' --coverage --collectCoverageFrom='src/**/*.{ts,tsx}'
```

## 5) Before opening a PR

- Add tests for the changed behavior (happy path + guard/error path).
- Ensure tests are readable enough to be used as examples by app developers.
- Run `npm test` locally.

## 6) Configuration reference

- Jest config: `config/jest.config.ts`
- Test setup: `tests/setup.ts`
- Scripts: `package.json`

## 7) E2E test credentials

Authenticated E2E tests require credentials for a valid user in the target application environment.

When running E2E tests, configure the required credentials through environment variables before starting the test command:

```bash
E2E_ADMIN_EMAIL
E2E_ADMIN_PASSWORD
```

Depending on the test setup, the following alternatives may also be supported:

```bash
E2E_EMAIL
E2E_USERNAME
E2E_PASSWORD
```

Example for PowerShell:

```powershell
$env:E2E_ADMIN_EMAIL="admin@example.com"
$env:E2E_ADMIN_PASSWORD="password"
npm run test:e2e
```

If credentials are not configured, the E2E setup will stop before running the test suite.


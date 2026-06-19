# Backend testing guide

This document is the reference for app developers writing backend tests in `project-management-app`.

## 1) What to test

### Unit tests (`tests/unit`)

Use unit tests when you validate isolated logic with mocked boundaries.

Examples in this app:

- `tests/unit/services/EmailService.spec.ts`
- `tests/unit/services/MockEmailService.spec.ts`
- `tests/unit/shared/utils.spec.ts`

### Integration tests (`tests/integration`)

Use integration tests when you validate real collaboration between action/service/model/DI.

When a test needs to validate GraphQL queries/mutations over HTTP, use `initTestContext()` + `supertest`. This boots the app in-process and sends requests directly to Express — no port binding needed:

Examples in this app:

- `tests/integration/completeTask.integration.spec.ts`
- `tests/integration/evaluateTaskPriority.integration.spec.ts`
- `tests/integration/initializeProject.integration.spec.ts`
- `tests/integration/OperationBuilder.integration.spec.ts`

## 2) Naming and location conventions

- Unit: `tests/unit/<area>/<feature>.spec.ts`
- Integration: `tests/integration/<feature>.integration.spec.ts`

Keep one behavior focus per test case and use descriptive names:

- `it('completes the task and records an activity log', ...)`
- `it('rejects blocked tasks', ...)`

## 3) Test style recommendations

Use Arrange / Act / Assert consistently:

1. Arrange: build data, configure context, mock external boundary.
2. Act: execute action/service under test.
3. Assert: verify observable behavior and important side effects.

Guidelines:

- Prefer deterministic data (avoid random IDs/time unless explicitly needed).
- Mock only external boundaries; keep core flow real.
- Reset mocks and DI state between tests.

## 4) Commands

Run commands from `apps/project-management-app/backend`.

- Run all backend tests:

```bash
npm test
```

- Run only backend unit tests:

```bash
npm run test:unit
```

- Run only backend integration tests:

```bash
npm run test:integration
```

- Run tests in watch mode:

```bash
npm run test:watch
```

- Run a single unit test file:

```bash
npm run test:unit -- --runTestsByPath tests/unit/services/EmailService.spec.ts
```

- Run a single integration test file:

```bash
npm run test:integration -- --runTestsByPath tests/integration/completeTask.integration.spec.ts
```

- Unit coverage example:

```bash
npm run test:unit -- --coverage --collectCoverageFrom='src/**/*.ts'
```

## 5) Before opening a PR

- Add/adjust tests for the changed behavior.
- Ensure success + guard/error scenarios are covered.
- Run `npm test` locally.
- Keep tests readable for app developers using this app as reference.

## 6) Configuration reference

- Jest config: `config/jest.config.ts`
- Test TypeScript config: `tsconfig.test.json`
- Scripts: `package.json`

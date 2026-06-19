# Unit testing: examples and prompt template

Worked examples and a reusable prompt template for generating unit tests. See [concepts.md](./concepts.md) for the patterns these examples build on and [guidelines.md](./guidelines.md) for recommendations.

## Worked examples

- [examples/backend-service.md](./examples/backend-service.md) — service unit test with mocked dependencies
- [examples/frontend-component.md](./examples/frontend-component.md) — component unit test with provider/event wrappers

Quick guide:

- If the unit under test is a backend service/action/helper, start with [examples/backend-service.md](./examples/backend-service.md).
- If the unit under test is a React component/view helper, start with [examples/frontend-component.md](./examples/frontend-component.md).

## Prompt: generate unit tests

> Use this prompt when generating or refactoring backend/frontend unit tests that should use an app-specific subclass of DrumrUnitTestKit.

### Input variables

| Variable | Description | Example |
| --- | --- | --- |
| `{SCOPE}` | Unit scope (`backend`, `frontend`, or `full-stack unit`) | `backend` |
| `{TARGET}` | Unit under test | `TaskService.createTask` |
| `{DEPENDENCIES}` | Collaborators to mock/isolate | `TaskRepository, NotificationService` |
| `{CONTEXT}` | Required execution context | `tenantId, user role` |
| `{ASSERTIONS}` | Expected outputs/effects | `returns DTO, calls notifier once` |
| `{TEST_PATH}` | Output test file path | `tests/unit/backend/task-service.spec.ts` |

### Prompt template

```text
Generate unit tests for {TARGET} in the Drumr app.

### Context
- Scope: {SCOPE}
- Dependencies to isolate/mock: {DEPENDENCIES}
- Required context: {CONTEXT}
- Expected assertions: {ASSERTIONS}
- Output path: {TEST_PATH}

### Guidelines
1. Use an app-level subclass of `DrumrUnitTestKit` (avoid modifying the framework base kit).
2. Use the kit lifecycle (`setup` / `teardown`) and context injection (`withContext`) patterns.
3. Isolate backend collaborators with the kit backend helpers (`mockDatabase`, `isolateService`, `reset`).
4. For frontend unit tests, render with `renderWithProviders` and simulate events via the `fireEvent` wrapper.
5. Keep tests deterministic and independent (no real network/DB).
6. Keep assertions focused on business behavior rather than implementation details.
7. If needed, configure runtime options (`expect`, `mockFactory`, `autoReset`, naming/context helpers) instead of adding app logic to the framework kit.
8. If helper APIs are missing, consider adding them to the app-level subclass first.

### Output
- A complete unit test file in {TEST_PATH}
- If needed, a small update to the app-level unit test kit subclass file
```

### Usage example

```text
Generate unit tests for TaskService.updatePriority in the Drumr app.

### Context
- Scope: backend
- Dependencies to isolate/mock: TaskRepository, PermissionService
- Required context: tenantId=acme, user role=manager
- Expected assertions: updates priority, persists changes, throws when unauthorized
- Output path: tests/unit/backend/task-service.spec.ts

### Guidelines
[...as above...]
```

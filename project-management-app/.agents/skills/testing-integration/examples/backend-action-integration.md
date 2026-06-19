# Example: Backend Action Integration Test

> A generic pattern for testing an action that interacts with a service and data model through the app's DI container.

## File Location

```text
backend/tests/integration/executeMyAction.integration.spec.ts
```

## Full Example

```typescript
import { TestApp } from '../test-app';
import { ExecuteMyAction } from '../../src/my-module/actions/execute-my.action';
import { MyDataSource } from '../../src/infra/data-sources/main.ds';
import { DrumrIntegrationTestKit } from '@drumr/qa';

describe('executeMyAction — Integration', () => {
  let app: TestApp;
  let action: ExecuteMyAction;
  let kit: DrumrIntegrationTestKit;

  beforeAll(async () => {
    app = await TestApp.create();
    action = app.container.resolve(ExecuteMyAction);
    kit = new DrumrIntegrationTestKit();
  });

  afterAll(async () => {
    await app.destroy();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Success case ────────────────────────────────────────────

  it('should process the entity and return updated data', async () => {
    // Arrange — mock only the external data source boundary
    jest.spyOn(MyDataSource.prototype, 'fetchExternalData').mockResolvedValue({
      id: 'ext-1',
      payload: { value: 42 },
    });

    // Act — execute the action through the real internal flow
    const result = await action.execute({
      entityId: 'entity-1',
      userId: 'user-1',
    });

    // Assert — use kit for response-level assertions
    kit.expectOk(result);
    kit.expectBodyContains(result, {
      entityId: 'entity-1',
      status: 'PROCESSED',
    });
  });

  // ── Failure / guard case ────────────────────────────────────

  it('should reject when required input is missing', async () => {
    const result = await action.execute({
      entityId: '',
      userId: 'user-1',
    });

    kit.expectClientError(result);
    kit.expectErrorMessage(result, /entityId is required/i);
  });

  // ── Edge case with scoped cleanup ───────────────────────────

  it('should handle external service failure gracefully', async () => {
    await kit.runWithCleanup(
      async () => {
        // Arrange — external boundary throws
        jest.spyOn(MyDataSource.prototype, 'fetchExternalData').mockRejectedValue(
          new Error('Service unavailable'),
        );

        // Act
        const result = await action.execute({
          entityId: 'entity-2',
          userId: 'user-1',
        });

        // Assert — error is propagated with context
        kit.expectServerError(result);
        kit.expectErrorMessage(result, /service unavailable/i);
      },
      async () => {
        // Cleanup — restore any side-effects if needed
        jest.restoreAllMocks();
      },
    );
  });
});
```

## Key Patterns Demonstrated

| Pattern | Where |
|---------|-------|
| TestApp / DI container setup | `beforeAll` — boot once, resolve action |
| Mock external boundary only | `jest.spyOn(MyDataSource.prototype, ...)` |
| Real internal flow | `action.execute()` — no internal mocks |
| Success case | First test — happy path |
| Failure / guard case | Second test — missing input |
| Scoped cleanup | Third test — `kit.runWithCleanup()` |
| `DrumrIntegrationTestKit` usage | `kit.expectOk()`, `kit.expectClientError()`, `kit.expectBodyContains()`, `kit.expectErrorMessage()` |
| Restore mocks between tests | `afterEach(() => jest.restoreAllMocks())` |

## When to Use `DrumrIntegrationTestKit`

- **Use it** for response-level assertions (`expectOk`, `expectClientError`, `expectBodyContains`, `expectErrorMessage`).
- **Use it** for lifecycle management (`runWithCleanup`, `withSetupAndCleanup`).
- **Skip it** when plain `expect(value).toBe(...)` is clearer for simple property checks.

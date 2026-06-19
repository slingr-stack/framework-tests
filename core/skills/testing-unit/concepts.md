# Unit testing: concepts and patterns

This file explains how `DrumrUnitTestKit` is meant to be used and the core patterns for writing unit tests. See [guidelines.md](./guidelines.md) for recommendations and [examples.md](./examples.md) for worked examples.

## Core ideas

These are the principles that keep the kit reusable and unit tests isolated. The first one is a technical requirement (the framework kit is shared across apps); the others are strong recommendations that keep tests maintainable.

1. **Framework kit stays agnostic (technical requirement)** — `qa/drumr-unit-test-kit.ts` is shared framework code, so keep app business logic out of it.
2. **Apps extend, rather than fork** — app repositories are encouraged to create subclasses (for fixtures/helpers) instead of editing the framework kit, so they can pick up framework updates cleanly.
3. **One test, one responsibility (suggested)** — aim to validate a single behavior per unit test. This keeps failures easy to diagnose, though you can group closely related assertions when it reads better.

## App-level extension pattern

The recommended way to add app-specific fixtures and helpers is to subclass the kit in your app repository:

```typescript
import { DrumrUnitTestKit } from '@drumr/framework-qa/drumr-unit-test-kit';

export class AppUnitTestKit extends DrumrUnitTestKit<MyAppContext> {
  withAdminContext(): this {
    return this.withContext({ user: { role: 'admin' } } as Partial<MyAppContext>);
  }
}
```

## Test lifecycle pattern

Instantiate the kit and wire its `setup`/`teardown` into your test runner's lifecycle hooks so each test starts from a clean state:

```typescript
const kit = new AppUnitTestKit({ backend, frontend, context: baseContext });

beforeEach(async () => {
  await kit.setup();
});

afterEach(async () => {
  await kit.teardown();
});
```

## Backend unit pattern

A typical backend unit test follows an arrange/act/assert shape:

- **Arrange:** isolate service dependencies and DB/ORM calls
- **Act:** execute the unit under test
- **Assert:** validate output + interaction expectations

## Frontend unit pattern

Frontend unit tests use the kit's rendering and event wrappers:

- **Arrange:** render using `frontend.renderWithProviders(...)`
- **Act:** simulate user interaction with `frontend.fireEvent(...)`
- **Assert:** verify UI state/output via the test framework assertion layer

## Optional runtime configuration

`DrumrUnitTestKit` can also be used as a pure abstract API without subclassing, by passing optional runtime settings. Reach for these when you need to adapt the kit to your runner or naming conventions without adding app logic to the framework kit:

- `runtime.expect`: inject the assertion API from Jest/Vitest.
- `runtime.mockFactory`: inject a generic mock creation strategy.
- `runtime.autoReset`: choose `teardown` (default) or `manual` reset behavior.
- `runtime.naming`: configure `suitePrefix` and `casePrefix` for naming helpers.
- `runtime.contextHelpers`: define reusable named context patches used via `kit.useContext(name)`.

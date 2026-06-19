# Unit testing: guidelines and recommendations

This file collects the recommendations for writing isolated, deterministic unit tests. These are suggestions you can adapt to your app's context — see [concepts.md](./concepts.md) for the underlying patterns and [examples.md](./examples.md) for worked examples.

## Things to keep out of unit tests

The following tend to make unit tests slow, flaky, or coupled to unrelated concerns. Avoid them unless a test genuinely needs them:

- Putting app-specific entities/workflows inside the framework `DrumrUnitTestKit` — keep app logic in your app-level subclass instead.
- Coupling unit tests to E2E selectors, Playwright APIs, or DOM internals from the E2E kit.
- Sharing mutable global state across unit tests.
- Depending on test execution order.

Avoiding these keeps unit tests independent and easy to reason about; the test isolation and lifecycle patterns in [concepts.md](./concepts.md) help you steer clear of them.

## Recommendations

- **Explicit mocking** — mock collaborators via `backend.mockDatabase()` / `backend.isolateService()` patterns so each test controls its own dependencies.
- **Context first** — inject the base app context in setup and override per test with `withContext()`; override per-test only when a test needs something different.
- **File organization** — a structure like the following works well, but feel free to organize tests however best fits your app:

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

## Running tests

To run the full unit test suite from the backend folder:

```bash
pnpm test:unit
```

To run a single test file, pass a partial name as a pattern — Jest will match any file whose path contains that string:

```bash
pnpm test:unit -- associate.data-model.spec.ts
```

## Determinism

Unit tests should be deterministic. Avoiding network calls, real DB access, and wall-clock dependencies is strongly recommended — these are the most common sources of flaky tests. When a unit genuinely depends on time or external data, inject it (via context, mocks, or runtime config) rather than reaching out to the real resource.

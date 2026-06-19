# Example: playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  workers: 4,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

- `fullyParallel: true` and multiple workers improve throughput when specs are isolated.
- `retries: 0` enforces determinism.
- Artifacts: screenshots, video, and trace only on failures.

## Credential resolution for login flows

For E2E specs that require authentication:

1. Resolve credentials from environment variables first: `E2E_EMAIL`, `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`.
2. If values are unknown during generation, stop before writing the spec and use `#tool:vscode/askQuestions`.
3. Ask for the email/username source and password strategy/source.
4. If credentials are still unavailable, stop with a clear actionable error.

Use `loginAsAdmin()` or the existing framework-approved login helper in the generated spec.
Do not hardcode passwords, placeholder credentials, invented credentials, or default demo credentials in generated tests.
Keep DrumrTestKit runtime fail-fast as a safety net, not the primary credential resolution mechanism.

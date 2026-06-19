# Example: NPM Scripts for E2E

```json
{
  "test:e2e": "npx playwright test",
  "test:e2e:headed": "npx playwright test --headed",
  "test:e2e:debug": "npx playwright test --headed --debug",
  "test:e2e:codegen": "npx playwright codegen http://localhost:8000"
}
```

Include these scripts in your app's `package.json` to make running and debugging E2E tests easier.
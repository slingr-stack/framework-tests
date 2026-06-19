# E2E tests execution guide for Drumr apps

This guide details how to execute E2E (End-to-End) tests using Playwright within applications built with the Drumr framework (e.g., `apps/project-management-app`).

Unlike Unit and Integration tests, E2E tests run in an environment that encompasses the entire application (frontend + backend - "full stack").

## Full Application (`apps/<app-name>`)

> **⚠️ Prerequisite:** Before running any E2E tests, the application (both frontend and backend) must be actively running locally or deployed to the target testing environment. E2E tests interact with the real, live application.

To run E2E tests, navigate to the root of the app (the same level where the app's workspace root is located, before entering backend or frontend):
```bash
cd apps/<app-name>
```

### 1. Run the entire E2E Test suite
Execute all Playwright tests in the app, typically located in `testsManagement/e2e/`:
```bash
pnpm run test:e2e
```
*(It is generally necessary to have run a build or to have the backend running depending on the app's configuration. The `pretest:e2e` script will build the QA framework beforehand).*

### 2. Run a specific file or suite
If you want to run a single E2E test file (e.g., `login.spec.ts`), pass the file or pattern after `--`:
```bash
pnpm run test:e2e -- testsManagement/e2e/login.spec.ts
```

### 3. Run E2E tests in Headed mode (View the browser)
Playwright runs tests in the background by default ("headless"). To see how it interacts with the browser visually:
```bash
pnpm run test:e2e:headed
```
*(You can also combine this with specific files: `pnpm run test:e2e:headed -- my-test.spec.ts`)*

### 4. Debug Mode
Run tests with the Playwright Inspector open, pausing execution for debugging:
```bash
pnpm run test:e2e:debug
```

### 5. Playwright Codegen
To open a browser instance that generates E2E code while you interact with the application:
```bash
pnpm run test:e2e:codegen
```

## Quick Reference from Workspace Root
If you don't want to change directories, you can use pnpm's filter flag from the root (`/`):

*(Note: Package names like `project-management-app-workspace` are just examples. The developer or AI must always use the exact value defined in the `name` field of the corresponding app's `package.json`.)*

```bash
# All E2E tests for the app workspace
pnpm --filter project-management-app-workspace run test:e2e

# A specific E2E test file
pnpm --filter project-management-app-workspace run test:e2e -- frontend/tests/e2e/login.spec.ts
```
# Integration tests execution guide for Drumr apps

This guide details how to execute integration tests within applications built with the Drumr framework (e.g., `apps/project-management-app`), for both the backend and frontend. The commands assume you are located in the root directory of the respective backend or frontend of the application.

## Backend (`apps/<app-name>/backend`)

To run backend integration tests, navigate to the `backend` folder of the app:
```bash
cd apps/<app-name>/backend
```

### 1. Run the entire Integration Test suite
Execute all tests located under the `tests/integration` pattern:
```bash
pnpm run test:integration
```

### 2. Run a specific file or suite
To isolate the execution to a single file (e.g., `user.action.spec.ts`), pass the file name or relative path after `--`:
```bash
pnpm run test:integration -- user.action.spec.ts
```

### 3. Important Considerations (Backend)
- **Test Database:** Backend integration tests use a temporary local test database managed by the Test Kit (SQLite or a dedicated DB). Usually, this requires `runInBand` or specific configurations in `jest.config.ts`, but the `test:integration` command abstracts this by invoking the correct configuration automatically.

---

## Frontend (`apps/<app-name>/frontend`)

To run frontend integration tests, navigate to the `frontend` folder of the app:
```bash
cd apps/<app-name>/frontend
```

### 1. Run the entire Integration Test suite
```bash
pnpm run test:integration
```

### 2. Run a specific file or suite
```bash
pnpm run test:integration -- dashboard.spec.tsx
```

## Quick Reference from Workspace Root
If you don't want to change directories, you can use pnpm's filter flag from the root (`/`):

*(Note: Package names like `project-management-app` or `project-management-app-frontend` are just examples. The developer or AI must always use the exact value defined in the `name` field of the corresponding app's `package.json`.)*

```bash
# All backend integration tests for the app
pnpm --filter project-management-app run test:integration

# A specific integration test in the frontend
pnpm --filter project-management-app-frontend run test:integration -- login.spec.tsx
```
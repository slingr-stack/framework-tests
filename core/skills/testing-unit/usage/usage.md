# Unit tests execution guide for Drumr apps

This guide details how to execute unit tests within applications built with the Drumr framework (e.g., `apps/project-management-app`), for both the backend and frontend. The commands assume you are in the root directory of the respective backend or frontend of the application.

## Backend (`apps/<app-name>/backend`)

To run backend unit tests, navigate to the `backend` folder of the app:
```bash
cd apps/<app-name>/backend
```

### 1. Run the entire Unit Test suite
Execute all tests located under the `tests/unit` pattern:
```bash
pnpm run test:unit
```

### 2. Run a specific file or suite
To isolate the execution to a single file (e.g., `task-service.spec.ts`), pass the file name or relative path after `--`:
```bash
pnpm run test:unit -- task-service.spec.ts
```
*(Note: Jest uses this string as a regex to filter matching files).*

### 3. Run tests in Watch mode (Development)
If you are actively developing tests, you can keep Jest running continuously on file changes:
```bash
pnpm run test:watch
```

---

## Frontend (`apps/<app-name>/frontend`)

To run frontend unit tests, navigate to the `frontend` folder of the app:
```bash
cd apps/<app-name>/frontend
```

### 1. Run the entire Unit Test suite
```bash
pnpm run test:unit
```

### 2. Run a specific file or suite
```bash
pnpm run test:unit -- my-component.spec.tsx
```

### 3. Run tests in Watch mode (Development)
```bash
pnpm run test:watch
```

## Quick Reference from Workspace Root
If you don't want to change directories, you can use pnpm's filter flag from the root (`/`):

*(Note: Package names like `project-management-app` or `project-management-app-frontend` are just examples. The developer or AI must always use the exact value defined in the `name` field of the corresponding app's `package.json`.)*

```bash
# All backend unit tests for the app
pnpm --filter project-management-app run test:unit

# A specific test in the frontend
pnpm --filter project-management-app-frontend run test:unit -- my-component.spec.tsx
```
---
name: backend-app
description: Essential skill for bootstrapping and configuring a Drumr backend app. Use when creating backend/src/App.ts, using @App/BaseApp lifecycle hooks, starting the backend  and configuring runtime behavior via src/config/config.json, reading src/config/config.json through ConfigService, resolving dependencies with App.resolve, or registering service overrides before startup.
user-invocable: true
---

# Backend skill: app bootstrap and configuration

## Purpose

Use this skill when the user asks about:

- Creating or editing `backend/src/App.ts`
- Defining the backend application entry point with `@App()` and `BaseApp`
- Configuring GraphQL, auth, workflows, metadata, and app-specific settings via `src/config/config.json`
- Reading `src/config/config.json` with `ConfigService`
- Using lifecycle hooks: `beforeStart`, `afterStart`, `beforeStop`, `onError`
- Resolving backend dependencies with `App.resolve(Token)`
- Replacing services or datasources before startup with `this.register(id, ReplacementClass)`

## Constraint checklist (single reference)

Use this checklist as the primary include/exclude gate when generating or reviewing code with this skill.

- [ ] Stay at app-bootstrap level only; do not document framework internals.
- [ ] Use only framework startup APIs (@App(), BaseApp, app.run(), lifecycle hooks, ConfigService, App.resolve).
- [ ] Do not manually initialize Express, Apollo, TypeORM, DBOS, or auth routes in app code.
- [ ] Keep startup code limited to initialization and configuration; move domain logic to services/actions/workflows.
- [ ] Put environment-driven settings in config/config.json and read them via ConfigService.
- [ ] Register service or datasource overrides in beforeStart() only.
- [ ] Keep exactly one @App() class per backend runtime app.

---

## Core concepts

| Concept | API | Use for |
| --- | --- | --- |
| App entry point | `@App()` + `extends BaseApp` | Register the backend application lifecycle class |
| Config file | `src/config/config.json` | Environment-specific backend configuration |
| Config service | `ConfigService` | Read typed config sections from DI |
| Service override | `this.register(id, ReplacementClass)` | Replace an implementation before startup |

---

## Minimal backend app

Create one app entry point under `backend/src/App.ts`. The class must extend `BaseApp` and be decorated with `@App()`.

```typescript
import { App, BaseApp } from '@drumr/framework-backend';

@App()
export class MyApp extends BaseApp {}
```

Notes:

- Import from `@drumr/framework-backend`.
- The framework auto-discovers data sources from `src/infra/data-sources/`, models from `src/<module>/data-models/`, actions from `src/<module>/actions/`, and workflows from `src/<module>/workflows/`.
- Use side-effect imports (e.g., `import '@/infra/auth/admin.perm'`) only when a file registers framework metadata by executing decorators or definer calls that are not in a convention directory.
- Apply the constraint checklist above for include/exclude decisions.

---

## Starting the app

In generated apps, importing the `@App()` entry module is enough for normal startup flow. The framework auto-runs the app outside test environments.

When writing a custom entry module, call the framework singleton explicitly:

```typescript
import { app } from '@drumr/framework-backend';

await app.run();
```

Use `src/config/config.json` for GraphQL, auth, workflows, metadata, and custom app settings. Keep startup orchestration in the framework and use the constraint checklist as the boundary reference.

`app.run()` is the stable public startup API documented in this skill. Integration tests that need a fully wired app without binding a port should use `App.resolve(TestApp).initTestContext(...)`.

## Configuration file


Backend configuration lives at `src/config/config.json` relative to the backend process working directory.

```json
{
  "graphql": {
    "host": "${GRAPHQL_HOST:0.0.0.0}",
    "port": "${GRAPHQL_PORT:3000}",
    "path": "/graphql",
    "enableExplorer": "${GRAPHQL_EXPLORER:true}"
  },
  "auth": {
    "enabled": "${AUTH_ENABLED:true}",
    "basePath": "/auth"
  },
  "workflows": {
    "enabled": "${WORKFLOWS_ENABLED:true}",
    "dataSource": "postgres-db",
    "pruneThresholdDays": "${WORKFLOW_PRUNE_DAYS:7}",
    "pruningIntervalSeconds": "${WORKFLOW_PRUNE_SECONDS:3600}"
  },
  "metadata": {
    "name": "My app",
    "version": "${APP_VERSION:0.0.0}",
    "description": "Drumr backend application"
  },
  "custom": {
    "mailer": {
      "from": "${MAIL_FROM:no-reply@example.com}",
      "enabled": "${MAIL_ENABLED:false}",
      "useMock": "${MAIL_USE_MOCK:false}"
    }
  }
}
```

Environment interpolation uses `${VAR:default}`. Resolved values are coerced when possible:

- `"true"` / `"false"` become booleans
- numeric strings become numbers
- all other values remain strings

---

## Reading config values

Inject `ConfigService` into apps, services, actions, workflows, or other DI-managed classes.

```typescript
import { ConfigService, Service } from '@drumr/framework-backend';

interface MailerConfig {
  from?: string;
  enabled?: boolean;
}

@Service()
export class MailerService {
  constructor(private configService: ConfigService) {}

  isEnabled(): boolean {
    const mailer = this.configService.custom.mailer as MailerConfig | undefined;
    return mailer?.enabled ?? false;
  }

  fromAddress(): string {
    const mailer = this.configService.custom.mailer as MailerConfig | undefined;
    return mailer?.from ?? 'no-reply@example.com';
  }
}
```

Available accessors:

| Accessor | Returns |
| --- | --- |
| `configService.graphql` | GraphQL server config or `{}` |
| `configService.auth` | Auth config or `{}` |
| `configService.workflows` | Workflow config or `{}` |
| `configService.distributedLocks` | Distributed lock config or `{}` |
| `configService.metadata` | App metadata or `{}` |
| `configService.custom` | App-specific config or `{}` |
| `configService.get<T>('key')` | Any top-level config section |
| `configService.getAll()` | Full backend config object |

For test-specific config files, subclass `ConfigService` and replace it in `beforeStart`.

```typescript
import path from 'node:path';
import { ConfigService, Service } from '@drumr/framework-backend';

@Service()
export class TestConfigService extends ConfigService {
  protected override getConfigFilePath(): string {
    return path.resolve(process.cwd(), 'tests/integration/config/test-config.json');
  }
}
```

---

## Lifecycle hooks

The `@App()` class supports constructor injection and four optional lifecycle hooks.

Important: the `@App()` class instance is created before `beforeStart()` runs. That means constructor-injected dependencies in the app class are resolved before any `this.register(...)` overrides declared in `beforeStart()`. If a dependency can be affected by overrides, resolve it after `beforeStart()` (for example in `afterStart()` with `App.resolve(...)`).

```typescript
import { App, BaseApp, ConfigService, logger } from '@drumr/framework-backend';
import { ActivityLogService } from '@/global/services/activity-log.service';
import { MockEmailService } from '@/global/services/mock-email.service';

@App()
export class MyApp extends BaseApp {
  constructor(
    private configService: ConfigService,
  ) {
    super();
  }

  override async beforeStart(): Promise<void> {
    const mailer = this.configService.custom.mailer as
      | { useMock?: boolean }
      | undefined;

    if (mailer?.useMock) {
      this.register('emailService', MockEmailService);
    }
  }

  override async afterStart(): Promise<void> {
    const activityLog = App.resolve(ActivityLogService);
    activityLog.addEntry('Application started');
    logger.info('App started', {
      workflows: this.configService.workflows.enabled ?? true,
    });
  }

  override async beforeStop(): Promise<void> {
    App.resolve(ActivityLogService).addEntry('Application stopping');
  }

  override async onError(error: Error): Promise<void> {
    logger.error('Startup error', error);
    App.resolve(ActivityLogService).addEntry(`Startup error: ${error.message}`);
  }
}
```

| Hook | Runs | Common use |
| --- | --- | --- |
| `beforeStart()` | Before config, discovery, datasource initialization, and servers | Register service/datasource overrides, pre-start setup |
| `afterStart()` | After datasources, workflows, auth, GraphQL, and HTTP startup | Startup logs, warmup, seed/demo setup |
| `beforeStop()` | Before app shutdown completes | Flush buffers, close external clients, log shutdown |
| `onError(error)` | When startup or lifecycle hook errors are caught | Error reporting and diagnostics |

Put `this.register(...)` calls in `beforeStart()` so overrides are active before the framework resolves most services and datasources. App-class constructor injections happen earlier, so keep override-sensitive dependencies out of the `@App()` constructor.

---

## Dependency resolution

Prefer constructor injection in DI-managed classes.

Use `App.resolve(Token)` when constructor injection is impractical, such as static helpers, test setup, or app bootstrap code.

```typescript
import { App } from '@drumr/framework-backend';
import { MailerService } from './services/MailerService';

const mailer = App.resolve(MailerService);
await mailer.sendWelcomeEmail(userId);
```

In tests, resolve the test app class before calling `initTestContext`.

```typescript
import type { Express } from 'express';
import { App, app } from '@drumr/framework-backend';
import { TestApp } from './TestApp';

let server: Express;

beforeAll(async () => {
  server = await App.resolve(TestApp).initTestContext({ dataSet: 'test-api' });
});

afterAll(async () => {
  await app.stop();
});
```

---

## Service and datasource overrides

Services and datasources that need replacement should have a stable string ID in their decorator.

```typescript
import { Service } from '@drumr/framework-backend';

@Service({ id: 'emailService' })
export class EmailService {
  async send(to: string, subject: string): Promise<void> {
    // real implementation
  }
}
```

Register the replacement inside `beforeStart`.

```typescript
override async beforeStart(): Promise<void> {
  this.register('emailService', MockEmailService);
  this.register('configService', TestConfigService);
}
```

Callers continue to inject the original class:

```typescript
constructor(private emailService: EmailService) {}
```

The container returns the registered replacement transparently.

---

## Usage notes & guidelines

Use the constraint checklist above as the source of truth for scope boundaries. The lists below are implementation habits.

### Do

- Create a single `@App()` class that extends `BaseApp`.
- Limit app startup code to initialization and configuration tasks only; put domain logic in services/actions/workflows.
- Use `src/config/config.json` and `ConfigService` for environment-driven settings.
- Store app-specific settings under `custom`.
- Use `${VAR:default}` for environment interpolation in JSON config.
- Use `beforeStart()` for overrides and pre-start setup.
- Use `afterStart()` only for work that requires initialized datasources/servers.
- Use `beforeStop()` for graceful shutdown work.
- Use `onError(error)` for diagnostics and error reporting.
- Prefer constructor injection; reserve `resolve(Token)` for bootstrap/static/test cases.

### Don't

- Do not initialize Express, Apollo, TypeORM, DBOS, or auth routes manually in app code.
- Do not read `process.env` throughout business logic when a config value belongs in `src/config/config.json`.
- Do not put service overrides in `afterStart()`; by then dependencies may already be resolved.
- Do not create multiple `@App()` classes in one runtime app.
- Do not place authorization rules directly in the app class unless the auth skill explicitly calls for that pattern.
- Do not invent lifecycle hooks beyond `beforeStart`, `afterStart`, `beforeStop`, and `onError`.

---

## File structure

```text
backend/
  src/
    App.ts
    auth/
      permissions.ts
    config/
      config.json
    dataSources/
      MainDs.ts
    services/
      EmailService.ts
      MockEmailService.ts
```

---

## Related skills

| Associated skill | When to use it | Why this skill is not enough |
| --- | --- | --- |
| [backend-services](../backend-services/SKILL.md) | Creating reusable backend services, request scope, service IDs, or dynamic resolution by ID. | This skill shows where services plug into app startup, not full service design. |
| [backend-datasources](../backend-datasources/SKILL.md) | Defining database connections or replacing datasource implementations. | This skill covers app bootstrap, not datasource implementation details. |
| [backend-auth](../backend-auth/SKILL.md) | Defining users, roles, permissions, or auth behavior. | This skill only covers app-level auth server configuration. |
| [backend-workflows](../backend-workflows/SKILL.md) | Implementing durable workflows, queues, steps, and execution patterns. | This skill only covers workflow app configuration. |
| [testing-integration](../testing-integration/SKILL.md) | Writing integration tests with `initTestContext`, datasets, and cleanup. | This skill shows the app bootstrap entry point, not full integration test structure. |
| [cli-commands](../cli-commands/SKILL.md) | Running, debugging, creating, or setting up apps with Drumr CLI commands. | This skill covers backend code patterns, not CLI usage. |

---
name: backend-config
description: Essential skill for Drumr Framework backend configuration. Teaches how to structure config/config.json, read built-in sections (graphql, auth, metadata, workflows) and custom properties via ConfigService, use env-var interpolation, and override config in tests with a TestConfigService subclass. Use this skill whenever a developer asks about runtime configuration, environment variables in config.json, or how to wire app-specific settings through ConfigService.
user-invocable: true
metadata:
  applies-to:
    - core/backend/src/config/
    - apps/*/backend/src/config/
    - apps/*/backend/tests/integration/TestConfigService.ts
---

# Backend skill: configuration

## Purpose

Use this skill when a developer asks about:

- The structure of `config/config.json` and which sections are available
- Environment variable interpolation inside JSON values
- Injecting and reading `ConfigService` in services, actions, workflows, or the `@App()` class
- Reading custom application-specific properties through `configService.custom` or `configService.get<T>()`
- Swapping the config file for integration tests with `TestConfigService`
- Stubbing `ConfigService` in unit tests with `createConfigServiceStub`

Do **not** use this skill to configure TypeORM entities, datasource connections, or DBOS workflow options — those live in their own dedicated skill files.

---

## Core concepts

| Concept | How | Notes |
|---|---|---|
| Config file location | `backend/config/config.json` | Relative to the backend app root (`process.cwd()`) |
| Env-var interpolation | `"${ENV_VAR:default}"` in any string value | Coerced to `boolean` / `number` / `string` automatically |
| `.env` loading | Automatic before interpolation | `ConfigService` calls `dotenv.config()` at construction time |
| DI registration | `@Service({ id: 'configService' })` | Injected via constructor or `DependencyContainer.resolve(ConfigService)` |
| Built-in sections | `.graphql`, `.auth`, `.metadata`, `.workflows` | Return `{}` (not `undefined`) when the section is absent |
| Custom sections | `.custom['key']` or `.get<T>('key')` | `custom` returns `{}` when absent; `get` returns `undefined` |
| Missing file | Silent empty config + console warning | The file is entirely optional |
| Test override | Subclass + `getConfigFilePath()` override | Registered in `TestApp.beforeStart()` via `this.register('configService', ...)` |

---

## `config/config.json` structure

All sections are optional. Omit any section you do not need.

```json
{
  "graphql": {
    "port": "${PORT:3000}",
    "host": "localhost",
    "enableExplorer": true,
    "path": "/graphql",
    "maxBatchSize": 10
  },
  "auth": {
    "enabled": true,
    "basePath": "/auth"
  },
  "metadata": {
    "name": "My App",
    "version": "1.0.0",
    "description": "Short description"
  },
  "workflows": {
    "enabled": true,
    "dataSource": "${WORKFLOWS_DATA_SOURCE:mainDs}",
    "pruneThresholdDays": "${WORKFLOWS_PRUNE_THRESHOLD_DAYS:7}",
    "pruningIntervalSeconds": "${WORKFLOWS_PRUNING_INTERVAL_SECONDS:3600}"
  },
  "custom": {
    "mailerHost": "${SMTP_HOST:smtp.example.com}",
    "mailerPort": "${SMTP_PORT:587}",
    "featureFlags": {
      "darkMode": false
    }
  }
}
```

### Built-in section reference

#### `GraphQLConfig`

| Property | Type | Default | Notes |
|---|---|---|---|
| `port` | `number` | `3000` | Server listen port |
| `host` | `string` | `localhost` | Server bind host |
| `enableExplorer` | `boolean` | `true` | Enables GraphQL playground/explorer |
| `path` | `string` | `/graphql` | HTTP path for the GraphQL endpoint |
| `maxBatchSize` | `number` | `10` | Max operations in a batched request |

#### `AuthConfig`

| Property | Type | Default | Notes |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Toggle auth routes on/off |
| `basePath` | `string` | `/auth` | Base HTTP path for auth routes |

#### `MetadataConfig`

| Property | Type | Default | Notes |
|---|---|---|---|
| `name` | `string` | `Drumr Application` | Application name |
| `version` | `string` | `1.0.0` | Application version |
| `description` | `string` | — | Short description |

#### `WorkflowsConfig`

| Property | Type | Default | Notes |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Enables the DBOS workflow engine |
| `dataSource` | `string` | — | Name of the datasource used by DBOS |
| `pruneThresholdDays` | `number` | `7` | Days of workflow history to retain |
| `pruningIntervalSeconds` | `number` | `3600` | How often the pruning job runs |

---

## Environment variable interpolation

Any string value in `config.json` can reference an environment variable:

```
"${ENV_VAR_NAME:defaultValue}"
```

Rules:
- The whole string must match the pattern (no partial interpolation).
- `defaultValue` is used when the env var is **unset** (`undefined`). If the env var is set to an empty string, the empty string is kept (not replaced by the default).
- The resolved value is automatically coerced: `"true"` → `boolean`, numeric strings → `number`, everything else stays `string`.
- Arrays and nested objects are walked recursively.

```json
{
  "graphql": { "port": "${APP_PORT:4000}" },
  "custom": { "debug": "${DEBUG_MODE:false}" }
}
```

With `APP_PORT=8080` and `DEBUG_MODE` unset:
- `configService.graphql.port` → `8080` (number)
- `configService.custom['debug']` → `false` (boolean)

---

## `ConfigService` API

| Member | Type | Description |
|---|---|---|
| `graphql` | `GraphQLConfig` | `graphql` section; `{}` if absent |
| `auth` | `AuthConfig` | `auth` section; `{}` if absent |
| `metadata` | `MetadataConfig` | `metadata` section; `{}` if absent |
| `workflows` | `WorkflowsConfig` | `workflows` section; `{}` if absent |
| `custom` | `Record<string, unknown>` | `custom` section; `{}` if absent |
| `get<T>(key)` | `T \| undefined` | Any top-level section by string key |
| `getAll()` | `BackendAppConfig` | Full raw config object |
| `getConfigFilePath()` (protected) | `string` | Absolute path to the config file; override in subclasses |

---

## Injecting and using `ConfigService`

### Constructor injection

The framework resolves `ConfigService` automatically from the DI container. Declare it as a constructor parameter in any `@Service`, `@Action`, `@Workflow`, or `@App` class.

Because `ConfigService` is registered with a string ID (`@Service({ id: 'configService' })`), use **`@Inject('configService')`** in actions and workflows. This explicitly routes resolution through the string-ID path, which is the same path that `this.register('configService', TestConfigService)` overrides — ensuring test replacements take effect.

Plain class-parameter injection also works (because `this.register()` re-maps the class token as well), but `@Inject` is the convention for services with an explicit string ID.

```typescript
import { Action, GlobalAction, ConfigService, Inject } from '@drumr/framework-backend';

@Action({ type: 'read', api: 'gql', returns: 'String' })
export class GetSmtpHost extends GlobalAction<void, string> {
  constructor(@Inject('configService') private configService: ConfigService) {
    super();
  }

  async execute(): Promise<string> {
    const email = this.configService.get<{ host: string }>('email');
    return email?.host ?? 'smtp.example.com';
  }
}
```

Inside a `@Service` class (not an action or workflow), plain constructor injection is fine:

```typescript
import { Service, ConfigService } from '@drumr/framework-backend';

@Service()
export class EmailService {
  constructor(private configService: ConfigService) {}

  getSmtpHost(): string {
    return this.configService.custom['mailerHost'] as string ?? 'smtp.example.com';
  }

  getSmtpPort(): number {
    return this.configService.custom['mailerPort'] as number ?? 587;
  }
}
```

### Reading built-in sections

```typescript
import { App, BaseApp, ConfigService, logger } from '@drumr/framework-backend';

@App()
export class MyApp extends BaseApp {
  constructor(private configService: ConfigService) {
    super();
  }

  override async afterStart(): Promise<void> {
    const { enabled, pruneThresholdDays } = this.configService.workflows;
    logger.info('App started', { workflowsEnabled: enabled ?? true, pruneThresholdDays });
  }
}
```

### Reading custom sections — two approaches

**Approach 1: `configService.get<T>(key)`** — for structured, typed top-level sections (preferred for multi-property groups):

```typescript
// config.json: { "email": { "host": "${SMTP_HOST:smtp.example.com}", "port": "${SMTP_PORT:587}" } }

interface SmtpConfig { host?: string; port?: number; secure?: boolean; }

const smtp = this.configService.get<SmtpConfig>('email');
const host = smtp?.host ?? 'smtp.example.com';
const port = smtp?.port ?? 587;
```

**Approach 2: `configService.custom['key']`** — for flat, ad-hoc scalar properties inside the reserved `custom` section:

```typescript
// config.json: { "custom": { "featureFlags": { "darkMode": false }, "maxRetries": 3 } }

const darkMode = this.configService.custom['darkMode'] as boolean | undefined ?? false;
```

**Decision rule:** If the config group has multiple related fields (SMTP settings, OAuth credentials, external API endpoints), define it as a named top-level section and use `configService.get<T>()` — this gives you TypeScript type safety and a clear interface. Reserve `configService.custom` for one-off flags and scalars that don't warrant their own section.

---

## Overriding config in tests

### Integration tests — `TestConfigService`

Subclass `ConfigService`, override `getConfigFilePath()`, and register it in your `TestApp.beforeStart()`. The framework will resolve the replacement for any class that injects `ConfigService`.

```typescript
// tests/integration/TestConfigService.ts
import * as path from 'node:path';
import { ConfigService, Service } from '@drumr/framework-backend';

@Service()
export class TestConfigService extends ConfigService {
  protected override getConfigFilePath(): string {
    return path.resolve(process.cwd(), 'tests/integration/config/test-config.json');
  }
}
```

```typescript
// tests/integration/TestApp.ts
import { App, BaseApp } from '@drumr/framework-backend';
import { TestConfigService } from './TestConfigService';

@App()
export class TestApp extends BaseApp {
  override async beforeStart(): Promise<void> {
    this.register('configService', TestConfigService);
  }
}
```

Place a corresponding JSON file at `tests/integration/config/test-config.json`:

```json
{
  "graphql": { "port": 4100 },
  "workflows": { "enabled": false },
  "custom": { "mailerHost": "mailhog.test" }
}
```

### Unit tests — inline stub

For unit tests that do not need a real file on disk, construct a minimal hand-rolled stub that satisfies the `ConfigService` interface your service uses:

```typescript
// tests/unit/services/EmailService.spec.ts
import { ConfigService } from '@drumr/framework-backend';
import { EmailService } from '../../../src/global/services/email.service';

const makeConfigStub = (custom: Record<string, unknown>): ConfigService =>
  ({
    get: (key: string) => (key === 'custom' ? custom : undefined),
    getAll: () => ({ custom }),
    graphql: {},
    auth: {},
    metadata: {},
    workflows: {},
    custom,
  }) as unknown as ConfigService;

describe('EmailService', () => {
  it('uses mailerHost from config', () => {
    const service = new EmailService(
      makeConfigStub({ mailerHost: 'smtp.test.local', mailerPort: 1025 }),
    );

    expect(service.getSmtpHost()).toBe('smtp.test.local');
    expect(service.getSmtpPort()).toBe(1025);
  });
});
```

Only stub the members your service under test actually calls — there is no need to implement the full interface.

---

## Anti-patterns to avoid

| Anti-pattern | Correct approach |
|---|---|
| `import * as fs from 'node:fs'; fs.readFileSync('config/config.json')` | Inject `ConfigService` — it handles file loading, env interpolation, and optional-file semantics |
| `process.env.MY_VAR ?? 'default'` in service code | Put the default in `config.json` as `"${MY_VAR:default}"` and read it through `ConfigService` |
| `DependencyContainer.resolve(ConfigService)` inside a constructor | Use constructor injection — declare `ConfigService` as a constructor parameter |
| Storing config properties directly on the `@App()` class as static fields | Inject `ConfigService` via constructor injection and read properties when needed |
| Calling `ConfigService.loadConfig()` from app code | That method is `@internal` and for testing utilities only |

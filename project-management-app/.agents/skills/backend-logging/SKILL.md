---
name: backend-logging
description: Use when adding, reviewing, or troubleshooting backend logging in Drumr apps and framework backend code, including log levels, structured metadata, context-aware logs, and safe logging practices.
user-invocable: true
metadata:
  applies-to:
    - core/backend/src/logging/
    - core/backend/src/action/
    - core/backend/src/services/
    - core/backend/src/workflows/
---

# Backend skill: logging

## Purpose

Use this skill when implementing or reviewing backend logging in Drumr code.

It standardizes:

- which logger to import;
- when to use each log level (`error`, `warn`, `info`, `debug`);
- how to log structured metadata (objects, not string concatenation);
- how to add useful context identifiers (`appId`, `userId`, `objectId`, `actionName`, `serviceName`, `providerName`, etc.);
- how to avoid leaking sensitive data.

Use framework logging APIs only. Do not introduce alternative logging libraries in Drumr app/backend code.

## Import and logger API

Always import from the framework package:

```typescript
import { logger } from '@drumr/framework-backend';
```

Available levels:

- `logger.error(message, metaOrError?)`
- `logger.warn(message, metaOrError?)`
- `logger.info(message, meta?)`
- `logger.debug(message, meta?)`

For `logger.error` and `logger.warn`, the optional second argument may be either a structured metadata object or an `Error` instance. Prefer passing the original exception directly when you are logging a caught error so the framework can normalize/enrich it and console output can include the stack trace.

The framework logger is a singleton (`Logger.getInstance()` under the hood), so app/backend code should use the exported `logger`.

## Log levels — when to use each

- **error**: failures that need attention, failed external calls, unexpected exceptions, operation aborts.
- **warn**: recoverable issues, fallback paths, suspicious but non-fatal states.
- **info**: meaningful lifecycle and business events, action execution milestones, integration events.
- **debug**: detailed diagnostics for development/troubleshooting (inputs, branch decisions, timing details), ideally behind log-level filtering.

## Structured logging patterns (required)

Prefer metadata objects:

```typescript
// ✅ Good: structured metadata (searchable/filterable)
logger.info('Order approved', {
  appId,
  userId,
  objectId: order.id,
  actionName: 'ApproveOrder',
  status: order.status,
});

// ❌ Avoid: string-concatenated dynamic data
logger.info(`Order approved app=${appId} user=${userId} id=${order.id}`);
```

Keep messages concise and human-readable; put variable details in metadata.

## Context-aware logging

The framework logger enriches metadata when runtime context is available (for example workflow context fields such as `workflowId`).

You should still pass business identifiers explicitly so logs remain useful across actions, services, and integrations.

## Practical examples

### Logging inside a backend action

```typescript
import {
  Action,
  ObjectAction,
  Context,
  logger,
} from '@drumr/framework-backend';
import { Order } from '@/orders/data-models/order.data-model';

@Action({ type: 'write', model: Order, api: 'gql' })
export class ApproveOrder extends ObjectAction<Order, void, Order> {
  constructor(private context: Context) {
    super();
  }

  async execute(order: Order): Promise<Order> {
    logger.info('Starting order approval', {
      appId: process.env.APP_ID,
      userId: this.context.user?.id,
      objectId: order.id,
      actionName: ApproveOrder.name,
    });

    order.status = 'approved';

    logger.info('Order approved', {
      userId: this.context.user?.id,
      objectId: order.id,
      actionName: ApproveOrder.name,
      status: order.status,
    });

    return order;
  }
}
```

### Logging inside a service

```typescript
import { Service, logger } from '@drumr/framework-backend';

@Service()
export class BillingService {
  async recalculateInvoice(invoiceId: string, userId?: string): Promise<void> {
    logger.debug('Recalculating invoice totals', {
      serviceName: BillingService.name,
      objectId: invoiceId,
      userId,
    });

    // ... service logic
  }
}
```

### Logging external integration failure

```typescript
import { logger } from '@drumr/framework-backend';

try {
  // external provider call
} catch (error: any) {
  logger.error('Payment provider request failed', {
    providerName: 'stripe',
    actionName: 'ChargeInvoice',
    objectId: invoiceId,
    userId,
    statusCode: error?.statusCode,
    error: error?.message,
  });
  throw error;
}
```

### Logging with contextual identifiers

```typescript
logger.warn('Using fallback shipping quote provider', {
  appId,
  userId,
  objectId: orderId,
  actionName: 'CalculateShipping',
  serviceName: 'ShippingService',
  providerName: 'backup-provider',
  reason: 'primary provider timeout',
});
```

## Security and privacy rules

Logs must be useful and concise, and must not leak sensitive data.

Never log:

- passwords;
- tokens;
- authorization headers;
- full request/response bodies containing sensitive fields;
- personal/private user data unless strictly necessary and sanitized.

If sensitive values are required for troubleshooting, log redacted/hashed forms only.

### Automatic masking of Drumr model instances

When you pass a Drumr model instance (or an array of instances) as metadata, the framework logger **automatically redacts fields decorated with `sensitive: true`**, replacing their values with `'[REDACTED]'` before the log entry is written. This covers ciphertext patterns and plaintext values alike.

Non-model plain objects (`{}`) are **not** auto-detected — every enumerable property passes through unchanged. Use an explicit field allowlist for plain objects.

```typescript
// ✅ Model instances are auto-masked — just pass them directly
logger.info('Task loaded', { task });

// ✅ Array of model instances — each is auto-masked
logger.info('Users loaded', { users });

// ❌ Plain object — sensitive fields are NOT auto-masked
logger.debug('Payload', { payload: { username, token } }); // 'token' leaks!

// ✅ Plain object — allowlist the safe fields explicitly
logger.debug('Payload', { payload: { username } });
```

### `logSafe()` helper — explicit top-level masking

Use `logSafe()` when you need a plain-object projection of a model instance with sensitive fields already replaced (e.g. when mapping across a list, or when you want to verify at the call site which fields are included):

```typescript
import { logSafe, logger } from '@drumr/framework-backend';

// Logs each User with sensitive fields replaced by '[REDACTED]'
logger.info('Users in database', {
  count: users.length,
  users: users.map(logSafe),
});
```

`logSafe` only processes the **top-level** fields of the instance. Nested model instances on non-sensitive fields retain their own sensitive-field masking through `redactObject` during the Winston pipeline.

For plain objects whose constructor carries no `MODEL_FIELDS` metadata, `logSafe` returns the original reference unchanged. In that case, explicitly allowlist the fields you intend to log.

## Logger configuration (high level)

### Preferred: environment variable

Set the log level via the `LOG_LEVEL` environment variable. The framework logger reads it on initialization, so no code change is needed:

```
LOG_LEVEL=debug   # error | warn | info | debug
```

### Programmatic configuration

If you need to set rotation, directory, or output options, call `Logger.configure(options)` **before any module that imports the top-level `logger` constant is evaluated**.

The package initializes the singleton eagerly:

```typescript
// executed once when the module is first imported
export const logger = Logger.getInstance();
```

Because of this, any call to `Logger.configure(...)` that runs *after* the `logger` constant has been captured will not affect that reference. If you reconfigure after import, call `Logger.getInstance()` to obtain the updated instance rather than relying on the module-level `logger`:

```typescript
import { Logger } from '@drumr/framework-backend';

// Call configure() before other imports that use the top-level `logger`
Logger.configure({
  level: 'info',
  logDirectory: './logs',
  console: true,
  file: true,
  filename: 'drumr-%DATE%.log',
  maxSize: '100m',
  maxFiles: 14,
});

// Fetch the reconfigured instance explicitly in code that runs after configure()
const log = Logger.getInstance();
log.info('Application started with custom config');
```

Supported `LoggerOptions` keys: `level`, `logDirectory`, `console`, `file`, `filename`, `maxSize`, `maxFiles`. Do not invent custom logger config properties.

---

## Related skills

| Skill | When to use |
| --- | --- |
| [backend-actions](../backend-actions/SKILL.md) | Logging inside backend actions, including execution milestones and error handling |
| [backend-services](../backend-services/SKILL.md) | Logging in reusable backend services or infrastructure adapters |
| [backend-tech-stack](../backend-tech-stack/SKILL.md) | Stack-level logging, troubleshooting, and logger configuration |
| [testing-unit](../testing-unit/SKILL.md) | Logging in backend unit tests for diagnostics |
| [testing-integration](../testing-integration/SKILL.md) | Logging in backend integration tests for cross-layer debugging |

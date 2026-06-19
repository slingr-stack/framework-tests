---
name: backend-services
description: Essential skill for Drumr Framework. Teaches the EXACT structure of backend services - @Service, BaseService, service options, lifecycle hooks, and service injection into actions/workflows/other services. Prevents hallucinating generic service frameworks or dependency injection libraries.
user-invocable: true
metadata:
  applies-to:
    - core/backend/src/services/
    - core/backend/src/di/
---

# Backend skill: services

## Purpose

Use this skill when the user asks about:

- Creating reusable backend logic that does not belong in a data model, action, workflow, queue, or data source
- Injecting shared services into actions, workflows, or other services
- Singleton vs. request-scoped service lifecycle
- Replacing a service implementation for tests or environment-specific behavior
- Dynamic strategy/provider resolution by string ID

A **service** encapsulates backend logic that is shared, cross-cutting, or infrastructure-facing. Services are the framework's primary unit for reusable backend code outside of the action/model/datasource layer.

Typical service use cases:

- **Reusable domain logic** shared by multiple actions or workflows (for example pricing rules, status evaluation, validation orchestration)
- **Infrastructure adapters** such as email, file storage, external API clients, or third-party integrations
- **Shared helpers** used across several actions (for example formatting, enrichment, notification dispatch)
- **Test doubles and environment-specific implementations** swapped via service replacement
- **Request-scoped state** such as per-request audit trails or logging context
- **Strategy-style resolution** where the correct implementation is selected at runtime by a string code

Focus on app usage patterns only. Do not document framework internals.

---

## Distributed locking with LockService

Use `LockService` when a service/action must serialize access to a shared resource across concurrent executions.

Preferred patterns:

- Use `withLock(key, callback, options?)` for most critical sections.
- Use `lock()/release()` only when lock scope must span multiple async boundaries.
- Use `withTryLock` / `tryLock` when contention should not throw.

Key rules:

- Always key locks by resource identity (`task:${taskId}`, `invoice:${invoiceId}`).
- Keep lock scope as small as possible.
- Re-read mutable state inside the lock when stale reads are possible.
- For manual `lock()`, always release in `finally`.

Error handling:

- `withLock` / `lock` throw `LockNotAvailableError` on contention timeout.
- `withTryLock` / `tryLock` return `null` for contention.
- Provider/infrastructure failures (for example Redis connectivity issues) are still thrown and must be surfaced/logged as operational errors.

`tryLock`/`withTryLock` timeout semantics:

- Default timeout is `0` ms (immediate attempt).
- If `options.timeout > 0`, they perform a bounded wait and still return `null` on contention.

---

## Core concepts

| Concept | API | Notes |
| --- | --- | --- |
| Service decorator | `@Service()` | Registers as singleton by default |
| Singleton scope | `@Service()` | One instance for the app lifetime, shared across all requests and users |
| Request scope | `@Service({ scope: 'request' })` | New instance per request, discarded after the request finishes |
| Service ID | `@Service({ id: '...' })` | Enables replacement via `register()` or dynamic lookup via `resolveById()` |
| Constructor injection | Declare dependencies as constructor parameters | The framework resolves registered class dependencies automatically — no `@inject()` needed |
| Static resolution | `DependencyContainer.resolve(Class)` | Use when constructor injection is impractical (for example inside a static method or default-value function) |
| Dynamic resolution | `DependencyContainer.resolveById<T>(id)` | Strategy/provider lookup by string code at runtime |
| Service replacement | `this.register(id, ReplacementClass)` in `beforeStart()` | Override a service by its string ID before the app starts |

### Singleton scope (default)

`@Service()` with no options creates a singleton: one instance is created at first resolution and shared across every request, every user, and every action for the lifetime of the application process.

Use singleton scope for stateless helpers, infrastructure adapters, and bounded shared state. Avoid storing per-user or per-request mutable state in singletons — use request scope instead.

### Request scope

`@Service({ scope: 'request' })` creates a fresh instance for every incoming request. The instance is shared within that single request (so multiple injections in the same request get the same object) and discarded when the request finishes.

Use request scope for per-request mutable state such as audit trails, step tracking, or context accumulation. Do not use request scope for stateless helpers — a singleton is more efficient.

### Service IDs

`@Service({ id: '...' })` registers the service under a string token in addition to its class type.

Service IDs serve two distinct purposes (do not mix them in one example):

1. **Replacement**: Assign an `id` to an infrastructure service so it can be swapped with a test/mock implementation via `this.register(id, ReplacementClass)` in the app's `beforeStart()` hook.
2. **Dynamic resolution**: Assign an `id` to each concrete strategy/provider implementation so the correct one can be selected at runtime via `DependencyContainer.resolveById(code)`.

### Constructor injection

Services, actions, workflows, and the `@App()` class all support constructor injection. The framework resolves registered class dependencies automatically — no `@inject()` decorator is needed for normal class dependencies.

```typescript
// The framework resolves MainDs and NotificationService from the DI container automatically.
constructor(private ds: MainDs, private notifications: NotificationService) {
  super();
}
```

---

## Practical examples

### Singleton service — bounded in-memory log

A singleton service that maintains a bounded in-memory activity log shared across every request for the lifetime of the process.

```typescript
import { Service } from '@drumr/framework-backend';

const MAX_ENTRIES = 100;

/**
 * Singleton service — shared across all requests for the lifetime of the process.
 * Keeps only the most recent entries to avoid unbounded memory growth.
 */
@Service()
export class ActivityLogService {
  private entries: string[] = [];

  addEntry(message: string): void {
    const timestamp = new Date().toISOString();
    this.entries.push(`[${timestamp}] ${message}`);
    // Bound the array so memory does not grow without limit
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.splice(0, this.entries.length - MAX_ENTRIES);
    }
  }

  getEntries(): string[] {
    return [...this.entries];
  }

  getCount(): number {
    return this.entries.length;
  }
}
```

> **Key point**: Singleton services **must** bound any in-memory collections. Without `MAX_ENTRIES`, the array would grow indefinitely over the lifetime of the process.

### Request-scoped service — per-request audit trail

A request-scoped service that records the logical steps taken during a single action execution. Each request gets its own instance; it is discarded when the request finishes.

```typescript
import { Service } from '@drumr/framework-backend';

/**
 * Request-scoped — a fresh instance is created per request and discarded after.
 * Safe to accumulate mutable state here because it never leaks across requests.
 */
@Service({ scope: 'request' })
export class RequestAuditService {
  private steps: string[] = [];

  addStep(step: string): void {
    const timestamp = new Date().toISOString();
    this.steps.push(`[${timestamp}] ${step}`);
  }

  getSteps(): string[] {
    return [...this.steps];
  }

  getSummary(): string {
    return this.steps.join(' → ');
  }
}
```

Inject it into any action to build a lightweight trace of what happened inside that request:

```typescript
import { Action, ObjectAction, Context } from '@drumr/framework-backend';
import { Ticket } from '@/support/data-models/ticket.data-model';
import { RequestAuditService } from '@/support/services/request-audit.service';
import { MainDs } from '@/infra/data-sources/main.ds';

@Action({ type: 'write', model: Ticket, api: 'gql', returns: Ticket, transactional: true })
export class CloseTicket extends ObjectAction<Ticket, void, Ticket> {
  constructor(
    private ds: MainDs,
    private context: Context,
    private requestAudit: RequestAuditService // request-scoped — unique to this request
  ) {
    super();
  }

  async execute(ticket: Ticket): Promise<Ticket> {
    this.requestAudit.addStep('starting close');
    ticket.status = 'closed';
    ticket.closedBy = this.context.user?.id ?? 'system';
    await this.ds.save(ticket);
    this.requestAudit.addStep('ticket saved');
    return ticket;
  }
}
```

### Injecting services into the `@App()` lifecycle

The `@App()` class extends `BaseApp` and supports the same constructor injection as actions and services. Override lifecycle hooks to run setup, teardown, or service-override logic.

```typescript
import { App, BaseApp, ConfigService, logger } from '@drumr/framework-backend';
import { ActivityLogService } from './services/ActivityLogService';
import { MockNotificationService } from './services/MockNotificationService';
import './auth/permissions'; // side-effect import — registers permission rules

@App()
export class MyApp extends BaseApp {
  constructor(
    private activityLog: ActivityLogService,
    private configService: ConfigService
  ) {
    super();
  }

  // Called before the app starts — register service overrides here
  override beforeStart(): Promise<void> {
    this.register('notificationService', MockNotificationService);
    return Promise.resolve();
  }

  // Called after servers and datasources are fully initialized
  override async afterStart(): Promise<void> {
    this.activityLog.addEntry('Application started');
    logger.info('App started', { workflows: this.configService.workflows.enabled });
  }

  // Called before the app shuts down
  override async beforeStop(): Promise<void> {
    this.activityLog.addEntry('Application stopping');
  }

  // Called on unhandled startup errors
  override async onError(error: Error): Promise<void> {
    logger.error('Startup error', error);
    this.activityLog.addEntry(`Startup error: ${error.message}`);
  }
}
```

Available lifecycle hooks (all optional, no-op by default):

| Hook             | When it runs                                  | Common use                                    |
| ---------------- | --------------------------------------------- | --------------------------------------------- |
| `beforeStart()`  | Before app starts                             | Register service overrides, pre-startup setup |
| `afterStart()`   | After servers and datasources are initialized | Log startup state, seed data, emit events     |
| `beforeStop()`   | Before app shuts down                         | Cleanup, flush buffers, log shutdown          |
| `onError(error)` | On unhandled startup error                    | Log error, record diagnostics                 |

### Service replacement — swap an implementation without changing callers

Assign a string `id` to an infrastructure service so it can be replaced via `this.register(id, ReplacementClass)` in the app's `beforeStart()` hook. The replacement class extends the original and overrides only the methods that need to change. Callers (actions, other services) continue to inject the base class — the container returns the replacement transparently.

**Base service — registered with a string ID for replaceability:**

```typescript
import { Service, ConfigService, logger } from '@drumr/framework-backend';

export interface NotificationMessage {
  to: string;
  subject: string;
  body: string;
}

/**
 * The string ID 'notificationService' allows this service to be replaced
 * by a mock or alternate implementation via this.register() in beforeStart().
 */
@Service({ id: 'notificationService' })
export class NotificationService {
  constructor(private configService: ConfigService) {}

  async send(message: NotificationMessage): Promise<void> {
    // Real implementation: send via SMTP, push API, etc.
    logger.info('[NotificationService] Sending notification', { to: message.to, subject: message.subject });
    // ... infrastructure logic ...
  }
}
```

**Mock replacement — extends the base, overrides behavior:**

```typescript
import { Service, logger } from '@drumr/framework-backend';
import { NotificationService, type NotificationMessage } from './NotificationService';

/**
 * Drop-in replacement that logs messages instead of sending them.
 * Useful for tests, local development, and non-production environments.
 * Does not need its own id — it is registered under the base service's id.
 */
@Service()
export class MockNotificationService extends NotificationService {
  override async send(message: NotificationMessage): Promise<void> {
    logger.info('[MockNotificationService] Notification captured (not sent)', {
      to: message.to,
      subject: message.subject,
    });
  }
}
```

**Registration in the app:**

```typescript
override beforeStart(): Promise<void> {
  // Replaces NotificationService with MockNotificationService for this environment.
  // Any constructor that injects NotificationService will receive MockNotificationService instead.
  this.register('notificationService', MockNotificationService);
  return Promise.resolve();
}
```

> **When to use this pattern**: Tests, local development without external services, staging environments with different providers. The calling code (actions, other services) does not change — only the registered implementation does.

### Dynamic resolution by ID — strategy / provider pattern

When the correct implementation must be selected at runtime (for example by a record field, configuration value, or integration code), register each concrete class with its own `@Service({ id })` and resolve dynamically with `DependencyContainer.resolveById()`.

This pattern is **separate** from service replacement (§4). In this case multiple implementations coexist simultaneously and the caller picks one by ID at runtime — no service is being swapped out globally.

```typescript
import { Service, DependencyContainer } from '@drumr/framework-backend';

/**
 * Abstract base for priority evaluation strategies.
 * Concrete implementations register with a string ID matching the priority code.
 */
export abstract class PriorityEvaluator {
  abstract evaluate(title: string): string;
}

/** Evaluates items marked as urgent. */
@Service({ id: 'urgent' })
export class UrgentPriorityEvaluator extends PriorityEvaluator {
  evaluate(title: string): string {
    return `[URGENT] ${title} requires immediate attention`;
  }
}

/** Evaluates items that are past their due date. */
@Service({ id: 'overdue' })
export class OverduePriorityEvaluator extends PriorityEvaluator {
  evaluate(title: string): string {
    return `[OVERDUE] ${title} is past its deadline`;
  }
}

/**
 * Resolves the correct evaluator by its string code at runtime.
 * Use this when the code comes from a record field, configuration, or external input.
 */
export function resolveEvaluator(code: string): PriorityEvaluator {
  return DependencyContainer.resolveById<PriorityEvaluator>(code);
}
```

Usage in an action:

```typescript
import { Action, ObjectAction } from '@drumr/framework-backend';
import { Task } from '@/tasks/data-models/task.data-model';
import { resolveEvaluator } from '@/tasks/services/priority-evaluator.service';

@Action({ type: 'read', model: Task, api: 'gql', returns: Task })
export class EvaluateTaskPriority extends ObjectAction<Task, void, Task> {
  async execute(task: Task): Promise<Task> {
    // task.priorityCode is a field like 'urgent' or 'overdue' — drives strategy selection
    const evaluator = resolveEvaluator(task.priorityCode);
    task.priorityLabel = evaluator.evaluate(task.title);
    return task;
  }
}
```

> **When to use this pattern**: Strategy selection by configuration value, record type, provider code, or integration identifier. Use `resolveById` **only** for dynamic lookup — prefer constructor injection for all static dependencies.

---

## Usage notes & copilot guidelines

### Do

- Use `@Service()` for reusable backend logic that is shared across multiple actions or is infrastructure-facing.
- Keep actions thin — extract shared or integration-heavy logic into services. Actions coordinate; services do the work.
- Use request scope (`@Service({ scope: 'request' })`) only when you need per-request mutable state.
- Assign a string `id` to services that need replacement or dynamic resolution.
- Use service replacement (`this.register()` in `beforeStart()`) for tests, local development, and environment-specific behavior.
- Prefer constructor injection for all static dependencies.
- Use `DependencyContainer.resolveById()` only for dynamic strategy/provider lookup at runtime.
- Bound any in-memory collections in singleton services to prevent unbounded memory growth.
- Import from `@drumr/framework-backend` in app code.
- Keep services focused on one responsibility.

### Don't

- Do not put persistence mapping inside services — that belongs in data models and data sources.
- Do not put permission or authorization definitions inside services — use `app.definePermissionsForRole` and related APIs (see the [auth skill](./auth.md)).
- Do not store user-specific or request-specific mutable state in singleton services.
- Do not use `any` in service method signatures.
- Do not use `@inject()` or `@injectable()` directly — `@Service()` handles DI registration.
- Do not import from `tsyringe` directly — use exports from `@drumr/framework-backend`.

---

## Common mistakes to avoid

- **Generating generic Express middleware, NestJS providers, or Spring `@Service` patterns.** Use `@Service()` from `@drumr/framework-backend` — the framework has its own DI container and lifecycle.
- **Storing global mutable user state in singleton services.** Singletons are shared across all requests and users. Per-request state must use `@Service({ scope: 'request' })`.
- **Unbounded singleton arrays, maps, or caches.** Always bound in-memory collections (for example max entries, LRU eviction). Without bounds, memory grows indefinitely over the process lifetime.
- **Resolving everything manually via `DependencyContainer.resolve()` instead of constructor injection.** Constructor injection is the default. Reserve `DependencyContainer.resolve()` for cases where injection is impractical (static methods, default-value functions, dynamic lookups).
- **Putting authorization rules in services.** Use `app.definePermissionsForRole`, `app.defineGlobalPermissions`, and related APIs from the auth skill instead.
- **Creating a service when a simple action-local private method is enough.** Extract to a service only when the logic is shared across multiple actions or is cross-cutting (email, external APIs, etc.).
- **Making request-scoped services for stateless helper logic.** Request scope has per-request overhead. Stateless helpers should be singleton.
- **Inventing decorators or lifecycle hooks that do not exist in the framework.** Only use `@Service()`, `@App()`, and the documented `BaseApp` lifecycle hooks (`beforeStart`, `afterStart`, `beforeStop`, `onError`).

---

## File structure

```
backend/
  src/
    services/
      ActivityLogService.ts            <- @Service()                    singleton, shared state
      RequestAuditService.ts           <- @Service({ scope: 'request' })  per-request state
      NotificationService.ts           <- @Service({ id: '...' })      replaceable infrastructure
      mock-notification.service.ts     <- @Service()                    test/local replacement
      priority-evaluator.service.ts    <- @Service({ id: '...' })      strategy pattern
    App.ts                             <- @App() entry point, registers service overrides
    infra/
      data-sources/
        main.ds.ts
      auth/
        admin.perm.ts
    tasks/
      data-models/
        task.data-model.ts
      actions/
        create-task.action.ts
      services/
        task.service.ts
```

Services live in `src/<module>/services/` alongside related actions and models. Group related strategies in the same file when they share an abstract base class.

---

## Related skills

- [Actions](./actions.md) — actions are the entry points that inject and use services
- [Data Sources](./dataSources.md) — services may inject datasources for persistence operations
- [Authentication & Permissions](./auth.md) — authorization rules belong in permissions, not services
- [Data Models](./dataModels.md) — persistence mapping belongs in models, not services

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-app](../backend-app/SKILL.md) | If the task is about `backend/src/App.ts`, `@App()`, app lifecycle hooks, `ConfigService`, `App.resolve`, or startup configuration. | This skill explains service design and replacement, but not complete backend app bootstrap or configuration. |
| [backend-actions](../backend-actions/SKILL.md) | If services are being consumed from action classes with lifecycle-specific behavior. | This skill covers service design, not complete action lifecycle and decorator usage. |
| [backend-datasources](../backend-datasources/SKILL.md) | If service logic needs advanced datasource query, pagination, or transaction control. | This skill shows injection patterns but not full datasource query semantics. |
| [backend-context](../backend-context/SKILL.md) | If service behavior depends on request-scoped context stacks and workflow metadata. | This skill mentions request scope but not complete context stack operations. |
| [backend-tech-stack](../backend-tech-stack/SKILL.md) | If service integrations need deeper library/runtime compatibility and constraints. | This skill is architecture-focused and does not enumerate full stack-level rules. |

---
name: backend-queues
description: Essential skill for Drumr Framework. Teaches the EXACT structure of workflow execution queues, @Queue, BaseQueue, QueueOptions, lifecycle hooks, and queue selection from workflow actions. Prevents hallucinating generic job-queue APIs like BullMQ, RabbitMQ, or SQS.
metadata:
  applies-to:
    - core/backend/src/workflows/
---

# Backend queues — copilot skill guide

Apply to:

- '**/backend/**/queues/\*_/_.ts'
- '**/backend/**/_Queue_.ts'
- '**/backend/**/_queue_.ts'

## Purpose & role

A **Queue** in Drumr is a **workflow execution channel**. It controls _how_ a workflow action runs: concurrency, timeouts, retries, backoff, and rate limits. It is **not** a generic job queue, a message broker, or a worker pool. There is no `enqueue()`, `dequeue()`, `process()`, or `worker` API.

> **Central rule**: Drumr queues are workflow execution queues. They configure the execution behavior of `@WorkflowAction` and `@ScheduledWorkflowAction` classes. Any other framing is incorrect.

```
@WorkflowAction({ queue: ReportQueue })
        |
        v
+------------------+
|  ReportQueue     |  <- Execution channel. Controls concurrency & retries.
|  [concurrency]   |     Fires lifecycle hooks on active/completed/failed/progress.
|  [retryAttempts] |
+------------------+
        |
        v
  Workflow Engine (DBOS)
```

Queues complement workflows — they do **not** replace actions, services, datasources, or workflows:

| Abstraction    | Responsibility                                                                      |
| -------------- | ----------------------------------------------------------------------------------- |
| **Action**     | Entry point. Receives request, guards execution, returns response.                  |
| **Service**    | Reusable business logic and integration code.                                       |
| **Workflow**   | Long-running, asynchronous, multi-step, durable business flow.                      |
| **Queue**      | Execution config for workflows: concurrency, retries, timeouts, rate limits, hooks. |
| **DataSource** | Persistence, queries, transactions.                                                 |

Use a queue when workflow execution needs:

- **Concurrency control** — limit parallel executions to protect resources.
- **Timeout enforcement** — fail workflows that exceed a time budget.
- **Retry & backoff** — automatically retry failed workflows with configurable delays.
- **Rate limiting** — throttle executions against external API/provider limits.
- **Lifecycle observation** — react when workflows start, complete, fail, or report progress.
- **Isolation** — separate slow/heavy work from fast/light work.

Do **not** create a queue for simple synchronous action logic.

---

## Core building blocks

### The `@Queue` decorator

All configuration lives inside the decorator — no manual registration is needed. The framework auto-discovers files in `backend/src/queues/` at startup.

```typescript
import { BaseQueue, Queue } from '@drumr/framework-backend';

@Queue({
  name: 'billing', // identifier; defaults to class name if omitted
  concurrency: 4, // max parallel workflows (default: 1)
  timeout: 5 * 60 * 1000, // max execution time in ms; omit for no timeout
  retryAttempts: 3, // retries on failure (default: 0)
  retryDelay: 1000, // delay between retries in ms (default: 1000)
  backoff: {
    // backoff strategy for retries
    type: 'exponential', // 'exponential' | 'fixed'
    delay: 5000, // base delay in ms
  },
  rateLimit: {
    // throughput control
    max: 100, // max workflows
    duration: 60000, // per this duration in ms (here: 100/minute)
  },
})
export class BillingQueue extends BaseQueue {}
```

> **Rule**: The `system` option is **framework-internal only**. Never use `system: true` in application queues.

### `QueueOptions` reference

Pass these fields as an object literal to `@Queue(...)`. Do not import `QueueOptions` in app code.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string` | class name | Queue identifier used in `queue:` references. |
| `concurrency` | `number` | `1` | Max workflows running in parallel. |
| `timeout` | `number` (ms) | none | Max execution time before forced failure. |
| `retryAttempts` | `number` | `0` | Number of retries on failure. |
| `retryDelay` | `number` (ms) | `1000` | Fixed delay between retries. |
| `backoff` | `{ type, delay }` | none | `'exponential'` doubles delay each retry; `'fixed'` uses constant delay. |
| `rateLimit` | `{ max, duration }` | none | Max `max` workflows per `duration` ms. |
| `system` | — | — | **Internal only. Never use in app code.** |

### `BaseQueue` — the class to extend

Every custom queue extends `BaseQueue` and is decorated with `@Queue`. The class exposes:

**Lifecycle hooks** (protected — override in subclass):

| Hook | Signature | When fired |
| --- | --- | --- |
| `onWorkflowActive` | `(workflow: Workflow): void \| Promise<void>` | A workflow starts processing in this queue. |
| `onWorkflowCompleted` | `(workflow: Workflow, result: any): void \| Promise<void>` | A workflow succeeds. |
| `onWorkflowFailed` | `(workflow: Workflow, error: Error): void \| Promise<void>` | A workflow fails. |
| `onWorkflowProgress` | `(workflow: Workflow, progress: number): void \| Promise<void>` | A workflow calls `reportProgress()`. |

Errors thrown inside hooks are **logged but never propagate** — they cannot break workflow execution.

**Public read-only API:**

| Method                | Returns           | Description                       |
| --------------------- | ----------------- | --------------------------------- |
| `getName()`           | `string`          | The queue name.                   |
| `getConfig()`         | object            | Copy of the queue configuration.  |
| `getActiveCount()`    | `Promise<number>` | Currently executing workflows.    |
| `getCompletedCount()` | `Promise<number>` | Successfully completed workflows. |
| `getFailedCount()`    | `Promise<number>` | Failed workflows.                 |

### Built-in queues

The framework ships four system queues that are available without any extra code. Use them when the default execution profile suits the workload.

| Class          | Name      | Concurrency | Best for                                                      |
| -------------- | --------- | ----------- | ------------------------------------------------------------- |
| `DefaultQueue` | `default` | 4           | Automatic fallback when no `queue` is specified on an action. |
| `LightQueue`   | `light`   | 8           | I/O-bound work: API calls, LLM, webhooks, notifications.      |
| `HeavyQueue`   | `heavy`   | 2           | CPU-bound work: reports, batch processing, data transforms.   |

> **Do not use `SystemQueue` in application code.** It is reserved for internal framework tasks.

### Queue selection from workflow actions

Set the `queue` field on `@WorkflowAction`, `@ScheduledWorkflowAction`, or `@Action({ workflow: true })`:

```typescript
import { WorkflowAction, GlobalWorkflowAction } from '@drumr/framework-backend';
import { ReportQueue } from '@/infra/queues/report.queue';

// By class reference (recommended — type-safe, refactor-friendly)
@WorkflowAction({ type: 'write', api: 'gql', queue: ReportQueue })
export class GenerateReport extends GlobalWorkflowAction<ReportParams, ReportResult> { ... }

// By string name (loosely coupled — allows runtime queue swap)
@WorkflowAction({ type: 'write', api: 'gql', queue: 'report' })
export class GenerateReport extends GlobalWorkflowAction<ReportParams, ReportResult> { ... }
```

If no `queue` is specified, the action runs on `DefaultQueue`.

**Per-action overrides** — `priority` and `timeout` fine-tune individual actions within a queue:

```typescript
@WorkflowAction({
  type: 'write',
  api: 'gql',
  queue: ReportQueue,
  priority: 'high',        // 'low' | 'normal' | 'medium' | 'high'
  timeout: 2 * 60 * 1000, // overrides queue-level timeout for this action only
})
export class UrgentReport extends GlobalWorkflowAction<void, void> { ... }
```

**Steps** can also target a different queue. The framework registers such steps as remote sub-workflows on the specified queue:

```typescript
import { Step, HeavyQueue } from '@drumr/framework-backend';

@Step({ queue: HeavyQueue })
async generatePdf(data: ReportData): Promise<Buffer> {
  // Runs on HeavyQueue even if the parent workflow runs on a lighter queue
}
```

---

## How copilot should reason about queues

| User need | Right abstraction |
| --- | --- |
| Expose an API operation or mutation | **Action** (`actions.md`) |
| Reusable business or integration logic | **Service** |
| Long-running, multi-step, async, retryable operation with progress | **Workflow action** |
| Control workflow concurrency, timeout, retries, backoff, rate limit, or lifecycle hooks | **Queue** (this skill) |
| Persistence, queries, transactions | **DataSource** (`dataSources.md`) |

**Queue or no queue?**

- Default execution (4 concurrent, 3 retries, exponential 10s backoff) is fine → use `DefaultQueue` or `LightQueue`/`HeavyQueue`.
- Need custom concurrency, different retries, a timeout, a rate limit, or lifecycle hooks → create a custom queue.
- Work is synchronous, fast, and request-scoped → do not use a queue or workflow; use a plain action.

---

## Practical examples

### Basic custom queue with lifecycle hooks

```typescript
import { BaseQueue, Queue, Workflow } from '@drumr/framework-backend';

@Queue({
  name: 'report',
  concurrency: 6,
  timeout: 10 * 60 * 1000, // 10 minutes
  retryAttempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
})
export class ReportQueue extends BaseQueue {
  protected override onWorkflowActive(workflow: Workflow): void {
    console.log(`Report workflow started: ${workflow.id}, action: ${workflow.action}`);
  }

  protected override onWorkflowCompleted(workflow: Workflow, result: any): void {
    console.log(`Report completed: ${workflow.id}`);
  }

  protected override onWorkflowFailed(workflow: Workflow, error: Error): void {
    console.error(`Report failed: ${workflow.id} — ${error.message}`);
  }

  protected override onWorkflowProgress(workflow: Workflow, progress: number): void {
    console.log(`Report progress: ${workflow.id} — ${progress}%`);
  }
}
```

### Config-only queue (no hooks needed)

```typescript
import { BaseQueue, Queue } from '@drumr/framework-backend';

@Queue({
  concurrency: 10,
  timeout: 30 * 60 * 1000, // 30 minutes
  retryAttempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
})
export class ImportQueue extends BaseQueue {}
```

When `name` is omitted, the class name (`ImportQueue`) becomes the queue identifier.

### Queue with rate limiting for an external API

```typescript
import { BaseQueue, Queue } from '@drumr/framework-backend';

@Queue({
  name: 'notification',
  concurrency: 5,
  retryAttempts: 2,
  backoff: { type: 'fixed', delay: 3000 },
  rateLimit: {
    max: 100, // 100 workflows
    duration: 60000, // per minute
  },
})
export class NotificationQueue extends BaseQueue {}
```

> Rate limiting belongs in the queue config, not in manual `sleep()` calls or polling loops. The framework enforces the limit automatically before dispatching workflows.

### Workflow action using a custom queue

```typescript
import { WorkflowAction, GlobalWorkflowAction } from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';
import { ReportQueue } from '@/infra/queues/report.queue';
import { ReportService } from '@/reports/services/report.service';

@WorkflowAction({
  type: 'write',
  api: 'gql',
  queue: ReportQueue,
})
export class GenerateMonthlyReport extends GlobalWorkflowAction<ReportParams, ReportResult> {
  constructor(
    private ds: MainDs,
    private reportService: ReportService
  ) {
    super();
  }

  async execute(params: ReportParams): Promise<ReportResult> {
    // Reusable logic lives in the service, not in the queue or inline
    const data = await this.reportService.gatherData(params.month, params.year);
    await this.reportProgress(25);

    const pdf = await this.reportService.generatePdf(data);
    await this.reportProgress(75);

    const saved = await this.reportService.saveReport(pdf, params);
    await this.reportProgress(100);

    return saved;
  }
}
```

> **Key pattern**: The queue controls execution behavior (concurrency, timeout, retries). The service contains reusable business logic. The workflow action orchestrates the flow.

### Scheduled workflow action on a custom queue

```typescript
import { ScheduledWorkflowAction, ScheduledGlobalWorkflowAction, logger } from '@drumr/framework-backend';
import { ImportQueue } from '@/infra/queues/import.queue';
import { ImportService } from '@/imports/services/import.service';

@ScheduledWorkflowAction({
  type: 'write',
  queue: ImportQueue,
  schedule: {
    cron: '0 3 * * *', // daily at 03:00
    timezone: 'UTC',
  },
})
export class DailyDataImport extends ScheduledGlobalWorkflowAction {
  constructor(private importService: ImportService) {
    super();
  }

  async execute(): Promise<void> {
    const records = await this.importService.fetchFromProvider();
    logger.info(`[DailyDataImport] Importing ${records.length} records`);

    for (const record of records) {
      await this.importService.importRecord(record);
    }

    logger.info('[DailyDataImport] Done');
  }
}
```

### Retry-safe (idempotent) workflow

When `retryAttempts > 0`, the framework automatically re-executes a failed workflow. Make retryable work idempotent:

```typescript
// Good — idempotent: check-before-insert prevents duplicates on retry
async execute(params: SyncParams): Promise<void> {
  const existing = await this.ds.findOneBy(ExternalRecord, { externalId: params.externalId });
  if (existing) {
    existing.data = params.data;
    existing.syncedAt = new Date();
    await this.ds.save(existing);
  } else {
    const record = new ExternalRecord();
    record.externalId = params.externalId;
    record.data = params.data;
    record.syncedAt = new Date();
    await this.ds.save(record);
  }
}

// Bad — creates duplicates on retry
async execute(params: SyncParams): Promise<void> {
  const record = new ExternalRecord();
  record.externalId = params.externalId;
  record.data = params.data;
  await this.ds.save(record); // duplicate on retry!
}
```

---

## Copilot prompt patterns

### Custom queue (config only)

```typescript
// Copilot: create a queue named <Name>Queue for <purpose>
// concurrency: <n>   timeout: <ms>   retryAttempts: <n>   backoff: exponential|fixed
import { BaseQueue, Queue } from '@drumr/framework-backend';

@Queue({ name: '<name>', concurrency: <n>, ... })
export class <Name>Queue extends BaseQueue {}
```

### Custom queue with hooks

```typescript
// Copilot: create a queue named <Name>Queue with lifecycle hooks
// hooks needed: onWorkflowCompleted (log result), onWorkflowFailed (alert on error)
import { BaseQueue, Queue, Workflow } from '@drumr/framework-backend';

@Queue({ name: '<name>', concurrency: <n>, retryAttempts: <n>, backoff: { type: 'exponential', delay: <ms> } })
export class <Name>Queue extends BaseQueue {
  protected override onWorkflowCompleted(workflow: Workflow, result: any): void { ... }
  protected override onWorkflowFailed(workflow: Workflow, error: Error): void { ... }
}
```

### Workflow action on a custom queue

```typescript
// Copilot: create a GlobalWorkflowAction that <purpose>, using <Name>Queue
// inject: MainDs + <ServiceName>
import { WorkflowAction, GlobalWorkflowAction } from '@drumr/framework-backend';
import { <Name>Queue } from '@/infra/queues/<name>.queue';

@WorkflowAction({ type: 'write', api: 'gql', queue: <Name>Queue })
export class <ActionName> extends GlobalWorkflowAction<<Params>, <Result>> {
  constructor(private ds: MainDs, private <service>: <ServiceName>) { super(); }
```

---

## Usage notes & copilot guidelines

### Do

- Treat queues as **workflow execution queues** — they control how workflows run, not what they do.
- Import from `@drumr/framework-backend` exclusively: `BaseQueue`, `Queue`, `Workflow`, `WorkflowAction`, `ScheduledWorkflowAction`, `GlobalWorkflowAction`, `ScheduledGlobalWorkflowAction`, `Step`, `LightQueue`, `HeavyQueue`, `DefaultQueue`.
- Keep queue classes focused on **execution configuration** and **lifecycle observation**.
- Put reusable business and integration logic in **services**.
- Keep workflow action classes responsible for **orchestrating the business flow**.
- Use queue config (`concurrency`, `timeout`, `retryAttempts`, `backoff`, `rateLimit`) instead of manual sleep/polling workarounds.
- Use small, serializable workflow inputs; prefer IDs over full object graphs.
- Make retryable work idempotent.
- Set `timeout` on the queue or the individual action to prevent hung workflows.
- Place queue files in `backend/src/queues/` — the framework auto-discovers them.

### Don't

- Invent `enqueue()`, `dequeue()`, `process()`, `worker()`, or `job` APIs — they do not exist.
- Suggest BullMQ, RabbitMQ, Kafka, SQS, NestJS queues, or any external queue library.
- Create custom polling loops or manual worker processes.
- Put business logic directly in queue hooks — hooks are for observation (logging, metrics, notifications).
- Use queues for simple synchronous action logic.
- Use unbounded concurrency or omit `timeout` for slow external work.
- Pass non-serializable payloads (functions, class instances with methods) as workflow inputs.
- Use `system: true` in application queues — it is framework-internal.
- Document or call `QueueRegistry`, `registerQueue`, `queueTriggerActive`, `queueTriggerCompleted`, `queueTriggerFailed`, `queueSetWorkflowEngine`, or `getQueueMetadata` from app code — these are internal framework helpers.
- Add `@Injectable()` to a queue class — `@Queue` already registers it as a singleton.
- Import from `tsyringe` directly.

---

## Common mistakes

| Mistake | Correct approach |
| --- | --- |
| Treating queues as BullMQ/SQS job queues | Use `@Queue` + `BaseQueue` with `@WorkflowAction({ queue: ... })`. |
| Calling `queue.enqueue(data)` | No such API. Workflows are dispatched by calling the action; queue routing is automatic. |
| Putting all logic in `onWorkflowCompleted` | Keep business logic in services; use hooks for logging/metrics/notifications only. |
| Missing `timeout` on slow external work | Set `timeout` on the queue (`@Queue`) or the action (`@WorkflowAction({ timeout: ... })`). |
| Non-idempotent work with `retryAttempts > 0` | Use upserts or check-before-insert to prevent duplicates on retry. |
| `concurrency: 1000` without `rateLimit` | Use realistic concurrency and `rateLimit` for external providers. |
| Using `system: true` | Omit `system`; it is for framework-provided queues only. |
| Importing `QueueRegistry` or internal helpers | These are internal. No app code should reference them. |

---

## File structure

```
backend/
  src/
    queues/
      ReportQueue.ts        <- @Queue config + lifecycle hooks
      ImportQueue.ts        <- @Queue config only
      NotificationQueue.ts  <- @Queue config with rateLimit
    actions/
      reports/
        GenerateMonthlyReport.ts  <- @WorkflowAction({ queue: ReportQueue })
      scheduled/
        DailyDataImport.ts        <- @ScheduledWorkflowAction({ queue: ImportQueue })
    services/
      ReportService.ts      <- Reusable report generation logic
      ImportService.ts      <- Reusable import logic
```

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-actions](../backend-actions/SKILL.md) | If you need to define the workflow action classes that queues will process. | This skill describes queue orchestration, not complete action class design. |
| [backend-services](../backend-services/SKILL.md) | If queue hooks should call reusable business services with dependency injection. | This skill shows queue flow but not full service scoping and replacement patterns. |
| [backend-tech-stack](../backend-tech-stack/SKILL.md) | If durable execution issues require stack-level DBOS/runtime troubleshooting. | This skill is queue-centric and does not provide full backend stack internals. |
| [backend-context](../backend-context/SKILL.md) | If workflow metadata must be read from or propagated via context composition. | This skill references context in workflows but not the full context API semantics. |

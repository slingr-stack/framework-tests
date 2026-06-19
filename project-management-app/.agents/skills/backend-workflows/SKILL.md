---
name: backend-workflows
description: >
  Essential skill for Drumr Framework. Use when creating, refactoring, or troubleshooting backend workflows — long-running operations, background jobs, async execution, durable tasks, multi-step processes, retries, progress tracking, scheduled jobs, cron tasks, or nightly processes. Teaches @Workflow, BaseWorkflow, BaseScheduledWorkflow, @Step, callStep, reportProgress, WorkflowsManager.execute/get/wait, queue selection, and idempotent step design. Prevents hallucinating DBOS imports directly, generic worker patterns (BullMQ, agenda, node-cron), missing @Step decorators, or calling step methods outside callStep().


user-invocable: true
metadata:
  applies-to:
    - core/backend/src/workflows/
---

# Backend workflows - copilot skill guide

## When to use this skill

Load this skill when the user mentions or asks about:

- **Workflow creation**: "create a workflow", "implement a background job", "long-running task", "async operation"
- **Steps**: "durable steps", "@Step", "callStep", "checkpoint", "retry on failure"
- **Scheduling**: "scheduled workflow", "cron job", "nightly task", "run every day", "periodic job"
- **Execution and monitoring**: "WorkflowsManager", "execute workflow", "check workflow status", "wait for workflow"
- **Progress**: "reportProgress", "track progress", "workflow progress"
- **Migration**: "refactor action to workflow", "convert to async", "move to background"
- **Queue assignment**: "run on heavy queue", "set concurrency", "workflow queue"

If the request is only about queue configuration without any workflow orchestration, use `backend-queues` instead.

Apply to:

- `**/backend/**/workflows/**/*.ts`
- `**/backend/**/actions/**/*.ts`
- `**/backend/**/queues/**/*.ts`

## Purpose and role

A backend workflow in Drumr is a durable, asynchronous execution flow built on DBOS.

Workflows are the right abstraction for long-running or failure-prone business operations where durability, retries, and progress tracking matter.

Use this skill to generate workflow code that is:

- framework-native (`@Workflow`, `BaseWorkflow`, `@Step`)
- queue-aware (`@Queue`, `DefaultQueue`, `LightQueue`, `HeavyQueue`)
- observable (`reportProgress`, `WorkflowsManager.get/wait`)
- safe to retry (idempotent step design)

## Quick decision guide

| Need                                          | Use                                                     |
| --------------------------------------------- | ------------------------------------------------------- |
| Fast request-response operation               | `@Action` + `GlobalAction`/`ModelAction`/`ObjectAction` |
| Long-running async business process           | `@Workflow` + `BaseWorkflow`                            |
| Periodic scheduled process                    | `@Workflow({ schedule })` + `BaseScheduledWorkflow`     |
| Control execution throughput/retries/timeouts | Queue class with `@Queue`                               |
| Reusable domain logic                         | `@Service()` and inject it in workflow                  |

## Core building blocks

### 1. Workflow class and decorator

Define workflows as classes decorated with `@Workflow(...)` and extending `BaseWorkflow`.

```typescript
import { BaseWorkflow, Workflow } from '@drumr/framework-backend';

@Workflow()
export class RebuildSearchIndexWorkflow extends BaseWorkflow {
  async execute(params: { tenantId: string }): Promise<void> {
    // Orchestrate durable steps here
  }
}
```

`@Workflow` options:

- `queue`: queue class or queue name
- `timeout`: workflow timeout in milliseconds
- `priority`: `low` | `normal` | `medium` | `high`
- `schedule`: for scheduled workflows (`cron` + `timezone`)

### 2. Durable steps with `@Step`

Use `@Step` for checkpointed units of work. In `execute`, call each step using `this.callStep(...)`.

```typescript
import { BaseWorkflow, Step, Workflow } from '@drumr/framework-backend';

@Workflow({ queue: 'default' })
export class ImportCustomersWorkflow extends BaseWorkflow {
  async execute(params: { sourceId: string }): Promise<number> {
    const raw = await this.callStep(this.fetchFromProvider, params.sourceId);
    const parsed = await this.callStep(this.parsePayload, raw);
    const saved = await this.callStep(this.persistBatch, parsed);
    await this.reportProgress(100);
    return saved;
  }

  @Step({ retries: 3, retryDelay: 2000, backoff: 'exponential' })
  async fetchFromProvider(sourceId: string): Promise<string> {
    return `payload-${sourceId}`;
  }

  @Step({ retries: 1, transactional: false })
  async parsePayload(raw: string): Promise<Array<{ externalId: string }>> {
    return [{ externalId: raw }];
  }

  @Step({ retries: 2 })
  async persistBatch(rows: Array<{ externalId: string }>): Promise<number> {
    return rows.length;
  }
}
```

### 3. Scheduled workflows

Scheduled workflows extend `BaseScheduledWorkflow` and require a valid cron and timezone.

```typescript
import { BaseScheduledWorkflow, Workflow } from '@drumr/framework-backend';

@Workflow({
  schedule: { cron: '0 2 * * *', timezone: 'UTC' },
})
export class NightlyCleanupWorkflow extends BaseScheduledWorkflow {
  async execute(): Promise<void> {
    // Cleanup logic
  }
}
```

### 4. Queue assignment

A workflow can run on:

- default queue (omit `queue` option)
- a named queue (`queue: 'billing'`)
- a queue class (`queue: BillingQueue`)

Use queue classes when you need explicit concurrency/retry/timeout/rate-limit behavior. Keep workflow orchestration in workflow classes and queue behavior in queue classes.

### 5. Starting and monitoring workflows

Use `WorkflowsManager` to execute and monitor workflow runs.

- Action executing a workflow example:

```typescript
@Action({
  type: 'write',
  model: Project,
  api: 'gql',
  params: GenerateReportParams,
  returns: WorkflowExecution,
})
export class GenerateReport extends ModelAction<Project, GenerateReportParams, WorkflowExecution> {
  constructor(private workflowsManager: WorkflowsManager) {
    super();
  }

  override async execute(params: GenerateReportParams): Promise<WorkflowExecution> {
    return this.workflowsManager.execute(GenerateReportWorkflow, params);
  }
}
```

- Monitoring workflow status example:

```typescript
import { DependencyContainer, WorkflowsManager } from '@drumr/framework-backend';
import { ImportCustomersWorkflow } from '@/customers/workflows/import-customers.workflow';

const workflows = DependencyContainer.resolve(WorkflowsManager);

const workflow = await workflows.execute(ImportCustomersWorkflow, { sourceId: 'erp-main' });
const latest = await workflows.get(workflow.id);

if (latest.status === 'SUCCESS') {
  // handle success
}

const result = await workflows.wait<number>(workflow, 60000);
```

## Copilot-oriented workflow implementation process

When generating workflow code, follow this order:

1. Classify the request:

- If operation may exceed request timeout or needs durability, choose workflow.
- If operation is short and synchronous, keep it as regular action.

2. Choose workflow type:

- Event-driven: `BaseWorkflow`
- Time-driven: `BaseScheduledWorkflow`

3. Define execution topology:

- Split orchestration into `execute` + multiple `@Step` methods.
- Keep each step focused, deterministic, and retry-safe.

4. Choose queue policy:

- Use `DefaultQueue` unless workload requires custom throughput/retry tuning.
- Introduce custom queue only when constraints are explicit.

5. Add observability:

- Call `reportProgress(0-100)` at meaningful milestones.
- Ensure step names and log messages are stable and descriptive.

6. Verify completion criteria:

- Workflow compiles with typed params/results.
- Steps are called only through `this.callStep(...)`.
- Idempotency rules are documented for retryable steps.
- Scheduling uses valid cron and timezone when present.

## Usage notes for generated apps

For generated Drumr apps (skills synced to `.agents/skills/`):

- Prefer imports from `@drumr/framework-backend`.
- Place workflows under `backend/src/workflows/`.
- Keep business logic in services and use workflows for orchestration.
- For UI-triggered async execution, return workflow handles/status via existing framework API patterns.

## Common pitfalls to avoid

- Calling step methods directly instead of `this.callStep(...)`.
- Putting all logic inside `execute` without durable checkpoints.
- Treating queues as generic broker workers instead of workflow execution controls.
- Adding non-idempotent side effects in retryable steps without guards.
- Using invalid cron/timezone values in scheduled workflows.

## Cross-skill navigation

Use associated skills when the request expands beyond workflow orchestration:

- `backend-queues`: queue definitions and lifecycle hooks
- `backend-actions`: entry points that start workflows
- `backend-datasources`: transactional data operations inside steps
- `backend-services`: reusable domain logic invoked by steps
- `backend-context`: request/user metadata patterns in workflow-triggering actions

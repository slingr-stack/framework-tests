---
name: backend-queues-conformance
description: >
  SR-* conformance agent for the backend-queues skill.
  Runs, updates, and interprets backend-queues.skill-conformance.spec.ts.
  Delegates to skill-conformance-generator for full scaffold regeneration.
tools:
  - read_file
  - file_search
  - grep_search
  - replace_string_in_file
  - run_in_terminal
---

# backend-queues Conformance Agent

**Skill:** `core/skills/backend-queues/SKILL.md`
**Spec:** `apps/project-management-app/backend/tests/unit/skill-conformance/backend-queues.skill-conformance.spec.ts`
**Score:** 86.7 (optional, threshold 65 ✅)
**Tests:** 19 passing, 2 todos

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='backend-queues.skill-conformance' \
  --no-coverage --verbose
```

## Fixtures

| Fixture | Role |
|---|---|
| `backend/src/queues/ReportQueue.ts` | `@Queue({ name, concurrency, timeout, retryAttempts, backoff:{type:'exponential'} })`, `extends BaseQueue`, all 4 lifecycle hooks as `protected override` |
| `backend/src/workflows/projects/GenerateReportWorkflow.ts` | `@Workflow({ queue: 'report-queue' })` string-name reference; `this.reportProgress()` |

## SR-* contract summary

| SR-* | Rules enforced |
|---|---|
| SR-1 | `Queue`+`BaseQueue` from `@drumr/framework-backend`; `@Queue` has config object; `concurrency`, `retryAttempts`, `backoff:{type:'exponential'}` declared; no `system:true` |
| SR-2 | `extends BaseQueue`; all 4 lifecycle hooks are `protected override`; no `enqueue`/`dequeue`/`process`/`worker` |
| SR-3 | `@Workflow` references queue by string name; `reportProgress()` for progress; `ReportQueue` has no `sleep()` |
| SR-4 | No `system:true` in custom queues; no `enqueue`/`dequeue`/`process` in queues; no `BullMQ`/`RabbitMQ`/`SQS` imports; all `BaseQueue` subclasses under `src/queues/` |

## Known deviations (it.todo)

1. **SystemQueue in app code** — `SyncDataWorkflow` and `GenerateReportWorkflow` `@Step` both use `SystemQueue`. Skill rule: *"Do not use SystemQueue in application code. It is reserved for internal framework tasks."* Fix: replace with `HeavyQueue` or another appropriate built-in queue.

2. **setTimeout false-positive** — `GenerateReportWorkflow` uses `setTimeout(resolve, 2000)` for PDF stream completion promise — legitimate use. The naive rate-limiting sleep regex catches it incorrectly.

## Raise score checklist

- Fix `SyncDataWorkflow` + `GenerateReportWorkflow @Step` to use `HeavyQueue` instead of `SystemQueue` → close `it.todo` → R 1→2 → 93.3
- Add `@Step({ queue: HeavyQueue })` fixture to cover step-level queue assignment pattern

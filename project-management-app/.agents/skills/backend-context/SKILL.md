---
name: backend-context
description: 'Use when implementing Drumr backend actions, workflows, or request-scoped services that need Context. Covers what Context is, how to inject it, how to read user/action/refresh/workflow metadata, and how to use stack utilities (some, none, find, parent, levels, push, pop) with defensive patterns for production-safe code.'
metadata:
  applies-to:
    - core/backend/src/context/
---

## 1. When to use

This skill is for **app developers** writing backend actions, workflows, and services.

It provides a practical guide to use backend `Context` end to end in real app code: how to inject it, which properties are available (`user`, `action`, `refresh`, `workflow`), how to apply stack utilities safely, and how to implement defensive patterns that are easy to maintain and test.

In other words, this skill explains the full usage model of `Context` in one place:

- What `Context` is and when it is available.
- How `Context` is composed (`user`, `action`, `refresh`, `workflow`, and extra metadata).
- How to inject it in actions and services.
- What you can do with stack utilities (`some`, `none`, `find`, `parent`, `levels`, `push`, `pop`).
- How to write defensive, production-safe context logic.

Use this guide when you need to:

- Read the current user from context.
- Read current action metadata (including bulk metadata).
- Make context-aware decisions in safe, testable ways.
- Query or temporarily enrich context via stack utilities.

Quick mental model:

- Think of `Context` as the execution metadata of the current request.
- Every action/service can read it to understand who is running and under which execution conditions.
- Most logic uses read-only access (`user`, `action`, `refresh`, `workflow`).
- Advanced scenarios can inspect or enrich the context stack in a controlled way.

## 2. What backend context is

`Context` is a request-scoped object injected by the framework.

At runtime, it gives you access to:

- `user` (who triggered execution)
- `action` (what action is currently running)
- `refresh` (backend-local refresh metadata for rich/form re-evaluation flows when available)
- `workflow` (workflow metadata when available)

In practice, `Context` gives you three core capabilities:

- Read caller information: identity, email, roles.
- Read execution information: action name, target object, bulk metadata, refresh/workflow hints.
- Navigate execution history: inspect parent/current levels and query frames through utility methods.

Typical injection points in app code:

- Action constructors (`@Action` classes).
- Request-scoped services (`@Injectable({ scope: 'request' })`).

```typescript
import { Action, Context, ObjectAction } from '@drumr/framework-backend';
import { Task } from '@/tasks/data-models/task.data-model';

@Action({ type: 'write', api: 'gql', model: Task })
export class MarkTaskViewed extends ObjectAction<Task, void, Task> {
  constructor(private readonly context: Context) {
    super();
  }

  async execute(task: Task, _params: void): Promise<Task> {
    // Read caller metadata with optional chaining.
    const actorEmail = this.context.user?.email ?? 'unknown-user';
    const actionName = this.context.action?.name ?? 'unknown-action';

    // Keep logic defensive and explicit.
    const previousNotes = task.notes ?? '';
    task.notes = `${previousNotes}\nViewed by ${actorEmail} via ${actionName}`.trim();

    return task;
  }
}
```

## 3. Dependency injection patterns (primary + fallback)

Preferred pattern:

- Constructor injection of `Context`.

Fallback pattern (only when constructor injection is impractical):

- Resolve directly inside a narrow scope.
- Keep fallback reads defensive.

```typescript
import { Context, DependencyContainer, Service } from '@drumr/framework-backend';

@Service({ scope: 'request' })
export class ApprovalPolicyService {
  // Primary pattern: constructor injection (recommended).
  constructor(private readonly context: Context) {}

  canApprove(): boolean {
    const roles = this.context.user?.roles ?? [];
    return roles.includes('admin') || roles.includes('manager');
  }

  static getCurrentActorIdFallback(): string | null {
    // Fallback pattern: resolve only when injection is not practical.
    // Keep reads defensive to avoid brittle behavior.
    try {
      const ctx = DependencyContainer.resolve(Context);
      return ctx?.user?.id ?? null;
    } catch {
      // If no active request scope exists, fail gracefully.
      return null;
    }
  }
}
```

## 4. Injection with `@Action` and `@Injectable`

Use `Context` in both:

- `@Action` classes for request orchestration.
- `@Injectable` services for reusable context-aware rules.

```typescript
import {
  Action,
  Context,
  Injectable,
  ObjectAction,
  TextField,
  DataModel,
  BaseDataModel,
} from '@drumr/framework-backend';
import { Ticket } from '@/support/data-models/ticket.data-model';

@Injectable({ scope: 'request' })
class ActorLabelService {
  constructor(private readonly context: Context) {}

  getActorLabel(): string {
    // Defensive fallback chain keeps logs stable.
    return this.context.user?.email ?? this.context.user?.id ?? 'system';
  }
}

@DataModel({ ui: { crud: { api: 'gql' } } })
class AddTicketNoteParams extends BaseDataModel {
  @TextField({ required: true, minLength: 1 })
  note!: string;
}

@Action({ type: 'write', api: 'gql', model: Ticket, params: AddTicketNoteParams, returns: Ticket })
export class AddTicketNote extends ObjectAction<Ticket, AddTicketNoteParams, Ticket> {
  constructor(
    private readonly context: Context,
    private readonly actorLabelService: ActorLabelService
  ) {
    super();
  }

  async execute(ticket: Ticket, params: AddTicketNoteParams): Promise<Ticket> {
    const actorLabel = this.actorLabelService.getActorLabel();
    const actionName = this.context.action?.name ?? 'AddTicketNote';

    ticket.notes = `${ticket.notes ?? ''}\n[${actionName}] ${actorLabel}: ${params.note}`.trim();
    return ticket;
  }
}
```

## 5. Context structure overview (`user`, `action`, `refresh`, `workflow`, extensible data)

Treat each branch as optional and read only what you need.

Common fields:

- `user`: `id`, `email`, `roles`
- `action`: `name`, `target`, `bulkAction`, `bulkQuery`
- `refresh`: `initializing`, `changedFields`, `dirtyFields`
- `workflow`: `id`, `actionName`, `status`, `startedAt`

Advanced frames may also include `system` and `transactions`. Most app code does not need them.

```typescript
import { Context } from '@drumr/framework-backend';

type ExecutionSummary = {
  actorId: string | null;
  actorRoles: string[];
  actionName: string | null;
  isBulk: boolean;
  isInitializingRefresh: boolean;
  workflowId: string | null;
};

export function buildExecutionSummary(context: Context): ExecutionSummary {
  // Each access is null-safe to handle partial or missing branches.
  const actorId = context.user?.id ?? null;
  const actorRoles = Array.isArray(context.user?.roles) ? context.user?.roles : [];
  const actionName = context.action?.name ?? null;
  const isBulk = context.action?.bulkAction ?? false;
  const isInitializingRefresh = context.refresh?.initializing ?? false;
  const workflowId = context.workflow?.id ?? null;

  return {
    actorId,
    actorRoles,
    actionName,
    isBulk,
    isInitializingRefresh,
    workflowId,
  };
}
```

## 6. Action-focused usage patterns (single vs bulk behavior)

A practical pattern is to branch behavior based on `context.action?.bulkAction`.

- In single mode, you may apply convenience defaults.
- In bulk mode, prefer explicit values and avoid heavy per-record side effects.

```typescript
import { Action, Context, ObjectAction } from '@drumr/framework-backend';
import { Invoice, InvoiceStatus } from '@/billing/data-models/invoice.data-model';

@Action({ type: 'write', api: 'gql', model: Invoice, bulk: true })
export class ApproveInvoice extends ObjectAction<Invoice, { reason?: string }, Invoice> {
  constructor(private readonly context: Context) {
    super();
  }

  async execute(invoice: Invoice, params: { reason?: string }): Promise<Invoice> {
    const isBulk = this.context.action?.bulkAction ?? false;
    const bulkQuery = this.context.action?.bulkQuery;

    // Defensive rule: never approve already approved records.
    if (invoice.status === InvoiceStatus.Approved) {
      return invoice;
    }

    // In bulk mode, avoid implicit defaults that may surprise users.
    const reason = isBulk ? (params.reason ?? null) : (params.reason ?? 'Approved during standard review');

    invoice.status = InvoiceStatus.Approved;

    // Optional metadata annotation for diagnostics.
    if (reason) {
      invoice.auditNote = `${invoice.auditNote ?? ''}\nReason: ${reason}`.trim();
    }

    // Defensive trace (null-safe bulk query info).
    if (isBulk && bulkQuery && Object.keys(bulkQuery).length === 0) {
      invoice.auditNote = `${invoice.auditNote ?? ''}\nBulk approval ran with an empty filter.`.trim();
    }

    return invoice;
  }
}
```

## 7. Current user usage patterns (ownership, createdBy, permissions)

Read actor identity from context instead of trusting client-sent user IDs.

```typescript
import { Action, Context, DataModel, BaseDataModel, ModelAction, TextField } from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';
import { Comment } from '@/tasks/data-models/comment.data-model';
import { User } from '@/users/data-models/user.data-model';

@DataModel({ ui: { crud: { api: 'gql' } } })
class CreateCommentParams extends BaseDataModel {
  @TextField({ required: true, minLength: 1, maxLength: 1000 })
  body!: string;
}

@Action({ type: 'write', api: 'gql', model: Comment, params: CreateCommentParams, returns: Comment })
export class CreateComment extends ModelAction<Comment, CreateCommentParams, Comment> {
  constructor(
    private readonly ds: MainDs,
    private readonly context: Context
  ) {
    super();
  }

  async execute(params: CreateCommentParams): Promise<Comment> {
    // Defensive actor validation: fail fast with a clear message.
    const actorId = this.context.user?.id;
    if (!actorId) {
      throw new Error('Cannot create comment: missing authenticated user in context.');
    }

    const actor = await this.ds.findOneBy(User, { id: actorId });
    if (!actor) {
      throw new Error('Cannot create comment: current user not found.');
    }

    const comment = new Comment();
    comment.body = params.body;
    comment.createdBy = actor;

    return await this.ds.save(comment);
  }
}
```

## 8. Stack utilities API (`some`, `none`, `find`, `parent`, `levels`, `push`, `pop`)

Use utilities to inspect context history and, in advanced scenarios, temporarily enrich it.

- Query helpers: `some`, `none`, `find`, `parent`, `levels`
- Stack mutation helpers: `push`, `pop` (advanced; always pair with `try/finally`)

```typescript
import { Context, Injectable } from '@drumr/framework-backend';

@Injectable({ scope: 'request' })
export class ContextInspectorService {
  constructor(private readonly context: Context) {}

  collectDiagnostics(): {
    depth: number;
    hasAdminInAnyLevel: boolean;
    hasNoInitializingRefresh: boolean;
    nearestActionName: string | null;
    parentActionName: string | null;
  } {
    // Stack depth at current execution point.
    const depth = this.context.levels();

    // True if any frame has admin role.
    const hasAdminInAnyLevel = this.context.some(frame => {
      const roles = frame.user?.roles;
      return Array.isArray(roles) && roles.includes('admin');
    });

    // True if no frame is inside initial refresh setup.
    const hasNoInitializingRefresh = this.context.none(frame => frame.refresh?.initializing === true);

    // Find nearest frame with an action.
    const nearestActionFrame = this.context.find(frame => !!frame.action?.name);
    const nearestActionName = nearestActionFrame?.action?.name ?? null;

    // Immediate parent frame (if available).
    const parentActionName = this.context.parent()?.action?.name ?? null;

    return {
      depth,
      hasAdminInAnyLevel,
      hasNoInitializingRefresh,
      nearestActionName,
      parentActionName,
    };
  }

  runWithTemporaryCorrelation<T>(correlationId: string, work: () => T): T {
    // Advanced pattern: temporarily enrich context for a local execution segment.
    this.context.push({ correlationId });

    try {
      // All reads during this callback can access correlationId.
      return work();
    } finally {
      // Critical: always pop in finally to avoid leaking stack frames.
      this.context.pop();
    }
  }
}
```

## 9. Defensive coding and best practices

Recommended practices:

- Prefer constructor injection over ad-hoc resolve calls.
- Use optional chaining and nullish defaults.
- Guard required values early with clear errors.
- Keep context reads close to the decision they influence.
- Use `push/pop` only when necessary, always with `try/finally`.

```typescript
import { Context, Injectable } from '@drumr/framework-backend';

@Injectable({ scope: 'request' })
export class SafeContextDecisions {
  constructor(private readonly context: Context) {}

  getRequiredActorId(): string {
    // Defensive guard with explicit failure message.
    const actorId = this.context.user?.id;
    if (!actorId) {
      throw new Error('Missing actor id in context.user.id');
    }
    return actorId;
  }

  isPrivilegedAction(): boolean {
    // Read roles and action name safely.
    const roles = this.context.user?.roles ?? [];
    const actionName = this.context.action?.name ?? '';

    // Defensive checks avoid accidental truthy/falsey bugs.
    const isAdmin = Array.isArray(roles) && roles.includes('admin');
    const isSensitiveAction = actionName.startsWith('Delete') || actionName.startsWith('Approve');

    return isAdmin && isSensitiveAction;
  }
}
```

## 10. Testing-friendly usage notes (app-level)

To keep context-dependent code testable:

- Place context decisions in small service methods.
- Keep action methods thin.
- Avoid scattering direct `resolve(Context)` calls.

```typescript
import { Context, Injectable } from '@drumr/framework-backend';

@Injectable({ scope: 'request' })
export class BulkModePolicy {
  constructor(private readonly context: Context) {}

  shouldSkipExpensiveSideEffects(): boolean {
    // Single responsibility: one clear, testable decision.
    const isBulk = this.context.action?.bulkAction ?? false;
    return isBulk;
  }
}

// Test-style pseudocode (framework-agnostic idea):
// - case A: context.action.bulkAction = true  => expect true
// - case B: context.action.bulkAction = false => expect false
// - case C: missing action branch             => expect false
```

## 11. Quick reference / cheat sheet

```typescript
import { Context } from '@drumr/framework-backend';

export function contextCheatSheet(context: Context): void {
  // Actor data
  const actorId = context.user?.id ?? null;
  const actorEmail = context.user?.email ?? null;
  const actorRoles = context.user?.roles ?? [];

  // Action data
  const actionName = context.action?.name ?? null;
  const actionTarget = context.action?.target ?? null;
  const isBulk = context.action?.bulkAction ?? false;
  const bulkQuery = context.action?.bulkQuery ?? null;

  // Optional branches
  const isInitializingRefresh = context.refresh?.initializing ?? false;
  const changedFields = context.refresh?.changedFields ?? [];
  const workflowId = context.workflow?.id ?? null;

  // Stack querying
  const depth = context.levels();
  const parentAction = context.parent()?.action?.name ?? null;
  const hasAdmin = context.some(frame => (frame.user?.roles ?? []).includes('admin'));
  const noInitializingRefresh = context.none(frame => frame.refresh?.initializing === true);
  const firstActionFrame = context.find(frame => !!frame.action?.name) ?? null;

  // Advanced temporary enrichment
  context.push({ correlationId: 'req-123' });
  try {
    const correlationId = context.find(frame => !!frame.correlationId)?.correlationId ?? null;
    void correlationId;
  } finally {
    context.pop();
  }

  void actorId;
  void actorEmail;
  void actorRoles;
  void actionName;
  void actionTarget;
  void isBulk;
  void bulkQuery;
  void isInitializingRefresh;
  void changedFields;
  void workflowId;
  void depth;
  void parentAction;
  void hasAdmin;
  void noInitializingRefresh;
  void firstActionFrame;
}
```

## 12. Contribution standards

When updating this skill:

- Keep examples app-developer focused and framework-internal free.
- Use generic business domains (`Task`, `Invoice`, `Comment`) unless a prompt requires otherwise.
- Prefer constructor injection (`@Action`, `@Injectable`) over direct resolve.
- Require defensive reads (`?.`, `??`, null checks) in every example.
- Show `push/pop` only with `try/finally`.
- Keep prose concise; teach primarily through clear commented code.
- Do not duplicate patterns already covered in other skills unless needed for context-specific clarity.
- If context API changes, update this file and the skills index in the same PR.

```typescript
// Example style template for new snippets in this skill:
// 1) Show imports clearly.
// 2) Inject Context via constructor.
// 3) Read branches with optional chaining.
// 4) Add explicit guards for required data.
// 5) Keep each snippet focused on one usage pattern.

import { Context, Injectable } from '@drumr/framework-backend';

@Injectable({ scope: 'request' })
export class TemplateExample {
  constructor(private readonly context: Context) {}

  run(): string {
    const actorId = this.context.user?.id;
    if (!actorId) {
      throw new Error('Missing actor id in context');
    }

    const actionName = this.context.action?.name ?? 'unknown-action';
    return `${actionName}:${actorId}`;
  }
}
```

## 13. Related skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-actions](../backend-actions/SKILL.md) | If you need to implement action classes that consume context values. | This skill explains context usage but does not define full action class architecture. |
| [backend-services](../backend-services/SKILL.md) | If context-aware logic should be encapsulated in request-scoped services. | This skill references service injection but not full service design and replacement patterns. |
| [backend-queues](../backend-queues/SKILL.md) | If context data must propagate through durable workflow/queue executions. | This skill does not cover queue lifecycle, retries, or durable workflow mechanics. |

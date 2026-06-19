---
name: implementation-planner
description: "Write an execution-ready implementation plan by relentlessly clarifying implementation decisions one question at a time, then save it to plan/{branchName}/{feature}.md. Use when the user asks for an implementation plan, execution plan, agent plan, plan this feature, or wants a larger model to prepare work for a simpler agent."
argument-hint: "What feature, fix, or change should be planned?"
---

# Implementation planner

Write a repository-grounded implementation plan that a smaller execution model can follow without reconstructing hidden context.

This skill is based on the grill-me interrogation style, but its target is implementation readiness rather than design critique.

## When to use

- The user asks for an implementation plan or execution plan
- The user wants a larger model to clarify requirements before a smaller model implements the work
- The user wants a plan written into the repository
- The user wants decisions, assumptions, and execution order made explicit before coding starts

Do not use this skill for open-ended brainstorming or when the user is explicitly asking for immediate code changes instead of a plan.

## Operating rules

1. Read the current branch yourself. Prefer repository context already available in chat. If it is not available, run `git branch --show-current`. Do not ask the user for the branch name unless both sources fail.
2. Ask exactly one question at a time.
3. For every question, provide a recommended answer using the built-in VS Code `#askQuestions` tool.
4. Separate facts from decisions. Read the codebase, docs, tests, configuration, existing plans, and nearby implementations to gather facts, but ask the user to confirm or choose implementation decisions instead of silently inferring them.
5. Be relentless about unresolved implementation choices. Keep asking until each material implementation branch is accepted, deferred, or explicitly rejected.
6. Resolve upstream decisions before downstream details. If a branch depends on another choice, settle the dependency first.
7. Convert uncertainty into explicit decisions, assumptions, or deferred items. Do not leave hidden ambiguity in the final plan.
8. Prefer asking over assuming when the topic changes implementation behavior, execution order, testing scope, fallback behavior, ownership, or rollout.
9. Write for a simpler execution model. Steps must be concrete, ordered, bounded in scope, and independently verifiable.
10. Derive the feature file name from the user request. Use concise kebab-case unless the user already provided a filename.
11. Write the plan to `plan/{branchName}/{feature}.md`. Create parent directories if needed.
12. Use the branch name verbatim. If the branch contains slashes, keep them as nested directories under `plan/`.
13. If the target file already exists, update it in place instead of creating a duplicate.

## Procedure

1. Restate the requested feature or change in one short paragraph.
2. Read the current branch name.
3. Derive the target file path as `plan/{branchName}/{feature}.md`.
4. Inspect the relevant repository surfaces first: owning code, tests, docs, config, and any nearby plans.
5. Build a queue of unresolved implementation decisions, such as shape of the change, affected files, interfaces, migrations, validation strategy, error handling, rollout, and rollback.
6. Pick the highest-leverage unresolved decision.
7. Use repository evidence to sharpen the next question, not to skip the question when the remaining issue is a choice rather than a fact.
8. Ask one sharp question and include:
   - the question
   - the recommended answer
   - why that answer is the default recommendation
   - what downstream planning decision this unlocks
9. Wait for the user's answer before asking the next question.
10. After each answer, update the decision queue and continue interrogating the next unresolved implementation choice.
11. Continue until no material implementation ambiguity remains.
12. Write or update the plan file.
13. End with a short summary of the decisions made, remaining risks, and the path of the generated plan.

## Plan requirements

The generated markdown file must contain these sections in this order:

1. `# <Feature title>`
2. `## Summary`
3. `## Scope`
4. `## Repository facts`
5. `## Decision log`
6. `## Assumptions and open questions`
7. `## Implementation steps`
8. `## Validation`
9. `## Risks and rollback`
10. `## Execution handoff`

## Section guidance

### Summary

- State the user goal in concrete terms
- Name the expected outcome and success signal

### Scope

- List what is in scope
- List what is explicitly out of scope

### Repository facts

- Record only facts confirmed from the repository, docs, tests, or commands
- Include file or symbol anchors when they matter for execution

### Decision log

- Capture each material decision as a short record with:
  - decision
  - status: accepted, deferred, or rejected
  - rationale
  - impact on implementation
- Prefer user-confirmed implementation decisions over planner assumptions

### Assumptions and open questions

- List assumptions the execution agent may rely on
- List unresolved questions only if they are genuinely non-blocking
- Mark blocking unknowns clearly
- Keep this section short by pushing as many items as possible into answered decisions before finalizing the plan

### Implementation steps

Use a numbered list. Each step must contain:

- objective
- target files or symbols
- concrete change to make
- validation to run immediately after the step
- completion signal

Prefer steps that are small enough for a simpler model to execute and validate without broad exploration.

Do not write implementation steps that depend on hidden choices. If a step would still require the execution agent to choose an approach, ask another question first.

### Validation

- List the focused commands, tests, or checks to run
- Put the cheapest discriminating checks first
- Note any environment prerequisites

### Risks and rollback

- Call out the main failure modes or regression risks
- State how to back out or contain the change if validation fails

### Execution handoff

- State the expected execution order
- Note where the agent should stop and ask for help instead of guessing
- Include any sequencing dependencies between steps

## Decision branches to walk

- Outcome: what problem is being solved, for whom, and how success is measured
- Scope: what is in scope, out of scope, and explicitly a non-goal
- Constraints: time, compatibility, performance, security, compliance, staffing, and migration limits
- Interfaces: APIs, UI contracts, schemas, events, commands, and integration boundaries
- Data: ownership, lifecycle, validation, storage, migrations, permissions, and observability
- Behavior: happy path, edge cases, failures, retries, concurrency, idempotency, and rollback
- Delivery: implementation sequence, rollout strategy, fallback plan, and testing approach

Treat these as question queues, not a passive checklist. Keep asking until each branch has an explicit implementation decision or an explicit deferment.

## Completion criteria

Stop only when:

- every major branch has been decided, rejected, or explicitly deferred
- the current branch has been read and the target plan path is known
- the plan file has been written or updated at `plan/{branchName}/{feature}.md`
- the decision log explains the important choices
- the user has been asked about each material implementation decision that could change the plan
- the implementation steps are specific enough for a simpler agent to execute
- the remaining assumptions and risks are listed plainly

## Final output

End with:

- the plan path
- a short decision summary
- the remaining assumptions and risks
- the next execution step for the smaller agent
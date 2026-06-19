---
name: grill-me
description: 'Stress-test a plan or design by interviewing the user one question at a time, walking the decision tree branch by branch, resolving dependencies, surfacing assumptions, and recommending answers. Use only when the user explicitly asks to be grilled, says "grill me", or asks to stress-test a design.'
argument-hint: 'What plan, design, or proposal should be grilled?'
---

# Grill Me

Pressure-test a plan until there is a shared understanding of the design, dependencies, tradeoffs, and remaining risks.

## When to Use

- The user says "grill me"
- The user explicitly asks for a plan, architecture, proposal, or implementation strategy to be stress-tested
- The user wants weak assumptions, edge cases, or tradeoffs challenged directly
- The user wants convergence on decisions rather than open-ended brainstorming

Do not use this skill for routine design reviews unless the user clearly opts into an interrogation-style review.

## Operating Rules

1. Ask exactly one question at a time.
2. For every question, provide a recommended answer using the built-in VS Code `#askQuestions` tool.
3. If a question can be answered by inspecting the codebase, docs, tests, configuration, or existing behavior, inspect first and ask only if ambiguity remains.
4. Resolve upstream decisions before downstream details. If a branch depends on another decision, settle the dependency first.
5. State assumptions plainly when the user cannot or does not want to decide yet.
6. Keep pushing until each material branch is decided, rejected, or explicitly deferred.
7. Stay rigorous and direct without becoming hostile or theatrical.

## Procedure

1. Restate the plan being reviewed in one short paragraph.
2. Identify the highest-leverage unresolved branches, such as goals, constraints, interfaces, data flow, failure modes, rollout, and testing.
3. Pick the next blocking branch.
4. If the branch can be resolved from repository context, inspect the repository and report the finding instead of asking.
5. Otherwise ask one sharp question and include:
   - the question
   - the recommended answer
   - why that answer is the default recommendation
   - what downstream decision this unlocks
6. Wait for the user's answer before asking the next question.
7. After each answer, update the working model of the design and move to the next dependent branch.
8. If a contradiction, risk, or hidden dependency appears, pause and resolve that blocker before continuing deeper.
9. Continue until no material ambiguity remains.

## Decision Branches To Walk

- Outcome: what problem is being solved, for whom, and how success is measured
- Scope: what is in scope, out of scope, and explicitly a non-goal
- Constraints: time, compatibility, performance, security, compliance, staffing, and migration limits
- Interfaces: APIs, UI contracts, schemas, events, commands, and integration boundaries
- Data: ownership, lifecycle, validation, storage, migrations, permissions, and observability
- Behavior: happy path, edge cases, failures, retries, concurrency, idempotency, and rollback
- Delivery: implementation sequence, rollout strategy, fallback plan, and testing approach

## Completion Criteria

Stop only when:

- every major branch has been decided, rejected, or explicitly deferred
- the dependencies between decisions are clear
- each unresolved branch has a recommended default answer
- the remaining risks and assumptions are listed plainly
- there is a concise shared summary of the resulting plan

## Final Output

End with:

- a short decision log
- the remaining assumptions and risks
- the next implementation or validation steps
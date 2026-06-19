---
name: implementation-executor
description: "Execute an existing implementation plan step by step, resume work from a plan directory, drill into ambiguities one question at a time for the current step, and maintain a resumable implementation-log.md with progress, decisions, validation, and the next handoff point. Use when the user says execute this plan, implement from plan, continue plan execution, resume implementation, or update the implementation log."
argument-hint: "Which existing plan should be executed or resumed?"
---

# Implementation executor

Execute a repository plan as a resumable workflow instead of treating the plan as a one-shot document.

This skill assumes a plan already exists. If the user needs a plan first, use the existing `implementation-planner` skill before using this one. If the user wants only to pressure-test a plan or design, use `grill-me` instead.

## When to use

- The user already has a plan file under `plan/` and wants the agent to implement it.
- The work should be resumable by any agent without reconstructing hidden context.
- The user wants implementation progress, decisions, validations, and blockers written to a persistent log.
- The user wants the agent to drill unresolved ambiguities within each current step before coding that step.

Do not use this skill when the user is still deciding what to build or when no implementation plan exists yet.

## Required inputs

- A target plan file, usually under `plan/<branch-or-topic>/`.
- Repository access so the agent can inspect code, modify files, and run validations.
- An existing implementation log in the same plan directory, if one already exists.

## Operating rules

1. Treat the plan file as the execution source of truth unless the user explicitly overrides it.
2. Keep the implementation log beside the plan file as `implementation-log.md`.
3. Resume before restarting. Read the plan, the existing log, and the current repository state before choosing the next action.
4. Stop at each declared checkpoint and ask the user for confirmation before continuing to the next stage or major step group.
5. Before coding a plan step, drill into that step's unresolved implementation branches until no material ambiguity remains for that step.
6. Ask exactly one question at a time only when the current step still has a material implementation decision that cannot be resolved from the repository or the plan.
7. Keep the drill narrow. Do not broaden into future steps unless an upstream dependency blocks the current step.
8. For each question, provide:
   - the question
   - the recommended answer
   - why that answer is the default recommendation
   - what downstream work the answer unlocks
9. Gather only the local repository context needed for the current plan step before editing.
10. Execute one bounded implementation slice at a time.
11. After each substantive edit, run the cheapest focused validation that can falsify the current change.
12. Never mark a plan step complete without either a validation signal or an explicit note explaining why validation was not available.
13. If the repository contradicts the plan, record the discrepancy in the implementation log and update the plan when later execution depends on that correction. Record the reason for the plan change in the log.
14. Keep every stop point handoff-ready: current status, last passing validation, blocker, next target, and whether checkpoint confirmation is required must always be explicit in the log.

## Procedure

1. Identify the target plan file.
   - If the user names a specific markdown file, use it.
   - If the user names a directory, inspect it and choose the main plan file.
   - If more than one plausible plan file exists, ask the user which one should drive execution.
2. Derive the log path as the sibling file `implementation-log.md` in the same directory.
3. Read the plan sections that control execution, especially:
   - summary
   - scope
   - decision log
   - assumptions and open questions
   - implementation steps
   - validation
   - risks and rollback
   - execution handoff
4. Read the current implementation log if it exists. If it does not exist, initialize it from the [implementation log template](./assets/implementation-log-template.md).
5. Inspect the current repository state that affects resumption:
   - relevant modified files
   - nearby tests or validation commands already recorded in the log
   - whether the last recorded resume point still matches the repository
6. Determine the next bounded step.
   - If the log marks a step as in progress, continue that step first.
   - Otherwise choose the first incomplete step from the plan.
   - If a checkpoint is already reached, stop and ask for confirmation before continuing.
7. Drill the current step before coding it.
   - Build the smallest queue of unresolved implementation questions for this step only.
   - Resolve whatever can be answered from the repository, tests, docs, or plan.
   - If a material ambiguity remains, ask one question at a time until the step is implementation-ready.
   - If an upstream dependency blocks the step, narrow the drill to that dependency and then return to the step.
8. Update the implementation log before coding:
   - current plan step or stage
   - current focus
   - ambiguity status for the current step
   - active blocker, if any
   - expected validation for this slice
9. Execute the current step with a tight loop:
   - gather the minimum local context
   - make the smallest grounded edit
   - run focused validation immediately
   - repair locally if the validation exposes a nearby defect
10. When a new doubt appears during implementation:
   - first resolve it from repository evidence if possible
   - otherwise pause coding and resume the step-scoped drill
   - record the final answer as a decision in the implementation log
11. After each completed slice, update the implementation log with:
   - what changed
   - which files changed
   - what validation ran and whether it passed
   - whether the plan step is complete, still in progress, or blocked
   - whether the next action requires checkpoint confirmation
12. If implementation reveals that the plan is wrong or incomplete:
   - update the implementation log immediately
   - update the plan when the new fact changes the execution contract, scope, sequencing, or later steps
13. Stop only at a clean handoff point:
   - the active slice is validated, or the blocker is explicit
   - the next target is named precisely
   - checkpoint confirmation is requested whenever a declared checkpoint was reached
   - the next question, if any, is written down

## Implementation log contract

Use the [implementation log template](./assets/implementation-log-template.md) when creating a new log.

The log should preserve these sections:

- `## Purpose`
- `## Current status`
- `## Decision log`
- `## Change log`
- `## Open questions and blockers`
- `## Resume point`

Minimum logging requirements:

- `Current status` must record branch, plan file, current stage or step, checkpoint status, current focus, and last passing validation.
- `Decision log` must capture accepted, deferred, or rejected implementation decisions that materially change behavior, sequencing, or risk.
- `Change log` must capture concrete edits, touched files, validation, and caveats.
- `Resume point` must tell the next agent exactly what to do next without rereading the full chat, including whether user confirmation is required before continuing.

## Step-scoped question protocol

When the current step leaves a material ambiguity that changes implementation behavior:

1. Build the smallest unresolved-question queue for the current step only.
2. Ask only one question.
3. Make it specific to the current implementation step.
4. Do not open sibling or future-step branches unless they block the current step.
5. Include the recommended answer.
6. Explain why the recommendation is the default.
7. State what work this decision unlocks next.
8. Wait for the user's answer before opening another unresolved branch.
9. Continue drilling within the same step until no material ambiguity remains for that step, then implement.

Do not ask questions that can be answered from the repository, tests, docs, or existing plan text.

## Completion criteria

Stop only when all of the following are true:

- the target plan file is known and has been read
- the implementation log exists and reflects the current repository state
- for the active step, material ambiguities are either resolved, explicitly deferred, or represented by one current blocking question
- at least one bounded implementation slice has been executed or a real blocker has been recorded
- the latest substantive change has an associated focused validation result, or the lack of validation is explicitly justified
- if a declared checkpoint was reached, the execution pass stops with a confirmation request
- the next resume point is explicit enough for another agent to continue without guessing

## Final output

End each execution pass with:

- the plan path
- the implementation log path
- what changed in this pass
- what validation ran
- the next resume point
- the next user question only if a material blocker remains
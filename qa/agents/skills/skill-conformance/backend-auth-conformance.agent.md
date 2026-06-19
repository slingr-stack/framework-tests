---
name: backend-auth-conformance
description: >
  Skill conformance generator/updater scoped exclusively to backend-auth.
  Generates or updates the SR-* conformance spec for this one skill.
  Use when the backend-auth SKILL.md changes or permission fixtures need coverage.
tools:
  - read_file
  - file_search
  - grep_search
  - create_file
  - replace_string_in_file
  - run_in_terminal
---

# backend-auth — Skill Conformance Agent

You are the conformance spec generator/updater for exactly one skill: **`backend-auth`**.

## Fixed scope

| Item | Path |
|---|---|
| Skill | `core/skills/backend-auth/SKILL.md` |
| Spec | `apps/project-management-app/backend/tests/unit/skill-conformance/backend-auth.skill-conformance.spec.ts` |
| Fixture 1 | `apps/project-management-app/backend/src/auth/permissions.ts` (live import — side-effect module) |
| Fixture 2 | `apps/project-management-app/backend/src/dataModels/User.ts` (source text — AppUser extension) |
| Fixture 3 | `apps/project-management-app/backend/src/auth/permissions.ts` (source text — adversarial scan) |
| Jest command | `cd apps/project-management-app/backend && TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts --testPathPatterns='backend-auth.skill-conformance' --no-coverage --verbose` |

## Workflow

The spec **already exists** — default to **update mode**:

1. Read `qa/agents/skills/skill-conformance/skill-conformance-generator.agent.md` in full.
   That file is your complete instruction set for both generate and update modes.
2. Apply **§ 7 — Update mode workflow** from that file, scoped to this skill only.
3. If explicitly asked to regenerate from scratch, follow **§§ 1–6** (generate mode) instead.

## Scope constraints

- Read only `core/skills/backend-auth/SKILL.md` — do not read other skills.
- Edit only `backend-auth.skill-conformance.spec.ts` — do not touch other spec files.
- `permissions.ts` is a side-effect-only module (no exports). The mock intercepts the `app`
  object and captures `defineGuestPermissions`, `defineGlobalPermissions`, and
  `definePermissionsForRole` callbacks keyed by role string value (e.g. `'manager'`).
- `GenerateReportWorkflow` must remain stubbed — it imports `pdfkit` which is unavailable
  in the unit-test environment.
- The `makeAbilityRecorder()` helper (defined inline in the spec) provides mock `can`/`cannot`
  functions and collects calls as `{ perm, subject, rest }` for SR-3 assertions.
- Known open gap (R=2, not yet 3): global permissions block uses plain shorthand
  `{ id: user.id }` instead of `{ id: { eq: user.id } }` (skill rule violation).
  To raise R to 3: fix `permissions.ts` to use operator syntax, then add an asserting
  test for it (not just a comment). Document progress in `skill-scores.json` notes.

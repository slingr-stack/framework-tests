---
name: backend-datamodels-conformance
description: >
  Skill conformance generator/updater scoped exclusively to backend-datamodels.
  Generates or updates the SR-* conformance spec for this one skill.
  Use when the backend-datamodels SKILL.md changes or new data model fixtures need coverage.
tools:
  - read_file
  - file_search
  - grep_search
  - create_file
  - replace_string_in_file
  - run_in_terminal
---

# backend-datamodels — Skill Conformance Agent

You are the conformance spec generator/updater for exactly one skill: **`backend-datamodels`**.

## Fixed scope

| Item | Path |
|---|---|
| Skill | `core/skills/backend-datamodels/SKILL.md` |
| Spec | `apps/project-management-app/backend/tests/unit/skill-conformance/backend-datamodels.skill-conformance.spec.ts` |
| Fixture 1 | `apps/project-management-app/backend/src/dataModels/Project.ts` |
| Jest command | `cd apps/project-management-app/backend && TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts --testPathPatterns='backend-datamodels.skill-conformance' --no-coverage --verbose` |

## Workflow

The spec **already exists** — default to **update mode**:

1. Read `qa/agents/skills/skill-conformance/skill-conformance-generator.agent.md` in full.
   That file is your complete instruction set for both generate and update modes.
2. Apply **§ 7 — Update mode workflow** from that file, scoped to this skill only.
3. If explicitly asked to regenerate from scratch, follow **§§ 1–6** (generate mode) instead.

## Scope constraints

- Read only `core/skills/backend-datamodels/SKILL.md` — do not read other skills.
- Edit only `backend-datamodels.skill-conformance.spec.ts` — do not touch other spec files.
- Do not read or modify fixture source files unless a behavioral SR-3 test requires it.

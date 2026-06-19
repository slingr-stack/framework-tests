---
name: backend-components-conformance
description: >
  Skill conformance generator/updater scoped exclusively to backend-components.
  Generates or updates the SR-* conformance spec for this one skill.
  Use when the backend-components SKILL.md changes or new component fixture coverage is needed.
tools:
  - read_file
  - file_search
  - grep_search
  - create_file
  - replace_string_in_file
  - run_in_terminal
---

# backend-components — Skill Conformance Agent

You are the conformance spec generator/updater for exactly one skill: **`backend-components`**.

## Fixed scope

| Item | Path |
|---|---|
| Skill | `core/skills/backend-components/SKILL.md` |
| Spec | `apps/project-management-app/backend/tests/unit/skill-conformance/backend-components.skill-conformance.spec.ts` |
| Fixture 1 | `apps/project-management-app/backend/src/dataModels/Task.ts` (live import — captures factory calls at module load time) |
| Fixture 2 | `apps/project-management-app/backend/src/dataModels/Project.ts` (live import — covers HTML, money, integer, time, dateTime, compositionCard, booleanCheckbox, named-view context) |
| Jest command | `cd apps/project-management-app/backend && TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts --testPathPatterns='backend-components.skill-conformance' --no-coverage --verbose` |

## Workflow

The spec **already exists** — default to **update mode**:

1. Read `qa/agents/skills/skill-conformance/skill-conformance-generator.agent.md` in full.
   That file is your complete instruction set for both generate and update modes.
2. Apply **§ 7 — Update mode workflow** from that file, scoped to this skill only.
3. If explicitly asked to regenerate from scratch, follow **§§ 1–6** (generate mode) instead.

## Scope constraints

- Read only `core/skills/backend-components/SKILL.md` and its linked sub-files (`text-components.md`, `numeric-components.md`, `choice-components.md`, `boolean-components.md`, `date-components.md`, `file-components.md`, `relationship-components.md`, `array-components.md`) — do not read other skills.
- Edit only `backend-components.skill-conformance.spec.ts` — do not touch other spec files.

## Key pitfalls specific to this skill

- **Alternative factory assertions — CRITICAL:** Wherever the skill table shows `X or Y`, the existence test MUST be `wasCalled('X') || wasCalled('Y')`. Current pairs with documented alternatives:
  - Choice write: `choiceDropdown()` **or** `choiceBoxSelector()`
  - Boolean write: `booleanToggle()` **or** `booleanCheckbox()`
  - File write: `fileInput()` **or** `fileDropZone()`
  - Composition write: `compositionPanel()` / `compositionCard()` / `compositionAccordion()` (three options)
  
  Any follow-up option checks must also spread both factories: `[...callsTo('booleanToggle'), ...callsTo('booleanCheckbox')]`. A single-factory `wasCalled('X')` where the skill documents alternatives is a spec defect, not a code defect.


- **Factory capture timing**: all factory functions (`textInput`, `choiceDropdown`, etc.) fire
  *eagerly* as part of field decorator option evaluation at module load time. The mock's
  `capturedFactoryCalls` array is populated during `import { Task }`. If a factory call is
  missing from the captured list, check whether the explicit factory entry was omitted from
  the mock (the Proxy noop silently absorbs it without recording a call).
- **valueMetadata placement SR-3**: `valueMetadata` must NOT appear in factory call options
  (it belongs at the ui-entry level). The SR-3 tests verify this via both captured factory
  args and source text inspection.
- **list() argument structure**: `list()` accepts either a `ComponentSpecification` directly
  (`list(textLabel())`) or an options object with a nested `component` key
  (`list({ component: textInput(), sorting: false })`). The SR-1 test for list argument
  structure handles both forms.
- **editRepresentation shorthand**: `editRepresentation: 'CodeEditor'` on a LongTextField
  does NOT trigger a `longTextInput()` factory call for that field entry — it is its own
  shorthand. SR-3 verifies via source text, not factory capture.
- **Transitive model stubs**: Task.ts imports `File`, `Note`, `ReviewChecks`, `TaskMetadata`,
  and `User` from sibling model files. `Project` is NOT stubbed — it is loaded as a real
  fixture. `Support` (imported by Project.ts) is stubbed to break the Support→Project circular
  dependency. If a new field is added that imports a new sibling model, add a corresponding
  `jest.mock` call to the spec.
- **SR-2 note**: backend-components has no dedicated "base class" contract (that is covered
  by backend-datamodels). SR-2 in this spec tests that factory return values are plain
  ComponentSpecification objects (not React elements or class instances).

## Open gaps (tracked in skill-scores.json)

- K=2 (two fixtures). Adding a third model fixture raises K 2→3 → score 90.0.
- To reach 93.3 (adversarial ceiling): add a full adversarial source scan (wrong-import patterns across all model files, raw React component instantiation checks) → R 2→3.

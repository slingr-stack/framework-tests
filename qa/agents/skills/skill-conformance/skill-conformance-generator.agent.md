---
name: skill-conformance-generator
description: >
  Generates SR-* skill conformance specs for any Drumr framework skill.
  Reads the target SKILL.md, locates an existing app fixture, and produces
  a complete .skill-conformance.spec.ts scaffold. Use when extending the
  conformance suite to a new skill.
tools:
  - read_file
  - file_search
  - grep_search
  - create_file
  - replace_string_in_file
  - run_in_terminal
---

<!--
HOW TO USE WITH CLAUDE (VS Code Copilot Chat)
─────────────────────────────────────────────

1. Open Copilot Chat in VS Code.

2. Select this agent:
   Click the agent picker (bottom-left of the chat input) and choose
   "skill-conformance-generator", or type:

     @skill-conformance-generator

3. Send your request — always name the skill explicitly in the message.
   The agent will not ask which skill to work on; if no skill is named it
   will stop and ask you to provide one.

   TWO MODES:

   a) Generate a new spec (skill has no conformance tests yet):

        @skill-conformance-generator generate spec for backend-actions

      Other examples:
        @skill-conformance-generator generate spec for frontend-form-views
        @skill-conformance-generator generate spec for backend-services
        @skill-conformance-generator generate spec for backend-queues

   b) Update an existing spec (SKILL.md changed, spec may have gaps):

        @skill-conformance-generator update spec for backend-actions

      Use this when the CI drift detector (G1) flags that a SKILL.md was
      changed but the conformance spec was not updated in the same PR.
      The agent will diff the skill's current SR-* rules against the
      existing spec and report which assertions are missing or stale.

4. The agent will (generate mode):
   - Read the target SKILL.md and extract SR-* contracts
   - Find real fixture files in apps/project-management-app/
   - Create the .skill-conformance.spec.ts file
   - Compute the SkillScore
   - Append the score entry to qa/conformance/skill-scores.json
   - Create the per-skill agent file in qa/agents/skills/skill-conformance/
   - Update the coverage index in this file

   The agent will (update mode):
   - Compare current SKILL.md rules against existing spec assertions
   - Report gaps and patch the spec
   - Recompute and record the updated score in skill-scores.json

5. **The only manual step:** run the spec to verify it passes.

     cd apps/project-management-app/backend
     TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts \
       --testPathPatterns='<skill-name>.skill-conformance' --no-coverage --verbose

If any test fails, paste the output back to the agent — it will diagnose and fix.
If the agent says "no fixture found", create a real app file following that skill first, then re-run.
-->


# Skill Conformance Generator

## Skill coverage index

This table is the canonical map of all 30 Drumr skills in scope for conformance specs.
Per-skill agents are thin, bounded agents — they delegate their full workflow here.
Use `@skill-conformance-generator` directly only for skills that don't have a per-skill agent yet.

**Excluded from conformance scope:** `testing-unit`, `testing-integration`, `testing-e2e` — these skills describe the test framework itself. Conformance specs would be circular (testing the testing kit using tests). They are deliberately excluded from the SR-* audit.

Scores are sourced from `qa/conformance/skill-scores.json` (latest history entry per skill).
Thresholds: core-flow ≥ 85 ✅ | supporting ≥ 75 ✅ | optional ≥ 65 ✅ | below threshold ⚠️

| Skill | Per-skill agent | Spec | Score | Status |
|---|---|---|---|---|
| `backend-actions` | `@backend-actions-conformance` ✅ | ✅ | 86.7 | ✅ core-flow |
| `backend-api` | `@backend-api-conformance` ✅ | ✅ | 93.3 | ✅ core-flow |
| `backend-app` | `@backend-app-conformance` ✅ | ✅ | 93.3 | ✅ core-flow |
| `backend-auth` | `@backend-auth-conformance` ✅ | ✅ | 93.3 | ✅ core-flow |
| `backend-components` | `@backend-components-conformance` ✅ | ✅ | 86.7 | ✅ core-flow |
| `backend-context` | `@backend-context-conformance` ✅ | ✅ | 93.3 | ✅ supporting |
| `backend-datamodels` | `@backend-datamodels-conformance` ✅ | ✅ | 93.3 | ✅ core-flow |
| `backend-datasets` | `@backend-datasets-conformance` ✅ | ✅ | 93.3 | ✅ optional |
| `backend-datasources` | `@backend-datasources-conformance` ✅ | ✅ | 93.3 | ✅ core-flow |
| `backend-files` | `@backend-files-conformance` ✅ | ✅ | 93.3 | ✅ optional |
| `backend-logging` | `@backend-logging-conformance` ✅ | ✅ | 93.3 | ✅ supporting |
| `backend-queues` | `@backend-queues-conformance` ✅ | ✅ | 86.7 | ✅ optional |
| `backend-services` | `@backend-services-conformance` ✅ | ✅ | 80.0 | ✅ supporting |
| `backend-tech-stack` | `@backend-tech-stack-conformance` ✅ | ✅ | 93.3 | ✅ supporting |
| `backend-workflows` | `@backend-workflows-conformance` ✅ | ✅ | 86.7 | ✅ core-flow |
| `frontend-action-views` | `@frontend-action-views-conformance` ✅ | ✅ | 93.3 | ✅ supporting |
| `frontend-api` | `@frontend-api-conformance` ✅ | ✅ | 93.3 | ✅ core-flow |
| `frontend-app` | `@frontend-app-conformance` ✅ | ✅ | 93.3 | ✅ core-flow |
| `frontend-components` | `@frontend-components-conformance` ✅ | ✅ | 93.3 | ✅ core-flow |
| `frontend-context` | `@frontend-context-conformance` ✅ | ✅ | 93.3 | ✅ supporting |
| `frontend-custom-views` | `@frontend-custom-views-conformance` ✅ | ✅ | 93.3 | ✅ supporting |
| `frontend-form-views` | `@frontend-form-views-conformance` ✅ | ✅ | 93.3 | ✅ core-flow |
| `frontend-helpers` | `@frontend-helpers-conformance` ✅ | ✅ | 93.3 | ✅ supporting |
| `frontend-layout` | `@frontend-layout-conformance` ✅ | ✅ | 93.3 | ✅ supporting |
| `frontend-services` | `@frontend-services-conformance` ✅ | ✅ | 93.3 | ✅ supporting |
| `frontend-table-views` | `@frontend-table-views-conformance` ✅ | ✅ | 86.7 | ✅ core-flow |
| `frontend-tech-stack` | `@frontend-tech-stack-conformance` ✅ | ✅ | 93.3 | ✅ supporting |
| `frontend-views` | `@frontend-views-conformance` ✅ | ✅ | 93.3 | ✅ core-flow |
| `cli-commands` | `@cli-commands-conformance` ✅ | ✅ | 93.3 | ✅ optional |
| `vscode-extension` | `@vscode-extension-conformance` ✅ | ✅ | 93.3 | ✅ optional |
| `testing-unit` | — | — | — | 🚫 excluded (see note above) |
| `testing-integration` | — | — | — | 🚫 excluded (see note above) |
| `testing-e2e` | — | — | — | 🚫 excluded (see note above) |

> **This table is updated automatically by the generator as part of § 6c.**
> Both this table and `skill-scores.json` must always agree on the latest score.

---

You generate `.skill-conformance.spec.ts` files following the SR-* pattern established in the PoC.

**Required input:** the skill name must be explicitly stated in the user's message (e.g. "generate spec for backend-actions"). If no skill name is provided, stop immediately and ask: *"Which skill should I generate the conformance spec for? Please name it explicitly (e.g. backend-actions)."* Do not guess or pick a default.

**Excluded skills — do not generate specs for these:** `testing-unit`, `testing-integration`, `testing-e2e`. These skills describe the test framework itself; conformance specs would be circular. If asked to generate a spec for any of these, explain the exclusion and stop.

**Two modes:**
- `generate spec for <skill>` — the skill has no conformance spec yet. Follow §§ 1–6 below in full.
- `update spec for <skill>` — a `SKILL.md` changed and the spec may have gaps. Follow the update workflow in § 7.

## Mandatory steps — generate mode (execute in order)

### 1. Read the process manual

Read `qa/docs/process-manual.md` § 6 in full before generating any code.
It defines the complete SR-* scaffold, mock pattern, and scoring step. Do not skip it.

### 2. Read the target skill

Read `core/skills/<skill-name>/SKILL.md` in full.

Extract the four SR-* contracts:

| SR-* | Extract from skill |
|---|---|
| SR-1 | Required decorator(s), mandatory options/properties, forbidden alternatives |
| SR-2 | Required base class(es) |
| SR-3 | Function signatures, return types, behavioral guarantees (e.g. never throws, accumulates, returns array) |
| SR-4 | Forbidden direct imports, wrapping rules |

If any category is not applicable for this skill (e.g. no base class required), skip that SR-* describe block and note why in the spec header comment.

### 3. Find the fixture

Search `apps/project-management-app/` for a real app file written following the target skill.

- For backend skills: look in `backend/src/` (dataModels/, actions/, services/, etc.)
- For frontend skills: look in `frontend/src/` (views/, layouts/, components/, etc.)
- The fixture must be real app code, not a test helper

If no fixture exists yet, state this clearly and do not generate a spec. A conformance spec without a real fixture is not meaningful.

### 4. Generate the spec

Follow the scaffold from `process-manual.md § 6` exactly:

- File: `apps/project-management-app/backend/tests/unit/skill-conformance/<skill-name>.skill-conformance.spec.ts`
- Header comment block: skill reference, fixture path, how-to-run, purpose
- Mock block: captures decorator options and base class reference; uses `any` types inside factory (never `typeof MockClass`); Proxy catch-all for unspecified exports
- Additional `jest.mock` calls for any internal dependencies the fixture imports
- SR-1 describe block: one test per documented decorator rule
- SR-2 describe block: prototype chain assertion against mock base class
- SR-3 describe block: one test per documented behavioral guarantee
- SR-4 describe block: one `not.toMatch` per forbidden import + one `toMatch` for the required framework import

Each test must include a comment explaining *why* it exists — which skill rule it enforces and what failure would mean.

**Factory alternative rule (mandatory):** When a skill's component table shows two valid factories for the same field type (e.g. `choiceDropdown()` **or** `choiceBoxSelector()`; `booleanToggle()` **or** `booleanCheckbox()`; `fileInput()` **or** `fileDropZone()`), the existence test MUST accept both alternatives:

```typescript
// CORRECT — matches the skill's documented alternatives
expect(wasCalled('choiceDropdown') || wasCalled('choiceBoxSelector')).toBe(true);

// WRONG — over-strict; fails if the fixture switches to the valid alternative
expect(wasCalled('choiceDropdown')).toBe(true);
```

Apply the same pattern to any follow-up tests (e.g. option checks): spread calls from both factories before asserting:

```typescript
const calls = [...callsTo('booleanToggle'), ...callsTo('booleanCheckbox')];
```

This is the most common source of spec-stricter-than-skill failures. Scan every `wasCalled()` call you write and cross-reference the skill table before committing.

### 5. Compute initial SkillScore

After generating the spec, compute the score the skill would achieve with exactly this spec (one fixture, no adversarial tests yet):

| Dimension | Initial value | Reason |
|---|---|---|
| Correctness | 3 if SR-1+SR-2+SR-3 all present; 2 if two; 1 if one | Count covered SR groups |
| Consistency | 1 | One fixture |
| Determinism | 3 | Always, by construction |
| Robustness | 1 | SR-4 only, no adversarial fixture yet |

`SkillScore = (C×0.40 + K×0.20 + D×0.20 + R×0.20) × 33.33`

State the score and the gap vs threshold. State the two cheapest tests that would close the gap (typically: add second fixture → K 1→2; add one adversarial import check → R 1→2).

### 6. Output summary and housekeeping (mandatory — do not skip)

After the spec is written, execute these three steps **in the same response** before closing:

#### 6a. Update skill-scores.json via the score updater

Do **not** edit `skill-scores.json` directly. Run the following two commands — the script derives C from actual test results and appends the correct history entry:

```bash
pnpm run test:skill-conformance:ci -- --skill=<skill-name>   # writes skill-conformance-run.json
pnpm run scores:update                                        # appends to skill-scores.json + re-renders report
```

If `run_in_terminal` is available, run these commands now. Otherwise, tell the developer to run them before committing.

The score computed in §5 is an estimate for explanation purposes. The script produces the authoritative value.

#### 6b. Create the per-skill agent file

Create `qa/agents/skills/skill-conformance/<skill-name>-conformance.agent.md` by copying
the structure of `backend-auth-conformance.agent.md` and filling in:

- `name:` and `description:` frontmatter for this skill
- Fixed scope table: Skill path, Spec path, all fixtures used (with a note on live-import vs source-text), Jest command
- Scope constraints: note any pitfalls specific to this skill (special mock requirements,
  known open gaps, repo-wide scan helpers to preserve, transitive stubs needed)

#### 6c. Update the coverage index

In this file (`skill-conformance-generator.agent.md`), find the row for `<skill-name>` in the
coverage index table and update all three cells:

```
| `<skill-name>` | `@<skill-name>-conformance` ✅ | ✅ | <score> | ✅/⚠️ <priority-class> |
```

Use the score computed in step 5. `skill-scores.json` and this table must always agree.

#### 6d. Print the output summary

```
Spec created: apps/project-management-app/backend/tests/unit/skill-conformance/<skill-name>.skill-conformance.spec.ts
Fixture used: <path to fixture>
SR groups covered: SR-1 ✓ / SR-2 ✓ / SR-3 ✓ / SR-4 ✓  (or ✗ if not applicable)
Initial SkillScore: <score> / 100
Gap to <priority-class> threshold (<value>): <gap> points
Next two tests to close the gap: <description>
Per-skill agent created: qa/agents/skills/skill-conformance/<skill-name>-conformance.agent.md
Coverage index updated: ✅
```

## § 7 — Update mode workflow

> Use when `@skill-conformance-generator update spec for <skill>` is invoked,
> typically triggered by the CI drift detector (G1) flagging a SKILL.md change
> without a matching spec update.

**Steps:**

1. Read `core/skills/<skill-name>/SKILL.md` in full — extract current SR-* rules as in § 2.
2. Read the existing `apps/project-management-app/backend/tests/unit/skill-conformance/<skill-name>.skill-conformance.spec.ts` in full.
3. For each SR-* category, compare documented rules against covered `it()` assertions:
   - Rules covered by an existing test → ✅ no action
   - Rules documented in the skill but missing from the spec → ❌ gap — add assertion
   - Tests in the spec that reference a rule no longer in the skill → ⚠️ stale — flag for removal
4. Report the gap/stale summary before making any edits.
5. If gaps exist, patch the spec by adding the missing `it()` blocks inside the appropriate `describe` block. Do not restructure passing tests.
6. Recompute SkillScore after the update using the formula in § 5 and state the delta (old score → new score). If the score crossed a threshold, say so explicitly.
7. Update `skill-scores.json` by running the score updater — do **not** edit the file directly:
   ```bash
   pnpm run test:skill-conformance:ci -- --skill=<skill-name>   # writes skill-conformance-run.json
   pnpm run scores:update                                        # appends to skill-scores.json + re-renders report
   ```
   If `run_in_terminal` is available, run these now. Otherwise, tell the developer to run them before committing.

**If no gaps are found:** state clearly that the spec is already aligned with the current skill — no changes needed.

> Note: update mode requires reading a diff of what changed in the skill to be most precise.
> Until the CI drift detector provides the diff automatically, read the full skill and full spec
> and do a manual rule-by-rule comparison.

---

## Hard rules

- Never generate a spec without a real fixture. State the gap instead.
- Never use `typeof MockClass` inside `jest.mock` factories — use `any`.
- Never add tests that require a running server, database, or network call.
- Always include the `--config config/jest.config.ts` warning in the how-to-run comment.
- If the skill has no SR-2 (no base class), omit the describe block and note it.
- Specs are app-scoped — they always go in `apps/<app>/backend/tests/unit/skill-conformance/`, never in `core/`.
- In update mode, never remove existing passing tests — only add missing ones and flag stale ones for human review.

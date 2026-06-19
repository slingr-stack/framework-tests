# QA Action Points — Skills Validation Initiative

Status: Living document — update as tasks progress  
Owner: QA Team  
Last update: 2026-05-13  
Related strategy: `qa/docs/skills-validation-strategy-draft.en.md`  
Milestone: Skills QA Validation (tasks #1747–#1758)

---

## What to work on next — decision guide

This section answers the question: given the plan, the audit, and the open milestone tasks, what is the next concrete thing to do?

### The four dimensions — current state

| # | Dimension | What it proves | Infrastructure | Status |
|---|---|---|---|---|
| 1 | **E2E** | Does the running app work? | Playwright + DrumrTestKit | 4 fully covered, 11 partial, 1 uncovered |
| 2 | **Integration** | Do backend layers cooperate? | Jest + DrumrIntegrationTestKit | Partial (5 specs exist) |
| 3 | **Unit** | Do isolated units work? | Jest + DrumrUnitTestKit | Partial (services, data models) |
| 4 | **Skill Conformance** | Does code generated from a skill satisfy the skill's own contracts? | Jest — structural + behavioral assertions tied to SR-* rules | **PoC delivered** (see below) |

Dimensions 1–3 validate *what the app does*. Dimension 4 validates *whether the skill produces correct code* — this is what the lead is asking about.

> **Scope of dimension 4:** The testability scope in the audit (`e2e-testable`, `framework-internal`, etc.) determines which *primary* test dimension applies to a skill. It does **not** restrict conformance tests. Every skill Copilot uses to generate app code should have SR-* conformance tests. **Target: 28 out of 28 skills.**

### PoC — Skill Conformance (Dimension 4)

**Delivered:** `apps/project-management-app/backend/tests/unit/skill-conformance/backend-datamodels.skill-conformance.spec.ts`

**Results:** 15/15 tests passing (0.5 s)

**What it demonstrates:**
- A test can explicitly reference a Skill Rule (SR-*) and assert that the generated code satisfies it
- Four rule categories are covered: decorator contract (SR-1), base class (SR-2), validation function contract (SR-3), forbidden imports (SR-4)
- When a test fails, it pinpoints either a generation gap (code doesn't follow skill) or a documentation gap (skill claims something that doesn't hold)
- Pattern can be replicated for any other skill in a new `*.skill-conformance.spec.ts` file in the same directory

**How to run:**
```bash
# from apps/project-management-app/backend/
TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts \
  --testPathPatterns='tests/unit/skill-conformance' --no-coverage --verbose
```

### How SR-* tests feed the SkillScore

The four strategy dimensions (Correctness, Consistency, Determinism, Robustness) are not abstract ratings — each one maps directly to a category of SR-* tests. The SkillScore formula tells you exactly which SR-* group to write next:

| Dimension | Weight | What it specifically measures | SR-* groups | Score rule |
|---|---|---|---|---|
| **Correctness** | 40% | Does the generated code implement the skill's structural and behavioral contracts? This is the heaviest weight: if the decorator, base class, or function contract is wrong, the code fails at runtime. | **SR-1** (decorator): right decorator used, required options present, forbidden alternatives absent. **SR-2** (base class): extends the documented framework base — wrong base class breaks lifecycle availability. **SR-3** (behavioral contract): generated functions match the skill's documented signatures, return types, and behavioral rules (e.g. validation returns array, never throws; execute() returns documented shape). | 3 = all three SR groups covered and passing; 2 = two groups; 1 = one group only; 0 = none |
| **Consistency** | 20% | Does the skill produce correct code for any entity, not just the one fixture used in the PoC? A skill that works for `Project` but breaks for `Task` is unreliable. | Same SR-1/SR-2/SR-3 assertions run against **multiple independent fixture files** for the same skill. | 3 = 3+ fixtures all pass; 2 = 2 fixtures; 1 = 1 fixture (PoC baseline); 0 = no fixtures |
| **Determinism** | 20% | Can test results be trusted across runs and environments? SR-* tests are pure static assertions on committed files — no network, no server, no random data. They cannot be flaky by construction. If this ever scores below 3 it means tests were written as non-static assertions, which would undermine the entire suite. | All SR-* test groups — determinism is a structural property of the SR-* pattern itself. | Always **3** once any SR-* test exists. This is an invariant of the pattern. |
| **Robustness** | 20% | Does the skill protect against incorrect patterns that compile but violate framework contracts? Measures defensive coverage: what generated code must NOT do. | **SR-4** (forbidden imports): file avoids direct imports from libraries the framework wraps (`typeorm`, `sequelize`, raw `antd`, etc.). **Adversarial fixtures**: code that looks structurally plausible but uses a wrong base class, wrong decorator, or banned pattern — the tests must detect these. | 3 = forbidden imports + wrong base class + wrong decorator all tested; 2 = import check + one adversarial; 1 = import check (SR-4) only; 0 = none |

**What the SkillScore represents:**

SkillScore is a numeric confidence measure (0–100) expressing: *"How reliably does this skill produce framework-compliant code?"*

- **100**: generated code always uses the right decorator+options (SR-1), extends the right base (SR-2), follows all behavioral contracts (SR-3), avoids all forbidden patterns (SR-4), does so consistently across multiple entity types, and the test suite is deterministic.
- **0**: no SR-* tests exist yet — no automated evidence of compliance.
- **Release gate threshold** (e.g. ≥85 for core-flow): the minimum confidence level required before shipping a skill change.

The weights reflect relative risk: structural correctness (40%) matters most because a wrong decorator or base class produces hard-to-debug runtime failures. Consistency and Robustness (20% each) are equal because unpredictable output and hallucinated patterns are both significant failure modes. Determinism (20%) is always satisfied by the SR-* pattern — its weight exists so that switching to a non-static test approach (which would lower it) is immediately visible in the score.

**Worked example — `backend-datamodels` after the PoC:**

`SkillScore = (3×0.40 + 1×0.20 + 3×0.20 + 2×0.20) × 33.33 ≈ 80`

Gap vs `core-flow` threshold (85): add a second fixture (`Task`) → Consistency 1→2 → score 82. Add one adversarial import rule → Robustness 2→3 → score 85. Two tests. Done.

This is the intended workflow: **write SR-* tests → score the skill → the gap identifies the next test → repeat until threshold**.

**Full skill conformance coverage target (29/29 skills):**

| Priority | Skill | Primary SR-* surface | Notes |
|---|---|---|---|
| 1 | `backend-datamodels` | SR-1/2/3/4 | **PoC done** (1 fixture, add `Task` + adversarial) — `core-flow` |
| 2 | `backend-actions` | SR-1 (`@Action`/`@ObjectAction`), SR-3 (`execute()` signature + return shape), SR-4 | `core-flow` — highest generation surface |
| 3 | `frontend-form-views` | SR-1 (`@CreateView`/`@EditView`), SR-3 (lifecycle hook signatures), SR-4 | `core-flow` — most frequent view type |
| 4 | `frontend-table-views` | SR-1 (`@TableView`), SR-3 (`tableOptions` shape), SR-4 | `core-flow` |
| 5 | `frontend-views` | SR-3 (toolbar DSL shape, UI API binding), SR-4 | `core-flow` — foundation for all view kinds |
| 6 | `frontend-api` | SR-3 (Operation Builder shape, union handling), SR-4 | `core-flow` |
| 7 | `frontend-components` | SR-3 (DataForm/DataTable usage, no raw Ant Design), SR-4 | `core-flow` |
| 8 | `backend-api` | SR-3 (GraphQL CRUD exposure, typed return, ValidationError union shape), SR-4 | `core-flow` |
| 9 | `backend-auth` | SR-3 (permission rule shape, AppUser usage), SR-4 | `core-flow` |
| 10 | `backend-workflows` | SR-1 (`@WorkflowQueue`/`BaseQueue`), SR-3 (handler shape), SR-4 | `core-flow` — new skill |
| 11 | `backend-datasources` | SR-1 (`@DataSource`), SR-2 (`TypeOrmSqlDataSource`), SR-4 | `core-flow` — framework-internal |
| 12 | `backend-services` | SR-1 (`@Service`), SR-3 (singleton scope, DI constructor), SR-4 | `supporting` |
| 13 | `backend-context` | SR-3 (constructor injection, `context.user/action/ui/workflow`), SR-4 | `supporting` — framework-internal, conformance is primary test type |
| 14 | `backend-components` | SR-3 (factory helper usage, context binding), SR-4 | `supporting` |
| 15 | `backend-tech-stack` | SR-4 only (no direct `typeorm`/`graphql` imports in app code) | `supporting` |
| 16 | `frontend-layout` | SR-1 (`@Layout`), SR-3 (menu/nav config), SR-4 | `supporting` |
| 17 | `frontend-action-views` | SR-1 (`@ActionView`), SR-3 (lifecycle hooks, `initialData`), SR-4 | `supporting` |
| 18 | `frontend-custom-views` | SR-1 (`@CustomView`), SR-3 (lifecycle hooks), SR-4 | `supporting` |
| 19 | `frontend-services` | SR-1 (`@Service`), SR-3 (DI injection), SR-4 | `supporting` |
| 20 | `frontend-helpers` | SR-3 (helper function signatures), SR-4 | `supporting` |
| 21 | `frontend-context` | SR-3 (`useContextValue`, `put()`, `notifyChange()`), SR-4 | `supporting` |
| 22 | `frontend-tech-stack` | SR-4 only (no raw `antd` when framework wrapper exists) | `supporting` |
| 23 | `cli-commands` | Special form — verify documented commands exist in the CLI binary | `supporting` — partially covered by existing CLI integration tests |
| 24 | `vscode-extension` | VS Code Extension Test Runner (`vs-code-extension/test/`) | `supporting` — different test runner than SR-* Jest |
| 25 | `testing-e2e` | SR-4 (DrumrTestKit imported, no raw Playwright in spec files) | `supporting` |
| 26 | `testing-integration` | SR-4 (DrumrIntegrationTestKit imported, no E2E-only deps) | `supporting` |
| 27 | `backend-files` | SR-1 (`AppFile`), SR-3 (file field options), SR-4 | `optional` |
| 28 | `backend-queues` | SR-1 (`@Queue`/`BaseQueue`), SR-3 (queue options), SR-4 | `optional` |
| 29 | `testing-unit` | SR-4 (DrumrUnitTestKit imported, no DB/DI container imports) | `optional` |

---

## Skill corpus — token cost reference

Token counts estimated at 4 characters per token from actual `SKILL.md` file sizes (measured 2026-05-14). Use this table to size context budgets for multi-skill Copilot prompts.

| Tier | Skills | Token range |
|---|---|---|
| **Lightweight** | `frontend-tech-stack`, `backend-tech-stack`, `frontend-services`, `testing-unit`, `backend-files` | 791 – 1,805 |
| **Standard** | `backend-auth`, `backend-workflows`, `testing-e2e`, `frontend-context`, `cli-commands`, `vscode-extension`, `frontend-action-views`, `frontend-components`, `backend-datamodels`, `backend-datasources`, `backend-datasets`, `frontend-helpers`, `backend-api`, `frontend-custom-views` | 2,093 – 3,906 |
| **Heavy** | `frontend-table-views`, `frontend-api`, `backend-context`, `frontend-layout`, `testing-integration`, `backend-components`, `frontend-form-views`, `backend-queues`, `backend-services`, `frontend-views`, `backend-actions` | 4,127 – 5,929 |

**Stats:** min **791** (`frontend-tech-stack`) · max **5,929** (`backend-actions`) · average **~3,600** · full 30-skill corpus **~107,500 tokens**

| Operation | Approximate token cost |
|---|---|
| Single skill read (average) | ~3,600 tokens |
| Typical multi-skill prompt (3 skills) | ~8,000 – 15,000 tokens |
| Full corpus (all 30 SKILL.md files listed above) | ~107,500 tokens |

Note: these are skill-content costs only. Total prompt cost also includes system instructions, conversation history, and generated output.

---

## Context

This document captures the operational next steps and blockers derived from the review of the skills validation strategy draft. It is intentionally separate from the strategy document, which defines *how* things should work. This document defines *what needs to happen to make the strategy operational*, mapped to open milestone tasks.

### Milestone task → dimension mapping

| Task | Title | Dimension | Next action |
|---|---|---|---|
| #1747 | Define QA validation strategy for skill testing | Strategy (done) | Set `criticality` in skill frontmatter (B1) |
| #1748 | Create deterministic test fixtures for existing skills | Dim 4 (Skill Conformance) + Dim 1 (E2E gaps) | Extend PoC to `backend-actions`, `backend-services`; close E2E gap list (S1–S2) |
| #1749 | Implement skill test harness for automated execution | Dim 4 | ✅ Done — harness runner, `pre-merge-tests.yml` matrix entry, nightly workflow |
| #1757 | Define baseline outputs and comparison rules | Dim 4 | ✅ Done — 3 pilot baselines in `qa/fixtures/`, comparator script (`pnpm run generation:compare`) |
| #1758 | Add regression gates for skill validations in CI | All dimensions | ✅ Done — nightly workflow, PR summary comment, score updater (`pnpm run scores:update`), exception policy |
| Flakiness / metrics | Standardize metrics, artifacts, flakiness detection | Dim 1 (E2E) + Dim 4 (conformance) + triage agent | ✅ Metrics + artifacts + flakiness detection done — `passRate`/`failRate`/`flakyRate`/`drift`/`failureClass` in run record; rerun strategy classifies `deterministic`/`flaky`/`infra`; `flaky-scenarios.json` tracker created; artifact naming standardised (`<sha>-<run_id>`); `if-no-files-found: error`; stability trend in report. Remaining: failure classifier agent (S3) |

### Three pain points driving this initiative

1. **Skills integrity testing** — Copilot development skills have no automated quality gate. We validate whether the *app built with a skill works* (E2E), but not whether the *skill itself produces correct code* (generation integrity).

2. **Version management + test execution management** — The strategy assumes a release management process (RC signals, changelogs, tagged releases) that does not yet exist. Without it, regression cadences are aspirational. Additionally, triage of test failures is entirely manual today, with no systematic way to distinguish product bugs from test defects or environment issues.

3. **App generation quality** — The setup/generation stage of new apps is not covered by any test type today. Copilot applying fixes after generating code from a skill is observable evidence that the generation stage is failing. This is distinct from runtime E2E testing and requires its own test type (Generation Integrity, now added to the strategy).

---

## Immediate Blockers
> Must be resolved before the regression gate in the strategy can operate as designed.

### B1 — Set `criticality` in skill frontmatter
**Relates to:** #1747 (Define QA validation strategy for skill testing)  
**Owner:** Dev team + QA joint session  
**Status:** Criticality decisions are now made — documented in `core/skills/README.md` skill criticality reference table. Mapping to strategy classes: `high` → `core-flow`, `medium` → `supporting`, `low` → `optional`. The `skills-audit-result.md` inventory has been updated accordingly.  
**Remaining action:** Write the `criticality` field into the YAML frontmatter of each `SKILL.md` file (mechanical update, no further decisions needed). Until that is done, the SkillScore release gate thresholds are operationally correct in the audit but not machine-readable from the skill files themselves.
**Owner:** QA  
**What:** `backend-queues` is now `e2e-partial / partially-covered` in the latest audit — the happy-path was partially addressed but the queue failure and notification-dismissal tests are still missing.  
**Action:** Implement the two tests already specified in the gap backlog:
- `"BulkAssignToMe workflow — WorkflowNotificationCenter shows completed status after queue-backed execution"`
- `"Workflow queue failure — error notification is displayed in WorkflowNotificationCenter and can be dismissed"`

### B3 — Define the Release Candidate trigger
**Relates to:** #1758 (Add regression gates for skill validations in CI)  
**Owner:** Dev team + QA  
**What:** The regression process in the strategy requires a formal RC signal. Without it the "Regression on every RC" cadence cannot be enforced.  
**Action:** Agree with devs on a lightweight release management policy: at minimum, a `core/` semantic version bump + CHANGELOG entry constitutes an RC. Interim fallback (already added to strategy): treat each `develop` merge as a regression trigger until the policy is in place.

---

## Short-term (within next 1–2 sprints)

### S1 — Close the validation-error surface gap (highest-frequency gap)
**Relates to:** #1748 (Create deterministic test fixtures for existing skills)  
**Owner:** QA  
**What:** The same type of missing coverage appears in four skills: `backend-api`, `backend-components`, `backend-datamodels`, and `frontend-api` — all missing a test that surfaces server-side validation errors as inline field errors in the UI. A single shared fixture can cover all four.  
**Action:** Write one integration-style E2E scenario that submits a form with a value that triggers a backend ValidationError union, and asserts the error renders as an inline field error. Map the test to all four skills in the audit.

### S2 — ~~Close core-flow auth gap~~ (completed)
**Relates to:** #1748  
**Status:** `backend-auth` is now `fully-covered` in the latest audit. The role-enforcement and JWT-redirect tests referenced here have been added to the suite.  
**No further action required.** Retained for traceability.

### S3 — Implement the Failure Classifier Agent (triage automation)
**Relates to:** #1749 (Implement skill test harness for automated execution) and the "Standardize metrics, artifacts and add flakiness detection" task  
**Owner:** QA  
**What:** Manual triage (Section 8 of the strategy) is currently the bottleneck after every regression run. The agent receives: failing scenario name, error message, stack trace, and last-passing-run metadata. It outputs: failure type (product defect / test defect / environment), affected skill id, and a confidence score.  
**Input data:** The skill-to-test-file mapping in `qa/conformance/skills-audit-result.md` provides the linkage needed.  
**Action:** Define the agent's input/output contract first (as a spec), then implement. Start with rule-based classification (regex on error patterns) before introducing model-based scoring.

### S4 — Define baseline outputs for Generation Integrity (new test type)
**Relates to:** #1757 (Define baseline outputs and comparison rules)  
**Owner:** QA + framework maintainers  
**What:** Generation Integrity is now defined in the strategy (Section 4.4) but has no fixtures yet. Baselines are: canonical prompts per skill + expected generated output that compiles + passes lint.  
**Action:**
- Select 3 high-priority skills as the pilot (`backend-datamodels`, `backend-actions`, `frontend-form-views` — high generation surface, `e2e-testable`).
- For each: write one canonical prompt and one adversarial prompt.
- Generate outputs and verify compile + lint pass.
- Document the baseline in a `generation-fixtures/` subfolder (one file per skill).

---

## Medium-term (release cadence + version policy)

### M1 — Negotiate release cadence with devs
**Relates to:** #1758 (Add regression gates for skill validations in CI)  
**Owner:** QA lead + framework lead  
**What:** The strategy defines cadences (smoke on push, regression on RC, deep on major release) that need a matching process on the dev side.  
**Action:** Propose the following minimal policy:
- `core/` version follows semver (patch/minor/major).
- Any skill `SKILL.md` change triggers a minor version bump.
- A tagged release on `core/` constitutes an RC and triggers the regression gate.
- Incorporate into the existing `check-conventions` pre-commit/CI flow.

### M2 — Establish framework version policy for `core/`
**Relates to:** #1758  
**Owner:** Dev team  
**What:** Downstream of M1. Without versioning on `core/`, tests cannot be pinned to a known-good state and historical bugfix scenarios have no stable anchor.  
**Action:** Add `core/package.json` to the release commit flow. Agree on the changelog format (a minimal `CHANGELOG.md` per release in `core/`).

### M3 — Wire Generation Integrity gate into CI
**Relates to:** #1758 and #1749  
**Owner:** QA + DevOps  
**What:** After S4 establishes the baseline fixtures, the generation check should run automatically on every skill `SKILL.md` change PR.  
**Action:** Add a CI step that runs the generation integrity check for the changed skill(s): prompt → TypeScript output → `tsc --noEmit` + `eslint`. Fail the PR if compile or lint fails.

---

## Skill coverage priorities (ordered by the plan's prioritization rule)

| Priority | Skill | Gap | Task ref |
|---|---|---|---|
| P1 (core-flow, high risk) | backend-queues | partially-covered — failure/notification tests still missing | #1748 |
| P1 (core-flow, new skill) | backend-workflows | not yet covered — new `e2e-partial` skill, no tests yet | #1748 |
| P1 (core-flow, validation) | backend-api + backend-components + backend-datamodels + frontend-api | validation error surface (shared fixture) | #1748 |
| P2 (core-flow, auth) | backend-auth | ✔ completed — now fully-covered | — |
| P2 (core-flow, actions) | backend-actions | ✔ completed — now fully-covered | — |
| P3 (supporting) | backend-files | oversized upload rejection + download | #1748 |
| P3 (supporting) | frontend-layout | navigation mode toggle + per-view override | #1748 |
| P3 (supporting) | frontend-components | WorkflowInlineProgress + ActionButtons disabled | #1748 |
| P3 (supporting) | frontend-custom-views | onParamsChange + ViewContainer isolation | #1748 |
| P3 (supporting) | frontend-helpers | E2E coverage for openView/extractData helpers | #1748 |
| P4 (supporting, framework-internal) | backend-context + backend-datasources | unit / integration tests (Jest) | #1749 |
| P4 (supporting, e2e-partial) | backend-services + frontend-services | E2E partial coverage + unit tests for internal contracts | #1748–#1749 |
| P5 (generation-testable) | backend-tech-stack + frontend-tech-stack + cli-commands + vscode-extension + testing-e2e + testing-integration + testing-unit | conformance only (see SR-* table above) | #1749 |
| New | backend-datamodels + backend-actions + frontend-form-views | Generation Integrity pilot | #1757 |

---

---

## Process gaps identified in architecture review (2026-05-14)

Four undocumented mechanisms were identified as necessary to make the end-to-end process fully operational. Listed in dependency order.

---

### G1 — Skill drift detector *(implement with #1749)*
**What:** When a `SKILL.md` changes in a PR but the corresponding `.skill-conformance.spec.ts` is not updated, the skill silently drifts out of alignment with its tests. No mechanism today catches this.  
**Proposed solution:** A lightweight CI check (no LLM needed) that, for any PR touching `core/skills/*/SKILL.md`, verifies that a change to `tests/unit/skill-conformance/<skill>.skill-conformance.spec.ts` is also present. If not, the PR receives a blocking warning: *"SKILL.md changed, conformance tests not updated."*  
**Location:** `qa/scripts/check-skill-drift.js`  
**Trigger:** CI — pre-merge check on any PR modifying `core/skills/`  
**Priority:** Implement in the same sprint as #1749 (wiring `test:skill-conformance`). Without this, the conformance suite becomes stale as soon as any skill evolves.

---

### G2 — Score history store *(prerequisite before first real regression run)*
**What:** The strategy (Section 6.1) includes the rule: *"SkillScore < threshold in two consecutive releases → escalate to Deep Validation."* This rule is currently inoperable because there is no mechanism to store scores across runs.  
**Proposed solution:** A committed file `qa/conformance/skill-scores.json` updated by CI on every `test:skill-conformance` run. Minimal schema:
```json
{
  "backend-datamodels": [
    { "date": "2026-05-14", "release": "develop", "score": 80, "C": 3, "K": 1, "D": 3, "R": 2 }
  ]
}
```
Lightweight, versionable, no additional infrastructure. The SkillScore Reporter (G3) writes it; the triage agent (S3) and the release process read it.  
**Location:** `qa/conformance/skill-scores.json`  
**Trigger:** Written by CI on every `test:skill-conformance` run  
**Priority:** Must exist before the first regression run is treated as a gating event. Implement alongside or immediately after #1749.

---

### G3 — SkillScore Reporter *(implement after #1749 is wired)*
**What:** Once `test:skill-conformance` produces Jest JSON output, there is no agent that (a) applies the SkillScore formula per dimension and (b) routes the result to the right owner with an actionable recommendation.  
**Proposed solution:** A single agent that combines scoring and recommendation — no value in separating them since the recommendation is driven directly by the per-dimension breakdown:
- Low Consistency → QA writes another fixture file
- Failing SR-3 → framework maintainer fixes the skill contract
- Low Robustness → QA adds adversarial fixtures

The agent emits: score per dimension, total score, gap vs threshold, and a routing decision (QA action vs framework maintainer action).  
**Location:** `qa/agents/skillscore-reporter.md`  
**Trigger:** CI — post `test:skill-conformance` run; reads Jest JSON results and writes to `skill-scores.json` (G2)  
**Priority:** Implement after #1749. The agent has no useful input until the conformance suite is wired into CI.

---

### G4 — Triage agent input expansion *(update S3 scope)*
**Note:** The triage agent (S3) was already documented. This is an addendum: the agent must also consume the score history from G2 as part of its input, so it can distinguish a *new* failure from a *regression* (score previously passed, now fails) from a *never-covered* gap (no historical data). Without the score history, the agent cannot make this distinction.  
**Action:** When implementing S3, include `skill-scores.json` (G2) as a required input alongside Jest JSON and the skills-audit-result.md linkage already specified.

---

## Open questions requiring dev team input

1. **Criticality classification** (B1): Which skills are `core-flow` vs `supporting` vs `optional`?
2. **Release trigger** (B3): Is a `core/` semver tag sufficient, or do we need an explicit QA sign-off step?
3. **Generation fixture scope**: Should the pilot (S4) be limited to 3 skills or expanded to all `core-flow` skills in the first sprint?
4. **Triage agent ownership**: Is the failure classifier agent owned by QA or is it a shared framework tooling item?
5. **Score history ownership**: Is `skill-scores.json` (G2) committed by CI automatically, or does it require a manual QA sign-off step before committing?

# Skills QA — Briefing

> For anyone joining without prior context.
> Full strategy: `qa/docs/skills-validation-strategy-draft.en.md`
> Action points and backlog: `qa/docs/qa-action-points.md`

---

## 1. Background — what are skills and what is the problem?

Drumr has **29 Copilot skills**. A skill is a markdown file (`SKILL.md`) in `core/skills/` that teaches Copilot the exact rules for one part of the framework — how to define a data model, write an action, set up a view, and so on.

When a developer asks Copilot to generate code, Copilot reads the relevant skill and produces output based on its rules. **The problem:** until now there was no automated way to verify that the code Copilot generates actually follows those rules. We validated whether the app works (E2E tests), but not whether the skill itself produces correct code.

---

## 2. The four testing dimensions

We test the framework across four independent dimensions — four different questions:

| # | Dimension | The question | Tools |
|---|---|---|---|
| 1 | **E2E** | Does the running app work for a real user? | Playwright + DrumrTestKit |
| 2 | **Integration** | Do the backend layers work together? | Jest + DrumrIntegrationTestKit |
| 3 | **Unit** | Do isolated pieces of logic work? | Jest + DrumrUnitTestKit |
| 4 | **Skill Conformance** | Does code generated from a skill satisfy the skill's own rules? | Jest — SR-* tests |

Dimensions 1–3 were already partially in place. **Dimension 4 is new and is what this initiative adds.**

---

## 3. What is Skill Conformance and what did we build?

A Skill Conformance test takes a real code file that was written following a skill and checks that it satisfies each rule the skill documents. Each rule check is called a **Skill Rule**, labeled SR-1, SR-2, etc.

**Example — `backend-datamodels` skill:**

| Rule | What it checks |
|---|---|
| SR-1 | The model uses `@DataModel()` — not `@Model`, not undecorated |
| SR-2 | The model class extends `BaseDataModel` |
| SR-3 | The validation function returns an array, accumulates all errors, each issue has a `constraint` and a `message` |
| SR-4 | The file does not import from `typeorm`, `sequelize`, or `mongoose` directly |

These are plain Jest tests. They run in under 1 second with no server or database required.

**Proof of concept delivered:** [`backend-datamodels.skill-conformance.spec.ts`](../../../apps/project-management-app/backend/tests/unit/skill-conformance/backend-datamodels.skill-conformance.spec.ts) — **15/15 tests passing.**

```bash
# From apps/project-management-app/backend/
TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts \
  --testPathPatterns='tests/unit/skill-conformance' --no-coverage --verbose
```

---

## 4. Two stages — what we have vs. the full vision

Skill Conformance and full Generation Integrity are not the same thing. They are two stages that build on each other:

| | Stage 1 — SR-* Static Conformance | Stage 2 — Live Generation Integrity |
|---|---|---|
| **What it does** | Asserts skill rules against existing fixture code | Actually invokes Copilot with a prompt, captures the output, verifies it compiles + passes lint |
| **Requires** | Jest only. No Copilot invocation. | A test harness that can call Copilot and capture output |
| **Status** | **Complete — 30/30 skills, CI-integrated** | Future work |

Stage 1 is the prerequisite. It proves the skill's rules are assertable. Stage 2 closes the loop by verifying Copilot follows those rules live.

**Stage 2 ownership.** Stage 2 introduces Copilot model behavior as a variable — it can drift between Copilot versions without any skill change. This creates a shared boundary:

- **QA owns:** the prompt corpus (canonical + adversarial prompts per skill) and the pass/fail criteria
- **Framework team owns:** the invocation harness and re-baselining when Copilot versions change
- **When a Stage 2 test fails:** QA classifies the failure first — skill content issue → framework maintainer fixes the skill; prompt quality issue → QA updates the prompt; Copilot drift with no skill change → framework team re-baselines You cannot do Stage 2 meaningfully without Stage 1 first.

---

## 5. How do we measure skill quality — the SkillScore

After writing SR-* tests for a skill, we compute a **SkillScore** (0–100) using four weighted dimensions. Each dimension maps directly to a category of SR-* tests:

| Dimension | Weight | What SR-* group feeds it |
|---|---|---|
| **Correctness** | 40% | SR-1, SR-2, SR-3 — does the code follow the skill's structural and behavioral rules? |
| **Consistency** | 20% | Are the same rules verified across **multiple fixture files** for the same skill? |
| **Determinism** | 20% | SR-* tests are static assertions — always **3/3** by definition, cannot be flaky |
| **Robustness** | 20% | SR-4 — does the code avoid all patterns the skill explicitly forbids? |

Each dimension is scored 0–3. The formula:

$$\text{SkillScore} = (C \times 0.40 + K \times 0.20 + D \times 0.20 + R \times 0.20) \times 33.33$$

**Release thresholds** (a skill must clear its threshold to pass the release gate):
- `core-flow` skill: ≥ 85
- `supporting` skill: ≥ 75
- `optional` skill: ≥ 65

**The score drives the backlog.** After the `backend-datamodels` PoC: Correctness = 3, Consistency = 1 (one fixture), Determinism = 3, Robustness = 2 → score ≈ 80, below the 85 gate. The two lowest dimensions tell you the next two tests to write: add a second fixture (Consistency 1→2, score→82), add one adversarial import rule (Robustness 2→3, score→85). No guesswork needed.

---

## 6. What happens with the score — the developer feedback loop

The score is only useful if the right person sees the right information. Publishing just the total hides the cause.

**The per-dimension breakdown is published to the skill owner (framework maintainer) with:**
- Score per dimension, not just the total
- Which SR-* group is the weakest
- Whether the gap is a *testing* problem (QA needs more fixtures) or a *skill* problem (the framework maintainer needs to fix the skill itself)

This distinction matters: a low Consistency score → QA writes another fixture file. A failing SR-3 group → the skill documents a contract that the generated code doesn't satisfy → framework maintainer fixes the skill.

---

## 7. Scope — which skills get conformance tests?

**28 out of 28 skills.** All skills get some form of conformance test. `backend-services` and `frontend-services` were reclassified from `framework-internal` to `e2e-partial`; their SR-* conformance priority is unchanged.

Important: skills labeled `framework-internal` in the audit (like `backend-context`, `backend-datasources`) are labeled that way because *E2E browser tests don't apply to them*. That label says nothing about conformance tests. All 28 skills get conformance tests appropriate to their `test_scope`.

---

## 8. Current state

| What | Status |
|---|---|
| QA validation strategy | Written — `skills-validation-strategy-draft.en.md` |
| Skills audit + coverage matrix | Complete — 30 skills audited in `skills-audit-result.md` |
| Skill Conformance — Stage 1 | Complete — 30/30 skills, all specs passing. CI-integrated (nightly + PR). Scores tracked in `skill-scores.json` and auto-updated via `pnpm run scores:update`. |
| Conformance coverage | 30 / 30 skills |
| Run metrics | `skill-conformance-run.json` now includes `passRate`, `failRate`, `flakyRate`, `drift` (Δ vs last history entry), and `failureClass` per skill (`deterministic` \| `flaky` \| `infra` \| `null`). |
| Flakiness detection | Operational — harness automatically re-runs failing skills; classifies failures before writing the run record. Untracked flaky skills trigger a CI warning pointing to `flaky-scenarios.json`. |
| Flaky scenario tracker | `core/skills/qa/skill-conformance/flaky-scenarios.json` — schema in place, empty (no flaky skills detected yet). Add an entry manually when the CI log reports an untracked flaky skill. |
| Stability trend | `skill-conformance-report.md` now includes a Stability Trend table (last 5 runs per skill with Δ). Rendered automatically by `pnpm run scores:update`. |
| Artifact traceability | Nightly artifact: `nightly-skill-conformance-<sha>-<run_id>` (90 days). PR artifact: `skill-conformance-pr-<sha>-<run_id>` (30 days). Missing artifact now fails the job (`if-no-files-found: error`). |
| Run metrics | `skill-conformance-run.json` now includes `passRate`, `failRate`, `flakyRate`, `drift` (Δ vs last history entry), and `failureClass` per skill (`deterministic` \| `flaky` \| `infra` \| `null`). |
| Flakiness detection | Operational — harness automatically re-runs failing skills; classifies failures before writing the run record. Untracked flaky skills trigger a CI warning pointing to `flaky-scenarios.json`. |
| Flaky scenario tracker | `qa/conformance/flaky-scenarios.json` — schema in place, empty (no flaky skills detected yet). Add an entry manually when the CI log reports an untracked flaky skill. |
| Stability trend | `skill-conformance-report.md` now includes a Stability Trend table (last 5 runs per skill with Δ). Rendered automatically by `pnpm run scores:update`. |
| Artifact traceability | Nightly artifact: `nightly-skill-conformance-<sha>-<run_id>` (90 days). PR artifact: `skill-conformance-pr-<sha>-<run_id>` (30 days). Missing artifact now fails the job (`if-no-files-found: error`). |
| Generation baselines | 3 pilot baselines (`backend-datamodels`, `backend-actions`, `frontend-form-views`) in `qa/fixtures/`. Comparator: `pnpm run generation:compare`. |
| E2E coverage | 6 fully covered, 14 partial, 0 uncovered |
| `criticality` field in all skills | Decision made — pending mechanical write into SKILL.md frontmatter (B1) |

---

## 9. Likely questions

### "How does the release process look?"

A release is gated on skills passing their SkillScore threshold. The flow is:

```
Skill changes in PR
  → re-run skills audit (updates skills-audit-result.md)
  → run SR-* conformance tests for changed skills
  → compute SkillScore per dimension
  → if score < threshold → block merge, fix skill or add tests
  → if score ≥ threshold → merge allowed

On Release Candidate (RC tag on core/)
  → run full E2E regression suite (all 29 skills checked)
  → run all SR-* conformance tests (all 29 skills)
  → any core-flow skill uncovered or below threshold → release blocked
  → publish per-dimension score report to framework maintainers
  → QA + maintainer sign-off → release
```

**Current honest state:** the release trigger (RC tag) does not exist yet. Until it does, the interim rule is: treat every merge to `develop` as a regression trigger and every sprint end as a regression window. Getting the release management process defined is blocker B1 in the action points.

---

### "How do we know when we're done adding tests?"

A skill is done when its SkillScore clears the threshold for its priority class **and** no dimension is below the per-dimension floor:

| Priority class | Score threshold | No dimension below |
|---|---|---|
| `core-flow` | ≥ 85 | 70 |
| `supporting` | ≥ 75 | 60 |
| `optional` | ≥ 65 | 50 |

The score tells you exactly what's missing. A skill never reaches threshold by chance — each dimension has a clear ceiling (3) and the formula shows the exact gap. When all dimensions clear their floors and the total clears the threshold, the skill is done.

There is one hard override: any open Sev-0 or Sev-1 defect against a skill blocks acceptance regardless of score.

**The `criticality` field** on each skill (currently unset for all 29) determines which threshold applies. Setting it is the first prerequisite — until then we can compute scores but can't apply the gate.

---

### "When do we execute what and how?"

Three cadences, each with a different trigger:

| When | What runs | How | Trigger |
|---|---|---|---|
| **Every PR (via `/run-tests` comment)** | SR-* conformance suite — non-blocking; posts PR comment with failing skill table + per-skill agent links | `pnpm run test:skill-conformance:ci` | CI — automatic (`pre-merge-tests.yml`, `allow-failure: true`) |
| **Every night at 2am UTC** | Full 30-skill conformance suite; Slack alert on failure | `pnpm run test:skill-conformance:ci` | CI — automatic (`nightly-skill-conformance.yml`) |
| **Every push to `develop`** | E2E smoke suite (happy paths for all `core-flow` skills) | Playwright via CI | Automatic |
| **Every sprint end / RC** | Full E2E regression + all SR-* conformance tests + score update | Playwright + Jest + `pnpm run conformance:run` | Manual trigger until release management is in place |
| **Before a major release** | Deep validation — edge cases, role variants, adversarial SR-* fixtures for all `core-flow` skills | Full suite | Manual |

For the conformance tests the commands are:
```bash
pnpm run conformance:run             # shortcut: run suite + update scores in one step
# or individually:
pnpm run test:skill-conformance:ci   # runs all 30 skills, writes skill-conformance-run.json
pnpm run scores:update               # update skill-scores.json + re-render report
```
See `qa/docs/process-manual.md` for the full playbooks (§3.2, §3.4, §3.5).

---

## 10. Immediate next steps

| Priority | What | Why | Task |
|---|---|---|---|
| 1 | Write `criticality` into each SKILL.md frontmatter | Decision made; mechanical update pending. Without it, release gate thresholds aren't machine-readable | B1 |
| 2 | Define release trigger (RC signal) | Regression cadence can't be enforced without it — currently running on sprint-end as interim | B3 |
| 3 | Close validation-error surface gap | 4 skills missing inline validation error test: `backend-api`, `backend-components`, `backend-datamodels`, `frontend-api` | S1 |
| 4 | Extend `backend-queues` E2E coverage | Queue failure and notification-dismissal tests still missing | — |
| ✅ | Skill conformance extended to all 30 skills | 30/30 specs passing | #1748 |
| ✅ | Skill conformance harness + CI integration | `pre-merge-tests.yml` + nightly workflow + PR comment | #1749 |
| ✅ | Generation baseline comparator + 3 pilot baselines | `qa/fixtures/` + `pnpm run generation:compare` | #1757 |
| ✅ | Score updater + exception policy | `pnpm run scores:update`, nightly, PR comment, `conformance-exceptions.json` | #1758 |

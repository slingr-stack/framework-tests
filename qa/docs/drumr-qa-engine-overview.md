# Drumr QA engine — overview

> Meeting reference document · Solution lead + Tech lead review · 2026-06-19

---

## What it is

The **drumr-qa-engine** is an AI-assisted test generation system for apps built on Drumr. Given a set of requirements, it produces ready-to-run Playwright E2E spec files — without manual test writing.

It is not a single script. It is a **pipeline of three sequential stages**, each with a clear input and output contract.

---

## Architecture: the hybrid cognitive split

The system is divided into two cooperating layers:

```
┌──────────────────────────────────────────────────┐
│       COGNITIVE LAYER  (the driver)              │
│  Markdown skill files that teach the LLM         │
│  how to classify, parse, and generate            │
│  qa/drumr-qa-engine.md + qa/agents/skills/       │
└────────────────────────┬─────────────────────────┘
                         │ rules & instructions
                         ▼
┌──────────────────────────────────────────────────┐
│    DETERMINISTIC LAYER  (the engine)             │
│  TypeScript service classes that implement       │
│  the same logic for CLI / CI use                 │
│  qa/agents/qa-workflow/                          │
└──────────────────────────────────────────────────┘
```

Both layers produce identical JSON shapes. The cognitive layer runs through a chat session; the deterministic layer runs programmatically (CLI, GitHub Actions).

---

## The three-stage pipeline

```
Natural language requirements
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Stage 1 — QA Analyst                          │
│  skill: testing-qa-analyst                      │
│  code:  qa-analyst-agent.ts                     │
│                                                 │
│  Input:  user story + acceptance criteria       │
│          (+ optional app metadata)              │
│  Output: QAAnalysisResult  →  saved as          │
│          qa-outputs/<feature>/stage-1-analysis.json │
└───────────────────────┬─────────────────────────┘
                        │
                  human review / approval
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│  Stage 2 — Test generator                      │
│  skill: testing-test-generator                  │
│  code:  qa-test-generator-agent.ts              │
│                                                 │
│  Input:  approved QAAnalysisResult              │
│  Output: QATestGeneratorResult  →  saved as     │
│          qa-outputs/<feature>/stage-2-test-cases.json │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│  Stage 3 — Automation coder                    │
│  skill: testing-automation-coder                │
│  code:  qa-automation-coder-agent.ts            │
│                                                 │
│  Input:  approved QATestGeneratorResult         │
│  Output: QAAutomationCoderResult  →  writes     │
│          apps/<app>/tests/e2e/<Entity>.spec.ts  │
└─────────────────────────────────────────────────┘
```

---

## Stage 1 — QA Analyst in detail

**Purpose:** converts natural-language requirements into structured, traceable testable behaviors with an ambiguity report.

**Key output fields:**

| Field | What it contains |
|---|---|
| `testable_behaviors[]` | One entry per distinct behavior (TB-001, TB-002, …) |
| `ambiguity_report` | Blockers and warnings that require clarification |
| `entity_map` | Entities inferred from requirements |
| `coverage_baseline` | Total behaviors extracted |

**Input modes supported today:**

| Mode | What you supply | How it works |
|---|---|---|
| Standalone | User story + acceptance criteria | Heuristic noun scanning to identify entities |
| Dual (recommended) | + app metadata JSON | Cross-validates behaviors against model fields; flags contradictions |
| GitHub issue | Issue title + body + labels | Parses checklist items as acceptance criteria |
| App codebase | + source path | Scans `@DataModel` / `@Model` decorators live from disk |
| Metadata-only | App metadata alone | Synthesises a baseline CRUD story — useful for brownfield audits |

**Interview mode:** when the analysis surfaces blocker ambiguities, the analyst pauses and conducts a one-question-at-a-time interview with the QA lead before continuing.

---

## Stage 2 — Test generator in detail

**Purpose:** translates each approved `TestableBehavior` into a structured Gherkin test case.

**One behavior → one `TestCaseDefinition`:**

```
TB-001  →  TC-001
           type: positive | negative | boundary | permission
           gherkin: { title, steps: [Given / When / Then / And] }
           preconditions: [...]
           assertions: [...]
```

**Coverage metric** is computed automatically:

```
CoverageMetric {
  totalBehaviors,
  coveredBehaviors,
  percentage,
  uncoveredBehaviors: []   ← behavior ids with no test case
}
```

This stage produces **no code**. It only produces structured JSON. The Gherkin scenarios are the contract passed downstream.

---

## Stage 3 — Automation coder in detail

**Purpose:** compiles each Gherkin `TestCaseDefinition` into a real, runnable Playwright + TypeScript spec file.

**Mandatory pre-generation checks (blocking):**

1. Reads `qa/drumr-test-kit.ts` to confirm method names and signatures — never guesses.
2. Checks for an app-level kit wrapper at `apps/<app>/tests/e2e/framework/drumr-test-kit.ts` — prefers it if present.
3. Runs credential preflight (`E2E_EMAIL`, `E2E_PASSWORD`, etc.) — fails fast if credentials are unavailable; never emits placeholder credentials.

**Output shape:**

```typescript
QAAutomationCoderResult {
  generatedFiles: [
    {
      filePath: "apps/project-management-app/tests/e2e/Task.spec.ts",
      content: "..."   // complete TypeScript spec file
    }
  ]
}
```

Each Gherkin step maps deterministically to a `DrumrTestKit` API call via a fixed translation table (`translateStepsToCode` in `qa-automation-coder-agent.ts`).

---

## How the CI pipeline uses it

```
GitHub issue opened / labeled
         │  (webhook)
         ▼
GitHub Action runner
         │
         │  slingr app:generate --issue=482 --env=staging
         ▼
TypeScript CLI engine
  reads drumr-qa-engine.md as agent entrypoint
         │
         ├── Stage 1 → QAAnalysisResult
         ├── Stage 2 → QATestGeneratorResult
         └── Stage 3 → QAAutomationCoderResult
                  │
                  ▼  writes .spec.ts files
         npx playwright test
                  │
                  ▼  posts diagnostic coverage report
         back to the original GitHub issue
```

---

## Current state

| Area | Status |
|---|---|
| Stage 1 TypeScript engine | Done — `qa-analyst-agent.ts`, all 5 input modes |
| Stage 2 TypeScript engine | Done — `qa-test-generator-agent.ts` |
| Stage 3 TypeScript engine | Done — `qa-automation-coder-agent.ts` |
| Cognitive skills (markdown) | Done for all 3 stages + DOM, Playwright, CI sub-skills |
| End-to-end Jest tests | Done — `qa-workflow.test.ts` covers classification, step mapping, stemming |
| CI integration | Defined in architecture; CI YAML wiring pending |
| Skill conformance suite | PoC delivered for `backend-datamodels` (15/15 tests); 29-skill rollout in progress, average score 92.4 |

**Known gaps:**

- CI YAML wiring for the automated GitHub issue → spec generation loop
- Robustness dimension (R=1 ⚠️) on `backend-workflows` and `backend-queues` skill conformance suites
- 11 `it.todo` items across 8 skills (app-code deviations)

---

## What we are aiming for

1. **Closed-loop automation** — a developer opens or labels a GitHub issue; the engine generates, writes, and runs the spec file with no manual intervention.

2. **Full skill conformance coverage** — all 29 Drumr skills have SR-* conformance tests meeting their tier threshold (≥85 core-flow, ≥75 supporting, ≥65 optional). Average currently at 92.4; gaps in workflow and queue skills remain.

3. **Dual-mode as the default** — every requirement analysis run uses app metadata for cross-validation, eliminating hallucinated entities and contradictory behaviors before test generation begins.

4. **Generation integrity** — beyond checking that app code follows a skill (what we have now), the next stage is verifying that the _output of Copilot generation_ satisfies the skill rules on every run, making skills provably reliable as code-generation contracts.

---

## Skill file map (quick reference)

```
qa/
  drumr-qa-engine.md               ← agent entrypoint
  agents/
    qa-workflow/
      types.ts                     ← shared JSON contracts
      qa-analyst-agent.ts          ← Stage 1 engine
      qa-test-generator-agent.ts   ← Stage 2 engine
      qa-automation-coder-agent.ts ← Stage 3 engine
      qa-workflow.test.ts          ← engine unit tests
    skills/
      testing-qa-analyst/          ← Stage 1 cognitive instructions
      testing-test-generator/      ← Stage 2 cognitive instructions
      testing-automation-coder/    ← Stage 3 cognitive instructions
      testing-dom/                 ← DrumrTestKit API reference
      testing-playwright/          ← Playwright config and debugging
      testing-ci/                  ← CI pipeline integration
      testing-e2e/                 ← E2E developer-facing entrypoint
core/
  skills/
    testing-unit/                  ← unit tests with DrumrUnitTestKit
    testing-integration/           ← integration tests
    testing-e2e/                   ← core E2E rules
```

# Skills QA — Process Manual

> Operational guide for running, interpreting, and extending the QA validation process.
> Full strategy: `qa/docs/skills-validation-strategy-draft.en.md`
> Action points and backlog: `qa/docs/qa-action-points.md`

---

## 1. Quick reference — when does what run?

| When | What runs | How triggered | Command / tool |
|---|---|---|---|
| Every PR (via `/run-tests` comment) | SR-* conformance suite — non-blocking; posts PR comment with failing skill table + per-skill agent links | CI — automatic (`pre-merge-tests.yml`, `skill-conformance` matrix entry, `allow-failure: true`) | `pnpm run test:skill-conformance:ci` |
| Every night at 2am UTC | Full 30-skill conformance suite; Slack alert on failure; artifact retained 90 days | CI — automatic (`nightly-skill-conformance.yml`) | `pnpm run test:skill-conformance:ci` |
| Every push to `develop` | E2E smoke suite (happy paths for all `core-flow` skills) | CI — automatic | Playwright via CI |
| Every sprint end / RC | Full E2E regression + all SR-* conformance tests + per-dimension score report | Manual trigger until release process is in place | See § 3.2 |
| Before a major release | Deep validation — edge cases, role variants, adversarial fixtures | Manual | See § 3.3 |

---

## 2. Environment prerequisites

Before running any test suite, verify:

```bash
# E2E and integration tests require the app running with seeded data
cd apps/project-management-app
docker compose up -d          # starts PostgreSQL only
# run the existing seed-data step used by the workflow
npx drumr run                # starts the application required by Playwright
# after the app is available on localhost:8000, run from frontend/:
npx playwright test           # full E2E run

# Skill conformance tests require no running app
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts \
  --testPathPatterns='tests/unit/skill-conformance' --no-coverage --verbose

# Backend integration tests
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.integration.config.ts

# Backend unit tests
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts \
  --testPathPatterns='tests/unit' --no-coverage
```

**Critical:** always pass `--config config/jest.config.ts` explicitly. Running plain `npx jest` falls back to Babel and breaks TypeScript annotations inside `jest.mock` factories.

---

## 3. Execution playbooks

> **The one-line rule:** skill changes, spec changes, and score changes always move together in the same PR. If a `SKILL.md` changes, the conformance spec and `skill-scores.json` must be updated in that same PR. If only a spec changes (new fixture added, adversarial rule added), the scores must also be updated in the same PR. Never let them drift.

### 3.1 Smoke (every push to `develop`)

**Goal:** quick confidence that critical flows are operational.

1. CI triggers Playwright smoke suite automatically on push.
2. Review results in CI artifacts (Playwright HTML report).
3. If any smoke test fails → **stop, do not merge** → classify failure (see § 4).
4. Expected duration: ≤ 10 minutes for the smoke subset.

Manual trigger:
```bash
cd apps/project-management-app/frontend
npx playwright test --grep @smoke
```

---

### 3.2 Regression (every sprint end / RC)

**Goal:** detect regressions in previously validated behavior.

**Steps:**

1. **Pre-run checklist:**
   - [ ] Staging environment is up with the canonical seed dataset
   - [ ] `skills-audit-result.md` is up to date
   - [ ] No open Sev-0/Sev-1 defects that would make results unreliable

2. **Run E2E regression:**
   ```bash
   cd apps/project-management-app/frontend
   npx playwright test
   ```

3. **Run SR-* conformance tests:**
   ```bash
   cd apps/project-management-app/backend
   TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts \
     --testPathPatterns='tests/unit/skill-conformance' --no-coverage --verbose
   ```

4. **Update SkillScores** (automated via `pnpm run scores:update`):
   - After the conformance run completes, a `skill-conformance-run.json` file is written at the repo root.
   - Run `pnpm run scores:update` to auto-derive C from SR-1/2/3 group results, carry K and R forward, append a new history entry to `skill-scores.json`, and re-render `skill-conformance-report.md`.
   - To preview without writing: `pnpm run scores:update:dry`.
   - To override K or R for a specific skill: `pnpm run scores:update -- --set-k=backend-datamodels=3`.
   - Commit `skill-scores.json` and `skill-conformance-report.md` in the same PR.

5. **Review results:**
   - Any `core-flow` or `supporting` skill below threshold → record in gap backlog.
   - Any E2E failure → classify (§ 4) → assign to owner.

6. **Publish:** share per-dimension score report with framework maintainers.

**`skill-scores.json` schema (current):**
```json
{
  "skills": {
    "backend-datamodels": {
      "priorityClass": "core-flow",
      "specFile": "tests/unit/skill-conformance/backend-datamodels.skill-conformance.spec.ts",
      "history": [
        { "date": "2026-05-14", "release": "develop", "C": 3, "K": 1, "D": 3, "R": 2, "score": 80.0, "fixtures": ["src/dataModels/Project.ts"], "notes": "" }
      ]
    }
  }
}
```

---

### 3.3 Deep Validation (before major releases)

**Goal:** challenge skill behavior under edge conditions and cross-layer interactions.

**Triggered by any of:**
- SkillScore < threshold for its priority class in two consecutive regression runs
- Sev-1 defect resolved requiring deep non-regression validation
- Public contract change for a skill (API signature, fields, error behavior)
- New or refactored skill in a major release

**Steps:**

1. Run the full regression playbook (§ 3.2).
2. For escalated skills additionally run:
   - Role/permission variants
   - Adversarial SR-* fixtures (wrong base class, banned imports)
   - Edge cases and failure boundary scenarios documented in the gap backlog
3. Results feed directly into the release go/no-go decision.

---

### 3.4 Skill Conformance — standalone run (on SKILL.md PR)

**Goal:** verify that a SKILL.md change does not break conformance contracts, and keep scores in sync.

**Steps:**

1. **Run the spec for the changed skill:**
   ```bash
   node scripts/run-skill-conformance.js --skill=<name>
   ```

2. **If tests fail** → the skill now documents a different contract. Open the per-skill agent (`qa/agents/skills/skill-conformance/<skill>-conformance.agent.md`) and run the update flow — it patches the spec to match the new rules. Verify the spec passes before continuing.

3. **Update scores** (always, even if spec did not change — a rule addition or fixture change affects C/R):
   ```bash
   pnpm run conformance:run                    # shortcut: run suite + update scores in one step
   # or individually:
   pnpm run test:skill-conformance:ci          # writes skill-conformance-run.json
   pnpm run scores:update:dry                  # preview
   pnpm run scores:update                      # write skill-scores.json + report
   ```

4. **Commit** `SKILL.md` + spec file + `skill-scores.json` + `skill-conformance-report.md` together in the same PR. Never split them across separate PRs.

---

### 3.5 Exception policy (skill under active development)

**Goal:** suppress regression warnings for a skill that is intentionally in flux, without disabling the whole suite.

**Steps:**

1. Add an entry to `qa/conformance/conformance-exceptions.json`:
   ```json
   {
     "exceptions": [
       { "skill": "backend-datamodels", "reason": "Refactoring tracked in #1234", "expires": "2026-07-01" }
     ]
   }
   ```
2. Commit it. The regression sentinel suppresses warnings for that skill until the expiry date — then warnings resume automatically.
3. Remove the entry once the refactor lands and the spec is updated.

> **Never set `expires` more than one sprint out.** If the refactor takes longer, extend the date explicitly — this forces a conscious check-in rather than silently suppressing warnings indefinitely.

---

## 4. Reading results — decision tree

```
Test fails
│
├─ E2E failure
│   ├─ Reproducible locally?
│   │   ├─ Yes → product defect or test defect
│   │   │   ├─ Is the feature still in the app? → product defect → assign to dev
│   │   │   └─ Feature removed / renamed → test defect (obsolete) → update or remove test
│   │   └─ No (only in CI) → environment issue → check seed data, Docker health, port conflicts
│   └─ Flaky (fails sometimes)?
│       └─ Check for timing dependencies, missing waits → test defect → fix abstraction in DrumrTestKit
│
└─ SR-* conformance failure
    ├─ Check failureClass in skill-conformance-run.json first
    │   ├─ "flaky" → failed first pass, passed rerun; not a regression
    │   │   └─ Recurs across multiple runs? → add to flaky-scenarios.json with owner + remediation plan
    │   ├─ "infra" → spawn error on rerun; environment/tooling issue, not a skill problem
    │   │   └─ Check Node version, Jest config, TS_NODE_PROJECT env var
    │   └─ "deterministic" (or null) → real failure; continue below
    ├─ After a SKILL.md change?
    │   └─ Yes → skill contract changed → update conformance spec in same PR
    └─ No SKILL.md change?
        ├─ Fixture file changed (e.g. Project.ts refactored)?
        │   └─ Yes → fixture drifted from skill → fix fixture or update spec
        └─ Neither changed → investigate framework package mock compatibility
```

---

## 5. Output artifacts

| Artifact | Location | Updated by | Used by |
|---|---|---|---|
| Skills audit + coverage matrix | `qa/conformance/skills-audit-result.md` | QA (after each regression) | All |
| SkillScore history | `qa/conformance/skill-scores.json` | `pnpm run scores:update` (automated) or QA manually with `--set-k`/`--set-r` | Score updater, PR comment step, triage agent (S3) |
| Skill conformance report | `qa/conformance/skill-conformance-report.md` | `pnpm run scores:update` (automated) | Framework maintainers, QA. Now includes a **Stability Trend** section showing the last 5 runs per skill with Δ. |
| Conformance run record | `skill-conformance-run.json` (repo root, ephemeral). CI artifacts: nightly → `nightly-skill-conformance-<sha>-<run_id>` (90 days); PR → `skill-conformance-pr-<sha>-<run_id>` (30 days). Fields: `summary.passRate/failRate/flakyRate`, `drift`, per-skill `failureClass`. | CI after each conformance run | `pnpm run scores:update`, PR comment step, triage agent (S3) |
| Conformance exception list | `qa/conformance/conformance-exceptions.json` | QA manually | Regression sentinel in `run-skill-conformance.js` |
| Flaky scenario tracker | `qa/conformance/flaky-scenarios.json` | QA manually (when CI reports untracked flaky skill) | Flakiness sentinel in `run-skill-conformance.js`; operator triage |
| Playwright HTML report | `apps/project-management-app/playwright-report/` | CI | QA |
| Jest conformance output | stdout / CI logs | CI | QA + framework maintainers |

---

## 6. How to write a new skill conformance spec

### Scope — conformance tests are app-scoped

Skill conformance tests follow the same scoping principle as all other test dimensions: the skill rules live in `core/skills/`, but the conformance evidence (tests + fixtures) lives inside the app.

| Dimension | Where tests live |
|---|---|
| E2E | `apps/<app>/frontend/tests/e2e/` |
| Integration | `apps/<app>/backend/tests/integration/` |
| Unit | `apps/<app>/backend/tests/unit/` |
| **Skill Conformance** | **`apps/<app>/backend/tests/unit/skill-conformance/`** |

This means every framework app that follows Drumr conventions can have its own conformance suite. The SR-* rules come from `core/skills/`; the fixtures are that app's own generated code. The suite is reproducible for any future app.

### Use the skill-conformance-generator agent

Rather than writing specs by hand, use the agents at `qa/agents/skills/skill-conformance/`.
Two agents, two situations:

| Situation | Agent to use | Prompt |
|---|---|---|
| Skill has **no spec yet** | `skill-conformance-generator` | `@skill-conformance-generator generate spec for <skill>` |
| Spec exists, **SKILL.md changed** | per-skill agent (e.g. `backend-actions-conformance`) | `@backend-actions-conformance update spec for backend-actions` |

**Generate mode** (`skill-conformance-generator`):
The agent reads the target `SKILL.md`, locates a real fixture file in the app, produces a complete `.skill-conformance.spec.ts` scaffold, computes the initial SkillScore, and **appends the score entry to `qa/conformance/skill-scores.json`**. After running and verifying the spec passes, two housekeeping steps must be done in the same session:
1. Create the per-skill agent file in `qa/agents/skills/skill-conformance/<skill>-conformance.agent.md` following the pattern of any existing one.
2. Update the coverage index table in `qa/agents/skills/skill-conformance/skill-conformance-generator.agent.md` — flip Spec ⬜ → ✅, set the per-skill agent name, and copy the score from `skill-scores.json`.

**Update mode** (per-skill agent, e.g. `@backend-actions-conformance`):
The agent compares the current `SKILL.md` rules against the existing spec assertions, reports gaps and stale tests, patches the spec, recomputes the SkillScore, and **appends a new history entry to `skill-scores.json`**. Never removes passing tests — only adds missing ones and flags stale ones for human review. See `qa/agents/skills/skill-conformance/README.md` for the full walkthrough.

The manual steps below document what the agents do internally — useful for reviewing generated output or writing specs without agents.

---

Follow this process to replicate the PoC pattern (`backend-datamodels.skill-conformance.spec.ts`) for any other skill.

### Step 1 — Read the skill and identify its contracts

Open `core/skills/<skill-name>/SKILL.md`. For each of the four SR-* categories, note:

| SR-* | What to look for in the skill |
|---|---|
| SR-1 | Which decorator is required? What options/properties does it mandate? What alternatives are explicitly forbidden? |
| SR-2 | Which base class must the generated class extend? |
| SR-3 | What function signatures are documented? What are the return types and behavioral guarantees (accumulate errors, return shape, never throw)? |
| SR-4 | What imports are explicitly forbidden? What library wrapping rules apply? |

### Step 2 — Find an existing fixture

Identify a file in `apps/project-management-app/` that was written following that skill. This is your fixture. It must be real app code, not a test helper.

Examples:
- `backend-datamodels` → `backend/src/dataModels/Project.ts`
- `backend-actions` → `backend/src/actions/<any action file>.ts`
- `backend-services` → `backend/src/services/<any service file>.ts`
- `frontend-form-views` → `frontend/src/<domain>/views/<any CreateView or EditView file>.tsx`

### Step 3 — Create the spec file

```
apps/project-management-app/backend/tests/unit/skill-conformance/<skill-name>.skill-conformance.spec.ts
```

### Step 4 — Set up the framework mock

The mock intercepts the framework package so decorators can be observed:

```typescript
jest.mock('@drumr/framework-backend', () => {
  class MockBaseClass {}

  const captured: { decorated: boolean; options: any; /* other captured state */ } = {
    decorated: false,
    options: undefined,
  };

  function noop(..._args: any[]) {
    return (..._rest: any[]) => undefined;
  }

  const explicit: Record<string, any> = {
    _captured: captured,
    BaseClass: MockBaseClass,       // replace with actual base class name
    // list other named exports the fixture imports:
    AppUser: class {},
    // The key decorator to capture:
    TheDecorator: (opts: any) => (cls: any) => {
      captured.decorated = true;
      captured.options = opts ?? {};
      return cls;
    },
  };

  return new Proxy(explicit, {
    get: (target, prop: string) => (prop in target ? target[prop] : noop),
  });
});
```

**Important notes:**
- Keep captured types simple (`any`, plain object literals). TypeScript type annotations referencing `typeof MockClass` inside `jest.mock` factories break with Babel due to hoisting.
- The `Proxy` catch-all (`noop`) handles any named export the fixture imports that you haven't explicitly declared — this prevents import errors without requiring you to enumerate every export.
- Add `jest.mock` calls for any other internal dependencies the fixture imports (datasources, other models, etc.) using `{ virtual: true }` if they don't exist at test time.

### Step 5 — Import the fixture

After all `jest.mock` calls:

```typescript
import { MyFixtureClass } from '../../../src/<path-to-fixture>';
const mock = jest.requireMock('@drumr/framework-backend') as {
  _captured: { decorated: boolean; options: any };
  BaseClass: new () => object;
};
```

### Step 6 — Write the SR-* describe blocks

```typescript
// SR-1: Decorator contract
describe('SR-1 — @TheDecorator() is used (never @WrongDecorator or undecorated)', () => {
  it('MyFixtureClass is decorated with @TheDecorator()', () => {
    expect(mock._captured.decorated).toBe(true);
  });
  // Add one test per required option documented by the skill
});

// SR-2: Base class
describe('SR-2 — class extends BaseClass', () => {
  it('MyFixtureClass extends BaseClass via prototype chain', () => {
    expect(MyFixtureClass.prototype).toBeInstanceOf(mock.BaseClass);
  });
});

// SR-3: Behavioral contract
describe('SR-3 — <function name> contract', () => {
  // One test per behavioral rule documented by the skill
  // e.g. returns array, accumulates errors, correct shape, doesn't throw
});

// SR-4: Forbidden imports
describe('SR-4 — source file does not import from forbidden libraries', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../../src/<path-to-fixture>.ts'), 'utf8'
  );
  it('does not import from "typeorm" directly', () => {
    expect(source).not.toMatch(/from ['"]typeorm['"]/);
  });
  // Add one test per forbidden import documented by the skill
  it('primary framework import is from "@drumr/framework-backend"', () => {
    expect(source).toMatch(/from ['"]@drumr\/framework-backend['"]/);
  });
});
```

### Step 7 — Run and verify

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts \
  --testPathPatterns='<skill-name>.skill-conformance' --no-coverage --verbose
```

All tests should pass against a well-written fixture. If a test fails:
- The fixture violates the skill rule → fix the fixture (and the corresponding app code), OR
- The skill documents a rule that no existing code follows → the skill needs a correction.

### Step 8 — Score the skill and record it

Once the spec passes, apply the SkillScore formula:

| Dimension | Score |
|---|---|
| Correctness | 3 if SR-1 + SR-2 + SR-3 all present and passing; 2 if two; 1 if one |
| Consistency | 1 (one fixture, the PoC baseline) |
| Determinism | 3 (always, by construction) |
| Robustness | 1 if SR-4 only; 2 if SR-4 + one adversarial fixture |

`SkillScore = (C×0.40 + K×0.20 + D×0.20 + R×0.20) × 33.33`

Compare against the threshold for the skill's priority class (core-flow ≥85, supporting ≥75, optional ≥65). The gap tells you exactly which SR-* group to write next.

**Always append the result to `qa/conformance/skill-scores.json`** before closing the session:

```json
// under skills.<skill-name>.history[]
{
  "date": "YYYY-MM-DD",
  "release": "develop",
  "C": 3,
  "K": 1,
  "D": 3,
  "R": 1,
  "score": 73.3,
  "fixtures": ["src/dataModels/Project.ts"],
  "notes": "Gap: X points to threshold. Next: add second fixture → K 1→2; add adversarial import check → R 1→2."
}
```

If the skill key does not yet exist in `skill-scores.json`, add it with `priorityClass`, `specFile`, and `history: [<entry>]`.
If it already exists, **append** to `history` — never overwrite previous entries.
Both `skill-scores.json` and the coverage index table in `skill-conformance-generator.agent.md` must agree on the latest score.

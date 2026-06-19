# Concepts: Gherkin structure and coverage metrics

## Gherkin scenario structure

Each `TestCaseDefinition.gherkin` is a `GherkinScenario` with a flat `steps` array.

```
Scenario: <descriptive title>
  Given  <precondition — system state before the action>
  When   <actor action>
  Then   <primary expected outcome>
  And    <additional expected outcomes>
  But    <outcomes that must NOT occur (negative guard)>
```

**Step keyword rules:**

| Keyword | Use for |
|---------|---------|
| `Given` | State that must be true before the scenario starts (logged in, data exists) |
| `When` | The single actor action under test |
| `Then` | The primary assertion |
| `And` | Additional assertions or setup continuations |
| `But` | Outcomes that must NOT be true (use for negative/boundary checks) |

Use at most one `When` per scenario. If you need two actions, split into two test cases.

## Mapping from `TestableBehavior` to `GherkinScenario`

Each `TestableBehavior` contributes exactly one `TestCaseDefinition`.

**Step mapping algorithm:**

1. `flowSteps` → translate each step into a `Given`/`When` step in order:
   - Steps describing preconditions (navigation, login, data setup) → `Given` or `And`
   - The decisive actor action (click, submit, enter data) → `When`
2. `expectedOutcomes` → translate each outcome into a `Then`/`And` step
3. For `type: 'negative'` or `type: 'boundary'`: add a `But` step for the inverse guard (e.g., "But the record is not saved")

**Preconditions (`TestCaseDefinition.preconditions`):**

Pull out any `flowSteps` that describe system state (app running, user logged in, entity exists). These go into `preconditions` as plain strings AND appear as the opening `Given` steps in the Gherkin.

**Assertions (`TestCaseDefinition.assertions`):**

Mirror `expectedOutcomes` as plain strings. These are the verification checklist for the coder agent.

## Coverage metric formula

```
percentage = Math.round((coveredBehaviors / totalBehaviors) * 100)
uncoveredBehaviors = behavior ids from QAAnalysisResult.testableBehaviors that have no matching TestCaseDefinition
```

A complete Stage 2 output always has `uncoveredBehaviors: []` unless a behavior was intentionally deferred (must be documented in an ambiguity).

## Test case ID format

IDs must follow `TC-NNN` (zero-padded to 3 digits): `TC-001`, `TC-002`, `TC-010`.
Each `TC-NNN` must map to a `TB-NNN` via `behaviorId`.

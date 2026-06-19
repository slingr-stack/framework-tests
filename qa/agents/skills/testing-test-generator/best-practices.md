# Best practices: Gherkin test case generation

## Traceability is mandatory

Every `TestCaseDefinition.behaviorId` must reference a real `TestableBehavior.id` from the input `QAAnalysisResult`. Orphan test cases (no matching behavior) must not be created.

Keep the `TC-NNN` ↔ `TB-NNN` mapping deterministic: `TC-001` → `TB-001`, `TC-002` → `TB-002`, etc. This ensures downstream tools can join on these IDs without a lookup table.

## One scenario per behavior

Generate exactly one `TestCaseDefinition` per `TestableBehavior`. Do not split a behavior into multiple test cases or merge behaviors into a single test case.

If a behavior contains too many steps to fit a single scenario cleanly, the behavior should have been split at Stage 1 (analyst). Flag it as a `warning` ambiguity rather than silently splitting it here.

## Precondition discipline

Separate setup from action. Preconditions are conditions the test assumes are already true when the test starts:

- "User is authenticated" → precondition
- "At least one project exists" → precondition
- "User navigates to the task list" → first `Given` step (navigation is still an action, not a state)

Do not bury preconditions inside `When` steps. Surface them explicitly so the coder agent can implement `beforeEach` setup correctly.

## Assertions must be verifiable

Each assertion in `TestCaseDefinition.assertions` must describe an observable UI state, not internal system behavior:

- ✅ "A success notification 'Task created' is visible"
- ✅ "The new task appears in the task list"
- ❌ "The database persisted the record" (not observable in E2E)
- ❌ "The backend returned 201" (belongs in integration tests)

## Negative and boundary guards

For `type: 'negative'` or `type: 'boundary'` test cases, always include a `But` step asserting the disallowed outcome did NOT occur:

- `But the task is not saved to the list`
- `But no success notification is shown`

This prevents false positives where the test passes because an assertion was never reached.

## Do not invent behaviors

Do not add test cases for behaviors not present in `QAAnalysisResult.testableBehaviors`. If a gap is identified during generation, surface it as an ambiguity and halt — do not auto-expand scope.

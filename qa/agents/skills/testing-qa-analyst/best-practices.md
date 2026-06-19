# Best Practices: QA Requirements Analysis

> Traceability, acceptance criteria quality, and interview discipline for the analyst stage.

---

## Traceability

Every testable behavior must trace back to one or more acceptance criteria. This traceability enables:
- Coverage calculation: $\text{Coverage \%} = \text{round}\left( \frac{\text{Covered Behaviors}}{\text{Total Behaviors}} \times 100 \right)$
- Gap detection before any automation code is committed
- Change impact: when a requirement changes, affected behaviors are immediately identifiable

### Traceability mapping

Each `TestableBehavior` includes a reference to the source acceptance criterion index. This mapping is preserved in `QAAnalysisResult.testableBehaviors[n].sourceIndex`.

---

## Acceptance Criteria Quality

When analyzing criteria, flag these quality issues as `info` or `warning` ambiguities:

| Issue | Severity | Example |
|-------|----------|---------|
| Missing actor | `info` | "Can delete projects" — who? |
| Vague quantifier | `warning` | "Can have many tasks" — how many? |
| Dual responsibility | `info` | One criterion specifies both happy path and error — split it |
| Implicit prerequisite | `warning` | "Can edit a task" — requires a task to exist first |
| Non-testable outcome | `blocker` | "System should be fast" — no measurable assertion |

---

## Interview Discipline

When blockers or critical warnings are raised, conduct a focused interview before continuing. Rules:

1. **One question per turn** — never batch multiple questions.
2. **Stop the analysis** until the blocker is resolved.
3. **Use `#tool:vscode/askQuestions`** to collect the answer.
4. **Document the resolution** as an assumption in the analysis output.
5. **Resume analysis** only after all blockers are cleared.

Never invent answers to blockers or proceed with unresolved assumptions that would produce incorrect test cases.

---

## Dual Mode Validation

When app metadata is provided, validate each behavior against the schema:

| Check | What to look for |
|-------|-----------------|
| Field existence | Criterion references a field → confirm field exists on target model |
| Action existence | Criterion references a non-CRUD verb → confirm action is registered |
| State field | Status-transition behavior → confirm model has a status/state field |
| Permission scope | Role-based criterion → confirm roles are declared in the app |

Missing entries generate `warning` ambiguities — they are not blockers unless the entire behavior is unreachable.

---

## Output Completeness

A complete `QAAnalysisResult` must include:
- All testable behaviors (one per acceptance criterion, minimum)
- An ambiguity report for every detected issue (even `info` level)
- A business flow grouping of related behaviors
- A risk report summarizing the highest-risk behaviors (permission and boundary types)
- A coverage metric

Incomplete outputs must not be handed off to the test generator stage.

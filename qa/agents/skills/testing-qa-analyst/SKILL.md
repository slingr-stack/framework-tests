# Skill: testing-qa-analyst

> Scope, routing, and prompts for requirements analysis, testable behavior extraction, and ambiguity detection — the analyst stage of the QA pipeline.

## Scope

This skill covers Stage 1 of the QA pipeline: converting natural-language requirements into structured, traceable testable behaviors with an ambiguity report. It can be invoked standalone or as the first step before test generation.

| Topic | File |
|-------|------|
| Testable behavior analysis and ambiguity detection theory | [concepts.md](./concepts.md) |
| Traceability, acceptance criteria quality, and interview discipline | [best-practices.md](./best-practices.md) |
| Sample analysis outputs (`QAAnalysisResult` JSON) | [examples.md](./examples.md) |

---

## Task Routing

### Analyze requirements (standalone)

Input: user stories + acceptance criteria (+ optional app metadata JSON).
Output: `QAAnalysisResult` saved to a JSON file.

1. Read [concepts.md](./concepts.md) — understand behavior extraction and classification.
2. Read [best-practices.md](./best-practices.md) — apply traceability and interview discipline.
3. Apply dual mode if app metadata is provided (cross-validate behaviors against model fields and actions).
4. Produce the structured output (see [examples.md](./examples.md)).
5. Save the result as `qa-outputs/<feature>/stage-1-analysis.json`.

### Analyze requirements before test generation

When the user wants to go all the way from requirements to specs:

1. Run this skill first (analyst stage).
2. Hand off `QAAnalysisResult` to `testing-qa-analyst` (self — review ambiguities with the user).
3. Then invoke `../testing-e2e/SKILL.md` for spec generation using the approved behaviors.

---

## Usage Modes

### Standalone mode (requirements only)

Triggered with just user stories and acceptance criteria. Uses heuristic noun scanning to identify target models.

### Dual mode (requirements + app metadata) — recommended

Triggered with both requirements and application metadata JSON. Enables cross-validation:
- Warning if a status-transition behavior is requested on a model with no state fields
- Warning if an action verb (assign, archive, export) has no matching registered action
- Warning if a referenced field does not exist on the target model

### Interview mode

When blockers or critical warnings are raised, the analyst suspends the analysis and launches a clarifying interview with the QA lead before continuing. Use `#tool:vscode/askQuestions` to conduct the interview one question at a time.

---

## Output

Save analysis output to:

```
qa-outputs/<feature>/
  stage-1-analysis.json     ← QAAnalysisResult
```

At the end of the analysis session, remind the user to save the JSON and review ambiguities before proceeding to test generation.

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

All modes normalise into a `RequirementRequest` before analysis runs. Use `runQaAnalystAgentFromInput(input)` for any source-based mode; use `runQaAnalystAgent(request)` only when you already hold a `RequirementRequest`.

### Standalone mode

Input: `{ kind: 'standalone', userStory, acceptanceCriteria }`.
Uses heuristic noun scanning to identify target models. No cross-validation.

### Dual mode (recommended)

Input: `{ kind: 'standalone', userStory, acceptanceCriteria, appMetadata }`.
Enables cross-validation: flags missing state fields, undeclared custom actions, and entities referenced in criteria that are absent from the metadata.

### GitHub issue mode

Input: `{ kind: 'github-issue', issue: { title, body, labels? }, appMetadata? }`.
The adapter extracts the user story from the first "As a …" sentence in the body (falls back to the issue title) and acceptance criteria from checklist items (`- [ ] …`) or numbered/bulleted list items under an "Acceptance Criteria" / "AC" section. Combine with `appMetadata` to get dual-mode cross-validation.

### App codebase mode

Input: `{ kind: 'app-codebase', sourcePath, userStory, acceptanceCriteria }`.
The adapter scans the given directory for TypeScript source files and extracts entity/model class declarations (decorated with `@Entity`, `@DataModel`, `@Model`) and action registrations (`@GlobalAction`, `@ModelAction`, `@ObjectAction`, …). The extracted schema is used as `appMetadata` for full dual-mode cross-validation. Requirements must still be supplied explicitly.

### Metadata-only mode

Input: `{ kind: 'metadata-only', appMetadata, focusArea? }`.
No user story or acceptance criteria required. The adapter synthesises a baseline CRUD user story and one positive criterion per entity plus one per registered custom action. Useful for brownfield audit passes or full-app coverage baselines.

### Interview mode

Triggered automatically when the analysis surfaces `blocker` ambiguities. The analyst suspends processing and conducts a one-question-at-a-time interview with the QA lead using `#tool:vscode/askQuestions` before continuing.

---

## Output

Save analysis output to:

```
qa-outputs/<feature>/
  stage-1-analysis.json     ← QAAnalysisResult
```

At the end of the analysis session, remind the user to save the JSON and review ambiguities before proceeding to test generation.

# Skill: testing-test-generator

> Stage 2 of the QA pipeline. Consumes an approved `QAAnalysisResult` (Stage 1) and produces a `QATestGeneratorResult` with Gherkin test cases and a coverage metric.

## Scope

- **Input:** `QAAnalysisResult` (from `qa-outputs/<feature>/stage-1-analysis.json`)
- **Output:** `QATestGeneratorResult` (saved to `qa-outputs/<feature>/stage-2-test-cases.json`)
- **Language:** JSON structured output — no Playwright code, no TypeScript spec files
- **This skill does NOT generate E2E spec code.** That is handled downstream by the coding stage (see `testing-e2e/`).

## Skill file map

| File | Purpose |
|------|---------|
| `SKILL.md` | This file — scope, routing, output contract |
| `concepts.md` | Gherkin structure, step mapping, coverage formula |
| `best-practices.md` | Traceability, precondition discipline, one scenario per behavior |
| `examples.md` | Sample `QATestGeneratorResult` JSON matching `types.ts` shapes |

## Task routing

### Generate test cases from an analysis result
1. Read this file — confirm input/output contract
2. Read `concepts.md` — learn Gherkin structure and step mapping from `flowSteps`/`expectedOutcomes`
3. Read `best-practices.md` — traceability rules and precondition guidance
4. Load `qa-outputs/<feature>/stage-1-analysis.json` — the approved `QAAnalysisResult`
5. Produce one `TestCaseDefinition` per `TestableBehavior`
6. Compute `CoverageMetric` from the behavior count
7. Save result to `qa-outputs/<feature>/stage-2-test-cases.json`

## Output contract (`QATestGeneratorResult`)

Defined in `qa/agents/qa-workflow/types.ts`:

```typescript
interface QATestGeneratorResult {
  id: string;            // UUID
  analysisId: string;    // References QAAnalysisResult.id
  testCases: TestCaseDefinition[];
  coverage: CoverageMetric;
  generatedAt: string;   // ISO 8601
}

interface TestCaseDefinition {
  id: string;            // TC-001, TC-002, ...
  behaviorId: string;    // References TestableBehavior.id (TB-001, ...)
  title: string;
  type: 'positive' | 'negative' | 'boundary' | 'permission';
  gherkin: GherkinScenario;
  preconditions: string[];
  assertions: string[];
}

interface GherkinScenario {
  title: string;
  steps: GherkinStep[];  // { keyword, text } where keyword ∈ Given|When|Then|And|But
}

interface CoverageMetric {
  totalBehaviors: number;
  coveredBehaviors: number;
  percentage: number;
  uncoveredBehaviors: string[];  // behavior ids with no test case
}
```

See `examples.md` for a complete sample output.

# Skill: testing-automation-coder

> Stage 3 of the QA pipeline. Consumes an approved `QATestGeneratorResult` (Stage 2) and produces fully compilable, DOM-agnostic Playwright + TypeScript spec files (`QAAutomationCoderResult`).

## Scope

- **Input:** `QATestGeneratorResult` (from `qa-outputs/<feature>/stage-2-test-cases.json`)
- **Output:** `QAAutomationCoderResult` containing ready-to-run `.spec.ts` file content
- **Language:** TypeScript — emits actual Playwright spec code using `DrumrTestKit`
- **This skill does NOT generate JSON.** Output is TypeScript test files.

## Skill file map

| File | Purpose |
|------|---------|
| `SKILL.md` | This file — scope, mandatory preflight, output contract |
| `concepts.md` | Gherkin-to-Playwright translation rules, step mapping |
| `best-practices.md` | Import discipline, kit inspection, compile hygiene |
| `examples.md` | Sample generated `.spec.ts` file from a `QATestGeneratorResult` |

## Mandatory pre-generation steps (blocking)

1. **Read `qa/drumr-test-kit.ts`** — confirm which methods exist and their exact signatures. Never guess method names.
2. **Check for an app-level kit wrapper** at `apps/<app-name>/frontend/tests/e2e/framework/drumr-test-kit.ts`. If it exists, prefer it over the shared kit — it may extend or override methods.
3. **Read the `QATestGeneratorResult`** from `qa-outputs/<feature>/stage-2-test-cases.json`.
4. **Run credential preflight** — check `E2E_EMAIL`, `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`. Do not emit auth-required spec code before preflight resolves.

## Task routing

### Generate E2E spec files from a test generator result
1. Read this file — confirm mandatory preflight
2. Read `concepts.md` — learn Gherkin-to-Playwright translation rules
3. Read `best-practices.md` — import style, compile hygiene
4. Complete mandatory pre-generation steps above
5. Map each `TestCaseDefinition` to a `test(...)` block inside one grouped `test.describe(...)`
6. Return `QAAutomationCoderResult` or write spec files to `apps/<app-name>/frontend/tests/e2e/`

## Output contract (`QAAutomationCoderResult`)

Defined in `qa/agents/qa-workflow/types.ts`:

```typescript
interface QAAutomationCoderResult {
  id: string;           // UUID
  generatorId: string;  // References QATestGeneratorResult.id
  generatedFiles: {
    filePath: string;   // e.g. "apps/project-management-app/frontend/tests/e2e/Task.spec.ts"
    content: string;    // Complete TypeScript spec file content
  }[];
  generatedAt: string;  // ISO 8601
}
```

See `examples.md` for a complete sample output.

## Deterministic step mapping

The TypeScript step-to-API mapping table lives in `qa/agents/qa-workflow/qa-automation-coder-agent.ts` (`translateStepsToCode`). If you extend the step vocabulary in the analyst stage (`ACTION_STEP_MAP` in `qa-analyst-agent.ts`), you MUST add corresponding entries there too.

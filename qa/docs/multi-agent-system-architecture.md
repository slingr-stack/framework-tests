# Architecture guide: the hybrid cognitive machine

This guide details the end-to-end architecture, dual-execution models, and metadata-driven compilation workflows powering the Drumr multi-agent generation and QA framework.

---

## 1. Architectural core: the hybrid cognitive split

To achieve predictable execution alongside fluid AI generation capacity, we divide our system into two isolated, cooperative layers:

```
┌──────────────────────────────────────────────┐
│        COGNITIVE LAYER (The Driver)          │
│  - Configuration Blueprints under .github/   │
│  - Prompts instructions teaching LLMs        │
└──────────────────────┬───────────────────────┘
                       │ Rules & Instructions
                       ▼
┌──────────────────────────────────────────────┐
│      DETERMINISTIC LAYER (The Engine)        │
│  - Core TS service layers under qa/agents/   │
│  - Exact calculations, CLI scripts, & Tests  │
└──────────────────────────────────────────────┘
```

1. **Deterministic TypeScript (The Engine):** Houses exact structures, math estimations, file transactions, local sandbox unit tests, and programmatic REST API triggers.
2. **Cognitive Markdown (The Driver):** Standardised directives living under [.github/agents/](../../.github/agents/) that direct LLM agents (like Claude) how to classify, parse, and operate on requirements.

The TypeScript engine reads the Cognitive prompt file from disk directly, passes it as a safe system instruction payload to the LLM backend with the requirement prompt, and consumes the predictable JSON response.

---

## 2. Dual execution modes

The Agentic QA loop supports two standalone execution pipelines depending on what is being analyzed:

### Mode A: Standalone mode (heuristic requirements analysis)
* **Trigger:** Invoked with only the `userStory` and `acceptanceCriteria` parameters. No pre-existing app metadata is supplied.
* **Mechanism:** The agent runs fallback parser algorithms that scan the natural language lines for mid-sentence capitalized nouns to isolate target system entities and procedurally compile flow steps based on verb heuristics.

### Mode B: Dual mode (cross-examination matrix) [Recommended]
* **Trigger:** Invoked with both natural language requirements and the `appMetadata` schema blueprint.
* **Mechanism:** The agent performs cross-examinations. It maps acceptance steps to physical model fields, verifying structural feasibility and throwing warning alerts if there are logical contradictions (e.g. requesting archiving functions on a model that lacks a `status` tracking field).

---

## 3. Metadata sourcing channels

The application metadata blueprint (`appMetadata`) is obtained programmatically via one of two channels:

```
             ┌────────────────────────────────────────────────────────┐
             │                     appMetadata                        │
             └───────────────┬────────────────────────┬───────────────┘
                             │                        │
                             ▼                        ▼
                   [ Channel 1: Greenfield ]     [ Channel 2: Brownfield ]
                   - Dev agent JSON spec         - Scans @DataModel decorated files
                   - Pre-code feasibility gate   - Compiles active runtime schema
```

### Channel 1: Greenfield / AI-generated blueprints (design agents)
When creating a brand-new application from scratch, code files on disk do not exist yet.
1. **The Generator Trigger:** The developer inputs a master prompt to Dev Design Agents (such as `backend-design-agent.ts` or `frontend-design-agent.ts`).
2. **Metadata Generation:** These agents collaborate to export an abstract, declarative JSON mapping specifying models, relationship boundaries, and view properties, skipping final code generation.
3. **QA Analyst Feed:** This JSON is fed as the application profile directly into the QA Analyst Agent, allowing it to blueprint and validate testable steps before any final TS code compile step triggers.

### Channel 2: Brownfield / existing applications (codebase extraction)
For applications that are already written and live on disk (like the [apps/project-management-app](../../apps/project-management-app) directory), the metadata is extracted from live source decorators:
1. **Model Decorator Parsing:** A CLI parser utility parses TypeScript entities decorated with `@DataModel()` and extracts fields, types, and validation hooks.
2. **Framework Metadata API:** The core runtime compiles active code-declaration structures on the fly utilizing standard programmatic APIs (such as [core/frontend/src/app/BaseFrontendApp.ts](../../core/frontend/src/app/BaseFrontendApp.ts#L65) on the client side and [core/backend/src/graphql/SchemaBuilder.ts](../../core/backend/src/graphql/SchemaBuilder.ts#L151) on the server side).
3. **JSON Serialization:** The compiled active application models are mapped into a standardized JSON structure conforming to the `AppMetadata` specification and passed directly to the planning QA agents.

---

## 4. The CI/CD & CLI GitHub automation pipeline

When developers assign an application ticket on GitHub, the engine runs an automated, closed-loop compilation and verification run:

```
 [ Platform UI / GitHub Issue ] ──(Web Hook)──► [ GitHub Action Runner ]
                                                        │
                                                        ▼
                                           [ TypeScript CLI Engine ] ◄── Reads ── [ qa/drumr-qa-engine.md ]
                                                        │                            + qa/agents/skills/testing-qa-analyst/
                                                        │                            + qa/agents/skills/testing-test-generator/
                                                        │                            + qa/agents/skills/testing-e2e/
                                                        ├──► Stage 1: testing-qa-analyst skill
                                                        │         └─► QAAnalysisResult (JSON)
                                                        │
                                                        ├──► Stage 2: testing-test-generator skill
                                                        │         └─► QATestGeneratorResult (JSON)
                                                        │
                                                        ├──► Stage 3: testing-e2e skill
                                                        │         └─► QAAutomationCoderResult (JSON)
                                                        │
                                                        ▼
                                           [ Validates & Writes spec.ts Code Files ]
                                                        │
                                                        ▼
```

### The step-by-step GitHub lifecycle
1. **The Trigger Event:** A designer opens or labels a GitHub Issue containing requirements as checkboxes. Webhooks capture this and fire a GitHub Action runner.
2. **Script Initialisation:** The runner starts the local CLI engine:
   `slingr app:generate --issue=482 --env=staging`
3. **Cognitive Load — Stage 1:** The TypeScript CLI loader opens the issue parameters, reads [qa/drumr-qa-engine.md](../../qa/drumr-qa-engine.md) as the agent entrypoint and routes to [qa/agents/skills/testing-qa-analyst/SKILL.md](../../qa/agents/skills/testing-qa-analyst/SKILL.md) for the analyst stage. The LLM returns a structured JSON payload conforming to `QAAnalysisResult`.
4. **Structured Assessment — Stage 1:** The LLM returns a structured JSON payload conforming to `QAAnalysisResult`.
5. **Cognitive Load — Stage 2:** The CLI feeds the `QAAnalysisResult` into the next agent pass using the same `drumr-qa-engine` entrypoint, routing internally to the test generator skill. The LLM returns a `QATestGeneratorResult` containing traced `TestCaseDefinition` records, Gherkin scenarios, and a `CoverageMetric`.
6. **Cognitive Load — Stage 3 (Test Code Generation):** The CLI feeds the Gherkin scenarios (`QATestGeneratorResult`) into the `drumr-qa-engine` agent routing to [qa/agents/skills/testing-e2e/SKILL.md](../../qa/agents/skills/testing-e2e/SKILL.md), compiling the spec steps cleanly into code strings.
7. **Deterministic Integration Playbook:** Our CLI engine parses the final `QAAutomationCoderResult` JSON, writes the executable `.spec.ts` files of the project, and boots up our standard automation runners:
   `npx playwright test`
8. **Unified Issue Report:** The execution log passes outputs directly to an analyzer, classification results are formulated, and the CLI posts a comprehensive passing comment complete with diagnostic coverage graphs back onto the original GitHub Issue, ready for human verification.

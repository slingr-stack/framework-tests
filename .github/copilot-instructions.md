---
excludeAgent: "code-review"
---

# Drumr monorepo – Copilot instructions

## Repository purpose and structure
- Drumr is a TypeScript monorepo explicitly designed to build "smart" enterprise applications. It operates as a model-driven platform that heavily abstracts backend infrastructure, allowing developers to focus purely on solving business problems rather than managing boilerplate code.
It includes framework runtime, app examples, and CLI tooling.
- `/core`: core framework (models, actions, GraphQL, datasources, UI library).
- `/apps`: sample/real Drumr apps used for integration and usage patterns.
- `/cli`: `drumr` command tooling, templates, generators, scripts.

## Essential commands

### Root level
```bash
npm run install:all                            # Install all packages
npm run build:all                              # Build all packages
npm run build:framework                        # Build just the framework package
npm run build:cli                              # Build just the CLI package
npm test                                       # Run all tests
npm run test:framework                         # Run framework Jest tests
npm run test:cli                               # Run CLI Mocha tests
npm run lint                                   # Lint with zero warnings required
npm run format                                 # Format with Prettier
npm run check-conventions                      # Check branch changes against develop
npm run check-conventions -- --path=<prefix>   # Scope checks to a path prefix
npm run check-conventions -- --all             # Check all tracked files
```


## Tech stack context
When generating framework backend and frontend code, primarily use these underlying libraries:

- **Backend:**
  - **Persistence/migrations:** TypeORM 0.3.x (typeorm@0.3.28)
  - **GraphQL server:** Apollo Server 5.x (@apollo/server@5.4.0), Pothos 4.x (@pothos/core@4.12.0, schema builder)
  - **Stateful workflows:** @dbos-inc/dbos-sdk 4.x (4.11.11), @dbos-inc/typeorm-datasource 4.x
  - **Validation/serialization:** class-validator 0.14.x (0.14.4), class-transformer 0.5.x (0.5.1)
  - **Dependency injection:** tsyringe 4.x (4.10.0), reflect-metadata 0.2.x (0.2.2)
  - **HTTP server:** Express 5.x (5.2.1)
  - **Authorization:** @casl/ability 6.x (6.8.0)
  - **Authentication:** jsonwebtoken 9.x (9.0.3), bcryptjs 3.x (3.0.3), passport-jwt 4.x, express-jwt 8.x
  - **File uploads:** multer 2.x (2.1.1)
  - **Logging:** Winston 3.x (3.19.0), winston-daily-rotate-file 5.x
  - **Utilities:** uuid 9.x (9.0.1), dayjs 1.x, cron-parser 5.x, dotenv 16.x

- **Frontend:**
  - **UI framework:** React 18.3.x (18.3.1), React DOM 18.3.x
  - **UI components/layouts:** Ant Design 6.x (antd@6.3.2), @ant-design/pro-components 3.x (3.1.10), @ant-design/icons 6.x (6.1.0)
  - **Styling/theming:** antd-style 4.x (4.1.0)
  - **GraphQL client:** Apollo Client 4.x (@apollo/client@4.1.2), graphql 16.x (16.12.0)
  - **Build/routing:** @umijs/max 4.x (4.6.32)
  - **Utilities:** dayjs 1.x (1.11.19)

## Domain-specific architectural rules
Do not guess architectural patterns.

Before generating code, answering architectural questions, or extending framework classes, Copilot MUST:
1. Read `/core/skills/README.md` first (master skills index).
2. Identify the exact domain of the prompt (backend, frontend, testing, CLI, workflow, etc.).
3. Open and read the specific skill file(s) referenced by the index for that domain.
4. **Multi-Skill Resolution (CRITICAL):** If a request involves multiple components/domains (for example: Datasource + DataModel + Action), identify and read **ALL** relevant skill files before writing a single line of code. Do not stop at the first match.
5. Base the final answer and code changes only on those skill instructions and existing repo patterns.
6. **Skill maintenance (CRITICAL):** After completing code changes, perform two checks:
   - **Direct mapping:** check whether any modified file path matches a path listed under `metadata.applies-to` in any `SKILL.md` you already read in steps 1–3. If it does, review and update that skill.
   - **Semantic impact:** reason about whether the change introduces new patterns, APIs, or behaviors that could affect skills *beyond* those directly mapped — for example, a new action pattern may also require updating testing skill guidance even if no test-kit file was modified. If so, read and update those skills too.
   Skipping this step triggers the S8 convention warning.

Domain routing workflow:
- **Data models & persistence:** Use `/core/skills/README.md` to locate and read the backend data-model and persistence skills before editing model or datasource code.
- **Actions, API, and workflows:** Use `/core/skills/README.md` to locate and read backend action/API/workflow skills before implementing business logic.
- **UI and views:** Use `/core/skills/README.md` to locate and read frontend UI/view skills before editing React/layout/view code.
- **CLI tooling:** Use `/core/skills/README.md` to locate and read CLI skills before changing command/template/project-structure code.

## Custom agents and skills

### Agents (`.github/agents/`)
Specialized instruction sets for focused tasks. In Copilot Chat, reference them explicitly with `#<filename>`. Claude Code can load them as context when directed.

| Agent file | Purpose |
|---|---|
| `framework-architect.md` | Architecture and design questions for `core/` |
| `drumr-test-runner.md` | Run, write, and debug Jest tests in `core/` |
| `cli-architect.md` | Architecture and design questions for `cli/` |
| `cli-test-runner.md` | Run, write, and debug Mocha tests in `cli/` |
| `framework-qa-engine.md` | Generate Playwright E2E tests using the DrumrTestKit abstraction |

### Skills
Skills are the primary source of implementation guidance and replace static documentation workflows.

Mandatory skills process:
1. Always start by reading `/core/skills/README.md`.
2. Use it as the canonical index to find the exact skill file(s) for the user request.
3. Read the target skill file(s) in full before producing code or architecture guidance.
4. **Multi-Skill Resolution (CRITICAL):** If a prompt spans multiple domains/components, read all relevant skill files in full before generating code. Never stop at the first matched skill.
5. Reconcile constraints from all selected skills and apply the strictest applicable guidance.
6. If no matching skill exists, explicitly state the gap and proceed conservatively using nearby repo patterns without inventing new architecture.

Skills usage expectations:
- Treat skill files as authoritative for patterns, APIs, conventions, and examples.
- Reuse existing helpers and established patterns referenced by skills.
- Do not bypass the skills index by guessing file paths or relying on memory only.
- When proposing new patterns, ensure they do not conflict with skill guidance.

## Answering guidelines
- Always clarify scope first with `#askQuestions` before writing code.
- Prefer examples that reuse existing helpers, skills, and repo patterns.
- Keep suggestions aligned with current architecture and folder responsibilities.
- When explaining changes, reference the relevant skill(s) and existing repo patterns instead of inventing parallel approaches.

## Maintenance and indexing
- If new skills, helpers, patterns, or workflows are added, remind contributors to update `/core/skills/README.md` and any related skill links in the same PR.
- Keep skill index links and instruction references valid and synchronized.

## Class API Reference — Overridable Methods and Fields

When generating code that extends framework base classes, only use public methods and fields documented by the relevant skill content. Do NOT suggest private or internal members.

Class API lookup process (mandatory):
1. Identify which base class(es) the prompt touches.
2. Read `/core/skills/README.md`.
3. From the index, locate and read the exact skill file(s) that define extension rules and allowed APIs for those classes.
4. Implement/answer using only those documented, public extension points.

Typical class-to-domain mapping (resolve through the skills index before answering):
- `BaseDataModel`: backend data models and persistence skills.
- `GlobalAction`, `ModelAction`, `ObjectAction`: backend actions and API skills.
- `GlobalWorkflowAction`, `ModelWorkflowAction`, `ObjectWorkflowAction`, `BaseQueue`: backend workflow/queue skills.
- `BaseLayout`, `CustomViewComponent`, `TableViewComponent`, `CreateViewComponent`, `EditViewComponent`, `ReadViewComponent`, `ActionViewComponent`: frontend UI/view skills.

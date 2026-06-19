# Skill: testing-e2e

> Entrypoint for all E2E test generation, structure, and maintenance tasks using Playwright and DrumrTestKit.

## Scope

This skill covers writing, generating, structuring, and maintaining E2E tests for any Drumr application. It routes to three supporting files for depth on specific topics.

| Topic | File |
|-------|------|
| Core philosophy and DOM-agnostic rules | [concepts.md](./concepts.md) |
| Naming, structure, credential preflight, timeout strategy | [best-practices.md](./best-practices.md) |
| Drawer-based and page-based CRUD examples | [examples.md](./examples.md) |
| DrumrTestKit API and selector internals | `../testing-dom/SKILL.md` |
| Playwright config and debugging | `../testing-playwright/SKILL.md` |
| CI pipeline integration | `../testing-ci/SKILL.md` |

---

## Task Routing

### Generate a new E2E test spec

1. Read [concepts.md](./concepts.md) — understand the DOM-agnostic contract before writing a single line.
2. Read [best-practices.md](./best-practices.md) — apply naming, structure, and credential preflight rules.
3. Read `../testing-dom/SKILL.md` — use the DrumrTestKit API reference to select the right kit methods.
4. Read the app's live `drumr-test-kit.ts` — use the concrete API present in the repo, not a speculative one.
5. Reference [examples.md](./examples.md) — match the drawer or page pattern to the entity's ReadView type.
6. Run credential preflight as a mandatory blocking step (see [best-practices.md](./best-practices.md) §Credential Preflight).

### Refactor a test that uses raw Playwright selectors

1. Read [concepts.md](./concepts.md) — understand why raw selectors are prohibited.
2. Read `../testing-dom/SKILL.md` — locate the correct kit method for each interaction.
3. If no kit method exists for the interaction, add it to `drumr-test-kit.ts` first, then use it in the spec.

### Debug a failing E2E test

1. Read `../testing-playwright/SKILL.md` — common failure patterns and debug workflow.
2. Cross-reference `../testing-dom/SKILL.md` — check framework rendering conventions for the failing element.

### Set up E2E in CI

1. Read `../testing-ci/SKILL.md` — pipeline commands, artifact collection, GitHub Actions template.

---

## Input Variables for Test Generation

| Variable | Description | Example |
|----------|-------------|---------|
| `{ENTITY_NAME}` | Display name of the entity | `Tasks`, `Projects` |
| `{ENTITY_ROUTE}` | URL path to the entity list | `/tasks`, `/projects` |
| `{FIELDS}` | List of fields with types | `name (text), status (select), project (reference)` |
| `{VIEW_CONTAINER}` | How ReadView opens | `drawer` or `page` |
| `{ACTIONS}` | Custom entity actions (if any) | `Assign Task (params: assignee)` |

---

## Output Persistence

After generating E2E spec files, save them to:

```
apps/<app-name>/frontend/tests/e2e/
  <entity>-crud.spec.ts
  framework/drumr-test-kit.ts   ← only if kit methods were added
```

At the end of each generation session, remind the user to save the generated files and commit them to the repository.

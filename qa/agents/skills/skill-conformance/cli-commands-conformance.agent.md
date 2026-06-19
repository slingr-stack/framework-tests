---
name: cli-commands-conformance
description: >
  SR-* conformance agent for the cli-commands skill.
  Runs, updates, and interprets cli-commands.skill-conformance.spec.ts.
  Delegates to skill-conformance-generator for full scaffold regeneration.
tools:
  - read_file
  - file_search
  - grep_search
  - replace_string_in_file
  - run_in_terminal
---

# cli-commands Conformance Agent

**Skill:** `core/skills/cli-commands/SKILL.md`
**Spec:** `apps/project-management-app/backend/tests/unit/skill-conformance/cli-commands.skill-conformance.spec.ts`
**Score:** 93.3 (optional, threshold 65 ✅)
**Tests:** 53 passing, 0 todos

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='cli-commands.skill-conformance' \
  --no-coverage --verbose
```

## Fixtures

| Fixture | Role |
|---|---|
| `cli/src/commands/create-app.ts` | `database`/`description`/`templates`/`skip-setup` flags; oclif `Args`+`Flags` pattern |
| `cli/src/commands/run.ts` | `prod`/`ui-only`/`backend`/`skip-infra`/`verbose` flags; `exclusive:` groups |
| `cli/src/commands/ds.ts` | `load`/`reset`/`indexes` actions; `includeModels`/`excludeModels` flags |
| `cli/src/commands/debug.ts` | `inspect-brk`/`inspect-port`/`skip-infra` flags |
| `cli/src/commands/build.ts` | `skip-metadata`/`skip-backend`/`skip-frontend`/`verbose` flags |
| `cli/src/commands/setup.ts` | `skip-install`/`skip-schema`/`skip-sdk` flags |
| `cli/src/commands/sync-metadata.ts` | `skip-views`/`skip-schema`/`skip-sdk` flags |
| `cli/src/commands/gql.ts` | `generate-schema`/`generate-sdk` actions; `no-exit` flag |
| `cli/src/commands/users.ts` | 7 documented actions; `roles`/`new-password`/`force`/`datasource` flags |
| `cli/src/commands/infra/up.ts` | `detach` flag |
| `cli/src/commands/infra/down.ts` | `volumes` flag |
| `cli/src/commands/infra/update.ts` | `all`/`file` flags |
| `cli/src/commands/cli-build.ts` | command existence |
| `cli/src/commands/views.ts` | command existence |
| `cli/src/commands/ds/generate-datasource.ts` | `ds generate-datasource` interactive scaffold subcommand |
| `cli/src/commands/tests/open.ts` | `tests:open` command; `port`/`no-open` flags |
| `cli/src/commands/tests/setup.ts` | `tests:setup` command existence; no flags |

## SR-* contract summary

| SR-* | Rules enforced |
|---|---|
| SR-1 | All 16 documented commands have source files; `create-app` flags `--database`, `--description`, `--templates`, `--skip-setup` declared; `tests:open` and `tests:setup` source files exist |
| SR-2 | Key documented flags per command exist in source (`run`, `debug`, `build`, `setup`, `sync-metadata`, `gql`, `ds`) |
| SR-3 | `ds` actions: `load`/`reset`/`indexes`; `gql` actions: `generate-schema`/`generate-sdk`; `users` 7 actions + 4 flags; `infra` flags |
| SR-4 | `run` declares `exclusive:` groups; no `--purge` on `run`; no `--environment` on `build`; no undocumented commands (`tests` directory is documented); no `--force` on `ds` |

## Key lesson — single-word flag patterns

CLI flag names that are valid JS identifiers are declared **without quotes** as object keys:
```ts
verbose: Flags.boolean({ ... })   // ← unquoted
'skip-infra': Flags.boolean({ ... }) // ← quoted (has hyphen)
```

**Use `toMatch(/flagname\s*:\s*Flags\./)` for single-word flags**, not `toContain("'flagname'")`.
Hyphenated flags (`skip-infra`, `inspect-brk`, etc.) may still use `toContain("'skip-infra'")`.

## Raise score checklist

- Score is already 93.3 (C=3, K=3, D=3, R=2). R=3 would require a full adversarial suite — currently R=2 covers SR-4 and adversarial checks on undocumented commands/flags.
- To raise to 100: add `--no-exit` adversarial check (verify it is only on `gql`, not on other commands).

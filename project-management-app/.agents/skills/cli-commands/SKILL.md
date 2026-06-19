---
name: cli-commands
description: Authoritative Drumr CLI command reference for AI assistants. Use this skill when a developer asks about any `drumr` CLI command. Covers creating a new app (`drumr create-app`), initial project setup (`drumr setup`), running the app locally in dev or production mode (`drumr run`, `drumr debug`), building the app (`drumr build`), regenerating GraphQL schema/SDK and view registries (`drumr sync-metadata`, `drumr gql`, `drumr views`), seeding or resetting datasource data (`drumr ds`), managing app users (`drumr users`), controlling Docker infrastructure services (`drumr infra:up`, `drumr infra:down`, `drumr infra:update`), and managing test infrastructure (`drumr tests:setup`, `drumr tests:open`).
metadata:
  applies-to:
    - cli/src/
---

# Drumr CLI

## Purpose

This document is the authoritative reference for the Drumr CLI command surface. Its main goal is to provide exact, real command syntax and usage so AI assistants do not hallucinate non-existent `drumr` commands.

Use this guide when helping developers with project bootstrap, local execution, metadata/code generation, infrastructure operations, data loading, and user management.

Unless explicitly stated otherwise, commands should be run from the root directory of a Drumr application (the folder that contains `package.json`, `backend/`, and usually `frontend/`).

### Generated backend template testing layout

- In generated backend apps, Jest config is in `backend/config/jest.config.ts`.
- Default `testMatch` in the template targets `src/**/*.test.ts`.
- The backend README template should describe this layout (tests under `src/`) when suggesting testing patterns.

### Create an app with `drumr create-app [name]`

- Syntax: `drumr create-app [name]`
- Default-first usage:
  - Recommended base command is `drumr create-app [name]` (no flags).
  - Database defaults to PostgreSQL when no database flag is provided.
- Optional customization flags (use only if the developer explicitly needs customization):
  - `-d, --database <postgres|mysql>`
  - `-D, --description <text>`
  - `-T, --templates`
  - `--skip-setup`
  - Hidden/internal toggles: `--backend`, `--frontend`
- What it does and when to use it:
  - Creates a new Drumr application scaffold.
  - Use at the very beginning of a project when you need a new app structure.
  - Suggest flags only when the user asks to customize generation behavior.

### App setup with `drumr setup`

- Syntax: `drumr setup`
- Default-first usage:
  - Recommended base command is `drumr setup` (no flags).
  - Use skip flags only when the user explicitly wants to skip a setup step.
- Key flags:
  - `--skip-install`
  - `--skip-schema`
  - `--skip-sdk`
- What it does and when to use it:
  - Runs full app setup: dependency installation, schema generation, SDK generation, and final build.
  - Use right after creating/cloning an app to prepare it for local development.

### Run the app with `drumr run`

- Syntax: `drumr run`
- Default-first usage:
  - Recommended base command is `drumr run` (no flags).
  - Suggest mode/port flags only if the user asks for a specific execution style.
- Key flags:
  - `-i, --skip-infra`
  - `--prod`
  - `--ui-only`
  - `-b, --backend`
  - `-p, --port <number>`
  - `-v, --verbose`
- What it does and when to use it:
  - Runs the Drumr app locally.
  - Default mode is development (backend via ts-node and separate UI dev server).
  - Use `--prod` to validate production-like behavior in a single process.
  - Use `--ui-only` or `--backend` for split development workflows.

### Debug the app with `drumr debug`

- Syntax: `drumr debug`
- Default-first usage:
  - Recommended base command is `drumr debug` (no flags).
  - Suggest debug flags only when the user needs a specific debugger behavior (break on start, custom inspect port, etc.).
- Key flags:
  - `--prod`
  - `-b, --inspect-brk`
  - `-p, --inspect-port <number>`
  - `-i, --skip-infra`
  - `--port <number>`
  - `-v, --verbose`
- What it does and when to use it:
  - Runs the app with Node.js debugging enabled.
  - Use when debugging backend startup, breakpoints, and runtime issues from VS Code or Chrome DevTools.

### Build the app with `drumr build`

- Syntax: `drumr build`
- Default-first usage:
  - Recommended base command is `drumr build` (no flags).
  - Suggest skip flags only for very specific troubleshooting or partial build scenarios requested by the user.
- Key flags:
  - `-m, --skip-metadata`
  - `-b, --skip-backend`
  - `-f, --skip-frontend`
  - `-v, --verbose`
- What it does and when to use it:
  - Runs app build orchestration: metadata sync, backend compile, and frontend build.
  - Use before packaging, release prep, or when validating a clean build pipeline.

### Sync metadata with `drumr sync-metadata`

- Syntax: `drumr sync-metadata`
- Default-first usage:
  - Recommended base command is `drumr sync-metadata` (no flags).
  - Suggest skip flags only when the user asks to regenerate only a subset.
- Key flags:
  - `--skip-views`
  - `--skip-schema`
  - `--skip-sdk`
- What it does and when to use it:
  - Regenerates metadata artifacts (view registries, GraphQL schema, SDK-related files).
  - Use after changing models, actions, GraphQL contracts, or frontend views that affect generated outputs.

### Handle `GraphQL` tasks with `drumr gql <action>`

- Syntax: `drumr gql <generate-schema|generate-sdk>`
- Key flags:
  - `--no-exit` (only for `generate-schema`)
- What it does and when to use it:
  - Handles GraphQL generation tasks.
  - Use `generate-schema` after backend model/action/API changes that impact GraphQL contracts.
  - Use `generate-sdk` after schema changes when frontend typed GraphQL artifacts need to be refreshed.
  - Practical rule for assistants:
    - If the user changed backend contracts and wants all metadata aligned, prefer `drumr sync-metadata`.
    - If the user asks specifically for GraphQL schema/types refresh, suggest `drumr gql ...` directly.

### Manage views with `drumr views <action>`

- Syntax: `drumr views <generate-context>`
- Key flags: none
- What it does and when to use it:
  - Generates view context/registries from frontend views.
  - Use when adding/removing/renaming views so generated context files stay accurate.
  - Use when the app fails to resolve generated view references and you need to rebuild view registries.
  - Practical rule for assistants:
    - If the user changed views and also needs schema/SDK regeneration, suggest `drumr sync-metadata` as the one-command path.
    - If the problem is only view context/registry generation, suggest `drumr views generate-context`.

### Scaffold a new datasource with `drumr ds generate-datasource`

- Syntax: `drumr ds generate-datasource` (interactive — no flags)
- What it does and when to use it:
  - Interactively scaffolds a new datasource file under `backend/src/dataSources/`.
  - Prompts for class name, datasource id, and database type (PostgreSQL, MySQL, MariaDB).
  - Generates a typed `TypeOrmSqlDataSource` subclass with environment-variable-driven connection config.
  - Use when adding a new database connection to an existing Drumr app.

### Manage datasources with `drumr ds <datasource> <action> [dataset]`

- Syntax: `drumr ds <datasource> <load|reset|indexes|sync-schema> [dataset]`
- Datasource reference recommendation:
  - Prefer the datasource **file basename** or **datasource id** as `<datasource>`.
  - The CLI resolves both file basenames (e.g., `main.ds` from `backend/src/infra/data-sources/main.ds.ts`) and datasource ids (e.g., `postgres-db` from `@DataSource({ id: 'postgres-db' })`).
  - Example in project-management app: use `main` or `postgres-db`.
- Key flags:
  - `--includeModels <Model1,Model2>`
  - `--excludeModels <Model1,Model2>`
  - `-v, --verbose`
- What it does and when to use it:
  - Manages datasource datasets and index inspection.
  - Use `load` to seed/load dataset data.
  - Use `reset` to reset datasource state.
  - Use `indexes` to inspect datasource index information.
  - Use `sync-schema` to synchronise the database schema without resetting data.
  - If the user does not understand why/how data is being loaded, recommend running the same `ds` command with `--verbose` to inspect detailed load logs.

### Manage users with `drumr users <action> [email]`

- Syntax: `drumr users <list|create|set-password|reset-password|activate|deactivate|delete> [email]`
- Key flags:
  - `--first-name <text>`
  - `--last-name <text>`
  - `-e, --email <email>`
  - `-p, --password <text>`
  - `-r, --roles <role1,role2>`
  - `--new-password <text>`
  - `-f, --force`
  - `-d, --datasource <name>`
- What it does and when to use it:
  - Manages application users in local/development environments.
  - Use for operational user lifecycle tasks such as creation, activation/deactivation, password operations, and deletion.
  - In this command family, flags are especially useful and often required to create/update users non-interactively.

### Start infrastructure with `drumr infra:up`

- Syntax: `drumr infra:up`
- Key flags:
  - `-d, --detach`
- What it does and when to use it:
  - Starts infrastructure services with Docker Compose.
  - Use before running the app if local DB/services are not already running.

### Stop infrastructure with `drumr infra:down`

- Syntax: `drumr infra:down`
- Key flags:
  - `-v, --volumes`
- What it does and when to use it:
  - Stops infrastructure services.
  - Use `--volumes` only when you intentionally want to remove persistent data.

### Update infrastructure with `drumr infra:update`

- Syntax: `drumr infra:update`
- Key flags:
  - `-a, --all`
  - `-f, --file <datasource-file>`
- What it does and when to use it:
  - Updates infrastructure configuration from datasource metadata.
  - Use after datasource config changes that require Docker/infrastructure regeneration.

### Rebuild the CLI with `drumr cli-build`

- Syntax: `drumr cli-build`
- Key flags: none
- What it does and when to use it:
  - Rebuilds the Drumr CLI tool itself (not an app build).
  - Use only when developing or maintaining the CLI package.
  - Run from the CLI workspace/package context, not from a normal application workflow.

### Scaffold test infrastructure with `drumr tests:setup`

- Syntax: `drumr tests:setup`
- Key flags: none
- What it does and when to use it:
  - Creates the test directory structure for a Drumr application if it does not already exist:
    - `frontend/tests/e2e/`, `frontend/tests/e2e/fixtures/`, `frontend/tests/e2e/helpers/`
    - `backend/tests/unit/`
    - `backend/tests/integration/`
    - `testsManagement/`
  - Initialises `testsManagement/test-plans.json` with an empty test plan scaffold.
  - Use once after creating or cloning an app to prepare the test infrastructure before writing tests.
  - Must be run before `drumr tests:open`.

### Launch the Test Manager UI with `drumr tests:open`

- Syntax: `drumr tests:open`
- Key flags:
  - `-p, --port <number>` (default: 4000)
  - `--no-open` — start the server without automatically opening the browser
- What it does and when to use it:
  - Starts a local HTTP server and opens the Drumr Test Manager web UI in the default browser.
  - Requires `testsManagement/test-plans.json` to exist (run `drumr tests:setup` first).
  - If the default port (4000) is occupied, the CLI automatically selects the next available port.
  - Press Ctrl+C to stop the server.
  - Use when reviewing, managing, or running test plans through the visual Test Manager interface.

## AI assistant troubleshooting & generation guide

- NEVER invent or hallucinate CLI commands. Only suggest commands explicitly listed in this document.
- If a request cannot be mapped to one of the listed commands, say so clearly and propose the closest supported command.
- Prefer default-first guidance:
  - Suggest the simplest base command first.
  - Only propose optional flags when the user asks for customization or a non-default behavior.
- Apply default-first explicitly to: `drumr setup`, `drumr run`, `drumr debug`, `drumr build`, and `drumr sync-metadata`.
- For scaffold requests, map directly to `drumr create-app`.
- For `drumr create-app`, do not force `--database`; PostgreSQL is the default unless the user requests another DB.
- For setup/bootstrap requests after scaffold or clone, map to `drumr setup`.
- For local execution requests, map to `drumr run` (or `drumr debug` if debugging is requested).
- For build pipeline requests, map to `drumr build`.
- For metadata regeneration requests, map to `drumr sync-metadata`, `drumr gql ...`, or `drumr views generate-context` as appropriate.
- For dataset/data source operations, map to `drumr ds <datasource> <action> [dataset]` and recommend the datasource file basename or id as the `<datasource>` argument (e.g., `main` from `backend/src/infra/data-sources/main.ds.ts`, or the datasource id `postgres-db`).
- `drumr ds` only manages dataset loading and datasource inspection — dataset JSONL files are authored by the developer (manually or via a project-specific script). Do not suggest `create`, `update`, or `generate` actions; they do not exist.
- When users ask why a dataset load behaves unexpectedly, recommend adding `--verbose` to the `drumr ds ...` command.
- For user lifecycle operations, map to `drumr users <action> [email]` and proactively use flags for non-interactive create/update flows.
- For infra lifecycle operations, map to `drumr infra:up`, `drumr infra:down`, and `drumr infra:update`.
- For test infrastructure setup requests (first-time setup or missing test dirs), map to `drumr tests:setup`.
- For launching the visual Test Manager UI, map to `drumr tests:open`. Remind users to run `drumr tests:setup` first if `testsManagement/test-plans.json` does not exist.
- For Docker/infrastructure transient errors, suggest this recovery sequence when appropriate:
  - `drumr infra:update`
  - `drumr infra:down`
  - `drumr infra:up`
- Remind users to run commands from the correct directory:
  - App commands: run from the Drumr app root.
  - CLI maintenance command (`drumr cli-build`): run in CLI development context.
- When flags are mutually exclusive (`drumr run --prod`, `--ui-only`, `--backend`), warn the user to choose one mode per command and, if they need multiple modes, run separate commands or terminals instead of combining those flags.
- When a command depends on app structure or dependencies, remind users to verify `package.json` exists and run dependency installation/setup first.

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-datasources](../backend-datasources/SKILL.md) | If CLI flows affect datasource loading, migration, or data-level behavior. | This skill defines command usage, not datasource implementation internals. |
| [backend-api](../backend-api/SKILL.md) | If command execution depends on how GraphQL/API contracts are generated or exposed. | This skill lists commands and flags but not backend API coding rules. |
| [frontend-views](../frontend-views/SKILL.md) | If metadata sync or generation impacts view definitions and frontend behavior. | This skill explains command invocation, not view decorator and lifecycle design. |

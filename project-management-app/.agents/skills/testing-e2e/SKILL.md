---
name: testing-e2e
description: Essential skill for Drumr Framework E2E (end-to-end) tests. Teaches how to write, debug, and maintain robust Playwright-driven browser tests for Drumr apps using DrumrTestKit and Playwright best practices.
metadata:
  applies-to:
    - qa/drumr-test-kit.ts
---

# Skill: E2E (End-to-End)

> How to design, write, and debug E2E tests for Drumr applications using Playwright and DrumrTestKit. Everything you need is in this skill and its examples.

## What this skill covers

- E2E test definition and scope (real browser flows)
- Playwright configuration and rationale
- DrumrTestKit usage
- Failure artifact analysis (screenshots, video, trace, error context)
- Debug workflow and common failure patterns
- Quality checklist and recommended structure

---

## 1. Purpose

E2E tests validate real user flows across the entire stack, using a real browser (Playwright). They:

- Prove that backend, frontend, and integrations work together
- Catch regressions not covered by unit/integration tests
- Run in Chromium (headless or headed)

---

## 2. Scope

- **Full-stack flows:** CRUD, navigation, permissions, errors
- **UI interactions:** Forms, tables, dialogs, modals, drawers
- **Network and state:** Real API calls, DB, authentication
- **Accessibility:** Validate visible/accessible elements

---

## 3. Generation Contract (Hard Constraints)

When this skill is used to generate E2E tests, all outputs must follow these constraints:

1. **Output format**
   - Generate only runnable TypeScript spec files (`*.spec.ts`).
   - Do not generate Markdown files in test folders.
   - Do not generate `README.md` files as part of E2E test generation.

2. **Language**
   - All generated code, test names, comments, and strings must be in English.

3. **Location**
   - Place tests only in `frontend/tests/e2e/` (or the app's configured E2E folder).
   - Never write E2E specs into `tests/unit` or `tests/integration`.

4. **DrumrTestKit usage**
	- Use DrumrTestKit public helpers.
	- Never edit DrumrTestKit source from app-level test generation.
	- Use app-valid import paths (for this repo, current pattern is `@drumr/framework-qa/drumr-test-kit`).

5. **Syntax safety**
   - Generated file must be complete and syntactically valid TypeScript.
   - Do not leave placeholders like unfinished blocks, partial snippets, or dangling comments.
   - Output must be code-only when asked to generate a spec (no prose before/after the file content).

6. **Spec abstraction safety**
   - Do not use raw Playwright selectors in specs (`page.getBy*`, `page.locator`, CSS/XPath selectors).
   - Keep UI interaction and waits in DrumrTestKit helpers.
   - If a required interaction is not supported by the available public helpers, do not bypass with raw selectors; report the missing helper explicitly.

7. **Scope safety**
   - Do not modify production source code when the task is “create/update E2E tests”.
   - Do not modify framework `core/` code from app-level E2E generation tasks.

8. **Non-destructive failure policy**
   - Never delete existing E2E spec files because of test failures.
   - Never replace a failing test by deleting and recreating from scratch.
   - When a generated test fails, iterate with targeted fixes in the same spec until it passes.
   - Only stop and escalate when the root cause is a missing/incorrect DrumrTestKit helper that cannot be solved from app-level test code.

9. **Credential resolution policy (mandatory)**
   - Never hardcode credentials in generated specs or helper files.
   - Resolve login credentials in this order:
     1. Environment variables: `E2E_EMAIL`, `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`.
     2. If values are still unknown during authenticated E2E generation, use `#tool:vscode/askQuestions` to request the email/username source and password strategy/source before writing the spec.
     3. Fail fast with a clear actionable error if credentials are still unavailable.
   - Do not persist plain passwords or secrets in generated files, fixtures, or logs.
   - Do not invent credentials, placeholders, demo defaults, or fallback users.
    - Do not invent credentials, placeholders, demo defaults, or fallback users.

### Canonical authenticated preflight example

Correct behavior for Copilot-driven authenticated E2E generation:

```text
User request: "Generate an authenticated E2E test for Tasks"

Agent response: "I need E2E credentials before generating the authenticated test."
Agent action: #tool:vscode/askQuestions
- Ask for the email/username source.
- Ask for the password strategy/source.

After credentials are resolved:
- Generate the spec using loginAsAdmin() or the existing framework-approved login helper.

If credentials are still unavailable:
- Stop with a clear fail-fast message.
- Do not emit any .spec.ts content.
```

---

### How to use the examples folder

The `examples/` folder contains both minimal and real-world E2E test cases, configuration templates, and troubleshooting patterns. Use this guide to know what to read and when:

- [`config.md`](./examples/config.md): Playwright configuration template and rationale.
- [`npm-scripts.md`](./examples/npm-scripts.md): Recommended NPM scripts for running/debugging E2E tests.
- [`failure-artifacts.md`](./examples/failure-artifacts.md): What artifacts Playwright produces on failure and how to interpret them.
- [`common-failures.md`](./examples/common-failures.md): Troubleshooting common E2E failure patterns and their fixes.
- [`crud-tasks.md`](./examples/crud-tasks.md): Real CRUD E2E test for a drawer-based ReadView (Tasks).
- [`crud-projects.md`](./examples/crud-projects.md): Real CRUD E2E test for a page-based ReadView (Projects).

> The examples folder may contain both minimal and advanced cases. Choose the most relevant example for your scenario—use config.md for setup, CRUD examples for real test structure, and common-failures.md for troubleshooting.

---

## 4. How to Create a New E2E Test

//For now, in a future we should be able to inject core DrumrTestKit into an app level kit and add app-specific helpers, but for now we can just use the core kit directly in the generated tests, as shown in the examples.

> **Important:** Never edit the DrumrTestKit directly. Always use its public helpers and patterns as shown in the examples. If you need new helpers, request them via framework contribution, but do not fork or modify the core kit in your app.

Follow these steps to create robust E2E tests for Drumr apps:

0. **Audit first (mandatory):**
   - Read at least 2 existing files from `frontend/tests/e2e/` in the target app.
   - Reuse the app's current import style, timeout style, and `describe` naming style.
   - Confirm the DrumrTestKit import path from existing app specs before generating new code.
   - Confirm whether the target view opens as page or drawer by checking existing specs/examples.

1. **Set up Playwright:**
   - Use the template in [`examples/config.md`](./examples/config.md) for your `playwright.config.ts`.
   - Add recommended scripts from [`examples/npm-scripts.md`](./examples/npm-scripts.md) to your `package.json`.

2. **Structure your test:**
	- Place E2E specs in `tests/e2e/`.
	- Use the CRUD examples ([`crud-tasks.md`](./examples/crud-tasks.md), [`crud-projects.md`](./examples/crud-projects.md)) as a starting point for real flows.
- Prefer parallel-safe independent tests by default.
		- Use serial suites only when a strict dependency cannot be removed.

3. **Use DrumrTestKit helpers:**
   - Always use DrumrTestKit for navigation, selectors, and actions—never hardcode selectors.
   - See the examples for correct usage patterns.

4. **Resolve credentials before generating auth-dependent tests:**
   - Check supported env vars first: `E2E_EMAIL`, `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`.
   - If credentials are still unknown, stop before writing the spec and use `#tool:vscode/askQuestions`.
   - Ask for the email/username source and password strategy/source.
   - If the user does not provide a usable source, stop generation and return a clear fail-fast message listing the supported env vars.
   - Keep `DrumrTestKit` runtime fail-fast as a safety net, not the primary credential resolution mechanism.

5. **Make tests deterministic:**
   - Avoid retries and flaky waits. Use explicit waits and helpers.
   - Each test should cover a single, real user flow.

6. **Debug and troubleshoot:**
   - If a test fails, review [`failure-artifacts.md`](./examples/failure-artifacts.md) and [`common-failures.md`](./examples/common-failures.md).
   - Use the prompt in this skill for root cause analysis.

7. **Checklist before committing:**
   - Specs are clear, organized, and named after the user flow.
   - All selectors and waits use DrumrTestKit.
   - No raw Playwright selectors appear in the spec.
   - Tests pass reliably (no retries needed).

For more advanced flows, adapt from the real-world examples and always keep tests readable and maintainable.

Add to .gitignore:

- `test-results/`
- `playwright-report/`

---

## 5. Running and Debugging

Useful commands:

- `npm run test:e2e` — All tests headless (CI)
- `npm run test:e2e:headed` — Visible browser
- `npm run test:e2e:debug` — Step-by-step Inspector
- `npm run test:e2e:codegen` — Record actions and generate code
- `npx playwright test file.spec.ts -g "test name"` — Run a specific test
- `npx playwright show-report` — Open HTML report

---

## 6. Failure Artifacts

See examples and explanation in [`examples/failure-artifacts.md`](./examples/failure-artifacts.md)

---

## 7. Common Failure Patterns & Fixes

See [`examples/common-failures.md`](./examples/common-failures.md)

---

## 8. Debug Workflow

1. Run headless and read the error message
2. Check `error-context.md` for page state
3. Review screenshots/video for visual clues
4. Run headed (`--headed`) to watch execution
5. Use Inspector (`--debug`) for step-by-step
6. If selector/timing issue, fix in `drumr-test-kit.ts`, never in the spec
7. Form fields use framework-owned ids. Current runtime helpers must tolerate both legacy raw ids (for example `title`) and the current stable `drumr-field-<sanitizedName>` ids emitted by field components.
8. Authenticated session reuse should probe a normal app route such as `/` and verify app chrome before falling back to `/login`. Do not assume the current frontend redirects authenticated users away from the login page automatically.

### Failure Recovery Rule

If a generated test fails:

1. Keep the same spec file and test names.
2. Diagnose using error output + artifacts (`error-context.md`, screenshot, trace).
3. Apply minimal, targeted fixes to the existing spec.
4. Re-run and repeat until resolved.
5. If blocked by missing DrumrTestKit capability, report the exact missing helper and stop (do not delete tests).

---

## 9. Quality Checklist

- Deterministic tests (no retries, no flakiness)
- Use DrumrTestKit helpers for selectors and waits
- Never hardcode selectors in specs
- Test data is worker-safe and unique under parallel workers
- No file-level mutable shared state that can collide across tests
- Failure artifacts are reviewed and fixed
- Specs organized in `tests/e2e/` with clear names

---

## 10. Prompt for Failure Analysis

Use this prompt when an E2E test fails:

### Variables

| Variable               | Description                 |
| ---------------------- | --------------------------- |
| `{TEST_NAME}`          | Name of the failing test    |
| `{SPEC_FILE}`          | Path to the spec            |
| `{ERROR_MESSAGE}`      | Playwright error message    |
| `{ERROR_CONTEXT_FILE}` | Error context path (if any) |

### Prompt

```
Analyze the failing E2E test and propose a fix.

### Failure Details
- Test name: {TEST_NAME}
- Spec file: {SPEC_FILE}
- Error message: {ERROR_MESSAGE}
- Error context: {ERROR_CONTEXT_FILE}

### Diagnosis Steps
1. Read the error context (YAML accessibility tree)
2. Read the spec to understand the flow
3. Locate the DrumrTestKit method and selector that failed
4. Review common failure patterns in this skill

### Common Root Causes (in order)
1. Drawer scoping — interacting with the correct drawer?
2. Async toolbar — are buttons visible? Any waits?
3. ProForm input — does fill() not update state? Use clearAndFillField
4. Delete confirmation text — "Execute", "Delete", or something else?
```

---

## 11. Prompt: Generate E2E Test File

Use this prompt when you need to generate a new E2E spec for an app.

### Input Variables

| Variable        | Description                  |
| --------------- | ---------------------------- |
| `{APP_DIR}`     | App directory path           |
| `{FEATURE}`     | Feature/user flow under test |
| `{OUTPUT_FILE}` | Target spec file path        |

### Prompt Template

```
Generate one Playwright E2E test file for {FEATURE}.

### Context
- App directory: {APP_DIR}
- Output file: {OUTPUT_FILE}
- Use skill: core/skills/testing-e2e/SKILL.md

### Hard Constraints
1. Create only one TypeScript spec file at {OUTPUT_FILE}.
2. Do not create any README.md or extra markdown files.
3. Use English for all code/comments/test names.
4. Use DrumrTestKit via public helpers only.
5. Do not modify DrumrTestKit or framework core files.
6. Ensure code is syntactically valid and runnable.
7. Do not use raw Playwright selectors in the spec (`page.getBy*`, `page.locator`, CSS/XPath).
8. Return code only (no explanatory prose outside the spec content).
9. Never delete or overwrite unrelated existing E2E specs.
10. If generated test fails, debug and patch incrementally; do not recreate from scratch.
11. Never hardcode login credentials in the generated spec.
12. For auth-required flows, resolve credentials in order: env vars (`E2E_EMAIL`, `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`) → `#tool:vscode/askQuestions` → fail-fast error.

### Audit Phase (before writing code)
1. Read at least two existing E2E specs in `{APP_DIR}/frontend/tests/e2e/`.
2. Infer and reuse the app's import path for DrumrTestKit.
3. Infer naming/timeouts/style from existing specs.
4. Confirm whether flow is drawer-based or page-based.
5. Check credential source for login flows:
   - Prefer env vars (`E2E_EMAIL`, `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`).
   - If missing, ask via `#tool:vscode/askQuestions` for the email/username source and password strategy/source.
   - If still missing, stop with an actionable error.

### Required Structure
- Import Playwright test API and DrumrTestKit.
- Add deterministic setup and clear user-flow test names.
- Use explicit waits and DrumrTestKit helpers only (no hardcoded selectors).
- Include at least one happy path and one guard/error path when applicable.

### Output
- Return only the final TypeScript code for {OUTPUT_FILE}.
```

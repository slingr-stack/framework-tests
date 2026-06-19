# How to use the QA agent for app migrations

> A guide for QA engineers joining a migration project where an existing client application is being moved to the Drumr framework.

---

## Overview

When a client's existing app is migrated to the Drumr framework, the QA team's job is to discover the app's current requirements, structure them into formal test cases, and automate them using the framework's E2E tooling — without needing to reverse-engineer the codebase manually.

The `drumr-qa-engine` agent handles all three stages of this process in a single conversation.

### How to open the agent

In VS Code with GitHub Copilot Chat open, type `@drumr-qa-engine` at the start of your message. The agent will activate and respond using its QA skills. If you don't see it in autocomplete, ask your tech lead to confirm the agent is installed in the workspace.

---

## What the agent does

The agent runs a three-stage QA pipeline on demand:

| Stage | What happens | Output file |
|-------|-------------|-------------|
| Stage 1 — Analyst | Extracts testable behaviors from natural-language requirements. Detects ambiguities. Interviews you when a blocker is found. | `qa-outputs/<feature>/stage-1-analysis.json` |
| Stage 2 — Test generator | Converts approved behaviors into Gherkin-style test cases with coverage metrics. | `qa-outputs/<feature>/stage-2-test-cases.json` |
| Stage 3 — Automation coder | Generates executable, DOM-agnostic Playwright spec files using `DrumrTestKit`. | `frontend/tests/e2e/<entity>-crud.spec.ts` |

All three stages can run in sequence within one session, or each can be run independently.

---

## Before you start

### 1. Choose an input mode for your migration phase

The analyst accepts requirements from different sources depending on what is available at each phase of the migration. Use `runQaAnalystAgentFromInput(input)` with the appropriate `kind` value.

| Phase | What you have | Recommended mode |
|-------|--------------|------------------|
| Early — Drumr models not built yet | Legacy DB schema or entity list | `metadata-only` |
| Active development — models being built | Drumr `backend/src` directory with decorated entities | `app-codebase` |
| Requirements in GitHub / Jira tickets | Issue URL or copied issue body | `github-issue` |
| Stabilisation — models complete | Finalised `appMetadata` JSON | `standalone` + `appMetadata` (dual mode) |

#### Phase 1 — Early migration (`metadata-only`)

Feed entity names from the legacy schema. The adapter synthesises baseline CRUD acceptance criteria for every entity, giving you a coverage baseline before any Drumr code exists.

```ts
{
  kind: 'metadata-only',
  appMetadata: {
    appName: 'Client CRM',
    models: [
      { name: 'Contact', fields: [{ name: 'name' }, { name: 'email' }, { name: 'status' }] }
    ],
    actions: [{ name: 'Archive', model: 'Contact' }]
  }
}
```

#### Phase 2 — Active development (`app-codebase`)

Point the adapter at the Drumr backend source directory. It scans for `@DataModel` / `@Entity` decorated classes and registered actions, then builds `appMetadata` automatically — no manual JSON export needed.

```ts
{
  kind: 'app-codebase',
  sourcePath: 'apps/client-crm/backend/src',
  userStory: 'As a sales rep, I want to manage contacts...',
  acceptanceCriteria: ['A contact must have a name.', ...]
}
```

#### Phase 2 — Requirements in GitHub issues (`github-issue`)

If migration tasks are tracked as GitHub issues, paste the issue body directly. The adapter extracts the user story from the first "As a …" line and acceptance criteria from checklist items (`- [ ] …`) or a numbered list under an "Acceptance Criteria" section. Combine with `appMetadata` for dual-mode cross-validation.

```ts
{
  kind: 'github-issue',
  issue: { title: 'Contact management', body: '...issue body...' },
  appMetadata: { ... }   // optional — enables dual-mode cross-validation
}
```

#### Phase 3 — Stabilisation (dual mode)

Once Drumr models are complete, supply the finalised metadata JSON as `appMetadata` on a `standalone` input. This gives the tightest cross-validation — every criterion is checked against real fields and actions before any spec is generated.

```ts
{
  kind: 'standalone',
  userStory: '...',
  acceptanceCriteria: [...],
  appMetadata: { appName: 'Client CRM', models: [...], actions: [...] }
}
```

### 2. Gather the app's requirements

Collect user stories and acceptance criteria from any source available:
- Existing requirement documents (Word, Confluence, Notion, Jira)
- Stakeholder interviews
- Screenshots or screen recordings of the original app
- Existing test cases (manual or automated) from the original system

You do not need to have perfect requirements. The analyst stage is designed to surface ambiguities and ask you to clarify them.

### 3. Set up credentials

E2E tests require a running Drumr app. Set credentials via environment variables before running tests. All of the following are supported — set whichever your app uses:

```bash
# Admin credentials
export E2E_ADMIN_EMAIL="admin@yourapp.com"
export E2E_ADMIN_PASSWORD="your-password"

# Or standard user credentials
export E2E_EMAIL="user@yourapp.com"
export E2E_USERNAME="user@yourapp.com"
export E2E_PASSWORD="your-password"
```

The agent will ask you for these during E2E generation if they are not set. Do not hardcode credentials in spec files.

---

## Running the pipeline

### Option A — Full pipeline in one session

In Copilot Chat, type `@drumr-qa-engine` and use a prompt like:

```
I'm working on migrating [Client App Name] to the Drumr framework.
Here are the user stories and acceptance criteria for the [Feature Name] module:

User story:
As a sales rep, I want to manage contacts so that I can track my client relationships.

Acceptance criteria:
1. A contact must have a name (required).
2. A contact must have a valid email address.
3. A contact can be archived. Archived contacts are hidden from the default list.
4. Only admin users can delete a contact.
5. Submitting a contact with a missing name must show a validation error.

App metadata (optional):
[paste JSON metadata if available]

Please analyze the requirements, generate test cases, and produce the Playwright E2E specs.
```

The agent will:
1. Run the analyst stage and present the testable behaviors
2. Pause if ambiguities are found and ask clarifying questions
3. Once you approve the behaviors, generate Gherkin test cases
4. Generate the executable Playwright spec files

### Option B — Stage by stage

Run each stage in separate sessions when you want to review and approve each output before proceeding.

**Session 1 — Analyst:**
```
Analyze these requirements for the [Feature Name] module and produce a QAAnalysisResult JSON.
[requirements]
```

**Session 2 — Test generator:**
```
Using this QAAnalysisResult, generate the Gherkin test cases:
[paste stage-1-analysis.json contents]
```

**Session 3 — Automation coder:**
```
Using this QATestGeneratorResult, generate the Playwright E2E spec for [Entity]:
[paste stage-2-test-cases.json contents]
Entity route: /contacts
Fields: name (text), email (text), status (select)
ReadView container: drawer
```

---

## Saving the outputs

At the end of each session, the agent will remind you to save the generated files. **Do not close the session without saving them** — conversation outputs are not persisted automatically.

Save outputs to your **app repository** (not the framework repo):

```
<app-repo-root>/
  qa-outputs/                       ← create this folder if it doesn't exist
    <feature-name>/
      stage-1-analysis.json         ← Analyst output
      stage-2-test-cases.json       ← Test generator output
  frontend/tests/e2e/
    <entity>-crud.spec.ts           ← Playwright spec
    framework/
      drumr-test-kit.ts            ← Updated kit (if new methods were added)
```

Commit these files to the repository so the next session can resume from the saved state.

---

## Resuming from a saved output

If you saved a previous stage's output, you can resume from it:

```
I have the stage-1-analysis.json from a previous session. Here it is:
[paste JSON]

Please generate the test cases for stage 2.
```

This avoids re-running the analyst stage from scratch.

---

## Running the generated specs

Once you have the `.spec.ts` files committed, run them from the app directory:

```bash
# Make sure the Drumr app is running first (ask your dev lead for the start command)
cd apps/<app-name>
npm run test:e2e
```

> **Migration timing:** If the Drumr version of the app is not built yet, you can still generate and commit the specs now. The specs describe business behavior — they're valid as soon as the corresponding views exist. Run them incrementally as each module is implemented. This gives you a live coverage report throughout the migration.

---

## Working feature by feature

For large migrations, process one feature or module at a time:
- `contacts/` — Contact management
- `deals/` — Deal pipeline
- `tasks/` — Task tracking

Each feature gets its own folder under `qa-outputs/` and its own spec files under `frontend/tests/e2e/`.

---

## Common questions

**What if I don't have formal requirements?**
Start with whatever you have — even rough notes or screen recordings. The analyst stage will extract testable behaviors and surface what's missing. It will ask clarifying questions through the interview process.

**What if the app metadata isn't available yet?**
Use `metadata-only` mode if you have a legacy schema with entity names — the adapter synthesises baseline CRUD criteria for you. If you have neither metadata nor formal requirements, use `standalone` mode with rough notes; the analyst uses heuristics to extract entity names from the text and asks clarifying questions for anything ambiguous.

**Can the agent discover requirements on its own from screenshots?**
Yes — share screenshots or describe the existing app's screens in plain language. The analyst stage can work from descriptions. The more specific you are, the fewer clarifying questions will be needed.

**What if a generated E2E spec fails?**
Read `qa/agents/skills/testing-playwright/SKILL.md` for the debug workflow. Check `test-results/<test-name>/error-context.md` first — it contains the exact accessibility tree at the point of failure.

**What if `DrumrTestKit` doesn't have a method for a specific interaction?**
The agent will add the method to `drumr-test-kit.ts` and then use it in the spec. Never use raw Playwright selectors in spec files.

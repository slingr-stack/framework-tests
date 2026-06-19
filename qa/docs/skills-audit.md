# Skills QA Coverage Audit — Reusable Prompt

Paste this prompt into GitHub Copilot Chat (`@workspace`) or Claude Code to generate or update the QA coverage map.
Re-run it whenever new skills are added or test coverage changes.

`Read qa/docs/skills-audit.md and execute the audit prompt inside it.`

---

```
You are a senior QA architect auditing test coverage for the Drumr framework skills.

## What you must NOT do
- Do not redefine, infer, or re-document what a skill does beyond what is needed for QA classification.
- Do not scan `/core/` or `/cli/` to discover skills.
- Do not modify any `SKILL.md` file.

## Source of truth
The skill inventory already exists and is maintained by developers.
Your job is to audit QA coverage against it and complete QA-owned metadata fields using deterministic inference rules defined below.

---

## Step 0 — Read the criticality reference table

Before scanning any `SKILL.md`, read `core/skills/README.md` in full.
Locate the skill criticality reference table (the table that maps each skill name to its `criticality` class: `core-flow`, `supporting`, or `optional`).
Keep this mapping in memory — it is the authoritative source for the `criticality` field during the entire audit.

---

## Step 1 — Read all existing skills

Scan `core/skills/` recursively.
For each folder that contains a `SKILL.md`, read the full file.
Extract the following fields:

- `name` — from YAML frontmatter (required, always present)
- `description` — from YAML frontmatter (required, always present) → use this as `purpose` in the output
- `criticality` — resolve from the **skill criticality reference table** in `core/skills/README.md` (canonical source of truth). Read that table before scanning any `SKILL.md`. If a skill's name does not appear in the table, fall back to the `criticality` YAML frontmatter field; if that is also absent or still set to `pending-devTeam`, mark `pending-devTeam`.
- `risk` — from YAML frontmatter if declared; otherwise infer using Rule R2
- `business_impact` — from YAML frontmatter if declared; otherwise infer using Rule R3
- `dependencies` — from YAML frontmatter if declared; otherwise infer using Rule R4
- `test_scope` — always infer using Rule R5, never read from frontmatter

Inference rules (apply only when field is absent from frontmatter):

**R1 — owner:** Derive deterministically from the folder name prefix:
- `backend-*` → `backend`
- `frontend-*` → `frontend`
- `cli-*` → `cli`
- `testing-*` → `qa`
- Any other prefix → `unknown`

**R2 — risk:** Count how many test files in `/apps/**/e2e/` directly exercise this skill.
- 0 test files → `high`
- 1–2 test files → `medium`
- 3+ test files → `low`

**R3 — business_impact:** Count references to this skill across all files in `/apps/`.
- 0 references → `optional`
- 1–4 references → `supporting`
- 5+ references → `core-flow`

**R4 — dependencies:** Scan the full body of the `SKILL.md` for mentions of other skill names (e.g. `backend-actions`, `backend-datamodels`). List each unique match found.
If none found → `none`

**R5 — test_scope:** Classify whether this skill produces behavior observable through the UI, is an internal framework mechanism, or is primarily an instructional skill used for code generation.
Use the following criteria:

| Value | Criteria |
|---|---|
| `e2e-testable` | The skill produces observable behavior in UI: actions triggered from toolbar/form, data rendered in tables/forms, auth flows, feedback messages, CRUD results |
| `framework-internal` | The skill is an internal framework mechanism with no direct UI representation: datasource internals, context stack utilities, component factory logic |
| `e2e-partial` | The skill result is observable in UI but only indirectly — e.g. a workflow whose outcome appears in the UI but whose internal steps are not |
| `generation-testable` | The skill is primarily instructional — Copilot uses it to generate app code. Validated by checking whether generated code compiles, passes lint, and conforms to the skill's documented patterns. Note: most skills are also `e2e-testable`; only classify as `generation-testable` exclusively if the skill has no observable UI behavior at all. |

When classifying, cross-reference against DrumrTestKit capabilities:
- DrumrTestKit can test: login, tables, forms, toolbars, drawers, modals, dialogs, CRUD actions, confirmation dialogs, feedback messages.
- If the skill's output maps to any of these, classify as `e2e-testable`.
- If the skill's output has no mapping to any of these, classify as `framework-internal`.
- If the skill is a `framework-internal` or `e2e-testable` skill that also has skill-conformance tests in `tests/unit/skill-conformance/`, note the conformance test file in the coverage matrix.

---

## Step 2 — Find all test files

Scan the entire repo for test files that exercise framework skills through a real app.
Include:
- Files under `/apps/**/e2e/`
- Files using `DrumrTestKit` (search for the import string `DrumrTestKit`)
- Playwright test files (`*.spec.ts`, `*.test.ts`) anywhere outside `/core/` and `/cli/`

For each test file found, extract:
- The skill(s) it exercises, inferred from the actions, views, models, or API calls it invokes.
- Whether it covers: happy path, edge cases, error/validation cases.

---

## Step 3 — Classify coverage per skill

For each skill in the registry, cross-reference against the test files found in Step 2.
Assign one coverage level:

| Level | Criteria |
|---|---|
| `fully-covered` | Happy path **and** at least one edge case or error/validation case tested |
| `partially-covered` | Happy path only, or coverage is indirect through a higher-level test that incidentally exercises this skill |
| `not-covered` | No test found that directly or indirectly exercises this skill |
| `n/a` | Skill is classified as `framework-internal` — E2E coverage is not applicable |

For `fully-covered` and `partially-covered`: list the exact test file(s) responsible.
For `partially-covered`: note what specific scenario is missing.
For `not-covered`: confirm no test was found rather than assuming.
For `n/a`: add a note explaining why E2E coverage is not applicable.

---

## Step 4 — Build the prioritized gap backlog

**Only include skills where `test_scope` is `e2e-testable` or `e2e-partial`.**
Do not add `framework-internal` skills to the gap backlog — they are not actionable for QA E2E automation.

List every qualifying skill with coverage level `not-covered` or `partially-covered`.

Sort by:
1. `risk` descending (`high` → `medium` → `low` → `unknown`)
2. `business_impact` descending (`core-flow` → `supporting` → `optional` → `unknown`)

For each entry provide:
- Skill name and file path
- `test_scope` value
- Current coverage level
- The specific missing scenario(s) needed to reach `fully-covered`
- A suggested Playwright/DrumrTestKit test case title for each missing scenario

For `framework-internal` skills, produce a separate section:

### Framework-internal skills (out of E2E scope)
List them with a one-line note on what type of testing would be appropriate instead (e.g. unit test, integration test).

---

## Step 5 — Output

Write the output to `qa/conformance/skills-audit-result.md`.
Do not touch any `SKILL.md` file or any other file.
All fields must be resolved using the inference rules above and the criticality reference table read in Step 0. Use `pending-devTeam` for `criticality` only when a skill is absent from the README reference table **and** has no `criticality` frontmatter value.

### Skills Inventory

| skill | file | owner | purpose | dependencies | criticality | risk | business_impact | test_scope |
|---|---|---|---|---|---|---|---|---|

### QA Coverage Matrix

| skill | test_scope | coverage_level | test_files | missing_scenarios |
|---|---|---|---|---|

### Gap Backlog — E2E Actionable

Ordered list. For each item:
- **[skill-name]** (`test_scope` / `coverage_level`) — `core/skills/<name>/SKILL.md`
  - Missing: _description of missing scenario_
  - Suggested test: `"<test case title>"`

### Framework-internal Skills

| skill | file | suggested_test_type | notes |
|---|---|---|---|

### Audit Metadata

| Field | Value |
|---|---|
| Audit date | <today> |
| Skills read | <count> |
| Test files scanned | <count> |
| E2E testable skills | <count> |
| Framework-internal skills | <count> |
| Fully covered | <count> (<%) |
| Partially covered | <count> (<%) |
| Not covered | <count> (<%) |
| Criticality resolved from README | <count> |
| Criticality pending (not in README) | <count> |
```
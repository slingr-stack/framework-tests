#file:core/skills/backend-actions/SKILL.md

Create an object action called `ArchiveBudget` for the `Budget` data model.

Requirements:
- Action type: `write`
- Exposed via GraphQL API (`api: 'gql'`)
- No params model (params-less action)
- Returns the updated `Budget` object
- Guard: cannot archive an already-archived budget. Add a `status` field (TextField,
  required, default "active") to Budget if not already present; the guard checks
  `budget.status === 'archived'` and returns the string `'Budget is already archived'`
- Execute body: sets `budget.status = 'archived'`, saves via injected data source,
  logs with `logger.info`, returns the updated budget
- Inject: `MainDs` data source
- Place at `src/actions/budgets/ArchiveBudget.ts`

Generate only the action file. Assume Budget and MainDs already exist.

> **Save output to:** `qa/benchmark/runs/<RUN>/outputs/<model>/backend-actions.ts`
> Replace `<RUN>` with the current run identifier (e.g. today's date) and `<model>` with `claude-sonnet-4-6` or `gpt-5.4`.

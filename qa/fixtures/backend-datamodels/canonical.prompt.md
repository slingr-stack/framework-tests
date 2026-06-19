#file:core/skills/backend-datamodels/SKILL.md

Create a new data model called `Budget` for the project management app.

Requirements:
- It belongs to the `Project` model (a Project has one Budget)
- Fields:
  - `totalAmount` — decimal number, required, label "Total Amount"
  - `currency`    — text field, max 3 characters, required, default "USD", label "Currency"
  - `notes`       — text field, optional, max 500 characters, label "Notes"
- Uses the GraphQL API (`crud.api: 'gql'`)
- The label field should be `currency`
- Place it under `src/dataModels/Budget.ts`

Generate only the data model file. Do not generate migrations, services, or actions.

> **Save output to:** `qa/benchmark/runs/<RUN>/outputs/<model>/backend-datamodels.ts`
> Replace `<RUN>` with the current run identifier (e.g. today's date) and `<model>` with `claude-sonnet-4-6` or `gpt-5.4`.

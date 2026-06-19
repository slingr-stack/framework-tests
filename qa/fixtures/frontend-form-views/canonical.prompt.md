#file:core/skills/frontend-form-views/SKILL.md

Create a create view for the `Budget` data model.

Requirements:
- Decorator: `@CreateView` with `model: 'Budget'` and `path: '/budgets/new'`
- Extends `CreateViewComponent<Budget>` (import Budget type from `@gql`)
- Custom breadcrumb: `['Budgets', 'New Budget']`
- Use `FormLayout` as the layout (import from `../../../layouts/FormLayout`)
- `formLayout` override: `'oneColumn'`
- `refreshMode` override: `'auto'`
- Place at `src/views/dataModels/budgets/BudgetCreateView.tsx`

Generate only the view file.

> **Save output to:** `qa/benchmark/runs/<RUN>/outputs/<model>/frontend-form-views.tsx`
> Replace `<RUN>` with the current run identifier (e.g. today's date) and `<model>` with `claude-sonnet-4-6` or `gpt-5.4`.

# frontend-api Conformance Agent

**Skill under test:** `core/skills/frontend-api/SKILL.md`
**Spec file:** `apps/project-management-app/backend/tests/unit/skill-conformance/frontend-api.skill-conformance.spec.ts`
**SkillScore:** 93.3 (C=3, K=3, D=3, R=2) — core-flow ✅

---

## Fixtures

| Fixture | Approach | SR-* coverage |
|---------|----------|---------------|
| `frontend/src/services/DashboardDataService.ts` | Source text | SR-1 (dataFindBy + generics + paginate + build), SR-2 (GraphQLClient DI), SR-3 (op.document/variables, no .value/.options), SR-4 (no raw gql``) |
| `frontend/src/services/ActivityLogDataService.ts` | Source text | SR-1 (dataAction + generic + build), SR-3 (__typename check, success-first, OperationError, gql.execute), SR-4 (no raw gql``) |
| `frontend/src/services/SummaryTableDataService.ts` | Source text | SR-1 (uiAction + generic + @gql types) |
| Adversarial scan | All `.ts` files in `frontend/src/services/` | SR-4 (raw gql``, @apollo/client direct import, tsyringe direct import) |

---

## SR-* Summary

### SR-1 — Builder and decorator contracts
- `dataFindBy<T>()` called with explicit type generic (never bare `dataFindBy()`)
- `.paginate(n)` on every `dataFindBy` list query (`paginateCount >= findByCount`)
- `.build()` materialises the operation object
- `dataAction<T>()` with explicit generic — `.build()` at chain end
- `uiAction<T>()` used when UI field metadata (`value`/`options`) is needed
- Generated types imported from `@gql` or `@gql/types`
- Builder functions imported from `@drumr/framework-frontend`

### SR-2 — DI and GraphQLClient resolution
- `GraphQLClient` resolved via constructor injection (not `new GraphQLClient()`)
- Framework primitives from `@drumr/framework-frontend` (not `tsyringe` directly)

### SR-3 — Behavioral guarantees
- `__typename` checked before accessing response payload fields
- Success `__typename` checked FIRST (before error union branches)
- `OperationError` caught for transport-level failures
- `gql.execute(op)` preferred for imperative action execution
- `op.document` and `op.variables` used when spreading into `client.query/mutate`
- No `.value` / `.options` access on `data*` operation responses
- Every `dataFindBy` has `.paginate()` before `.build()`

### SR-4 — Forbidden patterns
- No raw `gql\`` template literal strings
- No direct `@apollo/client` `gql` import in builder-using files
- No internal `core/frontend` path imports
- No `tsyringe` direct import in service files

---

## Known gaps (it.todo)

| Gap | File | Description |
|-----|------|-------------|
| SR-4 raw gql`` | `frontend/src/services/TaskCountService.ts` | Uses `gql\`` template string from `@apollo/client`. Pre-existing app violation. Migrate to `dataFindBy<TaskQueryResponse>().paginate(1).build()`. |

---

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='frontend-api.skill-conformance' \
  --no-coverage --verbose
```

> **After updating the spec:** run `pnpm run test:skill-conformance:ci -- --skill=frontend-api` then `pnpm run scores:update` to update `skill-scores.json` and the report. Do not edit `skill-scores.json` directly.

---

## Regex lessons

- `uiAction<T>(...)` has a generic before `(` — use `/uiAction\s*</` not `/uiAction\s*\(/`
- Same applies to all builder calls: `dataFindBy<T>`, `dataAction<T>`, `uiAction<T>` — always check for `<` when asserting explicit-generic presence
- To assert absence of bare calls (no generic): `/dataFindBy\s*\(/` correctly fails because all real calls have `<` first

---

## To raise score to 100

- Add adversarial fixture testing a wrong-pattern file (e.g. a mock service that breaks SR-4 rules) → R 2→3 → score 100
- Close `TaskCountService.ts` todo by migrating to `dataFindBy().paginate(1).build()`

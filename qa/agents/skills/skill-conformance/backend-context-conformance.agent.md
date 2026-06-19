# backend-context Conformance Agent

**Skill under test:** `core/skills/backend-context/SKILL.md`
**Spec file:** `apps/project-management-app/backend/tests/unit/skill-conformance/backend-context.skill-conformance.spec.ts`
**SkillScore:** 93.3 (C=3, K=3, D=3, R=2) — supporting ✅ (threshold 75)

---

## Fixtures

| Fixture | Approach | SR-* coverage |
|---------|----------|---------------|
| `src/actions/tasks/CompleteTask.ts` | Source text | SR-1 (constructor injection, no new Context), SR-2 (context.user?.id with optional chaining, defensive null check), SR-3 (null guard before assignment, logger.warn fallback), SR-4 (no tsyringe) |
| `src/actions/global/StartReportInBackground.ts` | Source text | SR-1 (constructor injection in GlobalAction), SR-2 (context.user?.id forwarded as userId to workflowsManager.start()), SR-3 (GlobalAction + Context pattern) |
| `src/actions/tasks/BulkChangePriority.ts` | Source text | SR-1 (App.resolve(Context) fallback NOT in constructor, wrapped in try/catch), SR-2 (action?.bulkAction ?? false, action?.bulkQuery), SR-3 (isBulk branch, empty-bulkQuery guard, catch does not rethrow) |
| Adversarial scan | All `.ts` in `src/actions/` + `src/services/` | SR-4 (no new Context(), no tsyringe imports, App.resolve(Context) outside BulkChangePriority only inside try/catch) |

---

## SR-* Summary

### SR-1 — Import and injection contracts
- `Context` imported from `@drumr/framework-backend`
- Constructor injection is the primary pattern
- No `new Context()` anywhere
- `App.resolve(Context)` fallback used only when injection is impractical (not in constructor)
- Fallback always wrapped in `try/catch`

### SR-2 — Context structure access patterns
- All context branch reads use optional chaining: `context.user?.id`, `context.action?.bulkAction`, `context.action?.bulkQuery`
- Nullish defaults on every read: `?? false`, `?? null`, `?? []`
- No raw `context.user.id` (missing `?.`)
- Actor identity forwarded via `userId: this.context.user?.id` not via client-sent values

### SR-3 — Behavioral / defensive coding
- Null check on resolved user before assigning to record field (`if (currentUser)`)
- `logger.warn` fired when user not found (graceful degradation, not throw)
- `isBulk` variable used to branch bulk vs single behavior
- Empty `bulkQuery` guard: `Object.keys(bulkQuery).length === 0`
- `catch` block in fallback resolve does NOT rethrow

### SR-4 — Forbidden patterns
- No `new Context()` in actions or services
- No `tsyringe` direct imports
- `App.resolve(Context)` outside `BulkChangePriority` allowed only inside `try/catch`

---

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='backend-context.skill-conformance' \
  --no-coverage --verbose
```

> **After updating the spec:** run `pnpm run test:skill-conformance:ci -- --skill=backend-context` then `pnpm run scores:update` to update `skill-scores.json` and the report. Do not edit `skill-scores.json` directly.

---

## To raise score to 100

- Add `push/pop` with `try/finally` pattern fixture → C gap closed, R stays 2 → still 93.3
- Add adversarial fixture that imports `Context` from `tsyringe` to confirm SR-4 scan catches it → R 2→3 → 100

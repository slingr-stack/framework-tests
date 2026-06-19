---
name: frontend-services-conformance
description: >
  SR-* conformance agent for the frontend-services skill.
  Runs, updates, and interprets frontend-services.skill-conformance.spec.ts.
  Delegates to skill-conformance-generator for full scaffold regeneration.
tools:
  - read_file
  - file_search
  - grep_search
  - replace_string_in_file
  - run_in_terminal
---

# frontend-services Conformance Agent

**Skill:** `core/skills/frontend-services/SKILL.md`
**Spec:** `apps/project-management-app/backend/tests/unit/skill-conformance/frontend-services.skill-conformance.spec.ts`
**Score:** 93.3 (supporting, threshold 75 ✅)
**Tests:** 27 passing, 0 todos

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='frontend-services.skill-conformance' \
  --no-coverage --verbose
```

## Fixtures

| Fixture | Role |
|---|---|
| `frontend/src/services/DashboardDataService.ts` | `@Service({ id: 'dashboardDataService' })` + GraphQLClient constructor injection + factory helper calling `DependencyContainer.resolve()` |
| `frontend/src/services/ActivityLogDataService.ts` | bare `@Service()` + `private readonly gql: GraphQLClient` constructor injection |
| `frontend/src/services/GraphQLClientService.ts` | `@Service()` with no constructor deps (valid singleton pattern) |
| `frontend/src/views/custom/ActivityLogView.tsx` | `DependencyContainer.resolve(ActivityLogDataService)` in class field — no `new Service()` |
| `frontend/src/views/custom/DashboardView.tsx` | `DependencyContainer.resolveById('dashboardDataService')` — ID-based dynamic dispatch |

## SR-* contract summary

| SR-* | Rules enforced |
|---|---|
| SR-1 | `@Service()`/`@Service({id})` imported from `@drumr/framework-frontend`; `DependencyContainer` from framework; no `tsyringe` direct import in service files |
| SR-2 | Constructor injection with `private readonly` field; no `new Service()` in constructors; no manual GraphQLClient instantiation at class level |
| SR-3 | `DependencyContainer.resolve()` in view class fields (not `new`); `DependencyContainer.resolveById()` for ID-based; factory helper wraps `resolve()`; no `new *Service()` in views/layouts |
| SR-4 | Adversarial scan — no view/layout instantiates `*Service` with `new`; no service imports from `tsyringe`; no service imports from internal `core/frontend` path; all `@Service`-decorated files import `Service` from `@drumr/framework-frontend`; no `openView` in service files |

## Key implementation note

**Regex pitfall**: `@Service` decorator appears *after* the import in source text. Checking with `/\@Service.*from\s+['"]@drumr\/framework-frontend['"]/s` (order-dependent) fails. Correct: check import and decorator presence independently:
```ts
const usesDecorator = /@Service\s*\(/.test(src);
const hasImport = /from\s+['"]@drumr\/framework-frontend['"]/.test(src);
```

## Raise score checklist

- Add `@Inject('id')` fixture demonstrating ID-based constructor injection → documents that path + R 2→3 → 100
- Alternatively: add adversarial fixture where a mock service is registered and resolved — verifies `DependencyContainer.registerInstance` test-replacement pattern

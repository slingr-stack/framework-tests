---
name: frontend-context-conformance
description: >
  SR-* conformance agent for the frontend-context skill.
  Runs, updates, and interprets frontend-context.skill-conformance.spec.ts.
  Delegates to skill-conformance-generator for full scaffold regeneration.
tools:
  - read_file
  - file_search
  - grep_search
  - replace_string_in_file
  - run_in_terminal
---

# frontend-context Conformance Agent

**Skill:** `core/skills/frontend-context/SKILL.md`
**Spec:** `apps/project-management-app/backend/tests/unit/skill-conformance/frontend-context.skill-conformance.spec.ts`
**Score:** 93.3 (supporting, threshold 75 ✅)
**Tests:** 24 passing, 0 todos

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='frontend-context.skill-conformance' \
  --no-coverage --verbose
```

## Fixtures

| Fixture | Role |
|---|---|
| `frontend/src/layouts/ViewLayout.tsx` | `useContextValue(ctx => ctx.views.get(UserReadView))` reactive label; `DependencyContainer.resolve(Context)` in `queryParams`; `ctx.views.get()` null-guarded with `if (userView)` before `.getParams()` |
| `frontend/src/views/dataModels/projects/ProjectReadView.tsx` | `DependencyContainer.resolve(Context)` in breadcrumb callback; `context.history?.some()` optional chaining; conditional breadcrumb based on navigation origin |
| `frontend/src/layouts/MainLayout.tsx` | `DependencyContainer.resolve(Context)` in `params: async ()` callback; `ctx.user?.id` optional chaining; defensive `return userId ? { id: userId } : {}` |

## SR-* contract summary

| SR-* | Rules enforced |
|---|---|
| SR-1 | `Context`/`useContextValue` from `@drumr/framework-frontend`; `DependencyContainer.resolve(Context)` for imperative access (app uses `DependencyContainer`, skill docs show `App.resolve` — both are DI-based equivalents) |
| SR-2 | `useContextValue` in render-time callbacks (reactive); `DependencyContainer.resolve` in `queryParams`/`breadcrumb`/`params` (imperative callbacks, not render) |
| SR-3 | `ctx.user?.id` optional chaining; defensive `return {}` when user absent; `context.history?.some()` optional chaining; `ctx.views.get()` null-checked; `useContextValue` selects stable view reference; conditional breadcrumb from history |
| SR-4 | No `new Context()` anywhere; no domain data in `context.put()`; all `Context` users import from framework; all `useContextValue` users import from framework |

## Key implementation notes

**Regex pitfalls for context patterns:**

1. `useContextValue((ctx) =>` — selector param has parentheses, `[^)]*ctx\s*=>` stops at `)` in `(ctx)`. Check `useContextValue(` and `ctx.views.get(` **independently**.
2. `breadcrumb: (): BreadcrumbValue => {` — return type annotation between `)` and `=>`. Use `/breadcrumb\s*:\s*\(\s*\)\s*:[^=]*=>/` not `/breadcrumb\s*:\s*\(\s*\)\s*=>/`.
3. `(entry) => entry.path === '/projects'` — parens around entry param break `entry\s*=>`. Use `/entry\.path\s*===\s*['"]/` directly.

## Raise score checklist

- Add `context.put()` or `context.notifyChange()` fixture (mutation side of the API) → closes SR-3 gap → R 2→3 → 100
- Alternatively: add `context.subscribe()` usage in a service or view lifecycle → documents advanced subscription pattern

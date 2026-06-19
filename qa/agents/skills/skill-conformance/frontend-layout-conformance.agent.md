---
name: frontend-layout-conformance
description: >
  SR-* conformance agent for the frontend-layout skill.
  Runs, updates, and interprets frontend-layout.skill-conformance.spec.ts.
  Delegates to skill-conformance-generator for full scaffold regeneration.
tools:
  - read_file
  - file_search
  - grep_search
  - replace_string_in_file
  - run_in_terminal
---

# frontend-layout Conformance Agent

**Skill:** `core/skills/frontend-layout/SKILL.md`
**Spec:** `apps/project-management-app/backend/tests/unit/skill-conformance/frontend-layout.skill-conformance.spec.ts`
**Score:** 93.3 (supporting, threshold 75 ✅)
**Tests:** 40 passing, 0 todos

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='frontend-layout.skill-conformance' \
  --no-coverage --verbose
```

## Fixtures

| Fixture | Role |
|---|---|
| `frontend/src/layouts/MainLayout.tsx` | `navigation='mix'`; `leftMenu` with `menu.group`+`menu.divider`; `topMenu` with `position='header'`; `userMenu` with `menu.myProfileAction`; `collapsible`; lifecycle hooks; dynamic `TaskCountLabel` React component label; `params` with `DependencyContainer.resolve` |
| `frontend/src/layouts/ViewLayout.tsx` | `navigation='left'`; `leftMenu` only (no `topMenu`); dynamic label via `useContextValue`; `queryParams` with `DependencyContainer.resolve(Context)` |
| `frontend/src/layouts/FormLayout.tsx` | `navigation='top'`; `topMenu` only (no `leftMenu`); `menu.subMenu` in topMenu; lazy view refs `view: () => Class`; `features.leftMenu=false`; lifecycle hooks |

## SR-* contract summary

| SR-* | Rules enforced |
|---|---|
| SR-1 | `@Layout()`, `BaseLayout`, `menu` all from `@drumr/framework-frontend`; typed config interfaces imported from framework |
| SR-2 | `extends BaseLayout`; `override` on all properties; `navigation: Navigation`, `contentWidth: ContentWidth`, `features: LayoutFeatures`, `header: LayoutHeaderConfig`, `footer: LayoutFooterConfig` |
| SR-3 | `navigation='mix'` → both leftMenu+topMenu; `navigation='left'` → no topMenu; `navigation='top'` → no leftMenu; `topMenu.position='header'`; `menu.myProfileAction()` suppresses auto-default; `menu.group()` in leftMenu; `menu.subMenu()` in topMenu; lazy view refs for circular import prevention; `menu.divider()`; lifecycle hooks `override`; dynamic React component label; `queryParams` with `DependencyContainer.resolve` |
| SR-4 | Adversarial scan of `layouts/` — no `viewButton`/`menuGroup`/`menuDivider`/standalone `subMenu` imports; all layout files from `@drumr/framework-frontend`; no `tsyringe` direct imports |

## Key implementation note

**Regex pitfall**: `MainLayout.tsx` has a comment `// TODO: Add menu items using viewButton()`. The pattern `/\bviewButton\s*\(/` matches this comment. Always strip single-line comments before scanning for obsolete helpers:
```ts
const stripped = src.replace(/\/\/[^\n]*/g, '');
```

## Raise score checklist

- Add test asserting per-view `override layout = ViewLayout` pattern (one of the 20+ view files in the app uses this) → documents that assignment; R 2→3 → 100
- Alternatively: add adversarial file that sets `navigation='top'` but also defines `leftMenu` (forbidden) → documents the navigation exclusion rule more forcefully

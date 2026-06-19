---
name: frontend-custom-views-conformance
description: >
  SR-* conformance agent for the frontend-custom-views skill.
  Runs, updates, and interprets frontend-custom-views.skill-conformance.spec.ts.
  Delegates to skill-conformance-generator for full scaffold regeneration.
tools:
  - read_file
  - file_search
  - grep_search
  - replace_string_in_file
  - run_in_terminal
---

# frontend-custom-views Conformance Agent

**Skill:** `core/skills/frontend-custom-views/SKILL.md`
**Spec:** `apps/project-management-app/backend/tests/unit/skill-conformance/frontend-custom-views.skill-conformance.spec.ts`
**Score:** 93.3 (supporting, threshold 75 ✅)
**Tests:** 33 passing, 0 todos

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='frontend-custom-views.skill-conformance' \
  --no-coverage --verbose
```

## Fixtures

| Fixture | Role |
|---|---|
| `frontend/src/views/custom/ActivityLogView.tsx` | `@CustomView({path})`, `extends CustomViewComponent`, `override header: ViewHeaderConfig`, `override onLoad()`, `override onRender()`, `override state`, `this.setState()` |
| `frontend/src/views/custom/DashboardView.tsx` | `@CustomView({path: '/'})`, full lifecycle with `onLoad()` + `onRender()`, `this.openView()` for navigation |
| `frontend/src/views/custom/SummaryView.tsx` | `override onRender()`, `this.app.message.info()` (not direct antd `message.*`), `this.openView()` for modal navigation |

## SR-* contract summary

| SR-* | Rules enforced |
|---|---|
| SR-1 | `@CustomView`/`CustomViewComponent`/`ViewHeaderConfig` from `@drumr/framework-frontend`; `path` required in decorator; no `name` in decorator (invalid `CustomViewOptions` property) |
| SR-2 | `extends CustomViewComponent`; `override header: ViewHeaderConfig` at class level; `override onRender()` required; no override of `render()`/`componentDidMount`/`componentWillUnmount` |
| SR-3 | `override onLoad()` for data fetching (not `componentDidMount`); `this.setState()` for updates; `this.openView()` not `window.location`; `this.app.message.info()` not bare antd `message.*`; `override state` with typed interface |
| SR-4 | Adversarial scan of all `views/` — no `useParams` hook; no `render()` override; no `@CustomView` with `name`; all `@CustomView` files import from framework; no `window.location.href =` |

## Raise score checklist

- Add `onParamsChange(prevParams, newParams)` fixture — documents the route-change-without-remount pattern → R 2→3 → 100
- Alternatively: add `ViewContainer` usage fixture or `this.closeView({ saved: true })` return-data pattern
- Both close the remaining SR-3 behavioral coverage gap

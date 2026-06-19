---
name: backend-tech-stack-conformance
description: >
  SR-* conformance agent for the backend-tech-stack skill.
  Runs, updates, and interprets backend-tech-stack.skill-conformance.spec.ts.
  Delegates to skill-conformance-generator for full scaffold regeneration.
tools:
  - read_file
  - file_search
  - grep_search
  - replace_string_in_file
  - run_in_terminal
---

# backend-tech-stack Conformance Agent

**Skill:** `core/skills/backend-tech-stack/SKILL.md`
**Spec:** `apps/project-management-app/backend/tests/unit/skill-conformance/backend-tech-stack.skill-conformance.spec.ts`
**Score:** 93.3 (supporting, threshold 75 ✅)
**Tests:** 35 passing + 1 todo

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='backend-tech-stack.skill-conformance' \
  --no-coverage --verbose
```

## Fixtures

| Fixture | Role |
|---|---|
| `src/App.ts` | `@App()` + `extends BaseApp`; logger/App/BaseApp/ConfigService from `@drumr/framework-backend`; lifecycle hooks (afterStart, beforeStop, onError) |
| `src/services/MockEmailService.ts` | `@Service()` + `extends EmailService`; logger from framework; no direct nodemailer config |
| `src/services/EmailService.ts` | `@Service()` + ConfigService constructor injection; logger.info/warn/error usage |

## SR-* contract summary

| SR-* | Rules enforced |
|---|---|
| SR-1 | `logger`, `App`, `BaseApp`, `ConfigService`, `Service` all from `@drumr/framework-backend`; no direct `winston` import in app files |
| SR-2 | `logger.info`/`warn`/`error` used (not console.*); metadata object as second arg; `logger.error` in `onError` lifecycle |
| SR-3 | `@App()` + `extends BaseApp`; `afterStart`/`beforeStop`/`onError` hooks; `@Service()` + class extension; `ConfigService` constructor-injected |
| SR-4 | Adversarial scan of all `src/` — no direct imports of: `winston`, `express`, `@apollo/server`, `typeorm`, `@casl/ability`, `@dbos-inc/dbos-sdk`, `class-validator`, `class-transformer`, `tsyringe`, `@pothos/core` |

## Known gaps (it.todo)

- `Budget.ts` + `moneyUtils.ts` use `parseFloat` + `.toFixed()` for monetary calculations — skill recommends `financial-number` or framework `Money` abstraction. Pre-existing app code; deferred until migrated.

## Raise score checklist

- Close the monetary arithmetic `it.todo` (migrate `Budget.ts` to `financial-number`) → maintains score but removes known gap
- Add adversarial wrong-base-class fixture (class that manually subclasses `BaseApp` without `@App()`) → R 2→3 → 100

---
name: backend-files-conformance
description: >
  SR-* conformance agent for the backend-files skill.
  Runs, updates, and interprets backend-files.skill-conformance.spec.ts.
  Delegates to skill-conformance-generator for full scaffold regeneration.
tools:
  - read_file
  - file_search
  - grep_search
  - replace_string_in_file
  - run_in_terminal
---

# backend-files Conformance Agent

**Skill:** `core/skills/backend-files/SKILL.md`
**Spec:** `apps/project-management-app/backend/tests/unit/skill-conformance/backend-files.skill-conformance.spec.ts`
**Score:** 93.3 (optional, threshold 65 ✅)
**Tests:** 20 passing, 0 todos

## Run command

```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest \
  --config config/jest.config.ts \
  --testPathPatterns='backend-files.skill-conformance' \
  --no-coverage --verbose
```

## Fixtures

| Fixture | Role |
|---|---|
| `backend/src/dataModels/File.ts` | Concrete `class File extends AppFile`; `@DataModel` with `crud.api:'gql'` + `ui.labelField:'name'`; `@TextField` for `description` |
| `backend/src/dataModels/Task.ts` | `@ReferenceField({ type: () => File })` array `attachments: File[]`; `fileInput()` write component |
| `backend/src/dataModels/ProjectReport.ts` | `@ReferenceField` required single `File` field; `fileLabel()` read + `fileInput()` write |
| `backend/src/auth/permissions.ts` | `can('access', File)` + `can('read', File)` granted |

## SR-* contract summary

| SR-* | Rules enforced |
|---|---|
| SR-1 | `AppFile` from `@drumr/framework-backend`; concrete `class File extends AppFile`; `@DataModel` with `crud.api:'gql'` and `labelField:'name'` |
| SR-2 | `@ReferenceField` uses `type: () => File` not `type: () => AppFile`; field typed as `File[]`/`File` not `AppFile`; `fileInput()` for write context, `fileLabel()` for read context |
| SR-3 | `can('access', File)` + `can('read', File)` in permissions.ts; `File` imported from app `dataModels` not framework; no `AppFile` import in model-referencing files |
| SR-4 | Adversarial scan — no `type: () => AppFile`; only one `AppFile` subclass (`File.ts`); no field typed as `AppFile`; `File extends AppFile` not `BaseDataModel`; no `/files/:id` direct download route hardcoded |

## Raise score checklist

- Add storage config env var test (`STORAGE_TYPE`/`STORAGE_PATH` checked in `.env.example` or `docker-compose.yml`) → R 2→3 → 100
- Alternatively: add test verifying upload route pattern `POST /files` referenced correctly (relative path, not absolute URL) in API docs or usage guides

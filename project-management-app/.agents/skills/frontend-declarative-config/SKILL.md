name: frontend-declarative-config
description: >
  Guides declarative frontend configuration for Drumr models and actions. Use
  when creating or updating frontend/src/<feature>/config/dataModels.tsx,
  frontend/src/<feature>/config/actions.tsx, or the app registration wiring in
  frontend/src/app.ts. Covers app.registerDataModel(), app.registerAction(),
  context-aware field entries with JSX field components, precedence with backend
  metadata, dependsOn for instance-aware model field callbacks, and functional
  action views.
user-invocable: true
metadata:
  applies-to:
    - '**/frontend/src/config/dataModels/**/*.ts'
    - '**/frontend/src/config/dataModels/**/*.tsx'
    - '**/frontend/src/config/actions/**/*.ts'
    - '**/frontend/src/config/actions/**/*.tsx'
    - '**/frontend/src/*/config/*.ts'
    - '**/frontend/src/*/config/*.tsx'
    - '**/frontend/src/app.ts'
    - '**/frontend/src/app.tsx'
    - core/frontend/src/config/dataModelDefaults.ts
    - core/frontend/src/config/actionDefaults.ts
---

# Frontend declarative model and action config

  ## When to use

Use this skill for frontend-owned UI config registered through `app.registerDataModel()` and `app.registerAction()`.

This layer is for **declarative UI configuration**, not backend behavior. It exists to keep rendering concerns in frontend modules while backend decorators keep ownership of persistence, validation, permissions, execution, and API contracts.

Use this skill when you need to:

- Configure model field labels, components, help text, visibility, editability, or default CRUD view names
- Configure action labels, icons, execution chrome, lightweight functional action views, or param field presentation
- Register model/action config from `frontend/src/<feature>/config/*.tsx` modules reached from `frontend/src/app.ts` (via the `config/appConfig.ts` pipeline)
- Move UI-only concerns out of backend metadata and into frontend-owned config

For the focused data model field-UI reference (component-per-type catalog, `labelField`, default views), see [frontend-datamodels](../frontend-datamodels/SKILL.md). This skill is the broader layer covering both models and actions plus the `app.ts` wiring.

Do not use this skill for:

- `@DataModel` schema design, datasource wiring, validation, calculated fields, or permissions
- `@Action` execution logic, `canExecute`, transactions, or backend `params` / `returns` contracts
- App shell, layouts, or route tables not related to model/action config

## Multi-skill routing

- Use [frontend-app](../frontend-app/SKILL.md) when wiring bootstrap flow, providers, routing, or app-wide defaults.
- Use [frontend-action-views](../frontend-action-views/SKILL.md) when action surface needs explicit route/layout control or full `ActionView` behavior.
- Use [backend-datamodels](../backend-datamodels/SKILL.md) or [backend-actions](../backend-actions/SKILL.md) when change affects schema, validation, permissions, execution, or API exposure.

## Ownership boundaries

Use this split consistently:

| Concern | Owner |
| --- | --- |
| Required fields, validation, datasource mapping, permissions, action execution | Backend decorators and backend classes |
| Labels, field components, read/write presentation, action button chrome, default CRUD view names | Frontend declarative config |
| Security and access control | Backend only |

Rule: do not move domain rules into frontend config. Frontend config can hide or restyle a field, but it must never become the source of truth for validation or authorization.

## Procedure

Recommended app structure:

```text
frontend/src/
  app.ts
  config/
    appDefaults.ts
    routing.ts
  users/                   # Example Business/Feature Folder
    config/                # Decentralized local config folder
      actions.tsx          # app.registerAction calls (JSX → .tsx)
      dataModels.tsx       # app.registerDataModel calls (JSX → .tsx)
    views/
  tasks/                   # Example Business/Feature Folder
    config/
      actions.tsx
      dataModels.tsx
    views/
```

Registration is a side effect of importing each config module (the `app.register*` calls run at import time). If a config module is never imported from the `app.ts` pipeline, its config does not exist at runtime.

```ts
// frontend/src/app.ts
import { app } from '@drumr/framework-frontend';
import { configureApp } from './config/appConfig';

configureApp(app);
```

Rules:

- Keep one obvious owner module per model whenever possible.
- Register each model from one owner module. `defineDataModelDefaults()` rejects a second owner for the same model, and action `params` already own their generated params model registration.
- Keep action defaults grouped by domain, but avoid re-registering the same action name in multiple files.
- Import config modules from frontend bootstrap or compose them through one bootstrap function.

## `app.registerDataModel()`

`app.registerDataModel<Model>('ModelName', config)` registers frontend UI config for one backend model. It is the app-facing API (it delegates to `defineDataModelDefaults` internally). For the full datamodel field-UI reference, see [frontend-datamodels](../frontend-datamodels/SKILL.md).

Primary use cases:

- Set `labelField` for frontend reference rendering
- Set `defaultCreateView`, `defaultEditView`, and `defaultReadView`
- Configure per-field UI under `fields`
- Move UI-only field behavior out of backend `ui` metadata

When a `labelField` function does not have enough data in the current record,
it may be authored as a hook-style resolver named `use...` and fetch the
missing data with framework data hooks such as `useApiFindById()`.

### Precedence

For model field UI concerns, current precedence is:

```text
frontend app.registerDataModel > backend transport metadata > system defaults
```

That means frontend model config is the authoritative source for component, label, visibility, help text, and related rendering behavior.

### Field entry shape

Each field can be one entry object or an array of context-aware entries. Supported UI properties:

- `component` — a JSX field component (`<TextLabel />`, `<ChoiceDropdown />`, …)
- `label`
- `labelField`
- `visible`
- `editable`
- `disabled`
- `helpMessage`
- `dependsOn`

Context can be:

- `'all'`
- `'read'`
- `'write'`
- A full `UiContext` matcher object such as `{ mode: 'read', view: { name: 'TaskDetails' } }`
- A matcher function

Important behavior: when multiple entries match the current context, they are **merged in declaration order**. This is not first-match-wins.

### Dynamic field callbacks

If `label`, `visible`, `editable`, `disabled`, `helpMessage`, or `context` depends on other form values, declare `dependsOn` for that field entry.

```tsx
support: [
  {
    context: 'all',
    dependsOn: ['status'],
    visible: (project) => project.status === 'active',
    component: (
      <CompositionCard
        size="large"
        label={(support) => `Support: ${support.email}`}
      />
    ),
  },
],
```

Nested composition wrappers also accept `readOnly: true` when a parent form stays writable but that specific nested section must render display-only.

```tsx
auditTrail: [
  {
    context: 'write',
    component: <CompositionCard readOnly size="large" />,
  },
],
```

For nested arrays configured through `List`, wrapper `label` callbacks on `CompositionAccordion`, `CompositionCard`, and `CompositionPanel` receive the plain item object rather than rich UI-field wrappers. This applies on first render and after form refreshes.

Rule: use `dependsOn` whenever a model field default reads sibling form values. Without it, the framework must fall back to broader instance-based reactivity.

### Example

Config files are `.tsx` because components are JSX:

```tsx
// frontend/src/projects/config/dataModels.tsx
import React from 'react';
import {
  app,
  ChoiceDropdown,
  ChoiceLabel,
  ReferenceDropdown,
  ReferenceLabel,
} from '@drumr/framework-frontend';
import type { Project } from '../../../generated/gql/types';

app.registerDataModel<Project>('Project', {
  labelField: 'name',
  defaultCreateView: 'ProjectCreateView',
  defaultEditView: 'ProjectEditView',
  defaultReadView: 'ProjectReadView',
  fields: {
    status: [
      {
        context: 'read',
        component: (
          <ChoiceLabel
            valueMetadata={{
              active: { label: 'Active', color: 'processing' },
            }}
          />
        ),
      },
      {
        context: 'write',
        component: <ChoiceDropdown placeholder="Select project status" />,
      },
    ],
    manager: [
      { context: 'all', componentOptions: { labelField: 'fullName' } },
      { context: 'read', component: <ReferenceLabel /> },
      {
        context: 'write',
        component: (
          <ReferenceDropdown
            placeholder="Select project manager"
            sorting={{ firstName: 'asc' }}
          />
        ),
      },
      {
        context: { mode: 'read', view: { name: 'TaskDetails' } },
        component: <ReferenceLabel representation="plain" />,
      },
    ],
  },
});
```

## `app.registerAction()`

`app.registerAction<TParams>({ action, ...config })` registers frontend UI config for one backend action. It is the app-facing API (it delegates to `defineActionDefaults` internally).

Use it for:

- `label` and `icon` overrides
- Execution chrome: `blockingExecution`/`showProgress`, `successMessage`/`errorMessage`
- Functional `view` registration for lightweight action surfaces
- Param field UI under `params`

Backend still owns action existence, permissions, params shape, returns shape, execution, and API exposure.

### Param field config

`params` uses the same contextual field configuration pattern as model fields for presentation concerns: `component` (JSX), `label`, `visible`, `editable`, `helpMessage`, `labelField`.

Use generated param types when available:

```ts
import type { AssignTaskParamsUi } from '@gql';
```

Keep param field UI in `params`. Do not register the same generated params model again through `defineDataModelDefaults()` or `app.registerDataModel()`.

### Functional action views

`app.registerAction({ view: MyActionView })` can register a lightweight functional component as the action view.

Key rules:

- This is frontend-only registration.
- The framework can auto-derive the canonical route when no explicit routing entry exists.
- No backend `ui.view` value is required for this functional path.
- If the app uses an explicit `ActionView` route or a backend-linked custom action view contract, follow [frontend-action-views](../frontend-action-views/SKILL.md) instead.

### Example

```tsx
// frontend/src/tasks/config/actions.tsx
import React from 'react';
import AssignTaskView from '@/tasks/views/actions/AssignTaskView';
import type { AssignTaskParamsUi } from '@gql';
import { app, ReferenceDropdown } from '@drumr/framework-frontend';

export const assignTaskDefaults = app.registerAction<AssignTaskParamsUi>({
  action: 'AssignTask',
  label: 'Assign task',
  icon: 'UserOutlined',
  view: AssignTaskView,
  params: {
    assignee: [
      {
        context: 'write',
        component: (
          <ReferenceDropdown
            placeholder="Select assignee"
            sorting={{ email: 'asc' }}
          />
        ),
        labelField: 'email',
      },
    ],
  },
});
```

## Decision rules

Use this quick rule set:

1. If concern changes how a model field looks in frontend, prefer `app.registerDataModel` (see [frontend-datamodels](../frontend-datamodels/SKILL.md)).
2. If concern changes how an action button or param form looks in frontend, prefer `app.registerAction`.
3. If concern changes validation, permissions, CRUD exposure, datasource behavior, or action execution, change backend code instead.
4. If concern is app shell, routing, or layout, use the app-level registration APIs instead (see [frontend-app](../frontend-app/SKILL.md)).

## Anti-patterns

- Forgetting to import the config module so its `app.register*` side-effect never runs
- Splitting one model's config across multiple owner files without a clear reason
- Re-registering the same action in multiple files and depending on accidental override order
- Registering action param field UI both in `params` and in a standalone defaults file for the generated params model
- Putting required/validation/permission rules in frontend config
- Using frontend visibility rules as a security mechanism
- Encoding backend business workflows in frontend callbacks
- Hand-writing raw Ant Design controls when a framework JSX field component already exists

## Related skills

| Skill | Use when |
| --- | --- |
| [frontend-app](../frontend-app/SKILL.md) | Bootstrapping `app.ts` and app-wide runtime defaults |
| [frontend-layout](../frontend-layout/SKILL.md) | Choosing layouts or assigning layout behavior to routes and app shell |
| [frontend-action-views](../frontend-action-views/SKILL.md) | Building full `ActionView` screens, richer custom action surfaces, or explicit route/layout behavior |
| [frontend-views](../frontend-views/SKILL.md) | Building model views that consume these defaults during read, create, or edit flows |
| [frontend-components](../frontend-components/SKILL.md) | Understanding how `DataForm`, `DataField`, and toolbar components consume these defaults |
| [frontend-datamodels](../frontend-datamodels/SKILL.md) | Configuring data model field UI specifically (labels, read/write components, default CRUD views) with `app.registerDataModel()` |
| [backend-datamodels](../backend-datamodels/SKILL.md) | Defining model schema, validation, datasource, and backend metadata |
| [backend-actions](../backend-actions/SKILL.md) | Implementing backend action classes and execution lifecycle |
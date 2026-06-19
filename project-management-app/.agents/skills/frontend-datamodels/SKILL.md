---
name: frontend-datamodels
description: >
  Defines declarative frontend UI configuration for Drumr data models. Use when
  configuring how a data model's fields render in the UI — labels, components
  (read vs write), visibility, editability, help messages, the model label field,
  and default CRUD view names — from frontend/src/<feature>/config/dataModels.tsx
  via app.registerDataModel(). Covers context-aware field entries, dependsOn for
  instance-aware callbacks, JSX field components (TextLabel/TextInput,
  ChoiceLabel/ChoiceDropdown, ReferenceLabel/ReferenceDropdown, MoneyLabel/MoneyInput,
  HtmlBlock/HtmlEditor, DateTimeLabel, List + CompositionPanel), and precedence over
  backend transport metadata. This is the UI counterpart of the backend-datamodels
  schema skill.
user-invocable: true
metadata:
  applies-to:
    - '**/frontend/src/config/dataModels/**/*.ts'
    - '**/frontend/src/config/dataModels/**/*.tsx'
    - '**/frontend/src/*/config/dataModels.ts'
    - '**/frontend/src/*/config/dataModels.tsx'
    - core/frontend/src/config/dataModelDefaults.ts
---

# Frontend skill: data model UI config

## Scope

This skill owns the **UI presentation** of data models on the frontend: how a model and its fields look and behave in forms, tables, and detail views. UI is declared with `app.registerDataModel()` from per-feature config modules.

It is the frontend counterpart of [backend-datamodels](../backend-datamodels/SKILL.md). Schema, persistence, validation, relationships, datasource wiring, optimistic locking, and permissions stay in the backend skill. Anything that only changes rendering lives here.

Use this skill when you need to:

- Set the model `labelField` used to render references in the UI
- Set `defaultCreateView`, `defaultEditView`, `defaultReadView`
- Configure per-field UI: `component` (a JSX field component), `label`, `labelField`, `visible`, `editable`, `disabled`, `helpMessage`
- Split read vs write presentation with context-aware entries
- Move UI-only field behavior out of backend `ui` metadata into frontend-owned config

Do **not** use this skill for:

- `@DataModel` schema, field decorators, `required`, calculated fields, model `validation` — see [backend-datamodels](../backend-datamodels/SKILL.md)
- Datasource wiring, indexing, `@VersionField`, permissions — see [backend-datamodels](../backend-datamodels/SKILL.md)
- Action UI defaults (`app.registerAction`), app shell, layouts, routing — see [frontend-declarative-config](../frontend-declarative-config/SKILL.md)

## Ownership boundaries

| Concern | Owner |
| --- | --- |
| Field type, `required`, validation, calculated fields, datasource mapping, permissions | Backend `@DataModel` decorators ([backend-datamodels](../backend-datamodels/SKILL.md)) |
| Field labels, components (read/write), visibility, editability, help text, model label field, default CRUD view names | Frontend `app.registerDataModel()` (this skill) |
| Security and access control | Backend only — never frontend |

Rule: frontend config may hide or restyle a field, but it must never become the source of truth for validation or authorization. UI visibility is not a security control.

## Precedence

For model field UI concerns:

```text
frontend app.registerDataModel > backend transport metadata > system defaults
```

Frontend model config is authoritative for component, label, visibility, help text, and related rendering. Backend `ui` metadata remains only as a migration fallback for fields not yet declared in frontend config.

## File layout and registration

Declare one config module per feature folder. Use the `.tsx` extension because field components are JSX:

```text
frontend/src/
  app.ts
  tasks/
    config/
      dataModels.tsx        # app.registerDataModel for Task (and related models)
    views/
```

`app.registerDataModel()` is a **side-effect registration** — it runs when the module is imported. The module must be reached from `frontend/src/app.ts` (through the `config/appConfig.ts` pipeline). If it is never imported, the config does not exist at runtime. See [frontend-app](../frontend-app/SKILL.md) and [frontend-declarative-config](../frontend-declarative-config/SKILL.md) for the `app.ts` wiring.

## `app.registerDataModel()`

```ts
import { app } from '@drumr/framework-frontend';

app.registerDataModel<Model>('ModelName', config);
```

Registers frontend UI config for one backend model. The registry keys by model name, so re-registering the same model replaces the previous snapshot (HMR-safe) — there is no module-level uniqueness. It throws only when the same model name is claimed by a different registration source (e.g. once as a model default and once as action params).

> `app.registerDataModel(name, config)` is the app-facing API and delegates to `defineDataModelDefaults(name, config)` in [core/frontend/src/config/dataModelDefaults.ts](../../../core/frontend/src/config/dataModelDefaults.ts). Prefer `app.registerDataModel` in app code.

Top-level config:

| Property | Type | Purpose |
| --- | --- | --- |
| `labelField` | `keyof T & string` | Field used to render the model in reference dropdowns/labels |
| `defaultCreateView` | `string` | View name for the create flow |
| `defaultEditView` | `string` | View name for the edit/update flow |
| `defaultReadView` | `string` | View name for the read/detail flow |
| `fields` | `{ [field]: entry \| entry[] }` | Per-field UI config |

### Field entry shape

Each field is one entry object or an array of context-aware entries:

| Property | Type | Purpose |
| --- | --- | --- |
| `context` | `'all' \| 'read' \| 'write' \| UiContext \| matcher fn` | When this entry applies |
| `component` | JSX field component (`React.ReactElement`) | The renderer |
| `label` | `string \| (instance) => string` | Field label |
| `labelField` | `string` | Label field for a reference field's dropdown/label |
| `visible` | `boolean \| (instance) => boolean` | Visibility |
| `editable` | `boolean \| (instance) => boolean` | Editability |
| `disabled` | `boolean \| (instance) => boolean` | Disabled state |
| `helpMessage` | `string \| (instance) => string` | Help text |
| `dependsOn` | `string[]` | Sibling fields the callbacks read |

Context can be `'all'`, `'read'`, `'write'`, a full `UiContext` matcher object such as `{ mode: 'read', view: { name: 'TaskDetails' } }`, or a matcher function.

Important: when multiple entries match the current context, they are **merged in declaration order** — not first-match-wins.

### Field components

Import JSX components from `@drumr/framework-frontend` and pass them to `component`. Pick the read vs write variant per context.

| Field kind | Read | Write |
| --- | --- | --- |
| Text | `<TextLabel />` | `<TextInput />` |
| Long text | `<LongTextLabel />` | `<LongTextInput />` |
| Choice | `<ChoiceLabel valueMetadata={...} />` | `<ChoiceDropdown valueMetadata={...} />` |
| Reference | `<ReferenceLabel />` | `<ReferenceDropdown label="name" placeholder="…" sorting={{ name: 'asc' }} />` |
| Money | `<MoneyLabel symbol="$" numberOfDecimals={2} />` | `<MoneyInput symbol="$" numberOfDecimals={2} />` |
| Html | `<HtmlBlock previewCharacters={200} />` | `<HtmlEditor height="300px" />` |
| Integer | `<IntegerLabel />` | `<IntegerInput />` |
| Boolean | `<BooleanToggle />` | `<BooleanToggle />` |
| Date / DateTime | `<DateLabel />` / `<DateTimeLabel />` | `<DatePickerField />` / `<DateTimePickerField />` |
| File | `<FileLabel />` | `<FileDropZone />` |
| Composition (single) | `<CompositionCard label={(c) => c.name} />` | same |
| Composition array | `<List component={<CompositionPanel<Child> label={(c) => c.name} />} />` | same (`<CompositionCard>` / `<CompositionAccordion>` also valid) |

### Dynamic field callbacks

When `label`, `visible`, `editable`, `disabled`, `helpMessage`, or `context` reads other form values, declare `dependsOn` so the framework re-evaluates only when those inputs change. Without it, the framework falls back to broader instance-based reactivity.

```tsx
support: [
  {
    context: 'all',
    dependsOn: ['status'],
    visible: (project) => project.status === 'active',
    component: <ReferenceLabel />,
  },
],
```

## Reference labels (`labelField`)

When a child model has a `@ReferenceField` to a parent, set the parent model's top-level `labelField` so the relation dropdown in create/edit views and reference labels in read views show a human-readable value instead of raw IDs. This replaces the backend `ui.labelField` for UI rendering.

```tsx
// frontend/src/projects/config/dataModels.tsx
app.registerDataModel<Country>('Country', {
  labelField: 'name',
});
```

Per reference field, pin the entry's `labelField` and read/write components:

```tsx
country: [
  { context: 'read', labelField: 'name', component: <ReferenceLabel /> },
  {
    context: 'write',
    labelField: 'name',
    component: <ReferenceDropdown label="name" placeholder="Select country" sorting={{ name: 'asc' }} />,
  },
],
```

## Audit-field UI immutability

Render audit fields (`createdBy`, `createdAt`) as read-only labels. UI read-only is presentation only — backend remains the source of truth and must enforce immutability server-side (see [backend-datamodels](../backend-datamodels/SKILL.md) audit-field rules and [backend-auth](../backend-auth/SKILL.md)).

```tsx
createdBy: [{ context: 'all', component: <ReferenceLabel /> }],
createdAt: [{ context: 'all', component: <DateTimeLabel format="DD/MM/YYYY HH:mm" /> }],
```

## Full example

```tsx
// frontend/src/projects/config/dataModels.tsx
import React from 'react';
import {
  app,
  ChoiceDropdown,
  ChoiceLabel,
  HtmlBlock,
  HtmlEditor,
  MoneyInput,
  MoneyLabel,
  ReferenceDropdown,
  ReferenceLabel,
  TextInput,
  TextLabel,
} from '@drumr/framework-frontend';
import type { Project } from '../../../generated/gql/types';

const STATUS_VALUE_METADATA = {
  planning: { label: 'Planning', color: 'default' },
  active: { label: 'Active', color: 'processing' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
} as const;

app.registerDataModel<Project>('Project', {
  labelField: 'name',
  defaultCreateView: 'ProjectCreateView',
  defaultEditView: 'ProjectEditView',
  defaultReadView: 'ProjectReadView',
  fields: {
    summary: { context: 'all', component: <TextLabel /> },
    name: [
      { context: 'read', component: <TextLabel /> },
      { context: 'write', component: <TextInput placeholder="Enter project name" /> },
    ],
    status: [
      { context: 'read', component: <ChoiceLabel valueMetadata={STATUS_VALUE_METADATA} /> },
      { context: 'write', component: <ChoiceDropdown placeholder="Select status" valueMetadata={STATUS_VALUE_METADATA} /> },
    ],
    description: [
      { context: 'read', label: 'Description', component: <HtmlBlock previewCharacters={200} /> },
      { context: 'write', label: 'Description', component: <HtmlEditor height="300px" /> },
    ],
    budget: [
      { context: 'read', component: <MoneyLabel symbol="$" showThousandsSeparator numberOfDecimals={2} /> },
      { context: 'write', component: <MoneyInput symbol="$" showThousandsSeparator numberOfDecimals={2} /> },
    ],
    manager: [
      { context: 'read', labelField: 'fullName', component: <ReferenceLabel /> },
      { context: 'write', labelField: 'fullName', component: <ReferenceDropdown label="fullName" placeholder="Select manager" sorting={{ firstName: 'asc' }} /> },
    ],
  },
});
```

## Authoring checklist

- One config module per feature: `frontend/src/<feature>/config/dataModels.tsx` (`.tsx` — components are JSX).
- Call `app.registerDataModel<Model>('ModelName', ...)` with the exact backend model name; import `app` from `@drumr/framework-frontend`.
- Use generated model types from `generated/gql/types` for the generic.
- Set `labelField` on every model referenced by a child entity so dropdowns/labels render readable values.
- Use context-aware entries (`read` / `write`) when read and write presentation differ.
- Use JSX field components (`<TextLabel />`, `<ChoiceDropdown />`, …); wrap composition arrays in `<List component={<CompositionPanel … />} />`.
- Declare `dependsOn` whenever a field callback reads sibling values.
- Render audit fields as read-only labels; never rely on this for security.
- Keep validation, `required`, permissions, datasource, and calculated fields in the backend skill.
- Ensure the config module is reached from `frontend/src/app.ts`, or the config never registers.

## Related skills

| Skill | Use when |
| --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | Model schema, fields, validation, relationships, datasource, versioning, permissions |
| [frontend-declarative-config](../frontend-declarative-config/SKILL.md) | The broader declarative layer: action config (`app.registerAction`), `app.ts` registration wiring |
| [frontend-components](../frontend-components/SKILL.md) | The JSX field components themselves and how `DataForm`/`DataField` consume this config |
| [frontend-form-views](../frontend-form-views/SKILL.md) | Building the `CreateView` / `EditView` / `ReadView` referenced by `defaultCreateView` etc. |
| [frontend-table-views](../frontend-table-views/SKILL.md) | Column rendering that consumes model field config |

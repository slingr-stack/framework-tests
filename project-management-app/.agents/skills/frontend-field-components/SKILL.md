---
name: frontend-field-components
description: >
  The EXACT Drumr frontend field-component system — the JSX components that render
  each data model field type, the field-type-to-component mapping, read/write context
  rendering, and per-component options. Use when choosing or configuring the `component`
  of a field entry in app.registerDataModel() / app.registerAction() params, or when a
  field renders with the wrong/raw control. Prevents hallucinating raw Ant Design or
  React controls when a framework field component exists.
user-invocable: true
metadata:
  applies-to:
    - '**/frontend/src/config/dataModels/**/*.tsx'
    - '**/frontend/src/*/config/dataModels.tsx'
    - '**/frontend/src/*/config/actions.tsx'
    - core/frontend/src/components/fields/
---

# Frontend skill: field components

## Scope

Drumr is a model-driven framework. The framework picks a sensible default field component per data type; when you need to override it, you assign a **JSX field component** as the `component` of a field entry — declared on the frontend with `app.registerDataModel()` (model fields) or `app.registerAction()` (action params). The runtime resolves the component by context (`read` or `write`) and renders the matching Ant Design control. `DataField` / `DataComponent` consume this config — see [frontend-components](../frontend-components/SKILL.md).

This skill covers:

- The JSX field components and their options (props)
- How to bind a component to a field via the `component` entry property
- Read vs. write context rendering
- All component families: Text, Numeric, Choice, Boolean, Date/DateTime/Time, File, Relationship, and Generic Arrays

### When to use this skill

- Choosing the correct component for a data type
- Customizing labels, inputs, formatting, placeholders, or icons on a field
- Wrapping scalar or composition arrays with `<List>`
- Understanding which components exist and what props they accept

### When NOT to use this skill

- Defining the model schema, field constraints, or persistence — see [backend-datamodels](../backend-datamodels/SKILL.md)
- The `labelField` / `defaultCreateView` / overall field-config mechanism — see [frontend-datamodels](../frontend-datamodels/SKILL.md)
- Building custom React view components — see [frontend-views](../frontend-views/SKILL.md)
- The runtime renderers `DataField` / `DataComponent` themselves — see [frontend-components](../frontend-components/SKILL.md)

## Architecture overview

```
app.registerDataModel('Model', { fields: { ... } })
        │
        ▼
  Field entry (per field name)
        │
        ├── context: 'read' | 'write' | 'all' | matcher
        └── component: <JSX field component />   ◄── component configuration lives here
              ├── { context: 'read',  component: <TextLabel /> }
              └── { context: 'write', component: <TextInput placeholder="…" /> }
        │
        ▼
  Framework runtime resolves component by context (DataField / DataComponent)
        │
        ▼
  React component rendered in the browser
```

All field components are imported from `@drumr/framework-frontend`. You pass them as JSX elements — the framework injects the field `name`, value, metadata, and errors from form context, so you do not set `name` yourself in field config.

## The `component` entry

Inside a field's config, `component` is a JSX element. Per field, declare:

1. **A single entry** — applies to all contexts:
   ```tsx
   summary: { context: 'all', component: <TextLabel /> }
   ```
2. **An array** — different components per context:
   ```tsx
   name: [
     { context: 'read',  component: <TextLabel /> },
     { context: 'write', component: <TextInput placeholder="Enter name" /> },
   ]
   ```
3. **Omitted** — the framework picks a sensible default component for the data type.

### Context values

| Value | Meaning |
| --- | --- |
| `'read'` | Record is in read-only / detail view |
| `'write'` | Record is in create or edit view |
| `'all'` | Applies to both read and write |
| `{ mode: 'read', view: { name: 'ViewName' } }` | Scoped to a specific named view |
| `{ usage: 'table' }` | Scoped to table/list view columns |

### Other field-entry properties

These live on the field entry (not as component props): `label`, `labelField`, `visible`, `editable`, `disabled`, `helpMessage`, `dependsOn`. See [frontend-datamodels](../frontend-datamodels/SKILL.md) for the full entry shape.

## Import convention

```tsx
import {
  app,
  // text
  TextLabel, TextInput,
  EmailLabel, EmailInput,
  HtmlBlock, HtmlEditor,
  UuidLabel,
  LongTextLabel, LongTextInput,
  // numeric
  IntegerLabel, IntegerInput,
  NumberLabel, NumberInput,
  DecimalLabel, DecimalInput,
  MoneyLabel, MoneyInput,
  // choice
  ChoiceLabel, ChoiceDropdown,
  // boolean
  BooleanLabel, BooleanToggle,
  // date / time
  DateLabel, DatePickerField,
  DateTimeLabel, DateTimePickerField,
  TimeLabel, TimePickerField,
  // file
  FileLabel, FileInput, FileDropZone,
  // reference
  ReferenceLabel, ReferenceDropdown,
  // composition / nested model
  CompositionPanel, CompositionCard, CompositionAccordion,
  // generic array wrapper
  List,
} from '@drumr/framework-frontend';
```

---

## Component families

Each family has its own reference file with full props and examples.

| # | Family | Components | Reference |
| --- | --- | --- | --- |
| 1 | Text | `<TextLabel>`/`<TextInput>`, `<EmailLabel>`/`<EmailInput>`, `<HtmlBlock>`/`<HtmlEditor>`, `<UuidLabel>`, `<LongTextLabel>`/`<LongTextInput>` | [text-components.md](./text-components.md) |
| 2 | Numeric | `<IntegerLabel>`/`<IntegerInput>`, `<NumberLabel>`/`<NumberInput>`, `<DecimalLabel>`/`<DecimalInput>`, `<MoneyLabel>`/`<MoneyInput>` | [numeric-components.md](./numeric-components.md) |
| 3 | Choice | `<ChoiceLabel>`, `<ChoiceDropdown>` (with `valueMetadata`) | [choice-components.md](./choice-components.md) |
| 4 | Boolean | `<BooleanLabel>`, `<BooleanToggle>` | [boolean-components.md](./boolean-components.md) |
| 5 | Date / DateTime / Time | `<DateLabel>`/`<DatePickerField>`, `<DateTimeLabel>`/`<DateTimePickerField>`, `<TimeLabel>`/`<TimePickerField>` | [date-components.md](./date-components.md) |
| 6 | File | `<FileLabel>`, `<FileInput>`, `<FileDropZone>` | [file-components.md](./file-components.md) |
| 7 | Relationship | `<ReferenceLabel>`/`<ReferenceDropdown>`, `<CompositionPanel>`/`<CompositionCard>`/`<CompositionAccordion>` | [relationship-components.md](./relationship-components.md) |
| 8 | Generic array | `<List component={…} />` | [array-components.md](./array-components.md) |

---

## Quick-reference: field type → component mapping

| Data type | Backend decorator | Read component | Write component |
| --- | --- | --- | --- |
| Text | `@TextField` | `<TextLabel />` | `<TextInput />` |
| Email | `@EmailField` | `<EmailLabel />` | `<EmailInput />` |
| HTML | `@HtmlField` | `<HtmlBlock />` | `<HtmlEditor />` |
| UUID | `@UuidField` | `<UuidLabel />` | _(auto-generated, read-only)_ |
| Long Text | `@LongTextField` | `<LongTextLabel />` | `<LongTextInput />` |
| Integer | `@IntegerField` | `<IntegerLabel />` | `<IntegerInput />` |
| Number | `@NumberField` | `<NumberLabel />` | `<NumberInput />` |
| Decimal | `@DecimalField` | `<DecimalLabel />` | `<DecimalInput />` |
| Money | `@MoneyField` | `<MoneyLabel />` | `<MoneyInput />` |
| Choice | `@ChoiceField` | `<ChoiceLabel />` | `<ChoiceDropdown />` |
| Boolean | `@BooleanField` | `<BooleanLabel />` | `<BooleanToggle />` |
| Date | `@DateField` | `<DateLabel />` | `<DatePickerField />` |
| DateTime | `@DateTimeField` | `<DateTimeLabel />` | `<DateTimePickerField />` |
| Time | `@TimeField` | `<TimeLabel />` | `<TimePickerField />` |
| File | `@ReferenceField → File` | `<FileLabel />` | `<FileInput />` or `<FileDropZone />` |
| Reference | `@ReferenceField` | `<ReferenceLabel />` | `<ReferenceDropdown />` |
| Composition (single) | `@CompositionField` | `<CompositionCard … />` / `<CompositionPanel … />` | same |
| Composition (array) | `@CompositionField` | `<List component={<CompositionPanel … />} />` | same (`<CompositionCard>` / `<CompositionAccordion>` also valid) |
| Array (any) | field + `<List>` | `<List component={<ReadComponent/>} />` | `<List component={<WriteComponent/>} />` |

> The backend decorator column tells you which model field type each component pairs with; the decorator itself is defined in the backend ([backend-datamodels](../backend-datamodels/SKILL.md)). The component is chosen here, on the frontend.

## Common pitfalls

1. **Do not hand-write raw Ant Design controls** — use the framework JSX field components (`<TextInput />`, `<MoneyLabel />`, etc.). They wire value/metadata/errors from form context automatically.
2. **Do not set `name` on the component** — the framework injects the field name from the config key.
3. **Composition arrays require `<List>`** — wrap with `<List component={<CompositionPanel … />} />` so add/remove controls render.
4. **File fields are references** — the backend uses `@ReferenceField({ type: () => File })`; render with `<FileLabel/>`/`<FileDropZone/>`.
5. **`calculation: 'automatic'` fields are read-only** — render with a label component (`<TextLabel/>`, etc.), not an input.
6. **`available` (backend) vs `visible` (frontend entry)** — backend `available` removes the field entirely; the frontend entry `visible` only hides the rendered component.
7. **Read-only in create/edit** — to show a value but block editing in a form, assign a **label** component for the `write` context (e.g. `<ReferenceLabel/>`, `<DateTimeLabel/>`). Pair with a backend `onInit()`/`calculation: 'automatic'` that sets the value.
8. **Choice colors/labels belong in `valueMetadata`, not hand-written `<Tag>` maps.** Do NOT write `const STATUS_COLOR = {…}` + custom `<Tag>` in a table column. Pass `valueMetadata` to `<ChoiceLabel>`/`<ChoiceDropdown>` once and the framework renders colored labels everywhere.

```tsx
// ❌ WRONG — color map + manual Tag in a view/column
const STATUS_COLOR: Record<string, string> = { open: 'green', closed: 'red' };
// render: (value) => <Tag color={STATUS_COLOR[value]}>{value}</Tag>

// ✅ CORRECT — declare valueMetadata once in the field config
const STATUS_METADATA = {
  open:        { label: 'Open',        color: 'success' },
  in_progress: { label: 'In Progress', color: 'processing' },
  closed:      { label: 'Closed',      color: 'default' },
} as const;

app.registerDataModel<Task>('Task', {
  fields: {
    status: [
      { context: 'read',  component: <ChoiceLabel valueMetadata={STATUS_METADATA} /> },
      { context: 'write', component: <ChoiceDropdown valueMetadata={STATUS_METADATA} placeholder="Select status" /> },
    ],
  },
});
```

## Read-only fields in write (create / edit) forms

To make a field **visible but not editable** in create/edit — e.g. a server-set timestamp or reference — assign a **label** component for the `write` context instead of an input.

```tsx
// createdAt: stamped by a backend onInit()/automatic calculation; shown read-only everywhere.
createdAt: { context: 'all', component: <DateTimeLabel format="DD/MM/YYYY HH:mm" /> },

// createdBy: resolved from request context in the backend; rendered as a non-editable label.
createdBy: { context: 'all', component: <ReferenceLabel /> },
```

The value is still serialized and saved; the user just cannot change it through the UI. Backend remains the source of truth — see [backend-datamodels](../backend-datamodels/SKILL.md) audit-field rules. UI read-only is not a security control.

| Requirement | Pattern |
| --- | --- |
| Field set once on creation, never editable | Backend `onInit()` + label component for `write` context |
| Field set automatically on every save | Backend `calculation: 'automatic'` + label component |
| Field editable only by specific roles | Backend action-level authorization — the component does not change |
| Field hidden by business rule | Backend `available: (record) => …` removes it; for display-only use a label component |

---

### Navigation paths to associated skills

| Associated Skill | When to navigate | Why the current info is NOT enough |
| --- | --- | --- |
| [frontend-datamodels](../frontend-datamodels/SKILL.md) | For the field-config mechanism: `labelField`, default CRUD views, entry shape, `app.registerDataModel()`. | This skill is the component catalog; it does not cover the overall model-config mechanism. |
| [backend-datamodels](../backend-datamodels/SKILL.md) | To define field constraints, validation, calculated fields, and persistence the components pair with. | This skill focuses on UI components, not model field semantics. |
| [frontend-components](../frontend-components/SKILL.md) | For the `DataField`/`DataComponent` renderers and runtime UI components. | This skill catalogs field components, not the runtime renderer contract. |
| [backend-files](../backend-files/SKILL.md) | For `AppFile` model/storage rules behind the file components. | This skill lists file UI components but not file model/storage rules. |
| [frontend-form-views](../frontend-form-views/SKILL.md) | When component behavior must coordinate with create/edit/read form lifecycle. | This skill does not define form-view hook orchestration. |

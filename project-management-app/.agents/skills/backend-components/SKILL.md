---
name: backend-components
description: >
  Deprecated backend skill. Field/type `ui` component configuration on backend model decorators was removed. Use frontend declarative config and frontend component/view skills for rendering decisions.


user-invocable: true
metadata:
  applies-to:
    - core/backend/src/model/
---

# Backend skill: components

## Status

Deprecated for current framework contract.

- Backend field decorators no longer accept `ui` component configuration.
- Component factories and field rendering choices belong to frontend declarative config.
- Keep backend model code focused on data structure, validation, persistence, relationships, and model-level metadata such as `ui.labelField`.
- For rendering work, use `frontend-declarative-config`, `frontend-form-views`, `frontend-table-views`, and `frontend-components`.

## Scope

Historical note: older versions declared UI components inside backend field decorators. That contract is removed. Do not generate new backend model code that uses field `ui`.

This skill covers:

- Where backend component configuration used to live
- Which frontend skills now own rendering configuration
- Migration direction away from backend field `ui`

### When to use this skill

- Configuring UI presentation for data model fields
- Choosing the correct component for a data type
- Customizing labels, inputs, formatting, placeholders, or icons on fields
- Wrapping scalar or composition arrays with `list()`
- Understanding which factory helpers are available and what options they accept

Use frontend skills instead of this file for all of those tasks.

### When NOT to use this skill

- Building custom React view components (see frontend views skill)
- Wiring Apollo Client queries directly (see frontend tech-stack skill)
- Defining the model itself or its persistence (see backend-datamodels skill)

## Architecture overview

```
@DataModel decorator
        │
        ▼
  Field decorator (@TextField, @MoneyField, …)
        │
        ├── data options   (required, min, max, regex …)
        ├── ui: [ ]        ◄── component configuration lives here
        │     ├── { context: 'read',  component: textLabel() }
        │     └── { context: 'write', component: textInput({ placeholder: '…' }) }
        │
        ▼
  Framework runtime resolves component by context
        │
        ▼
  React component rendered in the browser
```

All component factories are imported from `@drumr/framework-backend` (re-exported from the shared `ui-types` package). They return a `ComponentSpecification` object — you never instantiate React components directly.

## The `ui` property

Every field decorator accepts a `ui` property that can be:

1. **A single object** — applies to all contexts:
   ```typescript
   ui: {
     component: textLabel();
   }
   ```
2. **An array** — provides different components per context:
   ```typescript
   ui: [
     { context: 'read', component: textLabel() },
     { context: 'write', component: textInput({ placeholder: 'Enter name' }) },
   ];
   ```
3. **Omitted** — the framework picks a sensible default component for the data type.

### Context values

| Value                                          | Meaning                              |
| ---------------------------------------------- | ------------------------------------ |
| `'read'`                                       | Record is in read-only / detail view |
| `'write'`                                      | Record is in create or edit view     |
| `'all'`                                        | Applies to both read and write       |
| `{ mode: 'read', view: { name: 'ViewName' } }` | Scoped to a specific named view      |
| `{ usage: 'table' }`                           | Scoped to table/list view columns    |

### Additional `ui` entry properties

| Property             | Type                         | Description                                          |
| -------------------- | ---------------------------- | ---------------------------------------------------- |
| `context`            | `string \| object`           | When this entry applies                              |
| `component`          | `ComponentSpecification`     | Factory helper call                                  |
| `label`              | `string`                     | Override the field label displayed in the UI         |
| `labelField`         | `string`                     | For references — which field to display as the label |
| `valueMetadata`      | `Record<string, {…}>`        | For choices — label, color, description per value    |
| `visible`            | `(instance) => boolean`      | Show/hide the component dynamically                  |
| `editRepresentation` | `'TextArea' \| 'CodeEditor'` | For LongTextField shorthand                          |
| `language`           | `string`                     | Syntax language for CodeEditor representation        |
| `height`             | `string`                     | Height for editors/text areas                        |

## Import convention

All component helpers and field decorators come from a single import:

```typescript
import {
  // Field decorators
  TextField,
  EmailField,
  HtmlField,
  UuidField,
  LongTextField,
  IntegerField,
  NumberField,
  DecimalField,
  MoneyField,
  ChoiceField,
  BooleanField,
  DateField,
  DateTimeField,
  TimeField,
  ReferenceField,
  CompositionField,
  // Component factories — text
  textLabel,
  textInput,
  emailLabel,
  emailInput,
  htmlBlock,
  htmlEditor,
  uuidLabel,
  longTextLabel,
  longTextInput,
  // Component factories — numeric
  integerLabel,
  integerInput,
  numberLabel,
  numberInput,
  decimalLabel,
  decimalInput,
  moneyLabel,
  moneyInput,
  // Component factories — choice
  choiceLabel,
  choiceDropdown,
  choiceBox,
  // Component factories — boolean
  booleanLabel,
  booleanCheckbox,
  booleanToggle,
  // Component factories — date/time
  dateLabel,
  dateInput,
  datePicker,
  dateTimeLabel,
  dateTimeInput,
  dateTimePicker,
  timeLabel,
  timePicker,
  // Component factories — file
  fileLabel,
  fileInput,
  fileDropZone,
  // Component factories — reference
  referenceLabel,
  referenceDropdown,
  // Component factories — composition / nested model
  compositionPanel,
  compositionCard,
  compositionAccordion,
  // Component factories — generic array
  list,
  // Base class
  BaseDataModel,
  DataModel,
  Money,
} from '@drumr/framework-backend';
```

---

## Component families

Each component family has its own detailed reference file with full options and Copilot-optimized examples.

### 1 · Text components

Covers `@TextField`, `@EmailField`, `@HtmlField`, `@UuidField`, and `@LongTextField`. Includes factories for read-only labels (`textLabel`, `emailLabel`, `htmlBlock`, `uuidLabel`, `longTextLabel`) and write inputs (`textInput`, `emailInput`, `htmlEditor`, `longTextInput`). Supports placeholders, prepend/append icons, regex validation, copy buttons for emails, rich HTML editing, and code editor mode for long text.

**Full reference**: [text-components.md](./text-components.md)

### 2 · Numeric components

Covers `@IntegerField`, `@NumberField`, `@DecimalField`, and `@MoneyField`. Provides label and input factories for each type with formatting options like thousand separators, decimal precision, zero padding, currency symbols, and increment/decrement controls.

**Full reference**: [numeric-components.md](./numeric-components.md)

### 3 · Choice components

Covers `@ChoiceField` for single and multiple selections. Includes `choiceLabel`, `choiceDropdown`, `choiceBox`, and `choiceMultipleBox` factories. Supports `valueMetadata` for mapping enum values to labels, colors (Ant Design presets, named colors, or hex), and descriptions. Metadata can be shared at the `ui` entry level with `context: 'all'`.

**Full reference**: [choice-components.md](./choice-components.md)

### 4 · Boolean components

Covers `@BooleanField` with three display modes: `booleanLabel` (read-only text), `booleanCheckbox` (checkbox), and `booleanToggle` (toggle switch). All accept `trueLabel` and `falseLabel` for custom display text.

**Full reference**: [boolean-components.md](./boolean-components.md)

### 5 · Date and DateTime components

Covers `@DateField`, `@DateTimeField`, and `@TimeField`. Provides `dateLabel`/`datePicker` (with restricted formats: `yyyy-MM-dd`, `MM-dd-yyyy`, `dd-MM-yyyy`), `dateTimeLabel`/`dateTimePicker` (with free-form format strings), and `timePicker` (with `hourStep` and `minuteStep`). Includes examples of conditional `available` fields.

**Full reference**: [date-components.md](./date-components.md)

### 6 · File components

Covers file upload/download UI via `@ReferenceField({ type: () => File })`. Includes `fileLabel` (download link), `fileInput` (click-to-upload), and `fileDropZone` (drag-and-drop). Supports `maxSize`, `acceptedTypes`, `maxFiles`, and custom upload/download labels. Can also be configured via `fileOptions` on the decorator.

**Full reference**: [file-components.md](./file-components.md)

### 7 · Relationship components

Covers `@ReferenceField` and `@CompositionField`. For references: `referenceLabel` and `referenceDropdown` with filtering, sorting, search scope, and `labelField` shorthand. For compositions: `compositionPanel` (inline list), `compositionCard` (card layout), and `compositionAccordion` (collapsible). All composition factories support typed label callbacks. Note: the `filter:` option controls which records appear in the dropdown (UI concern); backend validation of that filter on save/update is a separate concern — see `backend-datamodels` skill for filter validation semantics.

**Full reference**: [relationship-components.md](./relationship-components.md)

### 8 · Generic array components

Covers the `list()` factory that wraps any scalar or composition component for array rendering. Automatically resolves to `array.list` (read) or `array.editor` (write). Supports `sorting`, nested component specification, and works with all field types including text, reference, and composition arrays.

**Full reference**: [array-components.md](./array-components.md)

---

## Quick-reference: field type → component mapping

| Data type | Decorator | Read component | Write component |
| --- | --- | --- | --- |
| Text | `@TextField` | `textLabel()` | `textInput()` |
| Email | `@EmailField` | `emailLabel()` | `emailInput()` |
| HTML | `@HtmlField` | `htmlBlock()` | `htmlEditor()` |
| UUID | `@UuidField` | `uuidLabel()` | _(auto-generated, read-only)_ |
| Long Text | `@LongTextField` | `longTextLabel()` | `longTextInput()` |
| Integer | `@IntegerField` | `integerLabel()` | `integerInput()` |
| Number | `@NumberField` | `numberLabel()` | `numberInput()` |
| Decimal | `@DecimalField` | `decimalLabel()` | `decimalInput()` |
| Money | `@MoneyField` | `moneyLabel()` | `moneyInput()` |
| Choice | `@ChoiceField` | `choiceLabel()` | `choiceDropdown()` or `choiceBoxSelector()` |
| Boolean | `@BooleanField` | `booleanLabel()` | `booleanToggle()` or `booleanCheckbox()` |
| Date | `@DateField` | `dateLabel()` | `datePicker()` |
| DateTime | `@DateTimeField` | `dateTimeLabel()` | `dateTimePicker()` |
| Time | `@TimeField` | `timeLabel()` | `timePicker()` |
| File | `@ReferenceField → File` | `fileLabel()` | `fileInput()` or `fileDropZone()` |
| Reference | `@ReferenceField` | `referenceLabel()` | `referenceDropdown()` |
| Composition | `@CompositionField` | `compositionPanel()` | `compositionPanel()` / `compositionCard()` / `compositionAccordion()` |
| Array (any) | field + `list()` | `list(readComponent)` | `list(writeComponent)` |

## Common pitfalls

1. **Do not import React components directly** — always use the factory helpers (`textInput`, `moneyLabel`, etc.).
2. **Do not duplicate `valueMetadata`** — place it at the `ui` entry level with `context: 'all'` to share across read/write components.
3. **Composition arrays require `list()`** — wrapping is needed for the framework to render add/remove controls.
4. **File fields are references** — use `@ReferenceField({ type: () => File })`, not a custom file decorator.
5. **`calculation: 'automatic'` fields are read-only** — pair with `textLabel()` or the appropriate label component, not an input component.
6. **The `available` property controls field visibility** — it hides the field entirely (including its component) based on a condition. This is different from the `visible` UI property which only hides the component rendering.
7. **To make a field read-only in create/edit forms, assign a label component for the `write` context** — do NOT reach for a custom React component or disable the input via props. Assign `referenceLabel()`, `dateTimeLabel()`, `textLabel()`, etc. for the `write` context (or omit the context array to apply the label everywhere). Combine this with `onInit()` to auto-populate the value.
8. **NEVER configure choice colors/labels in frontend code.** Hand-written `const STATUS_COLOR: Record<string, string>` maps and custom `<Tag>` renderers in a `@TableView` column are the wrong approach. All choice value presentation (labels, colors, descriptions) belongs on the backend `@ChoiceField` via `valueMetadata`. The framework propagates that metadata to the frontend automatically — no manual color maps needed in view code.

```typescript
// ❌ WRONG — color map defined in the frontend TableView
const STATUS_COLOR: Record<string, string> = {
  open: 'green',
  in_progress: 'yellow',
  closed: 'red',
};
// ... render: (value) => <Tag color={STATUS_COLOR[value]}>{value}</Tag>

// ✅ CORRECT — declare colors once in the backend @ChoiceField
export enum TaskStatus {
  Open = 'open',
  InProgress = 'in_progress',
  Closed = 'closed',
}

@ChoiceField({
  required: true,
  type: () => TaskStatus,
})
taskStatus!: TaskStatus;
// The framework renders colored labels/tags automatically in tables and forms.
```

## Read-only fields in write (create / edit) forms

Sometimes a field must be **visible but not editable** when a record is being created or edited — for example, a timestamp or a reference set automatically by the server. The pattern is to assign a **label component** (read-only renderer) for the `write` context instead of an input component.

### How it works

The framework renders whatever `ComponentSpecification` you declare for the `write` context. If you pass a label factory instead of an input factory, the field becomes a display-only widget inside the form. The value is still serialized and saved, but the user cannot change it through the UI.

Pair this with `onInit()` (for create) or a calculated field to populate the value automatically.

### Examples

#### Auto-populated timestamp (createdAt)

```typescript
import { DateTimeField, dateTimeLabel, BaseDataModel, DataModel } from '@drumr/framework-backend';

@DataModel({ dataSource: 'postgres-db' })
export class Invoice extends BaseDataModel {
  // Displayed in both create and edit forms as a read-only label.
  // Value is stamped once inside onInit().
  @DateTimeField({
    docs: 'When the record was created',
  })
  createdAt!: string | null;

  override async onInit(): Promise<void> {
    if (this.createdAt === undefined || this.createdAt === null) {
      this.createdAt = new Date().toISOString();
    }
  }
}
```

Key points:

- Passing `{ component: dateTimeLabel() }` (a single object, no context array) applies the label to **all** contexts — read, write, and table.
- `onInit()` is called during `fromJSONWithReferences()` (i.e., on the first instantiation from action params), so the timestamp is set once and never overwritten on subsequent updates.
- To also stamp `updatedAt` on every save (create and update), use `onBeforeSave()` instead of `onInit()`. See [backend-datamodels](../backend-datamodels/SKILL.md) → lifecycle hooks table for the full hook reference. `onBeforeSave` and `onAfterSave` are persistence hooks on `BaseDataModel` — they have no UI rendering role.

#### Auto-populated reference (createdBy)

```typescript
import {
  ReferenceField,
  referenceLabel,
  BaseDataModel,
  DataModel,
  DependencyContainer,
  Context,
} from '@drumr/framework-backend';
import { User } from './User';

@DataModel({ dataSource: 'postgres-db' })
export class Comment extends BaseDataModel {
  // Rendered as a non-editable label inside create/edit forms.
  // Value is resolved from the current request context in onInit().
  @ReferenceField({
    type: () => User,
    required: true,
  })
  createdBy!: User;

  override async onInit(): Promise<void> {
    try {
      const { MainDs } = await import('@/infra/data-sources/main.ds');
      const context = DependencyContainer.resolve(Context);
      const datasource = DependencyContainer.resolve(MainDs);
      const currentUser = await datasource.findOneBy(User, { id: context.user?.id });
      if (currentUser) {
        this.createdBy = currentUser;
      }
    } catch {
      // DI container or context not available during startup / testing
    }
  }
}
```

Key points:

- The `ui: { component: referenceLabel() }` shorthand (single object) makes the field read-only in **every** context.
- The `Context` and datasource are resolved inside `onInit()` to look up the authenticated user. The `try/catch` guard keeps testing and startup safe.
- Import the datasource class dynamically (`await import(...)`) to avoid circular dependency issues at module load time.

#### Mixed: editable in read context, label in write context

If you need the opposite — editable in a dedicated read view but always a label in a form — you can still use the context array:

```typescript
@TextField({
})
computedCode!: string;
```

This is unusual but valid when the value is derived server-side and must never be typed by a user.

### Decision guide

| Requirement | Pattern |
| --- | --- |
| Field set once on creation, never editable | `onInit()` + label component for `write` context |
| Field set automatically by the server on every save | `calculation: 'automatic'` + label component |
| Field editable only by specific roles | Use action-level authorization — the field component itself does not change |
| Field visible in forms but blocked by business rule | `available: (record) => condition` hides it entirely; for display-only use label component |

---

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | If you need to define field constraints, validation, and persistence metadata around UI components. | This skill focuses on UI component factories, not complete model field semantics. |
| [backend-files](../backend-files/SKILL.md) | If component usage includes file upload/download behavior or file model references. | This skill lists file-related UI helpers but not `AppFile` model/storage rules. |
| [frontend-views](../frontend-views/SKILL.md) | If you need to render advanced custom UI behavior around model fields in React views. | This skill covers component factory selection, not full view rendering lifecycle integration. |
| [frontend-form-views](../frontend-form-views/SKILL.md) | If component behavior must be coordinated with create/edit/read form lifecycle hooks. | This skill does not define form-view hook orchestration or form-level composition patterns. |

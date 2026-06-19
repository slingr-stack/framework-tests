# Text components

**Field decorators**: `@TextField`, `@EmailField`, `@HtmlField`, `@UuidField`, `@LongTextField`

## Available factories

| Factory                | Component ID     | Mode  | Use with         |
| ---------------------- | ---------------- | ----- | ---------------- |
| `textLabel(opts?)`     | `text.label`     | Read  | `@TextField`     |
| `textInput(opts?)`     | `text.input`     | Write | `@TextField`     |
| `emailLabel(opts?)`    | `email.label`    | Read  | `@EmailField`    |
| `emailInput(opts?)`    | `email.input`    | Write | `@EmailField`    |
| `htmlBlock(opts?)`     | `html.block`     | Read  | `@HtmlField`     |
| `htmlEditor(opts?)`    | `html.editor`    | Write | `@HtmlField`     |
| `uuidLabel(opts?)`     | `uuid.label`     | Read  | `@UuidField`     |
| `longTextLabel(opts?)` | `longText.label` | Read  | `@LongTextField` |
| `longTextInput(opts?)` | `longText.input` | Write | `@LongTextField` |

## Options reference

**`TextLabelComponentOptions`** — read-only text display:

- `textAlign?: 'left' | 'center' | 'right'`
- `limitCharacters?: number` — truncate display after N characters

**`TextInputComponentOptions`** — extends `BaseInputOptions`:

- `placeholder?: string`
- `prependText?: string` / `prependIcon?: string`
- `appendText?: string` / `appendIcon?: string`

**`EmailLabelComponentOptions`** — extends `TextLabelComponentOptions`:

- `copyButton?: boolean` — shows a copy-to-clipboard button

**`EmailInputComponentOptions`** — extends `BaseInputOptions`:

- `placeholder?: string`, `prependText?`, `prependIcon?`, `appendText?`, `appendIcon?`

**`HtmlBlockComponentOptions`**:

- `previewCharacters?: number` — truncate HTML preview

**`HtmlEditorComponentOptions`**:

- `height?: string | number` — editor height (e.g. `'300px'` or `300`)

**`LongTextLabelComponentOptions`** — extends `TextTypeUiOptions`:

- `textAlign?: 'left' | 'center' | 'right'` — inherited from `TextTypeUiOptions`
- `limitCharacters?: number` — inherited from `TextTypeUiOptions`
- `control?: 'textArea' | 'codeEditor'`
- `editRepresentation?: 'TextArea' | 'CodeEditor'`
- `language?: CodeEditorLanguage`
- `height?: string | number`
- `size?: 'auto' | 'small' | 'medium' | 'large' | { width: string | number; height: string | number }`

**`LongTextInputComponentOptions`** — extends `BaseInputOptions`:

- `control?: 'textArea' | 'codeEditor'`
- `limitCharacters?: number`
- `language?: CodeEditorLanguage` — for CodeEditor
- `height?: string | number`
- `size?: 'auto' | 'small' | 'medium' | 'large' | { width: string | number; height: string | number }`
- `placeholder?: string`

## Copilot-optimized examples

### Basic text field with read/write components

```typescript
@TextField({
  required: true,
  minLength: 3,
  maxLength: 100,
  docs: 'Name of the project',
})
name!: string;
```

### Text field with regex validation and prepend icon

```typescript
@TextField({
  required: true,
  minLength: 3,
  maxLength: 20,
  regex: /^[A-Z]{2,5}-\d{1,5}$/,
  regexMessage: 'Code must be in format: PREFIX-NUMBER (e.g., PROJ-123)',
})
code!: string;
```

### Automatic calculated text field (read-only)

```typescript
@TextField({
  minLength: 3,
  maxLength: 200,
  calculation: 'automatic',
})
get summary(): string {
  return this.name + ' - ' + this.code + ' (' + this.status.toUpperCase() + ')';
}
```

### Email field with copy button

```typescript
@EmailField({
  required: true,
})
email!: string;
```

### HTML field with preview and rich editor

```typescript
@HtmlField({
  maxLength: 5000,
  docs: 'Detailed description of the project',
})
description!: string | null;
```

### Long text field with text area

```typescript
@LongTextField({
  maxLength: 5000,
})
description!: string | null;
```

### Long text field with code editor representation (shorthand)

```typescript
@LongTextField({
  docs: 'Technical details or code snippets',
})
technicalDetails!: string | null;
```

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| backend-datamodels | If you need text field validation, indexing, requiredness, or persistence semantics. | This file focuses on text UI components and omits comprehensive model field rules. |
| frontend-form-views | If text components require conditional rendering or form lifecycle customization. | This file does not define create/edit/read hook-based form orchestration. |
| frontend-table-views | If text formatting and actions must be configured in table columns. | This file does not cover table column render pipelines or row interactions. |

# Text components

> Part of the [frontend-field-components](./SKILL.md) skill. Pairs with backend field types `@TextField`, `@EmailField`, `@HtmlField`, `@UuidField`, `@LongTextField` (schema lives in [backend-datamodels](../backend-datamodels/SKILL.md)).

## Available components

| Component | Mode | Pairs with |
| --- | --- | --- |
| `<TextLabel>` | Read | `@TextField` |
| `<TextInput>` | Write | `@TextField` |
| `<EmailLabel>` | Read | `@EmailField` |
| `<EmailInput>` | Write | `@EmailField` |
| `<HtmlBlock>` | Read | `@HtmlField` |
| `<HtmlEditor>` | Write | `@HtmlField` |
| `<UuidLabel>` | Read | `@UuidField` |
| `<LongTextLabel>` | Read | `@LongTextField` |
| `<LongTextInput>` | Write | `@LongTextField` |

## Props reference

Props mirror the framework component-option types; pass them as JSX attributes.

**`<TextLabel>`** — read-only text display:

- `textAlign?: 'left' | 'center' | 'right'`
- `limitCharacters?: number` — truncate display after N characters

**`<TextInput>`**:

- `placeholder?: string`
- `prependText?: string` / `prependIcon?: string`
- `appendText?: string` / `appendIcon?: string`

**`<EmailLabel>`** — extends text label props:

- `copyButton?: boolean` — shows a copy-to-clipboard button

**`<EmailInput>`**: `placeholder?`, `prependText?`, `prependIcon?`, `appendText?`, `appendIcon?`

**`<HtmlBlock>`**: `previewCharacters?: number` — truncate HTML preview

**`<HtmlEditor>`**: `height?: string | number` — editor height (e.g. `'300px'` or `300`)

**`<LongTextLabel>`**:

- `textAlign?: 'left' | 'center' | 'right'`
- `limitCharacters?: number`
- `control?: 'textArea' | 'codeEditor'`
- `language?: CodeEditorLanguage`
- `height?: string | number`
- `size?: 'auto' | 'small' | 'medium' | 'large' | { width: string | number; height: string | number }`

**`<LongTextInput>`**:

- `control?: 'textArea' | 'codeEditor'`
- `limitCharacters?: number`
- `language?: CodeEditorLanguage` — for code editor
- `height?: string | number`
- `size?: 'auto' | 'small' | 'medium' | 'large' | { width: string | number; height: string | number }`
- `placeholder?: string`

## Examples

> All examples are field entries inside `app.registerDataModel<Model>('Model', { fields: { … } })`. The field's type/validation is declared by the backend decorator named in each comment.

### Basic text field with read/write components

```tsx
// backend: @TextField({ required: true, minLength: 3, maxLength: 100 }) name
name: [
  { context: 'read',  label: 'Name', component: <TextLabel /> },
  { context: 'write', label: 'Name', component: <TextInput placeholder="Enter project name" /> },
],
```

### Text field with prepend icon

```tsx
// backend: @TextField({ required: true, regex: /^[A-Z]{2,5}-\d{1,5}$/ }) code
code: [
  { context: 'read',  component: <TextLabel /> },
  { context: 'write', component: <TextInput placeholder="Enter project code" prependIcon="CodeOutlined" /> },
],
```

### Automatic calculated text field (read-only)

```tsx
// backend: @TextField({ calculation: 'automatic' }) get summary()
summary: { context: 'all', component: <TextLabel /> },
```

### Email field with copy button

```tsx
// backend: @EmailField({ required: true }) email
email: [
  { context: 'read',  component: <EmailLabel copyButton /> },
  { context: 'write', component: <EmailInput placeholder="Enter support email" prependIcon="MailOutlined" /> },
],
```

### HTML field with preview and rich editor

```tsx
// backend: @HtmlField({ maxLength: 5000 }) description
description: [
  { context: 'read',  component: <HtmlBlock previewCharacters={200} /> },
  { context: 'write', component: <HtmlEditor height="300px" /> },
],
```

### Long text field with text area

```tsx
// backend: @LongTextField({ maxLength: 5000 }) description
description: [
  { context: 'read',  component: <LongTextLabel limitCharacters={5000} height="100px" control="textArea" textAlign="left" /> },
  { context: 'write', component: <LongTextInput control="textArea" limitCharacters={5000} height="150px" placeholder="Enter task description" /> },
],
```

### Long text field with code editor

```tsx
// backend: @LongTextField() technicalDetails
technicalDetails: [
  { context: 'all', label: 'Technical Details', component: <LongTextInput control="codeEditor" language="markdown" height="200px" /> },
  { context: { usage: 'table' }, component: <LongTextLabel height="30px" /> },
],
```

### Navigation paths to associated skills

| Associated Skill | When to navigate | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-datamodels](../backend-datamodels/SKILL.md) | Text field validation, indexing, requiredness, persistence. | This file focuses on text UI components, not model field rules. |
| [frontend-datamodels](../frontend-datamodels/SKILL.md) | The field-config mechanism these entries live in. | This file is the component catalog, not the config mechanism. |
| [frontend-form-views](../frontend-form-views/SKILL.md) | Conditional rendering or form lifecycle around text fields. | This file does not define form orchestration. |

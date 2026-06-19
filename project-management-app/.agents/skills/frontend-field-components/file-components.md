# File components

> Part of the [frontend-field-components](./SKILL.md) skill. File fields are `@ReferenceField({ type: () => File })` references to a class extending `AppFile` — model/storage rules live in [backend-files](../backend-files/SKILL.md). This file covers only the UI components.

## Available components

| Component | Mode | Description |
| --- | --- | --- |
| `<FileLabel>` | Read | Download link with metadata |
| `<FileInput>` | Write | Click-to-upload control |
| `<FileDropZone>` | Write | Drag-and-drop upload area |

## Props reference

**`<FileLabel>`**:

- `downloadLabel?: string`
- `showSize?: boolean`
- `showDate?: boolean`

**`<FileInput>` / `<FileDropZone>`**:

- `maxSize?: number` — max file size in bytes
- `acceptedTypes?: string[]` — MIME types or extensions
- `maxFiles?: number` — for array fields
- `uploadText?: string`, `uploadHint?: string`

> Upload constraints (`maxSize`, `acceptedTypes`) can also be declared backend-side via `fileOptions` on the `@ReferenceField` — see [backend-files](../backend-files/SKILL.md). Prefer one source; do not duplicate conflicting limits.

## Examples

> Field entries inside `app.registerDataModel<Model>('Model', { fields: { … } })`.

### File attachments (array)

```tsx
// backend: @ReferenceField({ type: () => File }) attachments!: File[]
attachments: [
  { context: 'read',  label: 'Attachments', component: <FileLabel showSize showDate /> },
  {
    context: 'write',
    label: 'Attachments',
    component: (
      <FileDropZone
        acceptedTypes={['image/*', '.pdf', '.doc', '.docx', '.txt']}
        maxSize={10485760}
        maxFiles={10}
      />
    ),
  },
],
```

### Single file

```tsx
// backend: @ReferenceField({ type: () => File }) pdfDocument!: File | null
pdfDocument: [
  { context: 'read',  component: <FileLabel downloadLabel="Download invoice" showSize showDate /> },
  { context: 'write', component: <FileInput acceptedTypes={['.pdf', 'application/pdf']} maxSize={10485760} uploadText="Upload invoice PDF" uploadHint="PDF only, max 10MB" /> },
],
```

### Navigation paths to associated skills

| Associated Skill | When to navigate | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-files](../backend-files/SKILL.md) | Modeling uploaded files, storage, `AppFile` references. | This file covers file UI only, not model/storage rules. |
| [backend-datamodels](../backend-datamodels/SKILL.md) | File reference field definitions. | This file does not define field persistence contracts. |
| [frontend-form-views](../frontend-form-views/SKILL.md) | Upload components in form save/refresh lifecycle. | This file does not define form lifecycle integration. |

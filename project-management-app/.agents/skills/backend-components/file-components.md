# File components

**Field decorator**: `@ReferenceField` with `type: () => File`

File fields are always `@ReferenceField` references pointing to a class that extends `AppFile`. See the **backend-files** skill for model definition. This section covers only the UI component configuration.

## Available factories

| Factory               | Component ID    | Mode  | Description                 |
| --------------------- | --------------- | ----- | --------------------------- |
| `fileLabel(opts?)`    | `file.label`    | Read  | Download link with metadata |
| `fileInput(opts?)`    | `file.input`    | Write | Click-to-upload control     |
| `fileDropZone(opts?)` | `file.dropZone` | Write | Drag-and-drop upload area   |

## Options reference

**`FileLabelComponentOptions`** — extends `FileTypeUiOptions` + `FileTypeOptions`:

- `downloadLabel?: string`
- `showSize?: boolean`
- `showDate?: boolean`
- `uploadText?: string`
- `uploadHint?: string`
- `maxSize?: number` — max file size in bytes
- `acceptedTypes?: string[]` — MIME types or extensions
- `maxFiles?: number` — for array fields

**`FileInputComponentOptions`** — extends `FileTypeOptions` + `FileTypeUiOptions`:

- `maxSize?: number` — max file size in bytes
- `acceptedTypes?: string[]` — MIME types or extensions
- `maxFiles?: number` — for array fields
- `uploadText?: string`, `uploadHint?: string`

**`FileDropZoneComponentOptions`** — same as `FileInputComponentOptions`, rendered as drag-and-drop area.

## Copilot-optimized examples

### File attachments (array)

```typescript
@ReferenceField({
  type: () => File,
  docs: 'File attachments for this task',
})
attachments!: File[];
```

### Single file with `fileOptions` on the decorator

```typescript
@ReferenceField({
  type: () => File,
  fileOptions: {
    maxSize: 10 * 1024 * 1024,
    acceptedTypes: ['.pdf', 'application/pdf'],
  },
})
pdfDocument!: File | null;
```

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| backend-files | If you need to model uploaded files, storage behavior, and file-reference entities. | This file covers file UI components only, not `AppFile` model and storage rules. |
| backend-datamodels | If file references require data model field definitions and decorators. | This file does not define field-level persistence and validation contracts. |
| frontend-form-views | If upload components must participate in form save/refresh lifecycle behaviors. | This file does not define form lifecycle integration patterns. |

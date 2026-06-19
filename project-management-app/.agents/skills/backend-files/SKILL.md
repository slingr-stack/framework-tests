---
name: backend-files
description: Essential skill for Drumr Framework. Teaches the EXACT structure of file handling in backend app code - AppFile, file references, upload/download behavior, and storage configuration. Prevents hallucinating generic file libraries.
metadata:
  applies-to:
    - core/backend/src/files/
---

# Backend skill: files

## Purpose

Use this skill when the user asks about:

- Defining the app File model (`class File extends AppFile`)
- Upload/download behavior for file fields in data models
- File references with `@ReferenceField({ type: () => File })` (single or arrays)
- File validation/UI options via `fileOptions`
- Storage configuration variables (`STORAGE_TYPE`, `STORAGE_PATH`)

This skill is focused on app-level implementation patterns using the framework public API.

## Core concepts

### Always create a concrete file model

`AppFile` is abstract. In app code, create a concrete model and reference that class.

```typescript
import { AppFile, DataModel, TextField } from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';

@DataModel({
  dataSource: MainDs,
  docs: 'System file model for storing uploads',
  crud: {
    api: 'gql',
    actions: ['create', 'findById', 'findBy', 'update', 'deleteById'],
  },
  ui: {
    crud: { api: 'gql', actions: ['crud', 'refresh'] },
  },
})
export class File extends AppFile {
  @TextField({ docs: 'Optional description' })
  description!: string | null;
}
```

### Use the concrete file class in references

Do not reference `AppFile` directly in relationship fields.

```typescript
import { BaseDataModel, DataModel, TextField, ReferenceField, UuidField } from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';
import { File } from '@/shared/data-models/file.data-model';

@DataModel({ dataSource: MainDs })
export class Invoice extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

  @TextField({ required: true, maxLength: 100 })
  invoiceNumber!: string;

  @ReferenceField({
    type: () => File,
    fileOptions: {
      maxSize: 10 * 1024 * 1024,
      acceptedTypes: ['.pdf', 'application/pdf'],
    },
  })
  pdfDocument!: File | null;

  @ReferenceField({
    type: () => File,
    fileOptions: {
      maxFiles: 5,
      acceptedTypes: ['image/*', '.pdf'],
    },
  })
  attachments!: File[];
}
```

### Runtime API behavior (verified)

- Routes are relative to your app backend base URL (for example, `https://api.my-app.com` or `http://localhost:4000`).
- `POST /files` uploads binary data (`multipart/form-data`, field `file`) and accepts optional `metadata` JSON string.
- Upload size limit is 100MB by default.
- `GET /data/:model/:id/files/:fileId` is the context-aware download route.
- Downloads enforce object access + field-level read permission and reject orphaned files.
- For security, some denied download scenarios return generic `404 Not found` responses.

Portable examples (no local framework source required):

```bash
# Upload (relative route: /files)
curl -X POST "<BACKEND_BASE_URL>/files" \
	-F "file=@/path/to/invoice.pdf" \
	-F 'metadata={"description":"Invoice PDF"}'

# Download with object context (relative route: /data/:model/:id/files/:fileId)
curl "<BACKEND_BASE_URL>/data/Invoice/<INVOICE_ID>/files/<FILE_ID>" --output invoice.pdf
```

### Security and permissions model

For file flows, guide users to permission definitions that include both object and field-level rules:

```typescript
import { app } from '@drumr/framework-backend';
import { Project } from '@/projects/data-models/project.data-model';

app.defineGlobalPermissions((user, { can }) => {
  can('access', Project, { owner: { id: { eq: user.id } } });
  can('read', Project, ['id', 'name', 'coverImage']);
});
```

If a user cannot read the field that references the file, download is denied even when the object exists.

### File upload + model linkage pattern

Recommended flow:

1. Upload file binary through `POST /files`.
2. Receive `fileId` in response.
3. Save that `fileId` in a GraphQL create/update operation on a file reference field.

```graphql
mutation ProjectUpdate($input: ProjectUpdateInput!) {
  ProjectUpdate(input: $input) {
    ... on ProjectType {
      id
      coverImage {
        id
        name
      }
    }
  }
}
json
{
  "input": {
    "id": "project-id",
    "coverImage": "uploaded-file-id"
  }
}
```

## Storage configuration

Files use the storage service configured through environment variables:

- `STORAGE_TYPE`: storage provider (`local` by default)
- `STORAGE_PATH`: folder for local provider (`./files` by default)

Current framework status:

- `local` is implemented and ready for use.
- `gcs` and `s3` are planned but not implemented yet (selecting them currently fails with configuration errors).

## Usage notes & copilot guidelines

- Start from a concrete `File extends AppFile` model (e.g., `src/shared/data-models/file.data-model.ts`).
- For file fields, use `@ReferenceField({ type: () => File, fileOptions: { ... } })`.
- Prefer `fileOptions` for validation and UI hints: `maxSize`, `acceptedTypes`, `maxFiles`, and `ui` settings.
- Do not recommend direct download routes like `/files/:fileId`; use the context-aware route.
- When documenting routes, always write them as relative paths + `<BACKEND_BASE_URL>` to avoid local-environment assumptions.
- Keep suggestions on public APIs consumed by app developers; do not require reading framework internals.
- Never suggest `@ReferenceField({ type: () => AppFile })` in generated code.
- **ALWAYS add explicit permissions for the `File` model whenever any data model has a file field.** Without these permissions, users will receive errors when attempting to upload or view attachments, even if they have full access to the parent record. Always include at minimum:

```typescript
import { File } from '@/shared/data-models/file.data-model';

app.definePermissionsForRole(Role.SomeRole, (user, { can }) => {
  // Required for file upload and download to work
  can('access', File);
  can('create', File);
  can('read', File);
  // Also grant write if users need to update file metadata
  // can('write', File);
});
```

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [frontend-field-components](../frontend-field-components/SKILL.md) | If file fields need concrete UI component configuration (`<FileLabel>`, `<FileInput>`, `<FileDropZone>`) for forms and labels. | This skill covers file modeling and options, not the frontend UI component catalog. |
| [backend-datamodels](../backend-datamodels/SKILL.md) | If file references must be integrated into broader model structures and validations. | This skill focuses on file entities, not complete generic data model architecture. |
| [backend-auth](../backend-auth/SKILL.md) | If file read/write access must follow permission and role constraints. | This skill contains isolated examples but not full authorization policy patterns. |

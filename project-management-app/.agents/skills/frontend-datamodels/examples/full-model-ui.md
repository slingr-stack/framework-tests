# Full model UI example: `app.registerDataModel`

> Part of the [frontend-datamodels](../SKILL.md) skill. This is the frontend UI counterpart of the backend [Project model](../../backend-datamodels/examples/full-model.md).

Demonstrates declarative UI for every field type with `app.registerDataModel()`: `labelField`, default CRUD views, context-aware read/write entries, and the JSX field components `<TextLabel>`/`<TextInput>`, `<ChoiceLabel>`/`<ChoiceDropdown>`, `<HtmlBlock>`/`<HtmlEditor>`, `<MoneyLabel>`/`<MoneyInput>`.

The backend model owns the schema, `crud`, and `validation`. The frontend owns everything below. Config files use `.tsx` because components are JSX.

---

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
  },
});
```

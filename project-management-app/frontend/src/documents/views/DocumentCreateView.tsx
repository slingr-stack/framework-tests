import { CreateView, closeView, DataField } from '@drumr/framework-frontend';
import React from 'react';

export function DocumentCreateView() {
  return (
    <CreateView<Document>
      model="Document"
      header={{ title: 'New Document' }}
      onSaved={() => closeView({ executed: true })}
    >
      <DataField name="title" />
      <DataField name="content" />
      <DataField name="status" />
      <DataField name="createdAt" />
    </CreateView>
  );
}

export default DocumentCreateView;

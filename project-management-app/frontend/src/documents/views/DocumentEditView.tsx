import { closeView, EditView } from '@drumr/framework-frontend';
import React from 'react';

// The framework's EditView auto-resolves :id from route params when not
// provided as a prop, so no wrapper component is needed.

interface Props {
  id?: string;
}

export default function DocumentEditView({ id }: Props = {}) {
  return (
    <EditView
      model="Document"
      id={id}
      fields={{ title: true, content: true, status: true, createdAt: true }}
      refreshTriggers={['title', 'content', 'status', 'createdAt']}
      header={{ title: 'Edit Document' }}
      onSaved={() => closeView({ executed: true })}
    />
  );
}

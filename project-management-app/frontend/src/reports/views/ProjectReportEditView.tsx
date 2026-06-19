import { closeView, EditView } from '@drumr/framework-frontend';
import React from 'react';

interface Props {
  id: string;
}

export function ProjectReportEditView({ id }: Props) {
  return (
    <EditView
      model="ProjectReport"
      id={id}
      header={{ title: 'Edit Project Report' }}
      onSaved={() => closeView({ executed: true })}
    />
  );
}

export default ProjectReportEditView;

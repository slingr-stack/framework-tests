import {
  closeView,
  EditView,
  ReferenceBoxSelector,
} from '@drumr/framework-frontend';
import React from 'react';

interface Props {
  id: string;
}

export function ProjectEditView({ id }: Props) {
  return (
    <EditView
      model="Project"
      id={id}
      header={{
        title: 'Edit Project',
        breadcrumb: [{ label: 'Projects', to: '/projects' }, { label: 'Edit' }],
      }}
      fieldOverrides={{
        teamMembers: { component: <ReferenceBoxSelector name="teamMembers" /> },
      }}
      refreshTriggers={[
        'name',
        'code',
        'support',
        'status',
        'manager',
        'meetingTime',
      ]}
      onSaved={() => closeView({ executed: true })}
    />
  );
}

export default ProjectEditView;

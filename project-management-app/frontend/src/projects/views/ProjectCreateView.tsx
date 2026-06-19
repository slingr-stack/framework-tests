import { CreateView } from '@drumr/framework-frontend';
import React from 'react';

export function ProjectCreateView() {
  return (
    <CreateView
      model="Project"
      refreshTriggers={['name', 'code', 'support', 'status', 'manager']}
      header={{
        breadcrumb: ['Projects', 'New Project'],
      }}
    />
  );
}

export default ProjectCreateView;

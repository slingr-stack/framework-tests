import { CreateView, closeView } from '@drumr/framework-frontend';
import React from 'react';

export function ProjectReportCreateView() {
  return (
    <CreateView
      model="ProjectReport"
      header={{ title: 'New Project Report' }}
      onSaved={() => closeView({ executed: true })}
    />
  );
}

export default ProjectReportCreateView;

import { ReadView } from '@drumr/framework-frontend';
import React from 'react';

interface Props {
  id: string;
}

export function ProjectReportReadView({ id }: Props) {
  return (
    <ReadView
      model="ProjectReport"
      id={id}
      header={{ title: 'Project Report' }}
    />
  );
}

export default ProjectReportReadView;

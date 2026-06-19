import type { ActionResponse } from '@drumr/framework-frontend';
import { ActionView, getApp } from '@drumr/framework-frontend';
import React from 'react';

export function ArchiveCompletedProjectsView() {
  const handleExecuted = (response: ActionResponse) => {
    const app = getApp();
    if (response.executed) {
      app.message.success('Archiving completed successfully.');
    } else if (response.error) {
      app.message.error(
        `Archiving failed (transaction rolled back): ${response.error}`,
      );
    }
  };

  return (
    <ActionView action="ArchiveCompletedProjects" onExecuted={handleExecuted} />
  );
}

export default ArchiveCompletedProjectsView;

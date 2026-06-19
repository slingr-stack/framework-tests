import type { ActionResponse } from '@drumr/framework-frontend';
import { ActionView, getApp } from '@drumr/framework-frontend';
import React from 'react';

export function GenerateReportView() {
  const handleExecuted = (response: ActionResponse) => {
    const app = getApp();
    if (response.executed) {
      console.info(
        '[GenerateReportView] Workflow finished successfully:',
        response,
      );
      app.notification.success({
        message: 'Report Generated',
        description: 'The report has been generated successfully.',
      });
    } else {
      app.notification.error({
        message: 'Report Generation Failed',
        description: 'There was an error generating the report.',
      });
      console.error('[GenerateReportView] Action execution failed:', response);
    }
  };

  return <ActionView action="GenerateReport" onExecuted={handleExecuted} />;
}

export default GenerateReportView;

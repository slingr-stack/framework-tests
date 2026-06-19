/**
 * View for the StartReportInBackground action.
 *
 * This action is a regular (non-workflow) action that returns a workflow ID.
 * The framework detects the workflowId in the response and registers it in the
 * notification center automatically (via defineActionDefaults blockingExecution: false).
 * The view only needs to show the immediate "started" toast.
 *
 * This demonstrates issue #887: manually tracking a workflow in the notifications.
 */

import type { Mutation, StartReportResult } from '@gql';
import {
  type ActionResponse,
  ActionView,
  getApp,
  registerWorkflow,
} from '@drumr/framework-frontend';
import React from 'react';

export function StartReportInBackgroundView() {
  const handleExecuted = (response: ActionResponse) => {
    const app = getApp();
    if (!response.executed) {
      if (response.error) {
        app.message.error(`Failed to start report: ${response.error}`);
      }
      return;
    }

    if (response.responseType === 'workflow') {
      // Framework (useActionViewExecution Format 4) already registered the workflow
      // in the notification center via defineActionDefaults. Just notify the user.
      app.message.info(
        'Report started in background. Check the notifications bell for progress.',
      );
      return;
    }

    if (response.responseType === 'data') {
      // Legacy path: framework did not detect the workflowId automatically,
      // register it manually so the bell shows it.
      const result = (
        response.data as Pick<Mutation, 'StartReportInBackground'>
      ).StartReportInBackground as StartReportResult | null | undefined;
      const workflowId = result?.workflowId;
      if (!workflowId) return;

      registerWorkflow({
        workflowId,
        actionName: 'Background Report',
        dialogOpen: false,
      });

      app.message.info(
        'Report started in background. Check the notifications bell for progress.',
      );
    }
  };

  return (
    <ActionView action="StartReportInBackground" onExecuted={handleExecuted} />
  );
}

export default StartReportInBackgroundView;

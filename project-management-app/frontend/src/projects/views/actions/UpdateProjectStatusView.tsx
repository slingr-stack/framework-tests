import type { ActionResponse } from '@drumr/framework-frontend';
import { ActionView, closeView } from '@drumr/framework-frontend';
import { App } from 'antd';
import React, { useEffect } from 'react';

interface Props {
  id: string;
}

export function UpdateProjectStatusView({ id }: Props) {
  const { message } = App.useApp();

  useEffect(() => {
    console.log('[UpdateProjectStatusView] View loaded for project:', id);
  }, [id]);

  const handleBeforeExecute = async (): Promise<boolean> => {
    console.log(
      '[UpdateProjectStatusView] beforeExecute: proceeding with execution.',
    );
    message.info('Updating project status...');
    return true;
  };

  const handleExecuted = (response: ActionResponse) => {
    console.log('[UpdateProjectStatusView] afterExecuted: Action completed.');
    if (response.executed) {
      message.success('After execute !');
    } else if (response.error) {
      message.error(`Failed to update status: ${response.error}`);
    }
    closeView({ executed: true });
  };

  return (
    <ActionView
      action="UpdateProjectStatus"
      model="Project"
      id={id}
      beforeExecute={handleBeforeExecute}
      onExecuted={handleExecuted}
    />
  );
}

export default UpdateProjectStatusView;

import type { ActionResponse } from '@drumr/framework-frontend';
import { ActionView, closeView } from '@drumr/framework-frontend';
import { App } from 'antd';
import React from 'react';

interface Props {
  id: string;
}

export function InitializeProjectView({ id }: Props) {
  const { message } = App.useApp();

  const handleExecuted = (response: ActionResponse) => {
    if (response.executed) {
      message.success('Project initialized successfully.');
    } else if (response.error) {
      message.error(
        `Initialization failed (transaction rolled back): ${response.error}`,
      );
    }
    closeView({ executed: true });
  };

  return (
    <ActionView
      action="InitializeProject"
      model="Project"
      id={id}
      onExecuted={handleExecuted}
    />
  );
}

export default InitializeProjectView;

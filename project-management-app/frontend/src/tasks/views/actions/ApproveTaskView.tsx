import { ActionView } from '@drumr/framework-frontend';
import React from 'react';

interface Props {
  id: string;
}

export function ApproveTaskView({ id }: Props) {
  return (
    <ActionView
      action="ApproveTask"
      model="Task"
      id={id}
      refreshTriggers={['assignee']}
    />
  );
}

export default ApproveTaskView;

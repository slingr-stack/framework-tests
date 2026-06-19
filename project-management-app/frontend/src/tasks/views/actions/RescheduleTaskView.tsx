import type { ActionResponse } from '@drumr/framework-frontend';
import { ActionView, closeView } from '@drumr/framework-frontend';
import { App } from 'antd';
import React, { useMemo } from 'react';

interface Props {
  id: string;
}

export function RescheduleTaskView({ id }: Props) {
  const { message } = App.useApp();

  const initialData = useMemo(() => ({ extensionDays: 7 }), []);

  const handleExecuted = (response: ActionResponse) => {
    if (response.executed && response.responseType === 'data') {
      const payload = (response.data as any)?.TaskRescheduleTask;
      const msg = payload?.dueDate
        ? `Task rescheduled — new due date: ${payload.dueDate}`
        : 'Task rescheduled successfully.';
      message.success(msg);
    }
    closeView({ executed: true });
  };

  return (
    <ActionView
      action="RescheduleTask"
      model="Task"
      id={id}
      initialData={initialData}
      onExecuted={handleExecuted}
    />
  );
}

export default RescheduleTaskView;

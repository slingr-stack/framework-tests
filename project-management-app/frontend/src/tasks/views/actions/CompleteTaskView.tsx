import { Task } from '@gql/types';
import { ActionView, DataField } from '@drumr/framework-frontend';
import { Alert, Space } from 'antd';
import React from 'react';

interface TaskActionViewProps {
  id?: string;
  targetObject?: Task;
}

function getTaskTitle(targetObject?: Task): string {
  console.log('getTaskTitle called with targetObject:', targetObject);
  const title = targetObject?.title ? targetObject.title : 'Task not found';
  return title;
}

function formatTaskExecuteLabel(
  baseLabel: string,
  targetObject?: Task,
): string {
  const title = getTaskTitle(targetObject);

  return title ? `${baseLabel}: ${title}` : baseLabel;
}

function formatTaskHeaderTitle(baseLabel: string, targetObject?: Task): string {
  const title = getTaskTitle(targetObject);

  return title ? `${baseLabel}: ${title}` : 'notfound';
}

export default function CompleteTaskView({
  id,
  targetObject,
}: TaskActionViewProps) {
  return (
    <ActionView
      action="CompleteTask"
      model="Task"
      id={id}
      header={{
        title: formatTaskHeaderTitle('Complete', targetObject),
      }}
      executeLabel={formatTaskExecuteLabel('Complete task', targetObject)}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="large">
        <Alert
          message="Complete Task"
          description="This task will be marked as done and the completion time will be recorded. You cannot undo this action. Optionally add a completion note below."
          type="warning"
          showIcon
        />
        <DataField name="note" />
      </Space>
    </ActionView>
  );
}

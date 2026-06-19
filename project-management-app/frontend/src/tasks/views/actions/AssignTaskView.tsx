import { ActionView } from '@drumr/framework-frontend';
import React from 'react';

interface TaskActionViewProps {
  id?: string;
  targetObject?: Record<string, unknown>;
}

function getTaskTitle(targetObject: unknown): string {
  const title =
    typeof targetObject === 'object' &&
    targetObject !== null &&
    typeof (targetObject as { title?: unknown }).title === 'string'
      ? (targetObject as { title: string }).title.trim()
      : '';

  return title;
}

function formatTaskExecuteLabel(
  baseLabel: string,
  targetObject: unknown,
): string {
  const title = getTaskTitle(targetObject);

  return title ? `${baseLabel}: ${title}` : baseLabel;
}

function formatTaskHeaderTitle(
  baseLabel: string,
  targetObject: unknown,
): string {
  const title = getTaskTitle(targetObject);

  return title ? `${baseLabel}: ${title}` : baseLabel;
}

export default function AssignTaskView({
  id,
  targetObject,
}: TaskActionViewProps) {
  return (
    <ActionView
      action="AssignTask"
      model="Task"
      id={id}
      targetObject={targetObject}
      header={{
        title: formatTaskHeaderTitle('Assign', targetObject),
      }}
      executeLabel={formatTaskExecuteLabel('Assign', targetObject)}
      refreshMode="auto"
    />
  );
}

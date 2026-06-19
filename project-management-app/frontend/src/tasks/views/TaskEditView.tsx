import { EditView, getApp } from '@drumr/framework-frontend';
import React from 'react';
import { handleTaskRefresh, TaskFormLayout } from './helpers/taskFormLayout';

export function TaskEditView({ id: idProp }: { id?: string } = {}) {
  const { useParams } = require('@umijs/max') as {
    useParams: () => Record<string, string>;
  };
  const routeParams = useParams();
  const id = idProp ?? routeParams?.id;
  console.log(
    'TaskEditView render with routeParams:',
    routeParams,
    'and idProp:',
    idProp,
  );
  return (
    <EditView
      model="Task"
      id={id}
      refreshMode="custom"
      onRefresh={handleTaskRefresh}
      beforeSave={async (values: Record<string, unknown>) => {
        const status = values.status as string | undefined;
        const title = values.title as string | undefined;
        console.log(
          '[TaskEditView] beforeSave: title:',
          title,
          'status:',
          status,
        );
        if (status === 'done') {
          getApp().message.warning(
            `"${title}" is done and cannot be edited. Reopen the task first.`,
          );
          return false;
        }
        getApp().message.info(`Saving "${title}"...`);
        return true;
      }}
      onError={(err: { message: string }) => {
        getApp().message.error(`Failed to save: ${err.message}`);
      }}
    >
      <div className="alert alert-info mb-3" role="alert">
        <strong>Note:</strong> This is a custom alert message for task editing.
      </div>
      <TaskFormLayout />
    </EditView>
  );
}
export default TaskEditView;

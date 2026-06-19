import { useApolloClient } from '@apollo/client/react';
import type { Task } from '@gql';
import {
  CreateView,
  closeView,
  getApp,
  toolbar,
} from '@drumr/framework-frontend';
import React from 'react';
import { TaskFormLayout } from './helpers/taskFormLayout';

export function TaskCreateView() {
  const apolloClient = useApolloClient();

  return (
    <CreateView
      model="Task"
      refreshMode="auto"
      header={{
        toolbar: { buttons: [toolbar.objectAction('AssignTask')] },
      }}
      beforeSave={async () => {
        console.log('[TaskCreateView] beforeCreate: Submitting new task...');
        return true;
      }}
      onSaved={(result?: unknown) => {
        const response = result as
          | { executed: boolean; data?: Task; error?: string }
          | undefined;
        console.log(
          '[TaskCreateView] afterCreated: Task creation completed.',
          response,
        );
        if (response?.executed !== false) {
          const title = (response?.data as Task)?.title ?? 'Task';
          getApp().message.success(`"${title}" created successfully!`);
          void apolloClient.refetchQueries({
            include: ['ProjectFindBy', 'TaskFindBy', 'UserFindBy'],
          });
          closeView({
            returnData: { executed: true, data: response?.data ?? result },
          });
        }
      }}
    >
      <TaskFormLayout />
    </CreateView>
  );
}

export default TaskCreateView;

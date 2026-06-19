import type { Task } from '@gql/types';
import type { ActionResponse } from '@drumr/framework-frontend';
import {
  DataTable,
  type DataTableRef,
  dataTable,
  getApp,
  toolbar,
  View,
} from '@drumr/framework-frontend';
import { Card } from 'antd';
import React, { useCallback, useRef } from 'react';
import TaskEditView from './TaskEditView';
import TaskReadView from './TaskReadView';

export function PendingTasksView() {
  const tableRef = useRef<DataTableRef>(null);

  const showPendingTasksModal = useCallback((tasks: Task[]) => {
    const data = tasks as unknown as Record<string, unknown>[];

    getApp().modal.info({
      title: 'Pending Tasks',
      width: 1260,
      content: (
        <DataTable
          model="Task"
          loadData={() => ({ data })}
          columns={[
            { field: 'title', title: 'Title', sorting: true, filtering: true },
            {
              field: 'status',
              title: 'Status',
              sorting: true,
              filtering: true,
            },
            {
              field: 'priority',
              title: 'Priority',
              sorting: true,
              filtering: true,
            },
            {
              field: 'dueDate',
              title: 'Due Date',
              sorting: true,
              filtering: true,
            },
            {
              field: 'estimatedHours',
              title: 'Est. Hours',
              sorting: true,
              filtering: true,
            },
          ]}
          pagination={{ pageSize: 10 }}
          rowToolbar={{
            buttons: [
              toolbar.view<Task>({
                elementId: 'pending-view-detail',
                view: TaskReadView,
                label: 'View detail',
                container: 'modal',
                modalSize: 'big',
                params: (record) => ({ id: record?.id }),
              }),
              toolbar.view<Task>({
                elementId: 'pending-edit-task',
                view: TaskEditView,
                label: 'Update',
                container: 'modal',
                modalSize: 'big',
                params: (record) => ({ id: record?.id }),
              }),
              toolbar.deleteAction(),
            ],
          }}
        />
      ),
      okText: 'Close',
    });
  }, []);

  const handleShowPendingTasks = useCallback(
    (response: ActionResponse): void => {
      if (
        response.executed &&
        response.responseType === 'data' &&
        'data' in response &&
        response.data
      ) {
        const nestedData = response.data as Record<string, unknown>;
        const rawData = nestedData.TaskGetPendingTasks;
        const data = Array.isArray(rawData) ? (rawData as Task[]) : [];
        showPendingTasksModal(data);
      }
    },
    [showPendingTasksModal],
  );

  return (
    <View
      header={{
        title: 'Pending Tasks',
        subTitle: 'View all tasks that are To Do, In Progress, or In Review',
        toolbar: {
          buttons: [
            toolbar.modelAction('DailyInactiveTasksCleanup', {
              label: 'Cleanup Inactive Tasks',
              style: 'primary',
              afterExecution: handleShowPendingTasks,
            }),
          ],
        },
      }}
    >
      <Card>
        <DataTable
          ref={tableRef}
          options={dataTable.options<Task>({
            model: 'Task',
            columns: [
              {
                field: 'title',
                title: 'Task Title',
                sorting: true,
                filtering: true,
              },
              {
                field: 'status',
                title: 'Status',
                sorting: true,
                filtering: true,
              },
              {
                field: 'priority',
                title: 'Priority',
                sorting: true,
                filtering: true,
              },
              {
                field: 'assignee',
                title: 'Assignee',
                sorting: true,
                filtering: true,
              },
              {
                field: 'project',
                title: 'Project',
                sorting: true,
                filtering: true,
              },
              {
                field: 'dueDate',
                title: 'Due Date',
                sorting: true,
                filtering: true,
              },
              {
                field: 'estimatedHours',
                title: 'Est. Hours',
                sorting: true,
                filtering: true,
              },
              {
                field: 'actualHours',
                title: 'Actual Hours',
                sorting: true,
                filtering: true,
              },
            ],
            pagination: { pageSize: 10 },
            selection: { enabled: true, type: 'multiple' },
            rowToolbar: {
              buttons: toolbar<Task>(),
            },
            filters: {
              status: {
                in: ['to_do' as any, 'in_progress' as any, 'in_review' as any],
              },
            },
          })}
        />
      </Card>
    </View>
  );
}

export default PendingTasksView;

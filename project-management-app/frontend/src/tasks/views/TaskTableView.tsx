import { CheckSquareOutlined } from '@ant-design/icons';
import type { Task } from '@gql';
import type { ActionResponse, DataTableRef } from '@drumr/framework-frontend';
import {
  getApp,
  openView,
  TableView,
  toolbar,
} from '@drumr/framework-frontend';
import { Space, Tag } from 'antd';
import React, { useCallback, useRef } from 'react';
import UserReadView from '@/users/views/UserReadView';
import ImportTasksView from './actions/ImportTasksView';
import { BillableSwitch } from './helpers/BillableSwitch';
import TaskEstimateView from './TaskEstimateView';

export function TaskTableView() {
  const tableRef = useRef<DataTableRef>(null);

  const handleActionExecuted = useCallback(
    (response: ActionResponse, actionName: string) => {
      if (!response.executed) return;
      console.log(
        `[TaskTableView] After executed: Action "${actionName}" executed successfully. Handling post-action logic.`,
      );
      switch (actionName) {
        case 'StartTask':
          getApp().message.success('Task started!');
          break;
        case 'CompleteTask':
          getApp().message.success('Task completed!');
          break;
        case 'AssignTask':
          getApp().message.success('Task assigned successfully.');
          break;
      }
      tableRef.current?.refresh();
    },
    [],
  );

  return (
    <TableView<Task>
      ref={tableRef}
      tableOptions={
        {
          model: 'Task',
          columns: [
            {
              field: 'title',
              title: 'Title',
              sorting: true,
              filtering: true,
              render: (value: string | null | undefined) => (
                <span style={{ display: 'block', textAlign: 'left' }}>
                  {value ?? ''}
                </span>
              ),
            },
            {
              field: 'project',
              title: 'Project',
              sorting: true,
              filtering: true,
            },
            {
              field: 'project.code',
              title: 'Project Code',
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
              field: 'startedAt',
              title: 'Start Date',
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
              field: 'technicalDetails',
              title: 'Tech Details',
              sorting: false,
              filtering: false,
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
            {
              field: 'isBillable',
              sorting: true,
              filtering: true,
              title: 'Billable',
              onRender: (
                value: boolean | null | undefined,
                record: Task,
                uiFieldOptions: any,
              ) => (
                <BillableSwitch
                  taskId={String(record.id)}
                  checked={Boolean(value)}
                  uiFieldOptions={uiFieldOptions}
                />
              ),
            },
          ],
          pagination: { pageSize: 10 },
          selection: { enabled: true, type: 'multiple' },
          rowToolbar: {
            buttons: [
              toolbar<Task>({ actions: 'crud' }),
              toolbar.objectAction<Task>('CompleteTask', {
                modalPosition: 'right',
                modalSize: 'small',
              }),

              toolbar.objectAction<Task>('RescheduleTask', {
                modalPosition: 'right',
                modalSize: 'small',
              }),
              toolbar.objectAction<Task>('AssignTask', {
                container: 'modal',
                label: 'Assign (page)',
              }),
              toolbar.view<Task>({
                elementId: 'viewAssigneeDetails',
                view: UserReadView,
                label: 'Assignee details',
                container: 'modal',
                modalPosition: 'right',
                visible: (record: Task | undefined) =>
                  Boolean(record?.assignee?.id),
                params: (record: Task) => ({ id: record?.assignee?.id }),
              }),
            ],
          },
          tableToolbar: {
            buttons: [toolbar<Task>({ actions: 'all' })],
          },
          onRowClicked: (record: Task) => {
            openView('TaskReadView', {
              params: { id: record.id },
              container: 'modal',
              modalPosition: 'left',
              modalSize: 'big',
            });
          },
          onActionExecuted: handleActionExecuted,
        } as any
      }
      header={{
        breadcrumb: (
          <Space size={4}>
            <CheckSquareOutlined />
            <Tag color="processing">Tasks</Tag>
          </Space>
        ),
        title: 'Tasks',
        subTitle: 'Manage and track all tasks',
        toolbar: {
          buttons: [
            toolbar.view({
              elementId: 'estimateTask',
              view: TaskEstimateView,
              label: 'Estimate Task',
              container: 'page',
            }),
            toolbar.action({
              id: 'BulkChangePriority',
              action: 'BulkChangePriority',
              label: 'Bulk Change Priority',
              container: 'modal',
              modalPosition: 'center',
            }),
            toolbar.action({
              id: 'EvaluateTaskPriority',
              action: 'EvaluateTaskPriority',
              label: 'Evaluate Priority',
              container: 'modal',
              modalPosition: 'center',
            }),
            toolbar.action({
              id: 'ImportTasks',
              action: 'ImportTasks',
              label: 'Import Tasks',
              view: ImportTasksView,
              container: 'modal',
              modalPosition: 'center',
            }),
            toolbar.action<Task>({
              id: 'ApproveTask',
              action: 'ApproveTask',
              container: 'modal',
              label: 'Approve',
            }),
            toolbar<Task>({ exclude: 'crud' }),
          ],
        },
      }}
    />
  );
}

export default TaskTableView;

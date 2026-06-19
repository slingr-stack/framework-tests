import { type Task, TaskPriorityEnum } from '@gql';
import { dataTable, TableView } from '@drumr/framework-frontend';
import React from 'react';

export function HighPriorityTasksView() {
  return (
    <TableView<Task>
      header={{
        breadcrumb: 'High Priority Tasks',
      }}
      tableOptions={dataTable.options<Task>({
        model: 'Task',
        columns: [
          { field: 'title', title: 'Title', sorting: true, filtering: true },
          {
            field: 'project',
            title: 'Project',
            sorting: true,
            filtering: true,
          },
          { field: 'status', title: 'Status', sorting: true, filtering: true },
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
        ],
        pagination: { pageSize: 15 },
        filters: {
          priority: { eq: TaskPriorityEnum.High },
        },
      })}
    />
  );
}

export default HighPriorityTasksView;

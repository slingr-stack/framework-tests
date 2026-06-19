import { app } from '@drumr/framework-frontend';
import type {
  ProjectWhereInput,
  TaskSortInputInput,
  TaskWhereInput,
} from '../../../generated/gql/types';

export const taskSortInputDefaults = app.registerDataModel<TaskSortInputInput>(
  'TaskSortInput',
  {
    fields: {
      field: { label: 'Task Sort Field' },
      order: { label: 'Task Sort Order' },
    },
  },
);

export const taskWhereInputDefaults = app.registerDataModel<TaskWhereInput>(
  'TaskWhereInput',
  {
    fields: {
      taskStatus: { label: 'Task Status' },
    },
  },
);

export const projectWhereInputDefaults =
  app.registerDataModel<ProjectWhereInput>('ProjectWhereInput', {
    fields: {
      projectStatus: { label: 'Project Status' },
    },
  });

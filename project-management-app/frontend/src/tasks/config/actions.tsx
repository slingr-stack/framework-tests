import {
  RichApproveTaskParams,
  RichAssignTaskParams,
  RichBulkChangePriorityParams,
  RichCompleteTaskParams,
  RichImportTasksParams,
  RichSubmitEstimateParams,
} from '@gql';
import {
  app,
  BooleanToggle,
  ChoiceDropdown,
  LongTextInput,
  LongTextLabel,
  ReferenceDropdown,
  ReferenceLabel,
  TextInput,
  TextLabel,
} from '@drumr/framework-frontend';
import React from 'react';
import ApproveTaskView from '@/tasks/views/actions/ApproveTaskView';
import AssignTaskView from '@/tasks/views/actions/AssignTaskView';
import BulkChangePriorityView from '@/tasks/views/actions/BulkChangePriorityView';
import CloneTaskView from '@/tasks/views/actions/CloneTaskView';
import CompleteTaskView from '@/tasks/views/actions/CompleteTaskView';
import ImportTasksView from '@/tasks/views/actions/ImportTasksView';
import RescheduleTaskView from '@/tasks/views/actions/RescheduleTaskView';
import StartTaskView from '@/tasks/views/actions/StartTaskView';
import SubmitEstimateView from '@/tasks/views/actions/SubmitEstimateView';

export const assignTaskDefaults = app.registerAction<RichAssignTaskParams>({
  action: 'AssignTask',
  view: AssignTaskView,
  label: 'Assign task',
  params: {
    assignee: [
      {
        context: 'read',
        component: <ReferenceLabel />,
        labelField: 'email',
      },
      {
        context: 'write',
        component: (
          <ReferenceDropdown
            placeholder="Select assignee"
            sorting={{ email: 'asc' }}
          />
        ),
        labelField: 'email',
      },
    ],
  },
});

export const approveTaskDefaults = app.registerAction<RichApproveTaskParams>({
  action: 'ApproveTask',
  label: 'Approve Task',
  icon: 'CheckCircleOutlined',
  view: ApproveTaskView,
  successMessage: 'Task approved successfully',
  errorMessage: 'Could not approve the task',
  params: {
    comment: { label: 'Approval Comment' },
  },
});

export const archiveTaskDefaults = app.registerAction({
  action: 'ArchiveTask',
  label: 'Archive task',
});

export const bulkAssignToMeDefaults = app.registerAction({
  action: 'BulkAssignToMe',
  label: 'Assign to me',
  icon: 'UserAddOutlined',
});

export const dailyInactiveTasksCleanupDefaults = app.registerAction({
  action: 'DailyInactiveTasksCleanup',
  label: 'Cleanup Inactive Tasks',
  icon: 'ClearOutlined',
});

const PRIORITY_VALUE_METADATA = {
  low: { label: 'Low', color: 'green' },
  medium: { label: 'Medium', color: 'blue' },
  high: { label: 'High', color: 'orange' },
  critical: { label: 'Critical', color: 'red' },
} as const;

export const bulkChangePriorityDefaults =
  app.registerAction<RichBulkChangePriorityParams>({
    action: 'BulkChangePriority',
    label: 'Bulk change priority',
    view: BulkChangePriorityView,
    successMessage: 'Priority updated for all selected tasks',
    errorMessage: 'Failed to update priority',
    params: {
      priority: {
        label: 'Priority',
        component: <ChoiceDropdown valueMetadata={PRIORITY_VALUE_METADATA} />,
      },
      reason: {
        label: 'Reason (optional)',
        component: (
          <LongTextInput
            control="textArea"
            height="80px"
            placeholder="Add a reason (optional)"
          />
        ),
      },
    },
  });

export const cloneTaskDefaults = app.registerAction({
  action: 'CloneTask',
  label: 'Clone task',
  icon: 'CopyOutlined',
  view: CloneTaskView,
});

export const claimAndStartTaskDefaults = app.registerAction({
  action: 'ClaimAndStartTask',
  label: 'Claim and start task',
});

export const completeTaskDefaults = app.registerAction<RichCompleteTaskParams>({
  action: 'CompleteTask',
  label: 'Complete task',
  view: CompleteTaskView,
  params: {
    note: { label: 'Completion Note' },
  },
});

export const getPendingTasksDefaults = app.registerAction({
  action: 'GetPendingTasks',
  label: 'Pending Tasks',
  icon: 'ClockCircleOutlined',
});

export const importTasksDefaults = app.registerAction<RichImportTasksParams>({
  action: 'ImportTasks',
  label: 'Import Tasks',
  icon: 'UploadOutlined',
  view: ImportTasksView,
  blockingExecution: false,
  successMessage: 'Import Tasks completed successfully',
  errorMessage: 'Import Tasks failed',
  params: {
    tasksJson: [
      {
        context: 'read',
        component: <LongTextLabel control="textArea" height="200px" />,
      },
      {
        context: 'write',
        label: 'Tasks JSON',
        component: (
          <LongTextInput
            control="textArea"
            height="200px"
            placeholder='[{"title":"My task","priority":"high","projectId":"..."}]'
          />
        ),
      },
    ],
    defaultProjectId: [
      {
        context: 'read',
        component: <TextLabel />,
      },
      {
        context: 'write',
        label: 'Default Project ID',
        component: <TextInput placeholder="Optional fallback project ID" />,
      },
    ],
  },
});

export const rescheduleTaskDefaults = app.registerAction({
  action: 'RescheduleTask',
  label: 'Reschedule',
  icon: 'CalendarOutlined',
  view: RescheduleTaskView,
});

export const startTaskDefaults = app.registerAction({
  action: 'StartTask',
  label: 'Start task',
  view: StartTaskView,
});

export const submitEstimateDefaults =
  app.registerAction<RichSubmitEstimateParams>({
    action: 'SubmitEstimate',
    label: 'Submit for review',
    style: 'primary',
    view: SubmitEstimateView,
    params: {
      approved: {
        context: 'write',
        label: 'Approve estimate',
        component: <BooleanToggle trueLabel="Approve" falseLabel="Reject" />,
      },
      notes: [
        {
          context: 'read',
          component: <LongTextLabel height="60px" control="textArea" />,
        },
        {
          context: 'write',
          label: 'Notes',
          component: (
            <LongTextInput
              control="textArea"
              height="80px"
              placeholder="Add reviewer notes (optional)"
            />
          ),
        },
      ],
    },
  });

import {
  app,
  ReferenceDropdown,
  ReferenceLabel,
} from '@drumr/framework-frontend';
import React from 'react';
import ActivityLogView from '@/activityLog/views/ActivityLogView';
import ArchiveCompletedProjectsView from '@/global/views/ArchiveCompletedProjectsView';
import EvaluateTaskPriorityView from '@/global/views/EvaluateTaskPriorityView';
import GetDashboardSummaryView from '@/global/views/GetDashboardSummaryView';
import StartReportInBackgroundView from '@/global/views/StartReportInBackgroundView';

const EVALUATOR_CODE_VALUE_METADATA = {
  urgent: { label: 'Urgent' },
  overdue: { label: 'Overdue' },
} as const;

const ARCHIVE_STRATEGY_VALUE_METADATA = {
  soft: { label: 'Soft (mark as archived)' },
  hard: { label: 'Hard (permanently delete)' },
} as const;

const POST_ARCHIVE_ACTION_VALUE_METADATA = {
  none: { label: 'None' },
  exportCsv: { label: 'Export to CSV' },
  webhook: { label: 'Trigger Webhook' },
} as const;

export const archiveCompletedProjectsDefaults = app.registerAction({
  action: 'ArchiveCompletedProjects',
  label: 'Archive completed projects',
  view: ArchiveCompletedProjectsView,
  params: {
    minAgeDays: {
      label: 'Minimum Age (days)',
      componentOptions: { showControls: true },
    },
    maxBudget: { label: 'Max Budget Threshold' },
    archiveBeforeDate: { label: 'Archive Before Date' },
    notifyOnCompletion: { label: 'Notify on Completion' },
    notificationEmail: { label: 'Notification Email' },
    batchSize: { label: 'Batch Size' },
    retryOnFailure: { label: 'Retry on Failure' },
    completedAfterDate: { label: 'Completed After Date' },
    auditTag: { label: 'Audit Tag' },
    costCentreOverride: { label: 'Cost Centre Override' },
    postArchiveAction: {
      label: 'Post-archive Action',
      componentOptions: {
        valueMetadata: POST_ARCHIVE_ACTION_VALUE_METADATA,
      },
    },
    strategy: {
      label: 'Archive Strategy',
      componentOptions: {
        valueMetadata: ARCHIVE_STRATEGY_VALUE_METADATA,
      },
    },
  },
});

export const escalateOverdueTasksDefaults = app.registerAction({
  action: 'EscalateOverdueTasks',
  label: 'Escalate Overdue Tasks',
  icon: 'WarningOutlined',
});

export const evaluateTaskPriorityDefaults = app.registerAction({
  action: 'EvaluateTaskPriority',
  label: 'Evaluate Task Priority',
  icon: 'BulbOutlined',
  view: EvaluateTaskPriorityView,
  params: {
    code: {
      label: 'Evaluator Code',
      componentOptions: {
        valueMetadata: EVALUATOR_CODE_VALUE_METADATA,
      },
    },
    taskTitle: { label: 'Task Title' },
  },
});

export const hourlyTaskProgressUpdateDefaults = app.registerAction({
  action: 'HourlyTaskProgressUpdate',
  label: 'Run Hourly Progress Update',
  icon: 'HourglassOutlined',
});

export const getDashboardSummaryDefaults = app.registerAction({
  action: 'GetDashboardSummary',
  label: 'Dashboard (Global)',
  icon: 'DashboardOutlined',
  view: GetDashboardSummaryView,
  params: {
    project: [
      { context: 'read', component: <ReferenceLabel />, labelField: 'name' },
      {
        context: 'write',
        component: <ReferenceDropdown />,
        labelField: 'name',
      },
    ],
  },
});

export const getActivityLogDefaults = app.registerAction({
  action: 'GetActivityLog',
  label: 'Get Activity Log',
  icon: 'FileTextOutlined',
  view: ActivityLogView,
});

export const getSummaryTableDataDefaults = app.registerAction({
  action: 'GetSummaryTableData',
  label: 'Summary Tables',
  icon: 'TableOutlined',
  params: {
    project: [
      { context: 'read', component: <ReferenceLabel />, labelField: 'name' },
      {
        context: 'write',
        component: <ReferenceDropdown />,
        labelField: 'name',
      },
    ],
  },
});

export const notifyStakeholdersDefaults = app.registerAction({
  action: 'NotifyStakeholders',
  label: 'Notify Stakeholders',
  icon: 'NotificationOutlined',
});

export const startReportInBackgroundDefaults = app.registerAction({
  action: 'StartReportInBackground',
  label: 'Start Report in Background',
  icon: 'RocketOutlined',
  view: StartReportInBackgroundView,
  blockingExecution: false,
  successMessage: 'Report generated successfully!',
});

export const syncDataDefaults = app.registerAction({
  action: 'SyncData',
  label: 'Sync Data',
  icon: 'SyncOutlined',
  blockingExecution: true,
  successMessage: 'Sync Data completed successfully',
  errorMessage: 'Sync Data failed',
});

export const weeklyOverdueTasksReminderDefaults = app.registerAction({
  action: 'WeeklyOverdueTasksReminder',
  label: 'Run Weekly Overdue Tasks Reminder',
  icon: 'AlertOutlined',
});

export const weeklyProjectStatusReportDefaults = app.registerAction({
  action: 'WeeklyProjectStatusReport',
  label: 'Run Weekly Project Status Report',
  icon: 'ScheduleOutlined',
});

export function registerGlobalActions() {
  // Defaults are registered when this module is imported.
}

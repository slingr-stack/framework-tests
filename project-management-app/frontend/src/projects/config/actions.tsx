import { RichGenerateReportParams } from '@gql';
import { app, List, TextInput } from '@drumr/framework-frontend';
import React from 'react';
import GenerateReportView from '@/global/views/GenerateReportView';
import InitializeProjectView from '@/projects/views/actions/InitializeProjectView';
import ProjectHealthCheckView from '@/projects/views/actions/ProjectHealthCheckView';
import UpdateProjectStatusView from '@/projects/views/actions/UpdateProjectStatusView';

export const archiveProjectDefaults = app.registerAction({
  action: 'ArchiveProject',
  label: 'Archive Project',
  icon: 'InboxOutlined',
});

export const generateReportDefaults =
  app.registerAction<RichGenerateReportParams>({
    action: 'GenerateReport',
    label: 'Generate Report',
    icon: 'FileTextOutlined',
    view: GenerateReportView,
    blockingExecution: true,
    showProgress: true,
    successMessage: 'Report generated successfully!',
    errorMessage: 'Failed to generate report',
    params: {
      title: {
        label: 'Report Title',
      },
      sections: {
        label: 'Sections',
        component: <List sorting={false} component={<TextInput />} />,
      },
    },
  });

export const getProjectStatisticsDefaults = app.registerAction({
  action: 'GetProjectStatistics',
  label: 'Projects statistics (Model)',
  icon: 'BarChartOutlined',
});

export const initializeProjectDefaults = app.registerAction({
  action: 'InitializeProject',
  label: 'Initialize Project',
  view: InitializeProjectView,
  icon: 'FileTextOutlined',
});

export const projectHealthCheckDefaults = app.registerAction({
  action: 'ProjectHealthCheck',
  label: 'Health check',
  icon: 'MedicineBoxOutlined',
  view: ProjectHealthCheckView,
});

export const updateProjectStatusDefaults = app.registerAction({
  action: 'UpdateProjectStatus',
  label: 'Update project status',
  view: UpdateProjectStatusView,
});

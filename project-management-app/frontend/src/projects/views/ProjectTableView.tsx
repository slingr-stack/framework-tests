import {
  BarChartOutlined,
  DashboardOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type {
  DashboardSummaryResult,
  Maybe,
  Project,
  ProjectPriorityEnum,
  ProjectStatusEnum,
  Query,
} from '@gql';
import {
  type ActionResponse,
  DataForm,
  type DataFormProps,
  dataAction,
  dataTable,
  getApp,
  getGraphQLClient,
  OperationError,
  openView,
  TableView,
  toolbar,
} from '@drumr/framework-frontend';
import { Descriptions, Tag } from 'antd';
import React from 'react';
import UserTableView from '@/users/views/UserTableView';

type DashboardSummaryUiActionResponse = {
  UiGetDashboardSummary?: NonNullable<DataFormProps['uiFields']> | null;
};

const STATUS_COLOR_MAP: Record<string, string> = {
  planning: 'default',
  active: 'processing',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'error',
};

const PRIORITY_COLOR_MAP: Record<string, string> = {
  low: 'green',
  medium: 'blue',
  high: 'orange',
  critical: 'red',
};

const formatLabel = (value?: string | null) => {
  if (!value) {
    return 'Unknown';
  }
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const showProjectStatistics = (
  response: ActionResponse<Pick<Query, 'ProjectGetProjectStatistics'>>,
) => {
  if (response.executed && response.responseType === 'data') {
    const result = response.data.ProjectGetProjectStatistics;
    if (!result || result.__typename !== 'ProjectStatisticsResult') {
      return;
    }

    getApp().modal.info({
      title: 'Project Statistics',
      width: 600,
      content: (
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Total Budget">
            {result.totalBudget ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      ),
    });
  }
};

const showDashboardSummary = (
  response: ActionResponse<Pick<Query, 'GetDashboardSummary'>>,
) => {
  if (response.executed && response.responseType === 'data') {
    const data = response.data.GetDashboardSummary as DashboardSummaryResult;
    getApp().modal.info({
      title: 'Dashboard Summary',
      width: 700,
      content: (
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Total Users" span={2}>
            {data.totalUsers}
          </Descriptions.Item>
          <Descriptions.Item label="Projects - Total">
            {data.projectsTotal}
          </Descriptions.Item>
          <Descriptions.Item label="Projects - Active">
            {data.projectsActive}
          </Descriptions.Item>
          <Descriptions.Item label="Projects - Completed">
            {data.projectsCompleted}
          </Descriptions.Item>
          <Descriptions.Item label="Projects - On Hold">
            {data.projectsOnHold}
          </Descriptions.Item>
          <Descriptions.Item label="Projects - Critical" span={2}>
            {data.projectsCritical}
          </Descriptions.Item>
          <Descriptions.Item label="Tasks - Total">
            {data.tasksTotal}
          </Descriptions.Item>
          <Descriptions.Item label="Tasks - Pending">
            {data.tasksPending}
          </Descriptions.Item>
          <Descriptions.Item label="Tasks - In Progress">
            {data.tasksInProgress}
          </Descriptions.Item>
          <Descriptions.Item label="Tasks - In Review">
            {data.tasksInReview}
          </Descriptions.Item>
          <Descriptions.Item label="Tasks - Completed">
            {data.tasksCompleted}
          </Descriptions.Item>
          <Descriptions.Item label="Tasks - Blocked">
            {data.tasksBlocked}
          </Descriptions.Item>
          <Descriptions.Item label="Tasks - Overdue">
            {data.tasksOverdue}
          </Descriptions.Item>
          <Descriptions.Item label="Tasks - High Priority">
            {data.tasksHighPriorityPending}
          </Descriptions.Item>
          <Descriptions.Item label="Total Active Budget" span={2}>
            {data.totalActiveBudget}
          </Descriptions.Item>
        </Descriptions>
      ),
    });
  }
};

const showDashboardSummaryUi = (
  response: ActionResponse<DashboardSummaryUiActionResponse>,
) => {
  console.log('showDashboardSummaryUi response', response);
  if (response.executed && response.responseType === 'data') {
    const uiFields = response.data.UiGetDashboardSummary;
    if (!uiFields) {
      return;
    }

    getApp().modal.info({
      title: 'Dashboard Summary',
      width: 720,
      content: <DataForm uiFields={uiFields} />,
    });
  }
};

type TableViewOptions = React.ComponentProps<
  typeof TableView<Project>
>['tableOptions'];

export function ProjectTableView() {
  return (
    <TableView<Project>
      header={{
        breadcrumb: 'Projects',
        title: 'Projects',
        subTitle: 'Manage and track all projects',
        toolbar: {
          buttons: [
            // Toolbar view button pointing to a render-permission-restricted view.
            // The framework automatically hides this button for roles that lack
            // can('render', 'UserTableView') — visible only to Admin and System.
            toolbar.view({
              elementId: 'manage-users',
              view: UserTableView,
              label: 'Manage Users',
              icon: <TeamOutlined />,
              container: 'modal',
              modalPosition: 'right',
              modalSize: 'big',
            }),
            toolbar.modelAction('GetProjectStatistics', {
              elementId: 'project-statistics',
              label: 'Statistics',
              icon: <BarChartOutlined />,
              confirmationModal: false,
              afterExecution: showProjectStatistics,
            }),
            toolbar.dropdown({
              label: 'Dashboard summary',
              icon: <DashboardOutlined />,
              elementId: 'dashboard-summary-dropdown',
              menu: {
                items: [
                  toolbar.globalAction('GetDashboardSummary', {
                    afterExecution: showDashboardSummary,
                    elementId: 'dashboard-summary',
                    label: 'Dashboard DATA API',
                    icon: <DashboardOutlined />,
                    confirmationModal: false,
                  }),
                  toolbar.globalAction('GetDashboardSummary', {
                    afterExecution: showDashboardSummaryUi,
                    elementId: 'dashboard-summary-ui',
                    label: 'Dashboard UI API',
                    icon: <DashboardOutlined />,
                    includeUiMetadata: true,
                  }),
                  toolbar.customAction({
                    elementId: 'custom-dashboard-summary',
                    label: 'Dashboard summary (queryBuilder)',
                    icon: <DashboardOutlined />,
                    handler: async () => {
                      const op = dataAction<DashboardSummaryResult>(
                        'GetDashboardSummary',
                      ).build();
                      const gql = getGraphQLClient();

                      try {
                        const summary = await gql.execute(op, { params: {} });
                        showDashboardSummary({
                          executed: true,
                          responseType: 'data',
                          data: { GetDashboardSummary: summary },
                        });
                      } catch (e) {
                        if (e instanceof OperationError) {
                          const err = e as InstanceType<typeof OperationError>;
                          console.error(
                            'Action error:',
                            err.errorInfo.__typename,
                            err.errorInfo.message,
                          );
                        }
                      }
                    },
                  }),
                ],
              },
            }),
            toolbar.globalAction('ArchiveCompletedProjects', {
              elementId: 'archive-projects',
              label: 'Archive Completed',
            }),
            toolbar.globalAction('StartReportInBackground', {
              elementId: 'start-report-bg',
              label: 'Background Report',
              modalSize: 'small',
            }),
            toolbar.globalAction('SyncData', {
              elementId: 'sync-data',
              label: 'Sync Data',
            }),
            toolbar<Project>({ exclude: ['GetProjectStatistics'] }),
          ],
        },
      }}
      tableOptions={
        dataTable.options<Project>({
          model: 'Project',
          columns: [
            {
              field: 'name',
              title: 'Project Name',
              sorting: true,
              filtering: true,
            },
            {
              field: 'code',
              title: 'Code',
              sorting: true,
              filtering: { caseSensitive: true },
            },
            {
              field: 'status',
              title: 'Status',
              filtering: true,
              sorting: true,
              onRender: (value: Maybe<ProjectStatusEnum> | undefined) => {
                const normalized = (value ?? '').toLowerCase();
                const color = STATUS_COLOR_MAP[normalized] ?? 'default';
                return <Tag color={color}>{formatLabel(value)}</Tag>;
              },
            },
            {
              field: 'priority',
              title: 'Priority',
              filtering: true,
              sorting: true,
              onRender: (value: Maybe<ProjectPriorityEnum> | undefined) => {
                const normalized = (value ?? '').toLowerCase();
                const color = PRIORITY_COLOR_MAP[normalized] ?? 'default';
                return <Tag color={color}>{formatLabel(value)}</Tag>;
              },
            },
            {
              field: 'manager',
              title: 'Manager',
              sorting: true,
              filtering: true,
            },
            {
              field: 'manager.roles',
              title: 'Manager Roles',
              sorting: true,
              filtering: true,
            },
            {
              field: 'budget',
              title: 'Budget',
              sorting: true,
              filtering: true,
            },
            {
              field: 'completionPercentage',
              title: 'Completion',
              sorting: true,
              filtering: true,
            },
            {
              field: 'startDate',
              title: 'Start Date',
              sorting: true,
              filtering: true,
            },
          ],
          onRowClicked: (record: Project) => {
            openView('ProjectReadView', {
              params: { id: record.id },
              container: 'page',
            });
          },
          pagination: { pageSize: 10 },
          selection: {
            enabled: true,
            type: 'multiple',
          },
          tableToolbar: {
            buttons: [toolbar<Project>({ actions: 'crud' })],
          },
          rowToolbar: {
            buttons: toolbar<Project>(),
          },
        }) as TableViewOptions
      }
    />
  );
}

export default ProjectTableView;

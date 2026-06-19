import {
  ClearOutlined,
  DeleteOutlined,
  TableOutlined,
} from '@ant-design/icons';
import {
  type RichTask,
  type RichUser,
  type Task,
  TaskWhereInputTaskStatusEnum,
} from '@gql';
import type {
  ActionResponse,
  DataTableLoadResult,
  DataTableRef,
  DataTableRequestState,
  DataTableSelectedRows,
} from '@drumr/framework-frontend';
import {
  DataTable,
  getApp,
  openView,
  toolbar,
  View,
} from '@drumr/framework-frontend';
import { Alert, Button, Card, Col, Row, Space, Switch, Typography } from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import UserReadView from '@/users/views/UserReadView';
import {
  getSummaryTableDataService,
  type SummaryProjectWhereRequest,
  type SummaryTaskPaginationRequest,
  type SummaryTaskSortRequest,
  type SummaryTaskWhereRequest,
} from '../services/SummaryTableDataService';
import { SummaryUsersMaterialTable } from './SummaryUsersMaterialTable';

const { Text } = Typography;

const DEFAULT_TASK_PAGE = 1;
const DEFAULT_TASK_PAGE_SIZE = 3;
type ProjectStatusPreset = 'active' | 'planning' | null;
type ManagerSummaryField = 'fullName' | 'email';

const TASK_SORT_FIELD_MAP: Record<string, SummaryTaskSortRequest['field']> = {
  title: 'title',
  project: 'projectName',
  status: 'status',
  priority: 'priority',
  assignee: 'assigneeFullName',
  dueDate: 'dueDate',
};

const TASK_STATUS_VALUES = new Set<string>(
  Object.values(TaskWhereInputTaskStatusEnum),
);

const TASK_STATUS_VALUE_METADATA = {
  to_do: { label: 'To Do', color: 'default' },
  in_progress: { label: 'In Progress', color: 'processing' },
  in_review: { label: 'In Review', color: 'warning' },
  done: { label: 'Done', color: 'success' },
  blocked: { label: 'Blocked', color: 'error' },
} as const;

const TASK_TABLE_COLUMN_METADATA: NonNullable<
  DataTableLoadResult<RichTask>['columnMetadata']
> = {
  status: {
    name: 'status',
    label: 'Status',
    dataType: 'choice',
    sortable: true,
    queryConfig: {
      enabled: true,
      sorting: true,
    },
    modelName: 'Task',
    options: {
      name: 'status',
      dataType: 'choice',
      fieldOptions: {
        query: {
          enabled: true,
          sorting: true,
        },
      },
      ui: {
        field: {
          label: 'Status',
        },
        type: {
          valueMetadata: TASK_STATUS_VALUE_METADATA,
        },
      },
      typeOptions: {
        valueMetadata: TASK_STATUS_VALUE_METADATA,
      },
    },
  },
};

type UiFieldLike = {
  value?: unknown;
};

const getUiFieldValue = (field: unknown): unknown => {
  if (!field || typeof field !== 'object' || !('value' in field)) {
    return undefined;
  }
  return (field as UiFieldLike).value;
};

const getUiFieldText = (
  record: RichUser | null | undefined,
  fieldName: ManagerSummaryField,
): string | null => {
  if (!record) {
    return null;
  }

  const value = getUiFieldValue(record[fieldName]);
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const getManagerSummary = (manager: RichUser | null): string | null => {
  if (!manager) {
    return null;
  }
  const fullName = getUiFieldText(manager, 'fullName');
  const email = getUiFieldText(manager, 'email');
  if (fullName && email) {
    return `${fullName} (${email})`;
  }
  return fullName || email;
};

const getProjectStatusPresetLabel = (
  status: ProjectStatusPreset,
): string | null => {
  if (status === 'active') return 'Active';
  if (status === 'planning') return 'Planning';
  return null;
};

// ── Helper builders ───────────────────────────────────────────────────────────

function buildTaskPaginationRequest(
  tableState?: DataTableRequestState<Task>,
): SummaryTaskPaginationRequest {
  return {
    page: tableState?.pagination.page ?? DEFAULT_TASK_PAGE,
    pageSize: tableState?.pagination.pageSize ?? DEFAULT_TASK_PAGE_SIZE,
  };
}

function buildTaskWhereRequest(
  tableState?: DataTableRequestState<Task>,
): SummaryTaskWhereRequest | undefined {
  const statusFilterValue = tableState?.filterState.status?.value;
  const taskStatus =
    typeof statusFilterValue === 'string' &&
    TASK_STATUS_VALUES.has(statusFilterValue)
      ? (statusFilterValue as TaskWhereInputTaskStatusEnum)
      : Array.isArray(statusFilterValue)
        ? (statusFilterValue.find(
            (value): value is TaskWhereInputTaskStatusEnum =>
              typeof value === 'string' && TASK_STATUS_VALUES.has(value),
          ) ?? null)
        : null;
  return taskStatus ? { taskStatus } : undefined;
}

function buildTaskSortRequest(
  tableState?: DataTableRequestState<Task>,
): SummaryTaskSortRequest | undefined {
  const fieldName =
    typeof tableState?.sort?.field === 'string' ? tableState.sort.field : null;
  const order = tableState?.sort?.order;
  if (!fieldName || !order) return undefined;
  const mappedField = TASK_SORT_FIELD_MAP[fieldName];
  return mappedField ? { field: mappedField, order } : undefined;
}

function buildProjectWhereRequest(
  filter: ProjectStatusPreset,
): SummaryProjectWhereRequest | undefined {
  return filter ? { projectStatus: filter } : undefined;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterHint({
  selectedProjectId,
  selectedProjectLabel,
  selectedManagerSummary,
  selectedProjectStatusFilter,
  onClearProjectFilter,
}: {
  selectedProjectId: string | null;
  selectedProjectLabel: string | null;
  selectedManagerSummary: string | null;
  selectedProjectStatusFilter: ProjectStatusPreset;
  onClearProjectFilter: () => void;
}) {
  const selectedProjectStatusLabel = getProjectStatusPresetLabel(
    selectedProjectStatusFilter,
  );
  const hasAnyProjectFilter =
    !!selectedProjectId || !!selectedProjectStatusLabel;
  const statusPrefix = selectedProjectStatusLabel
    ? `Project list filtered to ${selectedProjectStatusLabel}. `
    : '';

  return (
    <Alert
      type={hasAnyProjectFilter ? 'info' : 'success'}
      showIcon
      message={
        hasAnyProjectFilter ? 'Project filters active' : 'No project filter'
      }
      description={
        selectedProjectId
          ? `${statusPrefix}Showing the selected project and its related tasks for ${selectedProjectLabel || selectedProjectId}. Team members are scoped to that project.${selectedManagerSummary ? ` Manager: ${selectedManagerSummary}.` : ''}`
          : selectedProjectStatusLabel
            ? `${statusPrefix}Click a project row to filter the task table by that project and scope the team members list.`
            : 'Click a project row to filter the task table by that project and scope the team members list.'
      }
      action={
        selectedProjectId ? (
          <Button icon={<ClearOutlined />} onClick={onClearProjectFilter}>
            Clear filter
          </Button>
        ) : undefined
      }
    />
  );
}

function ProjectStatusActions({
  selectedProjectStatusFilter,
  onChange,
}: {
  selectedProjectStatusFilter: ProjectStatusPreset;
  onChange: (status: ProjectStatusPreset) => void;
}) {
  return (
    <Space size="small">
      <Button
        size="small"
        type={selectedProjectStatusFilter === null ? 'primary' : 'default'}
        onClick={() => onChange(null)}
      >
        All
      </Button>
      <Button
        size="small"
        type={selectedProjectStatusFilter === 'active' ? 'primary' : 'default'}
        onClick={() => onChange('active')}
      >
        Show Active
      </Button>
      <Button
        size="small"
        type={
          selectedProjectStatusFilter === 'planning' ? 'primary' : 'default'
        }
        onClick={() => onChange('planning')}
      >
        Show Planning
      </Button>
    </Space>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SummaryView() {
  const summaryService = useRef(getSummaryTableDataService());
  const projectTableRef = useRef<DataTableRef>(null);
  const taskTableRef = useRef<DataTableRef>(null);
  const userTableRef = useRef<DataTableRef>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [selectedProjectLabel, setSelectedProjectLabel] = useState<
    string | null
  >(null);
  const [selectedManagerSummary, setSelectedManagerSummary] = useState<
    string | null
  >(null);
  const [selectedProjectStatusFilter, setSelectedProjectStatusFilter] =
    useState<ProjectStatusPreset>(null);
  const [projectSelection, setProjectSelection] =
    useState<DataTableSelectedRows | null>(null);
  const [taskSelection, setTaskSelection] =
    useState<DataTableSelectedRows | null>(null);
  const [useMaterialUsersTable, setUseMaterialUsersTable] = useState(false);

  // Use refs to access latest state in callbacks without re-creating them
  const selectedProjectIdRef = useRef(selectedProjectId);
  selectedProjectIdRef.current = selectedProjectId;
  const selectedProjectStatusFilterRef = useRef(selectedProjectStatusFilter);
  selectedProjectStatusFilterRef.current = selectedProjectStatusFilter;

  // ── Data loaders ──────────────────────────────────────────────────────

  const getTableData = useCallback(
    async (
      projectId: string | null,
      forceRefresh = false,
      taskPagination?: SummaryTaskPaginationRequest,
      taskWhere?: SummaryTaskWhereRequest,
      taskSort?: SummaryTaskSortRequest,
      projectWhere?: SummaryProjectWhereRequest,
    ) => {
      return summaryService.current.getData(
        {
          projectId,
          taskPagination: taskPagination ?? buildTaskPaginationRequest(),
          taskWhere,
          taskSort,
          projectWhere,
        },
        forceRefresh,
      );
    },
    [],
  );

  const loadProjectRows = useCallback(
    async (forceRefresh = false) => {
      const projectWhere = buildProjectWhereRequest(
        selectedProjectStatusFilterRef.current,
      );
      const tableData = await getTableData(
        null,
        forceRefresh,
        undefined,
        undefined,
        undefined,
        projectWhere,
      );
      return { data: tableData.projects };
    },
    [getTableData],
  );

  const loadTaskRows = useCallback(
    async (
      tableState?: DataTableRequestState<Task>,
      forceRefresh = false,
    ): Promise<DataTableLoadResult<RichTask>> => {
      const taskWhere = buildTaskWhereRequest(tableState);
      const taskSort = buildTaskSortRequest(tableState);
      const projectWhere = buildProjectWhereRequest(
        selectedProjectStatusFilterRef.current,
      );
      const tableData = await getTableData(
        selectedProjectIdRef.current,
        forceRefresh,
        buildTaskPaginationRequest(tableState),
        taskWhere,
        taskSort,
        projectWhere,
      );
      return {
        data: tableData.tasks,
        pageInfo: tableData.taskPaginationInfo,
        columnMetadata: TASK_TABLE_COLUMN_METADATA,
      };
    },
    [getTableData],
  );

  const loadUserRows = useCallback(
    async (forceRefresh = false) => {
      const projectWhere = buildProjectWhereRequest(
        selectedProjectStatusFilterRef.current,
      );
      const tableData = await getTableData(
        selectedProjectIdRef.current,
        forceRefresh,
        undefined,
        undefined,
        undefined,
        projectWhere,
      );
      return { data: tableData.users };
    },
    [getTableData],
  );

  // ── Event handlers ────────────────────────────────────────────────────

  const handleProjectRowClick = useCallback(
    async (record: Record<string, unknown>) => {
      console.log('[SummaryView] Project row clicked', record);
      const recordId = typeof record.id === 'string' ? record.id : null;
      if (!recordId) return;

      const nextSelectedId =
        recordId === selectedProjectIdRef.current ? null : recordId;
      const nextSelectedLabel =
        nextSelectedId && typeof record.name === 'string'
          ? record.name
          : nextSelectedId;
      const selectedProjectData = nextSelectedId
        ? await getTableData(nextSelectedId, false)
        : null;

      setSelectedProjectId(nextSelectedId);
      setSelectedProjectLabel(nextSelectedId ? nextSelectedLabel : null);
      setSelectedManagerSummary(
        getManagerSummary(selectedProjectData?.manager ?? null),
      );
      setTaskSelection(null);
    },
    [getTableData],
  );

  const handleClearProjectFilter = useCallback(() => {
    setSelectedProjectId(null);
    setSelectedProjectLabel(null);
    setSelectedManagerSummary(null);
    setTaskSelection(null);
  }, []);

  const handleProjectStatusFilterChange = useCallback(
    (projectStatus: ProjectStatusPreset) => {
      setSelectedProjectId(null);
      setSelectedProjectLabel(null);
      setSelectedManagerSummary(null);
      setSelectedProjectStatusFilter(projectStatus);
      setTaskSelection(null);

      // Schedule refresh after state updates
      setTimeout(() => {
        projectTableRef.current?.refresh();
        taskTableRef.current?.refresh();
        userTableRef.current?.refresh();
      }, 0);
    },
    [],
  );

  const handleDeleteSelectedProjects = useCallback(() => {
    const selection = projectSelection;
    if (!selection || selection.count === 0) return;
    const app = getApp();
    if (selection.allRowsSelected) {
      void app.message.info(
        `All projects selected (${selection.count} total). Bulk delete would apply to all matching records.`,
      );
    } else {
      void app.message.info(
        `${selection.count} project(s) selected for deletion: ${selection.ids.join(', ')}`,
      );
    }
  }, [projectSelection]);

  const handleDeleteSelectedTasks = useCallback(() => {
    const selection = taskSelection;
    if (!selection || selection.count === 0) return;
    const app = getApp();
    if (selection.allRowsSelected) {
      void app.message.info(
        `All tasks selected (${selection.count} total). Bulk delete would apply to all matching records.`,
      );
    } else {
      void app.message.info(
        `${selection.count} task(s) selected for deletion: ${selection.ids.join(', ')}`,
      );
    }
  }, [taskSelection]);

  // ── Render helpers ────────────────────────────────────────────────────

  const hasProjectSelection = projectSelection && projectSelection.count > 0;
  const hasTaskSelection = taskSelection && taskSelection.count > 0;
  const taskTableKey = `summary-tasks-${selectedProjectId ?? 'all'}-${selectedProjectStatusFilter ?? 'all'}`;
  const userTableKey = `summary-users-${selectedProjectId ?? 'all'}-${selectedProjectStatusFilter ?? 'all'}`;

  return (
    <View
      header={{
        title: 'Summary',
        subTitle: 'Projects, tasks, and users tables',
      }}
    >
      <div style={{ padding: '0 24px 24px' }}>
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          {/* Filter hint card */}
          <Card>
            <Space
              orientation="vertical"
              style={{ width: '100%' }}
              size="middle"
            >
              <Space>
                <TableOutlined style={{ color: '#1890ff' }} />
                <Text strong>Table Summary</Text>
              </Space>
              <FilterHint
                selectedProjectId={selectedProjectId}
                selectedProjectLabel={selectedProjectLabel}
                selectedManagerSummary={selectedManagerSummary}
                selectedProjectStatusFilter={selectedProjectStatusFilter}
                onClearProjectFilter={handleClearProjectFilter}
              />
            </Space>
          </Card>

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Space
                orientation="vertical"
                style={{ width: '100%' }}
                size="large"
              >
                {/* Project table */}
                <Card
                  title="Projects Table"
                  extra={
                    <Space size="small">
                      {hasProjectSelection && (
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={handleDeleteSelectedProjects}
                          aria-label={
                            projectSelection.allRowsSelected
                              ? `Delete all ${projectSelection.count} projects`
                              : `Delete ${projectSelection.count} selected project(s)`
                          }
                        >
                          Delete (
                          {projectSelection.allRowsSelected
                            ? `All ${projectSelection.count}`
                            : projectSelection.count}
                          )
                        </Button>
                      )}
                      <ProjectStatusActions
                        selectedProjectStatusFilter={
                          selectedProjectStatusFilter
                        }
                        onChange={handleProjectStatusFilterChange}
                      />
                    </Space>
                  }
                >
                  <DataTable
                    ref={projectTableRef}
                    model="Project"
                    loadData={() => loadProjectRows(false)}
                    refresh={() => loadProjectRows(true)}
                    columns={[
                      { field: 'name' },
                      { field: 'code' },
                      { field: 'manager' },
                      { field: 'status' },
                      { field: 'priority' },
                      { field: 'budget' },
                      {
                        field: 'completionPercentage',
                        title: 'Completion',
                      },
                    ]}
                    onRowClicked={handleProjectRowClick}
                    pagination={{ enabled: false }}
                    selection={{
                      enabled: true,
                      type: 'multiple',
                      onSelectionChange: setProjectSelection,
                    }}
                  />
                </Card>

                {/* Task table */}
                <Card
                  title="Tasks Table"
                  extra={
                    hasTaskSelection ? (
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={handleDeleteSelectedTasks}
                        aria-label={
                          taskSelection.allRowsSelected
                            ? `Delete all ${taskSelection.count} tasks`
                            : `Delete ${taskSelection.count} selected task(s)`
                        }
                      >
                        Delete (
                        {taskSelection.allRowsSelected
                          ? `All ${taskSelection.count}`
                          : taskSelection.count}
                        )
                      </Button>
                    ) : undefined
                  }
                >
                  <DataTable
                    key={taskTableKey}
                    ref={taskTableRef}
                    model="Task"
                    loadData={(tableState) => loadTaskRows(tableState, false)}
                    refresh={(tableState) => loadTaskRows(tableState, true)}
                    paginate={(tableState) => loadTaskRows(tableState, false)}
                    columns={[
                      {
                        field: 'title',
                        title: 'Title',
                        filtering: false,
                        sorting: true,
                      },
                      {
                        field: 'project',
                        title: 'Project',
                        filtering: false,
                        sorting: true,
                      },
                      {
                        field: 'status',
                        title: 'Status',
                        filtering: true,
                        sorting: true,
                      },
                      {
                        field: 'priority',
                        title: 'Priority',
                        filtering: false,
                        sorting: false,
                      },
                      {
                        field: 'assignee',
                        title: 'Assignee',
                        filtering: false,
                        sorting: true,
                      },
                      {
                        field: 'dueDate',
                        title: 'Due Date',
                        filtering: false,
                        sorting: true,
                      },
                    ]}
                    pagination={{ pageSize: DEFAULT_TASK_PAGE_SIZE }}
                    selection={{
                      enabled: true,
                      type: 'multiple',
                      onSelectionChange: setTaskSelection,
                    }}
                    rowToolbar={{
                      buttons: [
                        toolbar.view<Task>({
                          elementId: 'viewAssigneeDetails',
                          view: UserReadView,
                          label: 'Assignee details',
                          container: 'modal',
                          modalPosition: 'right',
                          visible: (record) => {
                            console.log(
                              'Checking visibility for record:',
                              record,
                            );
                            return Boolean(record?.assignee?.id);
                          },
                          params: (record) => {
                            return { id: record?.assignee?.id };
                          },
                        }),
                        toolbar.customAction<Task>({
                          elementId: 'assignTask',
                          label: 'Assign Task',
                          visible: true,
                          handler: (record) => {
                            openView('AssignTaskView', {
                              params: { id: record?.id },
                              container: 'modal',
                              modalPosition: 'right',
                              onClose: async (response: ActionResponse) => {
                                if (response?.executed) {
                                  taskTableRef.current?.refresh();
                                } else {
                                  console.log(
                                    'Assign Task action was not executed or no response received',
                                  );
                                }
                              },
                            });
                          },
                        }),
                      ],
                    }}
                  />
                </Card>

                {/* User table */}
                <Space
                  orientation="vertical"
                  style={{ width: '100%' }}
                  size="middle"
                >
                  <Card
                    title="Team Members Table"
                    extra={
                      <Space size="small">
                        <span>Framework table</span>
                        <Switch
                          checked={useMaterialUsersTable}
                          checkedChildren="MUI"
                          unCheckedChildren="Ant"
                          onChange={setUseMaterialUsersTable}
                        />
                        <span>Material table</span>
                      </Space>
                    }
                  >
                    {useMaterialUsersTable ? (
                      <SummaryUsersMaterialTable
                        key={userTableKey}
                        loadData={() => loadUserRows(false)}
                        refreshData={() => loadUserRows(true)}
                      />
                    ) : (
                      <DataTable
                        ref={userTableRef}
                        key={userTableKey}
                        model="User"
                        loadData={() => loadUserRows(false)}
                        refresh={() => loadUserRows(true)}
                        columns={[
                          { field: 'fullName', title: 'Full Name' },
                          { field: 'email', title: 'Email' },
                          { field: 'roles', title: 'Roles' },
                          { field: 'status', title: 'Status' },
                        ]}
                        pagination={{ enabled: false }}
                        antdOptions={{
                          options: false,
                        }}
                      />
                    )}
                  </Card>

                  {selectedProjectId && selectedManagerSummary ? (
                    <Card title="Project Manager" size="small">
                      <Text>{selectedManagerSummary}</Text>
                    </Card>
                  ) : null}
                </Space>
              </Space>
            </Col>
          </Row>
        </Space>
      </div>
    </View>
  );
}

export default SummaryView;

import { SyncOutlined } from '@ant-design/icons';
import type { Project, Task } from '@gql/types';
import type {
  ActionResponse,
  BreadcrumbValue,
} from '@drumr/framework-frontend';
import {
  DataComponent,
  isUiField,
  menu,
  NestedTabs,
  NestedView,
  nestedTableView,
  openView,
  ReadView,
  Toolbar,
  toolbar,
  useFormViewDataFormContext,
} from '@drumr/framework-frontend';
import { Button, Card, Descriptions, Space, Typography } from 'antd';
import React, { useCallback, useMemo } from 'react';
import TaskTableView from '@/tasks/views/TaskTableView';

const { Title } = Typography;

const fieldDisplayOrder = [
  'code',
  'status',
  'priority',
  'manager',
  'teamMembers',
  'completionPercentage',
  'isArchived',
  'budget',
  'startDate',
  'endDate',
  'description',
  'createdAt',
  'updatedAt',
  'support',
];

const projectNestedViews = [
  nestedTableView<Task>({
    view: TaskTableView,
    title: 'Project Tasks',
    joinField: 'project',
  }),
];

// ── Status Toolbar (inline) ───────────────────────────────────────────────────

function StatusToolbar({
  onActionExecuted,
}: {
  onActionExecuted: (r: ActionResponse) => void;
}) {
  const statusMenuItems = useMemo(
    () => [
      toolbar.objectAction('UpdateProjectStatus', {
        elementId: 'status-planning',
        label: 'Set to Planning (Custom confirmationModal)',
        confirmationModal: {
          title: 'Confirm Status Change',
          content: 'Are you sure you want to set the status to Planning?', // should just open custom confirmation modal and execute with params
        },
        params: { status: 'planning' },
        afterExecution: onActionExecuted,
      }),
      toolbar.objectAction('UpdateProjectStatus', {
        elementId: 'status-active',
        label: 'Set to Active (no modal)',
        confirmationModal: false, // should execute directly
        params: { status: 'active' },
        afterExecution: onActionExecuted,
      }),
      toolbar.objectAction('UpdateProjectStatus', {
        elementId: 'status-onhold',
        label: 'Set to On Hold (default confirmation modal)',
        confirmationModal: true, // should just open default confirmation modal and execute with params
        params: { status: 'on_hold' },
        afterExecution: onActionExecuted,
      }),
      toolbar.objectAction('UpdateProjectStatus', {
        elementId: 'status-completed',
        label: 'Set to Completed (open action view)', // should open the action view (ProjectUpdateProjectStatusView) and execute with paramas as the default values
        params: { status: 'completed' },
        afterExecution: onActionExecuted,
      }),
      toolbar.objectAction('UpdateProjectStatus', {
        elementId: 'status-cancelled',
        label: 'Set to Cancelled',
        params: { status: 'cancelled' },
        afterExecution: onActionExecuted,
      }),
    ],
    [onActionExecuted],
  );

  return (
    <Toolbar
      options={toolbar.options({
        buttons: [
          toolbar.dropdown({
            elementId: 'statusActions',
            icon: <SyncOutlined />,
            menu: menu({ items: statusMenuItems }),
          }),
        ],
      })}
    />
  );
}

// ── Project Details (rendered inside DataForm context) ────────────────────────

function ProjectDetailsContent({ id }: { id?: string }) {
  const { dataFormHook } = useFormViewDataFormContext();
  const uiFields = dataFormHook.meta.uiFields;
  const isLoading = dataFormHook.formState.isLoading;
  const error = dataFormHook.meta.loadError;
  const data = dataFormHook.values as Project | null;
  const contextId = dataFormHook.meta.objectId;
  const dataId = data?.id ?? undefined;
  const projectId = id ?? contextId ?? dataId;

  console.log('[ProjectReadView] ProjectDetailsContent context:', {
    idProp: id,
    contextId,
    projectId,
    isLoading,
    hasError: !!error,
    hasUiFields: !!uiFields,
    objectId: (data as Project | null)?.id,
  });

  const handleActionExecuted = useCallback(() => {
    // The ReadView auto-refreshes on action execution, no manual refresh needed.
    // This callback is for the StatusToolbar's afterExecution.
  }, []);

  if (error) {
    return (
      <Card>
        <div>Failed to load project details: {error.message}</div>
      </Card>
    );
  }

  if (!uiFields) {
    return (
      <Card>
        <div>
          {isLoading
            ? 'Loading project details...'
            : 'Project details not available yet.'}
        </div>
      </Card>
    );
  }

  const allFields = Object.entries(uiFields).filter(
    ([fieldName]) =>
      fieldName !== 'id' &&
      fieldName !== 'name' &&
      fieldName !== '_actions' &&
      fieldName !== '_layout' &&
      fieldName !== '__typename' &&
      fieldName !== '_displayValue',
  );

  const visibleFields = allFields.filter(([_, fieldData]) => {
    return fieldData.visible !== false;
  });

  const displayFields = visibleFields.sort(([fieldNameA], [fieldNameB]) => {
    const indexA = fieldDisplayOrder.indexOf(fieldNameA);
    const indexB = fieldDisplayOrder.indexOf(fieldNameB);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return 0;
  });

  return (
    <Card
      title={
        <Space>
          <Title level={3} style={{ margin: 0 }}>
            {(data as Project | null)?.name}
          </Title>
        </Space>
      }
    >
      <Descriptions
        bordered
        column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
      >
        {displayFields.map(([fieldName, fieldData]) => {
          const label = fieldData.label;

          if (fieldName === 'status' && projectId) {
            return (
              <Descriptions.Item key={fieldName} label={label}>
                <Space>
                  <DataComponent name={fieldName} />
                  <StatusToolbar onActionExecuted={handleActionExecuted} />
                </Space>
              </Descriptions.Item>
            );
          }

          if (fieldName === 'manager') {
            const managerField = (uiFields as any)?.manager;
            const managerUiValue = isUiField(managerField)
              ? managerField.value
              : undefined;

            const managerData = data?.manager;
            let finalManagerId: string | undefined;

            if (managerData) {
              const extId =
                typeof managerData === 'string' ? managerData : managerData.id;
              if (extId) {
                finalManagerId = extId;
              }
            }

            if (!finalManagerId && managerUiValue) {
              const extId =
                typeof managerUiValue === 'string'
                  ? managerUiValue
                  : managerUiValue.id;
              if (extId) {
                finalManagerId = extId;
              }
            }

            return (
              <Descriptions.Item key={fieldName} label={label}>
                <Space>
                  <DataComponent name={fieldName} />
                  <Button
                    size="small"
                    disabled={!finalManagerId}
                    onClick={() => {
                      if (finalManagerId) {
                        openView('UserReadView', {
                          params: { id: finalManagerId },
                          container: 'modal',
                        });
                      }
                    }}
                  >
                    View manager
                  </Button>
                </Space>
              </Descriptions.Item>
            );
          }

          return (
            <Descriptions.Item
              key={fieldName}
              label={label}
              span={fieldName === 'description' ? 2 : undefined}
            >
              <div style={{ marginTop: '-5px' }}>
                <DataComponent name={fieldName} />
              </div>
            </Descriptions.Item>
          );
        })}
      </Descriptions>
    </Card>
  );
}

function ProjectReadContent({ id }: { id?: string }) {
  const { dataFormHook } = useFormViewDataFormContext();
  const uiFields = dataFormHook.meta.uiFields;
  const isLoading = dataFormHook.formState.isLoading;
  const error = dataFormHook.meta.loadError;
  const data = dataFormHook.values as Project | null;
  const contextId = dataFormHook.meta.objectId;
  const dataId = data?.id ?? undefined;
  const projectId = id ?? contextId ?? dataId;

  console.log('[ProjectReadView] ProjectReadContent render:', {
    idProp: id,
    contextId,
    objectId: (data as Project | null)?.id,
    projectId,
    isLoading,
    hasError: !!error,
    hasUiFields: !!uiFields,
  });

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <ProjectDetailsContent id={projectId} />
      <NestedTabs
        items={projectNestedViews.map((nestedView, index) => ({
          key: `${nestedView.kind}-${nestedView.title ?? index}`,
          label: nestedView.title ?? `Nested ${index + 1}`,
          children:
            nestedView.kind === 'table' ? (
              <NestedView
                kind="table"
                view={nestedView.view}
                joinField={nestedView.joinField}
                filter={nestedView.filter}
                title={nestedView.title}
              />
            ) : (
              <NestedView
                kind="custom"
                view={nestedView.view}
                title={nestedView.title}
              />
            ),
        }))}
      />
    </Space>
  );
}

// ── Main functional component ─────────────────────────────────────────────────

interface Props {
  id?: string;
}

export function ProjectReadView({ id }: Props = {}) {
  const resolvedId = id;

  const buildBreadcrumb = useCallback(
    (project: Project | null): BreadcrumbValue => {
      const projectName = project?.name ?? 'Project';
      // A read view always anchors on the Projects table: only "Projects" links
      // back to the list; the project name and "Details" mark the current page.
      return [
        { label: 'Projects', to: '/projects' },
        { label: projectName },
        { label: 'Details' },
      ];
    },
    [],
  );

  if (!resolvedId) {
    return <div>No object ID provided</div>;
  }

  return (
    <ReadView
      model="Project"
      id={resolvedId}
      header={{
        title: (project: Project | null) =>
          project?.summary || project?.name || 'Project Details',
        breadcrumb: buildBreadcrumb,
        toolbar: {
          buttons: [
            toolbar.editAction({ container: 'current' }),
            toolbar.deleteAction(),
            toolbar.dropdown({
              elementId: 'projectCustomActions',
              label: 'Actions',
              menu: menu({
                items: [menu.actionsMenu({ actions: 'allCustom' })],
              }),
            }),
          ],
        },
      }}
    >
      <ProjectReadContent id={resolvedId} />
    </ReadView>
  );
}

export default ProjectReadView;

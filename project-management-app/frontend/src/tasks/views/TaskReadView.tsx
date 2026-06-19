import {
  CheckSquareOutlined,
  RocketOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { Task } from '@gql';
import type { ActionResponse } from '@drumr/framework-frontend';
import {
  BooleanToggle,
  DataForm,
  getApp,
  menu,
  NestedTabs,
  NestedView,
  ReadView,
  toolbar,
  UiMode,
  UiUsage,
  useActionButton,
} from '@drumr/framework-frontend';
import { Button, Space, Tooltip } from 'antd';
import React from 'react';
import UserReadView from '@/users/views/UserReadView';
import CompleteTaskHeadlessView from './actions/CompleteTaskHeadlessView';

/**
 * useActionButton example — headless action button outside the toolbar DSL.
 *
 * Wires `StartTask` (a param-less object action with a confirmation modal) directly
 * onto an Ant Design Button using `canRun`, `executing`, and `execute`.
 * The ambient DataFormContext supplies the record's `id` and `canExecute`
 * automatically — no explicit id prop is needed here.
 */
function QuickStartButton() {
  const action = useActionButton({
    action: 'StartTask',
    confirmationModal: {
      title: 'Start this task?',
      content: 'The task status will change to In Progress.',
      submitterLabel: 'Start',
    },

    onExecuted: (response) => {
      if (response.executed) {
        getApp().message.success('Task started!');
      }
    },
  });

  return (
    <Tooltip title={action.canRun ? 'Start task' : 'Cannot start this task'}>
      <Button
        type="primary"
        icon={<RocketOutlined />}
        loading={action.executing}
        disabled={!action.canRun}
        onClick={() => void action.execute()}
      >
        Quick Start
      </Button>
    </Tooltip>
  );
}

interface Props {
  id?: string;
}

export function TaskReadView({ id }: Props = {}) {
  const { useParams } = require('@umijs/max') as {
    useParams: () => Record<string, string>;
  };
  const routeParams = useParams();
  const resolvedId = id ?? routeParams?.id;

  return (
    <ReadView<Task>
      model="Task"
      id={resolvedId}
      fieldOverrides={{
        summary: {
          label: 'Task Summary',
        },
        dueDate: {
          label: 'Task Due Date',
        },
        'reviewChecks.deploymentChecks.stagingDeploy': {
          component: <BooleanToggle name="stagingDeploy" />,
        },
      }}
      header={{
        title: (task: Task | null) =>
          task?.summary || task?.title || 'Task Details',
        breadcrumb: () => (
          <Space size={4}>
            <CheckSquareOutlined />
            <span>Task</span>
          </Space>
        ),
        toolbar: {
          buttons: [
            toolbar.refreshAction(),
            toolbar.dropdown({
              elementId: 'taskActions',
              label: 'Actions',
              icon: <ThunderboltOutlined />,
              style: 'primary',
              menu: menu({
                items: [
                  menu.actionsMenu({
                    actions: ['StartTask', 'CompleteTask', 'ApproveTask'],
                  }),
                  menu.divider(),
                  // useActionView example: same CompleteTask action with a fully
                  // custom headless render (see CompleteTaskHeadlessView.tsx).
                  toolbar.view({
                    elementId: 'completeTaskHeadless',
                    view: CompleteTaskHeadlessView,
                    label: 'Complete (headless)',
                    icon: <CheckSquareOutlined />,
                    container: 'modal',
                    modalPosition: 'right',
                    params: () => ({ id }),
                  }),
                  menu.divider(),
                  menu.objectAction('AssignTask'),
                ],
              }),
            }),
            toolbar.dropdown({
              elementId: 'crudActions',
              label: 'Manage',
              icon: <SettingOutlined />,
              menu: menu({
                items: [menu.editAction(), menu.divider(), menu.deleteAction()],
              }),
            }),
          ],
        },
      }}
      onActionExecuted={(response: ActionResponse, actionName: string) => {
        if (response.executed) {
          getApp().message.info(`Action ${actionName} executed successfully`);
          if (actionName === 'StartTask') {
            getApp().message.success('Task started successfully!');
          } else if (actionName === 'CompleteTask') {
            getApp().message.success('Task completed!');
          }
        } else if (response.error) {
          getApp().message.error(`Action failed: ${response.error}`);
        }
      }}
    >
      {/* useActionButton example — rendered directly inside the ReadView body.
          The ambient DataFormContext (provided by ReadView) supplies the record id
          and canExecute metadata, so QuickStartButton needs no explicit props. */}
      <div style={{ marginBottom: 12 }}>
        <QuickStartButton />
      </div>

      <DataForm<Task>
        model="Task"
        id={resolvedId}
        queryContext={{ mode: UiMode.Read, usage: UiUsage.Custom }}
        showActions={false}
        formProps={{ layout: 'horizontal', labelCol: { span: 3 } }}
      ></DataForm>
      <NestedTabs
        items={[
          {
            key: 'assignee',
            label: 'Assignee',
            children: (
              <NestedView
                kind="custom"
                view={UserReadView}
                parentModel="Task"
                parentId={id}
                params={(task: Task | null) => {
                  // Reference fields are normalized to plain string IDs in form values,
                  // so task.assignee is the user ID string directly, not an object.
                  return {
                    id: task?.assignee as unknown as string | undefined,
                  };
                }}
              />
            ),
          },
          {
            key: 'reporter',
            label: 'Reporter',
            children: (
              <NestedView
                kind="custom"
                view={UserReadView}
                parentModel="Task"
                parentId={id}
                params={(task: Task | null) => ({
                  id: task?.reporter as unknown as string | undefined,
                })}
              />
            ),
          },
        ]}
      />
    </ReadView>
  );
}

export default TaskReadView;

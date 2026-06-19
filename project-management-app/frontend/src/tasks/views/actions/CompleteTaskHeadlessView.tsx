/**
 * CompleteTaskHeadlessView — useActionView example
 *
 * Demonstrates the headless `useActionView` hook:
 * - Driving the param form (DataForm + DataField) from `view.action.form`
 * - Switching render by `view.mode` ('form' | 'confirm' | 'workflow')
 * - Using `view.toolbar.buttons` for the Execute/Cancel footer
 * - Displaying the action result after execution
 * - Handling the workflow inline-progress mode
 *
 * The framework's `ActionView` component wraps all of this automatically;
 * this view opts out of it to show the raw hook surface.
 */

import {
  CheckCircleOutlined,
  LoadingOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { Task } from '@gql';
import {
  buildWorkflowProgressProps,
  closeView,
  DataField,
  DataForm,
  getApp,
  Toolbar,
  useActionView,
  WorkflowInlineProgress,
} from '@drumr/framework-frontend';
import { Alert, Card, Space, Tag, Typography } from 'antd';
import React from 'react';

const { Text, Title } = Typography;

interface Props {
  id?: string;
}

export default function CompleteTaskHeadlessView({ id }: Props) {
  const view = useActionView<Task>({
    action: 'CompleteTask',
    model: 'Task',
    id,

    executeLabel: 'Mark as done',
    onExecuted: (response) => {
      if (response.executed) {
        getApp().message.success('Task completed!');
        closeView({ returnData: response });
      }
    },
    onError: (err) => {
      getApp().message.error(`Failed to complete task: ${err.message}`);
    },
  });

  // ── workflow inline-progress mode ─────────────────────────────────────────
  if (view.mode === 'workflow' && view.workflow) {
    return (
      <Card
        title={<Title level={4}>{view.title}</Title>}
        extra={
          <Tag color="processing">
            <LoadingOutlined /> Running
          </Tag>
        }
        style={{ maxWidth: 640, margin: '0 auto' }}
      >
        <WorkflowInlineProgress
          {...buildWorkflowProgressProps({
            workflowId: view.workflow.workflowId,
            actionName: view.title,
            onComplete: view.workflow.onComplete,
          })}
        />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Toolbar options={{ buttons: view.toolbar.buttons }} />
        </div>
      </Card>
    );
  }

  // ── param-less confirmation mode ──────────────────────────────────────────
  if (view.mode === 'confirm') {
    return (
      <Card
        title={<Title level={4}>{view.title}</Title>}
        style={{ maxWidth: 480, margin: '0 auto' }}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            message="Are you sure?"
            description="This task will be marked as done. You cannot undo this."
            type="warning"
            icon={<WarningOutlined />}
            showIcon
          />
          <div style={{ textAlign: 'right' }}>
            <Toolbar options={{ buttons: view.toolbar.buttons }} />
          </div>
        </Space>
      </Card>
    );
  }

  // ── form mode (default) ───────────────────────────────────────────────────
  return (
    <Card
      title={<Title level={4}>{view.title}</Title>}
      style={{ maxWidth: 640, margin: '0 auto' }}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="large">
        <Alert
          message="Complete Task"
          description="Mark this task as done. Add an optional completion note below."
          type="info"
          showIcon
        />

        {/* form is always present in 'form' mode — guarded below for type safety */}
        {view.action.form && (
          <DataForm dataFormHook={view.action.form} showActions={false}>
            <DataField name="note" />
          </DataForm>
        )}

        {/* result card shown after a successful execution */}
        {view.executed && view.result && (
          <Card
            size="small"
            style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}
          >
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text strong>Task completed</Text>
              <Text type="secondary">
                status: {(view.result as Task).status}
              </Text>
            </Space>
          </Card>
        )}

        {view.error && (
          <Alert message={view.error.message} type="error" showIcon />
        )}

        <div style={{ textAlign: 'right' }}>
          <Toolbar options={{ buttons: view.toolbar.buttons }} />
        </div>
      </Space>
    </Card>
  );
}

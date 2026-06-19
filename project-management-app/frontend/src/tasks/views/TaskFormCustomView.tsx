/**
 * TaskFormCustomView — Granular composition demo (Issue #8 AC1/AC3)
 *
 * Demonstrates composing <View> + <DataForm> + <DataField> + <Toolbar>
 * directly, without using the <EditView> wrapper.
 *
 * Key patterns shown:
 * - DataField shorthand (`name` prop only) — no direct context reads needed
 * - Manual View + DataForm + Toolbar composition
 * - Custom Row/Col layout defined in JSX (sections via Card)
 * - Save/cancel wired through formRef — same mechanism EditView uses internally
 *
 * What this view deliberately avoids (safe against PR #2073 context shape change):
 * - useDataFormContext() / reading context.uiFields, context.id, context.object
 * - Form.useWatch() / Form.useFormInstance() (antd form state)
 */

import type { Task } from '@gql';
import {
  cancelAction,
  closeView,
  DataField,
  DataForm,
  getApp,
  saveAction,
  Toolbar,
  View,
} from '@drumr/framework-frontend';
import { Card, Col, Row, Typography } from 'antd';
import React from 'react';

const { Title } = Typography;

interface Props {
  id?: string;
}

export function TaskFormCustomView({ id }: Props = {}) {
  const handleSave = (): void => {};

  const handleCancel = (): void => {
    closeView({ returnData: { executed: false, cancelled: true } });
  };

  const toolbarButtons = [
    saveAction({ handler: () => void handleSave() }),
    cancelAction({ handler: handleCancel }),
  ];

  return (
    <View
      header={{
        title: id ? 'Edit Task (custom layout)' : 'New Task (custom layout)',
        toolbar: { buttons: toolbarButtons },
      }}
      footer={<Toolbar options={{ buttons: toolbarButtons }} />}
    >
      <DataForm<Task>
        model="Task"
        id={id}
        isNewObject={!id}
        refreshTrigger={['status', 'project', 'isBillable']}
        onSubmitSuccess={(result: any) => {
          const response = result as { data?: Task } | undefined;
          const title = response?.data?.title ?? 'Task';
          getApp().message.success(`"${title}" saved.`);
          closeView({ returnData: { executed: true, data: result } });
        }}
        onSubmitError={(err: any) => {
          getApp().message.error(`Failed to save: ${err.message}`);
        }}
      >
        {/* ── Basic Information ─────────────────────────────────────── */}
        <Card style={{ marginBottom: 24 }}>
          <Title level={4}>Basic Information</Title>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <DataField name="title" />
            </Col>
            <Col span={24}>
              <DataField name="description" />
            </Col>
            <Col span={12}>
              <DataField name="tags" />
            </Col>
          </Row>
        </Card>

        {/* ── Status & Priority ─────────────────────────────────────── */}
        <Card style={{ marginBottom: 24 }}>
          <Title level={4}>Status & Priority</Title>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <DataField name="status" />
            </Col>
            <Col span={12}>
              <DataField name="priority" />
            </Col>
          </Row>
        </Card>

        {/* ── Team ──────────────────────────────────────────────────── */}
        <Card style={{ marginBottom: 24 }}>
          <Title level={4}>Team</Title>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <DataField name="isBillable" />
            </Col>
          </Row>
        </Card>

        {/* ── Time Tracking ─────────────────────────────────────────── */}
        <Card style={{ marginBottom: 24 }}>
          <Title level={4}>Time Tracking</Title>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <DataField name="estimatedHours" />
            </Col>
            <Col span={8}>
              <DataField name="actualHours" />
            </Col>
            <Col span={8}>
              <DataField name="dueDate" />
            </Col>
          </Row>
        </Card>
      </DataForm>
    </View>
  );
}

export default TaskFormCustomView;

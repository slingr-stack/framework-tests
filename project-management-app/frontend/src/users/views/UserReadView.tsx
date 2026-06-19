/**
 * UserReadView — functional equivalent of the class-based UserReadView.
 *
 * Demonstrates the full-composition pattern: explicit <View> + <DataForm> + <DataField>
 * layout, using Row/Col for two-column presentation, plus nested views in tabs.
 *
 * NOTE: This file co-exists with the class-based `UserReadView.tsx`.
 * Once the routing system supports functional views natively, the class-based
 * version can be removed and this file can be registered at the same path.
 */

import { CheckSquareOutlined } from '@ant-design/icons';
import type { User } from '@gql';
import {
  DataField,
  DataForm,
  NestedTabs,
  NestedView,
  ReadView,
  toolbar,
} from '@drumr/framework-frontend';
import { Col, Row } from 'antd';
import Space from 'antd/lib/space';
import React, { useEffect } from 'react';
import { setViewedUserId } from '@/context/viewedUser';
import ProjectTableView from '@/projects/views/ProjectTableView';
import TaskTableView from '@/tasks/views/TaskTableView';
import UserEditView from './UserEditView';

// ─── UserReadView — full-composition read view ───────────────────────────────
// Uses <View> + <DataForm> + <DataField> with explicit layout.
interface Props {
  id?: string;
}

export default function UserReadView({ id: idProp }: Props = {}) {
  const { useParams } = require('@umijs/max') as {
    useParams: () => Record<string, string>;
  };
  const routeParams = useParams();
  const id = idProp ?? routeParams?.id;

  useEffect(() => {
    if (!id) {
      setViewedUserId(undefined);
      return undefined;
    }

    setViewedUserId(id);
    return () => setViewedUserId(undefined);
  }, [id]);

  return (
    <ReadView<User>
      model="User"
      id={id}
      header={{
        title: 'User Details',
        toolbar: {
          buttons: [
            toolbar.refreshAction(),
            toolbar.editAction({ container: 'page' }),
          ],
        },
        breadcrumb: () => (
          <Space size={4}>
            <CheckSquareOutlined />
            <span>User</span>
          </Space>
        ),
      }}
    >
      <DataForm<User>
        showActions={false}
        formProps={{ layout: 'horizontal', labelCol: { span: 3 } }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <DataField name="firstName" />
          </Col>
          <Col span={12}>
            <DataField name="lastName" />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <DataField name="fullName" />
          </Col>
          <Col span={12}>
            <DataField name="email" />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <DataField name="status" />
          </Col>
          <Col span={12}>
            <DataField name="roles" />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <DataField name="addresses" />
          </Col>
        </Row>
      </DataForm>
      <NestedTabs
        items={[
          {
            key: 'managed-projects',
            label: 'Managed Projects',
            children: (
              <NestedView
                title="Managed projects"
                kind="table"
                view={ProjectTableView}
                joinField="manager"
              />
            ),
          },
          {
            key: 'team-projects',
            label: 'Team Projects',
            children: (
              <NestedView
                kind="table"
                view={ProjectTableView}
                joinField="teamMembers"
              />
            ),
          },
          {
            key: 'assigned-tasks',
            label: 'Assigned Tasks',
            children: (
              <NestedView
                kind="table"
                view={TaskTableView}
                joinField="assignee"
                filter={{ status: { eq: 'done' } }}
              />
            ),
          },
          {
            key: 'edit-user',
            label: 'Edit User',
            children: <NestedView kind="custom" view={UserEditView} />,
          },
        ]}
      />
    </ReadView>
  );
}

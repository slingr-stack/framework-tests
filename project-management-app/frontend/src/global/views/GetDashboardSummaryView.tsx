import type { DashboardFiltersInput } from '@gql';
import {
  ActionView,
  DataField,
  getApp,
  type OnRefreshCallback,
} from '@drumr/framework-frontend';
import { Alert, Card, Col, Row, Typography } from 'antd';
import React, { useMemo } from 'react';

const { Title } = Typography;

export function GetDashboardSummaryView() {
  const initialData = useMemo<DashboardFiltersInput>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, []);

  const handleRefresh: OnRefreshCallback = async (_defaultRefresh, context) => {
    const app = getApp();
    const changedFields = context.changedFieldsSinceRefresh;
    const data = context.form.state.values as DashboardFiltersInput;

    if (changedFields.has('startDate') || changedFields.has('endDate')) {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (start > end) {
          app.message.warning('Start date cannot be after end date');
        }
      }
    }

    if (changedFields.has('project')) {
      console.log(
        '[GetDashboardSummaryView] Project filter changed:',
        data.project,
      );
    }

    return {
      success: true,
      values: data,
      uiFields: null,
      errors: [],
    };
  };

  return (
    <ActionView
      action="GetDashboardSummary"
      initialData={initialData}
      refreshMode="custom"
      refreshTriggers={['project', 'startDate', 'endDate']}
      onRefresh={handleRefresh}
    >
      <div style={{ padding: '0 24px' }}>
        <Alert
          message="Dashboard Summary"
          description={
            <span>
              Configure filters below and execute to generate a summary of
              projects, tasks, and users.
              <br />
              <strong>Note:</strong> The date filters apply to the{' '}
              <b>start date</b> of projects and tasks.
              <br />
              All filters are optional — leave empty to see the full overview.
            </span>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Card>
          <Title level={4}>Filters</Title>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <DataField name="project" />
            </Col>
            <Col span={12}>
              <DataField name="startDate" />
            </Col>
            <Col span={12}>
              <DataField name="endDate" />
            </Col>
          </Row>
        </Card>
      </div>
    </ActionView>
  );
}

export default GetDashboardSummaryView;

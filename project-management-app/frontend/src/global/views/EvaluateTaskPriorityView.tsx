import { ActionView, DataField } from '@drumr/framework-frontend';
import { Alert, Card, Col, Row, Typography } from 'antd';
import React from 'react';

const { Title } = Typography;

export function EvaluateTaskPriorityView() {
  return (
    <ActionView
      action="EvaluateTaskPriority"
      header={{ title: 'Evaluate Task Priority' }}
    >
      <div style={{ padding: '0 24px' }}>
        <Alert
          message="Resolve evaluator by ID"
          description={
            <span>
              Select an <strong>Evaluator Code</strong> and enter a{' '}
              <strong>Task Title</strong>. The action resolves the matching{' '}
              <code>@Service</code> subclass via{' '}
              <code>DependencyContainer.resolveById(code)</code> and returns the
              evaluation result.
            </span>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Card>
          <Title level={5}>Parameters</Title>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <DataField
                name="code"
                antdOptions={{
                  layout: 'horizontal',
                  labelCol: { span: 5.5 },
                  wrapperCol: { span: 16 },
                }}
              />
            </Col>
            <Col span={24}>
              <DataField
                name="taskTitle"
                antdOptions={{
                  layout: 'vertical',
                  labelCol: { span: 2.5 },
                  wrapperCol: { span: 6 },
                }}
              />
            </Col>
          </Row>
        </Card>
      </div>
    </ActionView>
  );
}

export default EvaluateTaskPriorityView;

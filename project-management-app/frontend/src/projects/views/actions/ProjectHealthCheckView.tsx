import type { ActionResponse } from '@drumr/framework-frontend';
import { ActionView, closeView, getApp } from '@drumr/framework-frontend';
import { Descriptions, Tag } from 'antd';
import React from 'react';

interface Props {
  id: string;
}

const statusColor: Record<string, string> = {
  ok: 'success',
  warning: 'warning',
  critical: 'error',
};

export function ProjectHealthCheckView({ id }: Props) {
  const handleExecuted = (response: ActionResponse) => {
    if (response.executed && response.responseType === 'data') {
      const r = (response.data as any)?.ProjectProjectHealthCheck;

      getApp().modal.info({
        title: 'Health Report',
        width: 480,
        content: (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Status">
              <Tag color={statusColor[r?.status] ?? 'default'}>
                {r?.status?.toUpperCase() ?? '—'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Completion">
              {r?.completionRate ?? 0}%
            </Descriptions.Item>
            <Descriptions.Item label="Total tasks">
              {r?.totalTasks ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="Completed">
              {r?.completedTasks ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="Blocked">
              {r?.blockedTasks ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="Overdue">
              {r?.overdueTasks ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="At risk">
              {r?.atRiskTasks ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="Summary">
              {r?.summary ?? '—'}
            </Descriptions.Item>
          </Descriptions>
        ),
      });
    }
    closeView({ executed: true });
  };

  return (
    <ActionView
      action="ProjectHealthCheck"
      model="Project"
      id={id}
      onExecuted={handleExecuted}
    />
  );
}

export default ProjectHealthCheckView;

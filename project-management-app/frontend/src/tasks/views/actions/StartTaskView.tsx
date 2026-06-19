import { Alert, Space } from 'antd';
import React from 'react';

export function StartTaskView() {
  return (
    <Space orientation="vertical" style={{ width: '100%' }}>
      <Alert
        message="Start Task"
        description="This will change the task status to 'In Progress' and record the current time as the start time. Make sure the task has been properly assigned before starting."
        type="info"
        showIcon
      />
    </Space>
  );
}

export default StartTaskView;

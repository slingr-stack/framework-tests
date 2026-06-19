import { ActionView, DataField } from '@drumr/framework-frontend';
import { Alert, Space } from 'antd';
import React from 'react';

interface Props {
  id: string;
}

export function TryLockManualView({ id }: Props) {
  return (
    <ActionView action="TryLockManual" model="User" id={id}>
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Alert
          title="tryLock() — manual non-blocking acquisition"
          description={
            <>
              Tries to acquire the lock via <code>tryLock()</code>{' '}
              <strong>without waiting</strong>. Holds for N seconds and releases
              manually in a <code>finally</code> block. Returns a
              CannotExecuteError immediately if already taken.
              <br />
              <br />
              Use this pattern when you need the lock handle across multiple
              operations and want to fail fast on contention.
            </>
          }
          type="info"
          showIcon
        />
        <DataField name="holdForSeconds" />
      </Space>
    </ActionView>
  );
}

export default TryLockManualView;

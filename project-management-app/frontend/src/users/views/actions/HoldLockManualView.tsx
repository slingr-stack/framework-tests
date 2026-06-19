import { ActionView, DataField } from '@drumr/framework-frontend';
import { Alert, Space } from 'antd';
import React from 'react';

interface Props {
  id: string;
}

export function HoldLockManualView({ id }: Props) {
  return (
    <ActionView action="HoldLockManual" model="User" id={id}>
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Alert
          title="lock() — manual blocking acquisition"
          description={
            <>
              Acquires a lock via <code>lock()</code> and releases it manually
              in a <code>finally</code> block after holding for the given
              seconds. Blocks up to 3 s if already held; fails with
              CannotExecuteError on timeout.
              <br />
              <br />
              Use this pattern when the lock must span multiple async operations
              that cannot be wrapped in a single callback.
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

export default HoldLockManualView;

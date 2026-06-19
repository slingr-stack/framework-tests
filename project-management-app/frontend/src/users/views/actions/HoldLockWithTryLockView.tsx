import { ActionView, DataField } from '@drumr/framework-frontend';
import { Alert, Space } from 'antd';
import React from 'react';

interface Props {
  id: string;
}

export function HoldLockWithTryLockView({ id }: Props) {
  return (
    <ActionView action="HoldLockWithTryLock" model="User" id={id}>
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Alert
          title="withTryLock — non-blocking acquisition"
          description={
            <>
              Tries to acquire the lock <strong>immediately</strong> (zero
              wait). If the lock is free it holds for the given seconds; if
              already taken it returns a CannotExecuteError{' '}
              <strong>without blocking</strong>.
              <br />
              <br />
              To test: first run "Hold lock (withLock)" on the same user, then
              run this action while the first one is still holding.
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

export default HoldLockWithTryLockView;

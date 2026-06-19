import { ActionView, DataField } from '@drumr/framework-frontend';
import { Alert, Space } from 'antd';
import React from 'react';

interface Props {
  id: string;
}

export function HoldLockWithLockView({ id }: Props) {
  return (
    <ActionView action="HoldLockWithLock" model="User" id={id}>
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Alert
          title="withLock — blocking acquisition"
          description={
            <>
              Acquires an exclusive lock on this user and holds it for the given
              number of seconds. If the lock is already held, the action{' '}
              <strong>blocks up to 3 s</strong> waiting for it to become free,
              then fails with a CannotExecuteError.
              <br />
              <br />
              To test contention: run this, then immediately run another lock
              action on the <strong>same user</strong> from a different tab.
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

export default HoldLockWithLockView;

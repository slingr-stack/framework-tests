/**
 * UserTableView — functional equivalent of the class-based UsersView.
 *
 * Demonstrates the high-level <TableView> pattern with an explicit options object.
 *
 * Class-based original for comparison:
 *
 * ```ts
 * @TableView({ model: 'User', path: '/users' })
 * export default class UsersView extends TableViewComponent<User> {
 *   override tableOptions: TableViewTableOptions<User> = {
 *     columns: [
 *       { field: 'fullName', title: 'Full Name', sorting: true, filtering: true },
 *       { field: 'email', title: 'Email', sorting: true, filtering: true },
 *       { field: 'roles', title: 'Roles', sorting: true, filtering: true },
 *       { field: 'createdAt', title: 'Created At', sorting: true, filtering: true },
 *     ],
 *     pagination: { pageSize: 10 },
 *     selection: { enabled: true, type: 'multiple' },
 *     rowToolbar: { buttons: toolbar<User>({ container: 'modal' }) },
 *     tableToolbar: { buttons: toolbar<User>({ actions: 'crud' }) },
 *   };
 * }
 * ```
 *
 * NOTE: This file co-exists with the class-based `UserTableView.tsx`.
 * Once the routing system supports functional views natively, the class-based
 * version can be removed and this file can be registered at the same path.
 */

import { LockOutlined } from '@ant-design/icons';
import type { User } from '@gql';
import {
  dataTable,
  menu,
  openView,
  TableView,
  toolbar,
} from '@drumr/framework-frontend';
import React from 'react';

export function UserTableView() {
  return (
    <TableView<User>
      header={{
        title: 'Users',
      }}
      tableOptions={dataTable.options<User>({
        model: 'User',
        columns: [
          {
            field: 'fullName',
            title: 'Full Name',
            sorting: true,
            filtering: true,
          },
          { field: 'email', title: 'Email', sorting: true, filtering: true },
          { field: 'roles', title: 'Roles', sorting: true, filtering: true },
          {
            field: 'createdAt',
            title: 'Created At',
            sorting: true,
            filtering: true,
          },
        ],
        pagination: { pageSize: 10 },
        selection: { enabled: true, type: 'multiple' },
        rowToolbar: {
          buttons: [
            toolbar<User>({ container: 'modal' }),
            toolbar.dropdown({
              elementId: 'lockTesting',
              label: 'Lock testing',
              icon: <LockOutlined />,
              menu: menu({
                items: [
                  toolbar.objectAction<User>('HoldLockWithLock'),
                  toolbar.objectAction<User>('HoldLockWithTryLock'),
                  menu.divider(),
                  toolbar.objectAction<User>('HoldLockManual'),
                  toolbar.objectAction<User>('TryLockManual'),
                ],
              }),
            }),
          ],
        },
        tableToolbar: { buttons: toolbar<User>({ actions: 'crud' }) },
        onRowClicked: (user: User) => {
          openView('UserReadView', {
            params: { id: user.id },
            container: 'page',
            modalPosition: 'left',
          });
        },
      })}
    />
  );
}

export default UserTableView;

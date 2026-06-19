/**
 * UserEditView — functional equivalent of the class-based UserEditView.
 *
 * Demonstrates migrating from `@EditView` + `EditViewComponent` to the
 * functional `EditView` component from '@drumr/framework-frontend'.
 *
 * Class-based original for comparison:
 *
 * ```ts
 * @EditView({ model: 'User', path: '/users/:id/edit' })
 * export default class UserEditView extends EditViewComponent<User> {
 *   override fields = ['firstName', 'lastName', 'fullName', 'email', 'status', 'roles', 'addresses'];
 *   override formLayout = 'oneColumn';
 *   override formProps = { layout: 'horizontal', labelCol: { span: 2 } };
 *   override refreshTriggers = ['firstName', 'lastName', 'email', 'fullName'];
 * }
 * ```
 *
 * NOTE: This file co-exists with the class-based `UserEditView.tsx`.
 * Once the routing system supports functional views natively, the class-based
 * version can be removed and this file can be registered at the same path.
 */

import type { User } from '@gql';
import { closeView, EditView } from '@drumr/framework-frontend';
import React from 'react';

// The framework's EditView auto-resolves :id from route params when not
// provided as a prop, so no wrapper component is needed.

interface Props {
  id?: string;
}

export default function UserEditView({ id }: Props = {}) {
  return (
    <EditView<User>
      model="User"
      id={id}
      fields={{
        firstName: true,
        lastName: true,
        fullName: true,
        email: true,
        status: true,
        roles: true,
        addresses: true,
      }}
      fieldOverrides={{
        firstName: {
          label: 'Given Name',
        },
        lastName: {
          label: 'Family Name',
        },
      }}
      header={{ title: 'Edit User' }}
      onSaved={() => closeView({ executed: true })}
    />
  );
}

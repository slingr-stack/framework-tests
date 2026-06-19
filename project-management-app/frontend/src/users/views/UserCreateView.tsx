/**
 * UserCreateView — functional equivalent of the class-based UserCreateView.
 *
 * Demonstrates the composition pattern: explicit <DataField> children
 * override the default "all model fields" rendering of <CreateView>.
 *
 * Class-based original for comparison:
 *
 * ```ts
 * @CreateView({ model: 'User', path: '/users/new' })
 * export default class UserCreateView extends CreateViewComponent<User> {
 *   override fields = ['firstName', 'lastName', 'fullName', 'email', 'status', 'roles', 'addresses'];
 *   override formLayout = 'oneColumn';
 *   override layout = FormLayout;
 * }
 * ```
 *
 * NOTE: This file co-exists with the class-based `UserCreateView.tsx`.
 * Once the routing system supports functional views natively, the class-based
 * version can be removed and this file can be registered at the same path.
 */

import type { User } from '@gql';
import { CreateView, closeView, DataField } from '@drumr/framework-frontend';
import React from 'react';

// No route wrapper needed — /users/new has no route params.

export function UserCreateView() {
  return (
    <CreateView<User>
      model="User"
      header={{ title: 'New User' }}
      onSaved={() => closeView({ executed: true })}
    >
      <DataField name="firstName" />
      <DataField name="lastName" />
      <DataField name="fullName" />
      <DataField name="email" />
      <DataField name="status" />
      <DataField name="roles" />
      <DataField name="addresses" />
    </CreateView>
  );
}

export default UserCreateView;

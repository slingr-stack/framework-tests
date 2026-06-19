import type { Address, RichLockDemoParams, User } from '@gql';
import {
  app,
  ChoiceDropdown,
  ChoiceLabel,
  CompositionAccordion,
  DateTimeLabel,
  DateTimePickerField,
  IntegerInput,
  List,
  TextInput,
} from '@drumr/framework-frontend';
import React from 'react';

const ROLE_VALUE_METADATA = {
  system: { label: 'System', color: 'green', description: 'Full access' },
  admin: {
    label: 'Admin',
    color: 'blue',
    description: 'Access to Users, Tasks and Projects',
  },
  manager: {
    label: 'Manager',
    color: 'orange',
    description: 'Can manage projects where they are the manager',
  },
  developer: {
    label: 'Developer',
    color: 'red',
    description: 'Can work on assigned tasks',
  },
} as const;

// Register User defaults
app.registerDataModel<User>('User', {
  labelField: 'fullName',
  defaultCreateView: 'UserCreateView',
  defaultEditView: 'UserEditView',
  defaultReadView: 'UserReadView',
  fields: {
    password: [
      {
        context: 'all',
        label: 'Password',
        component: <TextInput maskInput={true} />,
      },
    ],
    createdAt: [
      {
        context: 'read',
        component: <DateTimeLabel format="DD/MM/YYYY HH:mm" />,
      },
      {
        context: 'write',
        component: <DateTimePickerField format="DD/MM/YYYY HH:mm" />,
      },
    ],
    updatedAt: [
      {
        context: 'read',
        component: <DateTimeLabel format="DD/MM/YYYY HH:mm" />,
      },
      {
        context: 'write',
        component: <DateTimePickerField format="DD/MM/YYYY HH:mm" />,
      },
    ],
    roles: [
      {
        context: 'read',
        component: <ChoiceLabel valueMetadata={ROLE_VALUE_METADATA} />,
      },
      {
        context: 'write',
        component: (
          <ChoiceDropdown
            placeholder="Select roles"
            valueMetadata={ROLE_VALUE_METADATA}
          />
        ),
      },
    ],
    addresses: [
      {
        context: 'read',
        component: (
          <List
            component={
              <CompositionAccordion<Address>
                label={(address: Address) =>
                  `${address.street}, ${address.city}`
                }
                defaultExpanded={false}
                collapsible
              />
            }
          />
        ),
      },
      {
        context: 'write',
        component: (
          <List
            component={
              <CompositionAccordion<Address>
                label={(address: Address) => address.street || 'New Address'}
                defaultExpanded
                collapsible
              />
            }
          />
        ),
      },
    ],
  },
});

// Register LockDemoParams defaults
app.registerDataModel<RichLockDemoParams>('LockDemoParams', {
  fields: {
    holdForSeconds: [
      { context: 'all', label: 'Hold for (seconds)' },
      { context: 'write', component: <IntegerInput /> },
    ],
  },
});

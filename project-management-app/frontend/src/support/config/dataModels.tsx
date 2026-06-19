import {
  app,
  ChoiceDropdown,
  ChoiceLabel,
  DateTimeLabel,
  EmailInput,
  EmailLabel,
  LongTextInput,
  LongTextLabel,
  TextInput,
  TextLabel,
} from '@drumr/framework-frontend';
import React from 'react';
import type {
  Address,
  Document,
  File,
  Support,
} from '../../../generated/gql/types';

// =============================================================================
// Support Defaults
// =============================================================================

app.registerDataModel<Support>('Support', {
  fields: {
    email: [
      { context: 'read', component: <EmailLabel copyButton /> },
      {
        context: 'write',
        component: (
          <EmailInput
            placeholder="Enter support email"
            prependIcon="MailOutlined"
          />
        ),
      },
    ],
  },
});

// =============================================================================
// File Defaults
// =============================================================================

app.registerDataModel<File>('File', {
  labelField: 'name',
  fields: {
    description: [
      { context: 'read', label: 'Description', component: <TextLabel /> },
      {
        context: 'write',
        label: 'Description',
        component: <TextInput placeholder="Enter file description" />,
      },
    ],
  },
});

// =============================================================================
// Address Defaults
// =============================================================================

app.registerDataModel<Address>('Address', {
  fields: {
    street: [
      { context: 'read', component: <TextLabel /> },
      {
        context: 'write',
        component: <TextInput placeholder="Enter street address" />,
      },
    ],
    city: [
      { context: 'read', component: <TextLabel /> },
      {
        context: 'write',
        component: <TextInput placeholder="Enter city or locality" />,
      },
    ],
    state: [
      { context: 'read', component: <TextLabel /> },
      {
        context: 'write',
        component: <TextInput placeholder="Enter state, province, or region" />,
      },
    ],
    postalCode: [
      { context: 'read', component: <TextLabel /> },
      {
        context: 'write',
        component: <TextInput placeholder="Enter postal or ZIP code" />,
      },
    ],
    country: [
      { context: 'read', component: <TextLabel /> },
      {
        context: 'write',
        component: <TextInput placeholder="Enter country" />,
      },
    ],
  },
});

// =============================================================================
// Document Defaults
// =============================================================================

app.registerDataModel<Document>('Document', {
  labelField: 'title',
  defaultCreateView: 'DocumentCreateView',
  defaultEditView: 'DocumentEditView',
  defaultReadView: 'DocumentReadView',
  fields: {
    title: [
      { context: 'read', component: <TextLabel /> },
      {
        context: 'write',
        component: <TextInput placeholder="Document title" />,
      },
    ],
    content: [
      {
        context: 'read',
        component: <LongTextLabel control="textArea" height="120px" />,
      },
      {
        context: 'write',
        component: (
          <LongTextInput
            control="textArea"
            height="120px"
            placeholder="Document content"
            limitCharacters={5000}
          />
        ),
      },
    ],
    status: [
      { context: 'read', component: <ChoiceLabel /> },
      {
        context: 'write',
        component: <ChoiceDropdown placeholder="Select status" />,
      },
    ],
    createdAt: {
      context: 'all',
      component: <DateTimeLabel format="DD/MM/YYYY HH:mm" />,
    },
  },
});

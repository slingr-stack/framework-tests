import {
  app,
  BooleanCheckbox,
  BooleanToggle,
  ChoiceDropdown,
  ChoiceLabel,
  CompositionCard,
  DateLabel,
  DatePickerField,
  DateTimeLabel,
  DateTimePickerField,
  FileInput,
  FileLabel,
  HtmlBlock,
  HtmlEditor,
  IntegerInput,
  IntegerLabel,
  List,
  MoneyInput,
  MoneyLabel,
  ReferenceDropdown,
  ReferenceLabel,
  TextInput,
  TextLabel,
  TimePickerField,
  useApiFindById,
} from '@drumr/framework-frontend';
import React from 'react';
import type {
  Project,
  ProjectReport,
  Support,
  User,
} from '../../../generated/gql/types';

// =============================================================================
// Project Defaults
// =============================================================================

const STATUS_VALUE_METADATA = {
  planning: { label: 'Planning', color: 'default' },
  active: { label: 'Active', color: 'processing' },
  on_hold: { label: 'On Hold', color: 'warning' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
} as const;

const PRIORITY_VALUE_METADATA = {
  low: { label: 'Low', color: 'green' },
  medium: { label: 'Medium', color: 'blue' },
  high: { label: 'High', color: 'orange' },
  critical: { label: 'Critical', color: 'red' },
} as const;

function useProjectTeamMemberLabel(instance: unknown): string {
  const user = instance as User;
  const userId = user?.id ?? null;
  const { data } = useApiFindById<User>('User', userId, {
    fields: {
      id: true,
      fullName: true,
      roles: true,
    },
  });

  const resolvedUser = data ?? user;
  const baseLabel = resolvedUser?.fullName ?? user?.fullName ?? userId ?? '';
  const primaryRole = resolvedUser?.roles?.[0];

  return primaryRole ? `${baseLabel} (${primaryRole})` : baseLabel;
}

app.registerDataModel<Project>('Project', {
  labelField: 'name',
  defaultCreateView: 'ProjectCreateView',
  defaultEditView: 'ProjectEditView',
  defaultReadView: 'ProjectReadView',
  fields: {
    summary: { context: 'all', component: <TextLabel /> },
    name: [
      { context: 'read', label: 'Name', component: <TextLabel /> },
      {
        context: 'write',
        label: 'Name',
        component: <TextInput placeholder="Enter project name" />,
      },
      {
        context: { view: { name: 'TaskDetails' } },
        label: 'Name',
        componentOptions: { noBackground: true },
      },
    ],
    code: [
      { context: 'read', label: 'Code', component: <TextLabel /> },
      {
        context: 'write',
        label: 'Code',
        component: (
          <TextInput
            placeholder="Enter project code"
            prependIcon="CodeOutlined"
          />
        ),
      },
      {
        context: { view: { name: 'TaskDetails' } },
        label: 'Code',
        componentOptions: { noBackground: true },
      },
    ],
    description: [
      {
        context: 'read',
        label: 'Description',
        component: <HtmlBlock previewCharacters={200} />,
      },
      {
        context: 'write',
        label: 'Description',
        component: <HtmlEditor height="300px" />,
      },
    ],
    status: [
      {
        context: 'read',
        component: <ChoiceLabel valueMetadata={STATUS_VALUE_METADATA} />,
      },
      {
        context: 'write',
        component: (
          <ChoiceDropdown
            placeholder="Select project status"
            valueMetadata={STATUS_VALUE_METADATA}
          />
        ),
      },
    ],
    priority: [
      {
        context: 'read',
        component: <ChoiceLabel valueMetadata={PRIORITY_VALUE_METADATA} />,
      },
      {
        context: 'write',
        component: (
          <ChoiceDropdown
            placeholder="Select project priority"
            valueMetadata={PRIORITY_VALUE_METADATA}
          />
        ),
      },
    ],
    startDate: [
      { context: 'read', component: <DateLabel format="dd-MM-yyyy" /> },
      { context: 'write', component: <DatePickerField format="dd-MM-yyyy" /> },
    ],
    endDate: [
      { context: 'read', component: <DateLabel format="dd-MM-yyyy" /> },
      { context: 'write', component: <DatePickerField format="dd-MM-yyyy" /> },
    ],
    budget: [
      {
        context: 'read',
        component: (
          <MoneyLabel symbol="$" showThousandsSeparator numberOfDecimals={2} />
        ),
      },
      {
        context: 'write',
        component: (
          <MoneyInput symbol="$" showThousandsSeparator numberOfDecimals={2} />
        ),
      },
    ],
    completionPercentage: [
      { context: 'read', component: <IntegerLabel /> },
      {
        context: 'write',
        component: <IntegerInput appendText="%" />,
        componentOptions: { showControls: true },
      },
    ],
    meetingTime: [
      {
        context: 'write',
        component: (
          <TimePickerField format="HH:mm" hourStep={1} minuteStep={15} />
        ),
      },
    ],
    manager: [
      {
        context: 'read',
        labelField: 'fullName',
        component: <ReferenceLabel />,
      },
      {
        context: 'write',
        labelField: 'fullName',
        component: (
          <ReferenceDropdown
            label="fullName"
            placeholder="Select project manager"
            sorting={{ firstName: 'asc' }}
          />
        ),
      },
      {
        context: { view: { name: 'TaskDetails' } },
        labelField: 'fullName',
        component: <ReferenceLabel representation="plain" />,
        componentOptions: { noBackground: true },
      },
    ],
    teamMembers: [
      {
        context: 'read',
        labelField: useProjectTeamMemberLabel,
        component: <ReferenceLabel />,
      },
      {
        context: 'write',
        labelField: useProjectTeamMemberLabel,
        component: (
          <ReferenceDropdown
            placeholder="Select team members"
            sorting={{ firstName: 'asc' }}
          />
        ),
      },
    ],
    isArchived: [
      { context: 'read', component: <BooleanCheckbox /> },
      {
        context: 'write',
        component: (
          <BooleanToggle falseLabel="Not Archived" trueLabel="Archived" />
        ),
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
    support: [
      {
        context: 'all',
        component: (
          <CompositionCard
            size="large"
            label={(support: Support) => `Support: ${support.email}`}
          />
        ),
        visible: (project: Project) => project.status === 'active',
      },
    ],
  },
});

// =============================================================================
// ProjectReport Defaults
// =============================================================================

app.registerDataModel<ProjectReport>('ProjectReport', {
  labelField: 'title',
  defaultCreateView: 'ProjectReportCreateView',
  defaultEditView: 'ProjectReportEditView',
  defaultReadView: 'ProjectReportReadView',
  fields: {
    title: [
      { context: 'read', label: 'Title', component: <TextLabel /> },
      { context: 'write', label: 'Title', component: <TextInput /> },
    ],
    generatedAt: [
      { context: 'read', label: 'Generated At', component: <DateTimeLabel /> },
      {
        context: 'write',
        label: 'Generated At',
        component: <DateTimePickerField showTime />,
      },
    ],
    project: [
      { context: 'read', label: 'Project', component: <ReferenceLabel /> },
      { context: 'write', label: 'Project', component: <ReferenceDropdown /> },
    ],
    file: [
      { context: 'read', label: 'Report File', component: <FileLabel /> },
      { context: 'write', label: 'Report File', component: <FileInput /> },
    ],
    sections: [
      {
        context: 'read',
        label: 'Sections',
        component: <List component={<TextLabel />} />,
      },
      {
        context: 'write',
        label: 'Sections',
        component: (
          <List
            sorting={false}
            component={<TextInput placeholder="Enter section" />}
          />
        ),
      },
    ],
  },
});

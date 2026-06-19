import {
  app,
  BooleanToggle,
  ChoiceDropdown,
  ChoiceLabel,
  CompositionPanel,
  DateLabel,
  DatePickerField,
  DateTimeLabel,
  FileDropZone,
  FileLabel,
  IntegerInput,
  IntegerLabel,
  List,
  LongTextInput,
  LongTextLabel,
  ReferenceDropdown,
  ReferenceLabel,
  TextInput,
  TextLabel,
} from '@drumr/framework-frontend';
import React from 'react';
import type { Note, Task, TaskMetadata } from '../../../generated/gql/types';
import { TaskPriorityBadge } from '../components/TaskPriorityBadge';

// =============================================================================
// Task Defaults
// =============================================================================

const STATUS_VALUE_METADATA = {
  to_do: { label: 'To Do', color: 'default' },
  in_progress: { label: 'In Progress', color: 'processing' },
  in_review: { label: 'In Review', color: 'warning' },
  done: { label: 'Done', color: 'success' },
  blocked: { label: 'Blocked', color: 'error' },
} as const;

const PRIORITY_VALUE_METADATA = {
  low: { label: 'Low', color: 'green' },
  medium: { label: 'Medium', color: 'blue' },
  high: { label: 'High', color: 'orange' },
  urgent: { label: 'Urgent', color: 'red' },
  critical: { label: 'Critical', color: 'purple' },
} as const;

app.registerDataModel<Task>('Task', {
  labelField: (task: Task) => `${task.title}`,
  defaultCreateView: 'TaskCreateView',
  defaultEditView: 'TaskEditView',
  defaultReadView: 'TaskReadView',
  fields: {
    summary: {
      context: 'all',
      component: <TextLabel />,
    },

    title: [
      {
        context: 'read',
        component: <TextLabel limitCharacters={200} />,
      },
      {
        context: 'write',
        component: (
          <TextInput
            placeholder="Enter task title"
            appendIcon="FontSizeOutlined"
          />
        ),
      },
    ],

    description: [
      {
        context: 'read',
        component: (
          <LongTextLabel
            limitCharacters={5000}
            height="100px"
            control="textArea"
            textAlign="left"
          />
        ),
      },
      {
        context: 'write',
        component: (
          <LongTextInput
            control="textArea"
            limitCharacters={5000}
            height="150px"
            placeholder="Enter task description"
          />
        ),
      },
    ],

    status: [
      {
        context: 'read',
        label: 'Task Status',
        component: <ChoiceLabel valueMetadata={STATUS_VALUE_METADATA} />,
      },
      {
        context: 'write',
        label: 'Task Status',
        component: (
          <ChoiceDropdown
            placeholder="Select task status"
            valueMetadata={STATUS_VALUE_METADATA}
          />
        ),
      },
    ],

    priority: [
      {
        context: 'read',
        component: <TaskPriorityBadge />,
      },
      {
        context: { usage: 'table' },
        component: <TaskPriorityBadge />,
      },
      {
        context: 'write',
        component: (
          <ChoiceDropdown
            placeholder="Select task priority"
            valueMetadata={PRIORITY_VALUE_METADATA}
          />
        ),
      },
    ],

    project: [
      {
        context: 'read',
        labelField: 'name',
        component: <ReferenceLabel />,
      },
      {
        context: 'write',
        labelField: 'name',
        component: (
          <ReferenceDropdown
            label="name"
            placeholder="Select project"
            sorting={{ name: 'asc' }}
          />
        ),
      },
    ],

    assignee: [
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
            placeholder="Select assignee"
            sorting={{ firstName: 'asc' }}
          />
        ),
      },
    ],

    reporter: [
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
            placeholder="Select reporter"
            sorting={{ firstName: 'asc' }}
          />
        ),
      },
    ],

    estimatedHours: [
      {
        context: 'read',
        label: 'Estimated',
        component: <IntegerLabel />,
      },
      {
        context: 'write',
        label: 'Estimated Hours',
        component: (
          <IntegerInput appendText="h" placeholder="Hours" showControls />
        ),
      },
    ],

    actualHours: [
      {
        context: 'read',
        label: 'Actual',
        component: <IntegerLabel />,
      },
      {
        context: 'write',
        label: 'Actual Hours',
        component: <IntegerInput appendText="h" placeholder="Hours" />,
      },
    ],

    dueDate: [
      {
        context: 'read',
        component: <DateLabel format="dd-MM-yyyy" />,
      },
      {
        context: 'write',
        component: <DatePickerField format="dd-MM-yyyy" />,
      },
    ],

    startedAt: [
      {
        context: 'read',
        component: <DateLabel format="dd-MM-yyyy" />,
      },
      {
        context: 'write',
        component: <DatePickerField />,
      },
    ],

    completedAt: [
      {
        context: (instance: unknown) =>
          (instance as Task | null)?.status === 'done',
        visible: true,
      },
      {
        context: (instance: unknown) =>
          (instance as Task | null)?.status !== 'done',
        visible: false,
      },
      {
        context: 'read',
        component: <DateLabel format="dd-MM-yyyy" />,
      },
      {
        context: 'write',
        component: <DatePickerField format="dd-MM-yyyy" />,
      },
    ],

    isBillable: [
      {
        context: 'read',
        component: (
          <BooleanToggle falseLabel="Non-Billable" trueLabel="Billable" />
        ),
      },
      {
        context: 'write',
        component: (
          <BooleanToggle falseLabel="Non-Billable" trueLabel="Billable" />
        ),
      },
    ],

    tags: [
      {
        context: 'read',
        component: <List displayAs="tags" component={<TextLabel />} />,
      },
      {
        context: 'write',
        component: (
          <List
            sorting={false}
            component={<TextInput placeholder="Enter tag" />}
          />
        ),
      },
    ],

    technicalDetails: [
      // Generic fallbacks — lowest priority, matched when no specific context wins
      {
        context: 'read',
        label: 'Technical Details',
        component: <LongTextLabel height="200px" />,
      },
      {
        context: 'write',
        label: 'Technical Details',
        component: (
          <LongTextInput
            control="codeEditor"
            language="markdown"
            height="200px"
          />
        ),
      },
      // Table: plain text preview — compact, no scroll container, no editor overhead
      {
        context: { usage: 'table' },
        component: <TextLabel />,
      },
      // Edit form: reduced editor height, explicit label for context clarity
      {
        context: { view: { type: 'editView' } },
        label: 'Technical Details (edit)',
        component: (
          <LongTextInput
            control="codeEditor"
            language="markdown"
            height="120px"
          />
        ),
      },
      // Create form: same reduced height, label signals new-record context
      {
        context: { view: { type: 'createView' } },
        label: 'Technical Details (new)',
        component: (
          <LongTextInput
            control="codeEditor"
            language="markdown"
            height="120px"
          />
        ),
      },
      // Read drawer (modal container): compact read-only preview
      {
        context: { view: { type: 'readView', container: 'modal' } },
        label: 'Technical Details (preview)',
        component: <LongTextLabel height="60px" />,
      },
    ],

    jsonMetadata: {
      context: 'all',
      label: 'JSON Metadata',
      componentOptions: { height: '100px' },
    },

    metadata: [
      {
        context: 'read',
        component: (
          <List
            component={
              <CompositionPanel<TaskMetadata>
                label={(meta: TaskMetadata) => meta.key || 'New Metadata'}
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
              <CompositionPanel<TaskMetadata>
                label={(meta: TaskMetadata) => meta.key || 'New Metadata'}
              />
            }
          />
        ),
      },
    ],

    attachments: [
      {
        context: 'read',
        label: 'Attachments',
        component: <List component={<FileLabel />} />,
      },
      {
        context: 'write',
        label: 'Attachments',
        component: (
          <FileDropZone
            size="large"
            maxFiles={10}
            acceptedTypes={['image/*', '.pdf', '.doc', '.docx', '.txt']}
            maxSize={10485760}
            uploadHint="Images, PDFs or documents — max 10 MB each, up to 10 files"
          />
        ),
      },
    ],
  },
});

// =============================================================================
// TaskMetadata Defaults
// =============================================================================

app.registerDataModel<TaskMetadata>('TaskMetadata', {
  fields: {
    key: [
      { context: 'read', component: <TextLabel /> },
      { context: 'write', component: <TextInput placeholder="Enter key" /> },
    ],
    value: [
      { context: 'read', component: <TextLabel /> },
      { context: 'write', component: <TextInput placeholder="Enter value" /> },
    ],
  },
});

// =============================================================================
// TaskEstimate Defaults
// =============================================================================

const COMPLEXITY_VALUE_METADATA = {
  low: { label: 'Low', color: 'green' },
  medium: { label: 'Medium', color: 'blue' },
  high: { label: 'High', color: 'orange' },
  very_high: { label: 'Very High', color: 'red' },
} as const;

app.registerDataModel('TaskEstimate', {
  labelField: 'taskTitle',
  fields: {
    taskTitle: [
      { context: 'read', component: <TextLabel /> },
      {
        context: 'write',
        component: <TextInput placeholder="Enter task title" />,
      },
    ],
    complexity: [
      {
        context: 'read',
        component: <ChoiceLabel valueMetadata={COMPLEXITY_VALUE_METADATA} />,
      },
      {
        context: 'write',
        component: (
          <ChoiceDropdown
            placeholder="Select complexity"
            valueMetadata={COMPLEXITY_VALUE_METADATA}
          />
        ),
      },
    ],
    estimatedHours: [
      { context: 'read', component: <IntegerLabel /> },
      { context: 'write', component: <IntegerInput appendText="h" /> },
    ],
    storyPoints: [
      { context: 'read', component: <IntegerLabel /> },
      { context: 'write', component: <IntegerInput placeholder="Optional" /> },
    ],
    notes: [
      {
        context: 'read',
        component: <LongTextLabel height="80px" control="textArea" />,
      },
      {
        context: 'write',
        component: (
          <LongTextInput
            control="textArea"
            height="80px"
            placeholder="Describe assumptions or risks"
          />
        ),
      },
    ],
  },
});

// =============================================================================
// Note Defaults
// =============================================================================

app.registerDataModel<Note>('Note', {
  labelField: 'title',
  fields: {
    title: [
      { context: 'read', component: <TextLabel /> },
      {
        context: 'write',
        component: <TextInput placeholder="Enter note title" />,
      },
    ],
    note: [
      {
        context: 'read',
        component: <LongTextLabel control="textArea" height="150px" />,
      },
      {
        context: 'write',
        component: (
          <LongTextInput
            control="textArea"
            height="150px"
            placeholder="Note content"
            limitCharacters={2000}
          />
        ),
      },
    ],
    createdBy: {
      context: 'read',
      component: <ReferenceLabel />,
    },
    createdAt: {
      context: 'read',
      component: <DateTimeLabel format="DD/MM/YYYY HH:mm" />,
    },
  },
});

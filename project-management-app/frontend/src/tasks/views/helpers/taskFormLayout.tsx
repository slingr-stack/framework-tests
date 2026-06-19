/**
 * Shared Task Form Layout and Logic
 * Used by both CreateTaskView and EditTaskView
 */

import type { Task } from '@gql';
import {
  DataField,
  DataForm,
  getApp,
  getAuthStorageKeys,
  getContext,
  IntegerInput,
  type OnRefreshCallback,
  UiMode,
  useDataForm,
  useDataFormField,
} from '@drumr/framework-frontend';
import { Alert, Card, Col, Row, Typography } from 'antd';
import React from 'react';

const { Title } = Typography;

type TaskNote = NonNullable<NonNullable<Task['notes']>[number]> &
  Record<string, unknown>;
type TaskRefreshValues = Partial<Task> &
  Record<string, unknown> & {
    estimatedHours?: Task['estimatedHours'] | string;
    actualHours?: Task['actualHours'] | string;
  };

type CurrentUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
};

const PROJECT_DETAILS_FIELDS = {
  name: true,
  code: true,
  manager: true,
} as const;

const PROJECT_DETAILS_QUERY_CONTEXT = {
  mode: UiMode.Read,
  view: { name: 'TaskDetails' },
} as const;

export const taskRefreshTriggers: string[] = [
  'title',
  'status',
  'notes',
  'estimatedHours',
  'actualHours',
];

function isBlankText(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.trim() === '');
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

const getUserIdentityFromToken = (): {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
} => {
  try {
    const token = localStorage.getItem(getAuthStorageKeys().tokenKey);
    if (!token) return {};

    const parts = token.split('.');
    if (parts.length < 2) return {};

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = decodeURIComponent(
      atob(payloadBase64)
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(''),
    );
    const payload = JSON.parse(payloadJson) as Record<string, any>;

    return {
      firstName: payload.firstName,
      lastName: payload.lastName,
      username: payload.username,
      email: payload.email,
    };
  } catch {
    return {};
  }
};

const ProjectDetailsPanel = React.memo(function ProjectDetailsPanel({
  projectId,
}: {
  projectId: string | null | undefined;
}) {
  const projectDetailsHook = useDataForm({
    model: 'Project',
    id: projectId!,
    queryContext: PROJECT_DETAILS_QUERY_CONTEXT,
    fields: PROJECT_DETAILS_FIELDS,
  });

  return (
    <Alert
      type="info"
      description={
        <DataForm dataFormHook={projectDetailsHook} showActions={false} />
      }
    />
  );
});

/**
 * Basic Information section — extracted as a component so hooks can be used.
 */
function BasicInfoSection(): React.ReactElement {
  const projectField = useDataFormField('project');
  const projectValue = projectField.value;
  const projectId =
    typeof projectValue === 'string'
      ? projectValue
      : typeof projectValue === 'number'
        ? String(projectValue)
        : undefined;
  console.log(
    'BasicInfoSection render with projectValue:',
    projectValue,
    'and derived projectId:',
    projectId,
  );

  return (
    <Card style={{ marginBottom: 24 }}>
      <Title level={4}>Basic Information </Title>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <DataField name="title" />
        </Col>
        <Col span={24}>
          <DataField name="description" />
        </Col>
        <Col span={12}>
          <DataField name="project" />
        </Col>
        <Col span={12}>
          <DataField name="tags" />
        </Col>
      </Row>
      {projectId && (
        <div style={{ marginTop: 16 }}>
          <ProjectDetailsPanel projectId={projectId} />
        </div>
      )}
    </Card>
  );
}

/**
 * Task form layout component rendered inside a DataForm context.
 * Uses DataField by name — the framework handles field visibility automatically.
 */
export function TaskFormLayout(): React.ReactElement {
  return (
    <div style={{ padding: '0 24px' }}>
      <BasicInfoSection />

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>Status & Priority</Title>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <DataField name="status" />
          </Col>
          <Col span={12}>
            <DataField name="priority" />
          </Col>
        </Row>
      </Card>

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>Team</Title>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <DataField name="assignee" />
          </Col>
          <Col span={8}>
            <DataField name="reporter" />
          </Col>
          <Col span={8}>
            <DataField name="isBillable" />
          </Col>
        </Row>
      </Card>

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>Time Tracking</Title>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <IntegerInput name="estimatedHours" showControls appendText="h" />
          </Col>
          <Col span={8}>
            <IntegerInput name="actualHours" appendText="h" />
          </Col>
          <Col span={8}>
            <DataField name="dueDate" />
          </Col>
          <Col span={8}>
            <DataField name="startedAt" />
          </Col>
          <Col span={8}>
            <DataField name="completedAt" />
          </Col>
        </Row>
      </Card>

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>Technical Details</Title>
        <DataField name="technicalDetails" />
      </Card>

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>JSON Metadata</Title>
        <DataField name="jsonMetadata" />
      </Card>

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>Review Checks</Title>
        <DataField name="reviewChecks" />
      </Card>

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>Notes</Title>
        <DataField name="notes" />
      </Card>

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>Attachments</Title>
        <DataField name="attachments" />
      </Card>

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>Task Metadata</Title>
        <DataField name="metadata" />
      </Card>

      <Card>
        <Title level={4}>Metadata</Title>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <DataField name="createdAt" />
          </Col>
          <Col span={12}>
            <DataField name="updatedAt" />
          </Col>
        </Row>
      </Card>
    </div>
  );
}

/**
 * Custom refresh handler for Task forms
 * Handles status changes and hours validation
 */
export const handleTaskRefresh: OnRefreshCallback = async (
  defaultRefresh,
  context,
) => {
  const changedFields = Array.from(context.changedFieldsSinceRefresh);
  const data = context.form.state.values as TaskRefreshValues;

  if (
    changedFields.includes('title') &&
    data.title &&
    isBlankText(data.description)
  ) {
    context.change('description', `This is the description for ${data.title}`);
  }
  console.log(
    'handleTaskRefresh called with changedFields:',
    changedFields,
    'and data:',
    data,
  );
  if (changedFields.includes('status')) {
    if (data.status === 'done') {
      getApp().message.info(
        'Task marked as completed! Consider updating actual hours.',
      );
    } else if (data.status) {
      getApp().message.info(`Status updated to ${data.status}`);
    }
  }

  if (
    changedFields.some(
      (fieldName) =>
        fieldName === 'notes' ||
        fieldName.startsWith('notes.') ||
        fieldName.startsWith('notes['),
    ) &&
    Array.isArray(data.notes)
  ) {
    const appContext = getContext();
    const currentUser = appContext.user as CurrentUser | undefined;
    const tokenUser = getUserIdentityFromToken();
    let notesChanged = false;

    const nextNotes = data.notes.map((note) => {
      if (!note || typeof note !== 'object') {
        return note;
      }

      const nextNote = { ...(note as TaskNote) };

      if (!nextNote.createdAt) {
        nextNote.createdAt = new Date().toISOString();
        notesChanged = true;
      }

      if (!nextNote.createdBy && currentUser?.id) {
        const fullName = [
          currentUser.firstName ?? tokenUser.firstName,
          currentUser.lastName ?? tokenUser.lastName,
        ]
          .filter(Boolean)
          .join(' ')
          .trim();

        nextNote.createdBy = {
          id: currentUser.id,
          _displayValue:
            fullName ||
            currentUser.username ||
            tokenUser.username ||
            currentUser.email ||
            tokenUser.email ||
            'Current user',
        };
        notesChanged = true;
      }

      return nextNote;
    });

    if (notesChanged) {
      context.change('notes', nextNotes);
    }
  }

  if (
    changedFields.includes('estimatedHours') ||
    changedFields.includes('actualHours')
  ) {
    const estimated = toNumber(data.estimatedHours);
    const actual = toNumber(data.actualHours);

    if (actual > estimated * 1.5) {
      getApp().message.warning(
        'Actual hours significantly exceed estimated hours.',
      );
    }
  }

  return defaultRefresh();
};

/**
 * Default export for auto-generated context imports
 */
export default {
  TaskFormLayout,
  handleTaskRefresh,
};

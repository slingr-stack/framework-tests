import { UserOutlined } from '@ant-design/icons';
import type { RichTask, RichUser } from '@gql';
import {
  type UiFieldOptions,
  useApiAction,
  useApiFindBy,
} from '@drumr/framework-frontend';
import { App, Button, Popover, Select, Space, Typography } from 'antd';
import React, { useState } from 'react';

const { Text } = Typography;

/**
 * Inline assignee panel using `useMetaApiAction`.
 *
 * Demonstrates the core `useMetaApiAction` pattern:
 * - The action name maps to an `ObjectAction` (`AssignTask` → `UiTaskAssignTask`)
 * - `execute({ id, assignee })` passes the target task ID and the new assignee's ID
 * - The response is UI-enriched: `result.assignee.value` is the full `UserUi`
 *   object, so we can read the display value without a separate query
 * - `canExecute` guards are enforced server-side; if the task is Done the
 *   server rejects the call and `error` is set
 *
 * This panel uses `useMetaApiAction`, so the response includes
 * `value/options/errors` wrappers instead of plain raw fields.
 *
 * Usage in a read view or detail panel:
 *
 * ```tsx
 * <AssignTaskPanel
 *   taskId={task.id}
 *   assigneeField={uiFields.assignee}
 * />
 * ```
 */
/**
 * Inner popover content — only mounted when the popover is open, so the
 * user query fires at most once per popover interaction instead of once per
 * table row on initial render.
 */
function AssignTaskContent({
  taskId,
  onClose,
  onAssigned,
}: {
  taskId: string;
  onClose: () => void;
  onAssigned: (label: string) => void;
}) {
  const { message } = App.useApp();
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

  // Fetch available users to populate the assignee select.
  // `useApiFindBy` with the `User` model — returns UI-enriched user objects
  // so the select can display the email label from `user.email.value`.
  const { data: users, loading: usersLoading } = useApiFindBy<RichUser>(
    'User',
    {
      format: 'rich',
      fields: { id: true, email: true, firstName: true, lastName: true },
      orderBy: { email: 'ASC' },
    },
  );

  // The AssignTask object action — operation name: `UiTaskAssignTask`.
  // Returns the updated Task as UI-enriched fields so we can immediately
  // display the new assignee without a separate refetch.
  const {
    execute,
    loading: assigning,
    error,
    reset,
  } = useApiAction<RichTask>('AssignTask', {
    format: 'rich',
    fields: { id: true, assignee: true },
  });

  // `error` is React state — reading it synchronously inside `handleAssign`
  // after `await execute()` always returns the pre-execution stale value.
  // A useEffect that fires on change is the correct React pattern for this.
  React.useEffect(() => {
    if (error) {
      message.error(error.message);
    }
  }, [error, message]);

  const userOptions = users.map((user: RichUser) => ({
    value: user.id?.value as string,
    label: String(user._displayValue ?? user.id?.value),
  }));

  const handleAssign = async () => {
    if (!selectedUserId) return;

    // id is the target task; action params go under `params`.
    // The GQL operation signature is: UiTaskAssignTask(id, params: TaskAssignTaskParamsInput!)
    const result = await execute({
      id: taskId,
      params: { assignee: selectedUserId },
    });

    if (result) {
      // Only use _displayValue — never fall back to a raw ID string as a label.
      const assigneeLabel = (result.assignee?.value as any)?._displayValue;
      if (assigneeLabel) {
        message.success(`Assigned to ${assigneeLabel}`);
        onAssigned(assigneeLabel);
        setSelectedUserId(undefined);
        reset();
      }
    }
    // Errors are handled reactively by the useEffect above —
    // reading `error` here would see the pre-execution stale value.
  };

  const handleCancel = () => {
    setSelectedUserId(undefined);
    reset();
    onClose();
  };

  return (
    <Space orientation="vertical" style={{ minWidth: 260 }}>
      <Select
        showSearch
        placeholder="Select a user"
        value={selectedUserId}
        options={userOptions}
        loading={usersLoading}
        onChange={setSelectedUserId}
        filterOption={(input, option) =>
          String(option?.label ?? '')
            .toLowerCase()
            .includes(input.toLowerCase())
        }
        style={{ width: '100%' }}
      />
      <Space>
        <Button
          type="primary"
          size="small"
          loading={assigning}
          disabled={!selectedUserId}
          onClick={handleAssign}
        >
          Assign
        </Button>
        <Button size="small" onClick={handleCancel}>
          Cancel
        </Button>
      </Space>
    </Space>
  );
}

export function AssignTaskPanel({
  taskId,
  assigneeField,
}: {
  taskId: string;
  /** The current assignee field — provides the displayed user and options metadata */
  assigneeField: {
    value?: unknown;
    options?: UiFieldOptions | null;
    errors?: unknown;
  };
}) {
  const [open, setOpen] = useState(false);
  // Holds the label after a successful assign so the UI updates immediately,
  // before the parent re-renders with a fresh assigneeField.value prop.
  const [confirmedLabel, setConfirmedLabel] = useState<string | null>(null);

  // `assigneeField.value` is already the formatted display string (the table
  // pre-formats reference fields using labelField before passing to onRender).
  // After a successful action, prefer confirmedLabel (set optimistically on
  // success) so the button updates immediately without waiting for the parent
  // to re-render. When the parent eventually re-renders with a fresh prop,
  // confirmedLabel can be cleared so the prop drives the display again.
  const currentLabel =
    confirmedLabel ??
    (assigneeField.value != null ? String(assigneeField.value) : 'Unassigned');

  const handleAssigned = (label: string) => {
    setConfirmedLabel(label);
    setOpen(false);
  };

  // React portal events bubble through the React component tree, not the DOM tree.
  // Without stopPropagation here, a click on the Select dropdown option would
  // bubble up through Popover → table cell → table row and fire onRowClicked.
  const content = open ? (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <AssignTaskContent
        taskId={taskId}
        onClose={() => setOpen(false)}
        onAssigned={handleAssigned}
      />
    </div>
  ) : null;

  return (
    <Popover
      title="Assign task"
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      content={content}
    >
      <Button
        type="text"
        size="small"
        icon={<UserOutlined />}
        onClick={(e) => e.stopPropagation()}
      >
        <Text style={{ maxWidth: 140 }} ellipsis>
          {currentLabel}
        </Text>
      </Button>
    </Popover>
  );
}

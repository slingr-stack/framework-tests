import { Task } from '@gql/types';
import { type UiFieldOptions, useApiUpdate } from '@drumr/framework-frontend';
import { Switch } from 'antd';
import React from 'react';

/**
 * A functional component that uses `useApiUpdate` to toggle the billable
 * status of a task directly from the table row.
 *
 * The visual state is driven by the mutation hook's `data` (the record returned
 * after a successful update) and falls back to the `checked` prop coming from
 * the table row when no mutation has run yet.
 */
export function BillableSwitch({
  taskId,
  checked,
  uiFieldOptions,
}: {
  taskId: string;
  checked: boolean;
  uiFieldOptions?: UiFieldOptions;
}) {
  const { execute, data, loading, error } = useApiUpdate<Task>('Task', {
    fields: { isBillable: true },
  });
  // Standard Data API pattern: prefer the hook's `data` (post-mutation truth)
  // and fall back to the table row's prop. If the last mutation errored, keep
  // showing the prop value so the UI stays consistent with the backend.
  const isChecked = error ? checked : (data?.isBillable ?? checked);

  // Read component options from the backend-provided field metadata so the
  // switch honours config like trueLabel/falseLabel and disabled.
  const componentOptions =
    (uiFieldOptions?.ui?.component?.options as
      | { trueLabel?: string; falseLabel?: string; disabled?: boolean }
      | undefined) ?? {};

  const handleToggle = async (
    newChecked: boolean,
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    await execute({ id: taskId, isBillable: newChecked });
  };

  return (
    <Switch
      checked={isChecked}
      loading={loading}
      disabled={componentOptions.disabled}
      checkedChildren={componentOptions.trueLabel}
      unCheckedChildren={componentOptions.falseLabel}
      onClick={handleToggle}
      size="small"
    />
  );
}

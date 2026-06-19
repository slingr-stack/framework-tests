import { ActionView, DataField } from '@drumr/framework-frontend';
import { Alert, Space } from 'antd';
import React, { useMemo } from 'react';

interface BulkChangePriorityViewProps {
  id?: string;
  /** Raw IDs from the header toolbar bulk-selection context. */
  ids?: string[];
  /** Pre-built Drumr query object (used when opened directly, not via toolbar). */
  bulkQuery?: Record<string, any>;
  /** True when the "select all" checkbox was used. */
  allRowsSelected?: boolean;
  /** Active filter query when allRowsSelected is true. */
  selectionQuery?: Record<string, any>;
}

export function BulkChangePriorityView({
  id,
  ids,
  bulkQuery: bulkQueryProp,
  allRowsSelected,
  selectionQuery,
}: BulkChangePriorityViewProps) {
  // Derive bulkQuery from toolbar params when not provided directly.
  // The toolbar passes `ids` (raw string array) while ActionView expects
  // bulkQuery in Drumr query format: { id: { in: [...] } }.
  const bulkQuery = useMemo(() => {
    if (bulkQueryProp !== undefined) return bulkQueryProp;
    if (allRowsSelected) return selectionQuery ?? {};
    if (ids && ids.length > 0) return { id: { in: ids } };
    return undefined;
  }, [bulkQueryProp, ids, allRowsSelected, selectionQuery]);
  const initialData = useMemo(() => {
    if (bulkQuery === undefined) {
      return { priority: 'urgent' };
    }
    return { priority: null };
  }, [bulkQuery]);

  const explicitIds: string[] | undefined = bulkQuery?.id?.in;
  const isSelectAll = bulkQuery !== undefined && !explicitIds;
  const hasActiveFilter =
    isSelectAll && bulkQuery !== undefined && Object.keys(bulkQuery).length > 0;

  let bannerMessage: string;
  let bannerType: 'info' | 'warning';
  let bannerDescription: string;

  if (bulkQuery === undefined) {
    bannerMessage = 'Change task priority';
    bannerType = 'info';
    bannerDescription =
      'Select the new priority and optionally provide a reason.';
  } else if (explicitIds) {
    bannerMessage = `Changing priority for ${explicitIds.length} task${explicitIds.length !== 1 ? 's' : ''}`;
    bannerType = 'info';
    bannerDescription =
      'Select the new priority and optionally provide a reason. This will be applied to all selected tasks.';
  } else if (hasActiveFilter) {
    bannerMessage =
      'Changing priority for all tasks matching the active filter';
    bannerType = 'info';
    bannerDescription =
      'Select the new priority and optionally provide a reason. Only tasks matching the current filter will be affected.';
  } else {
    bannerMessage = '⚠ Changing priority for ALL tasks';
    bannerType = 'warning';
    bannerDescription =
      'No filter is active. This will change the priority of every task in the system. Proceed with caution.';
  }

  return (
    <ActionView
      action="BulkChangePriority"
      model="Task"
      id={id}
      bulkQuery={bulkQuery}
      initialData={initialData}
    >
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Alert
          message={bannerMessage}
          description={bannerDescription}
          type={bannerType}
          showIcon
        />
        <DataField name="priority" />
        <DataField name="reason" />
      </Space>
    </ActionView>
  );
}

export default BulkChangePriorityView;

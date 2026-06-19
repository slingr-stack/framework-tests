import type { FieldController } from '@drumr/framework-frontend';
import {
  defineFieldComponent,
  registerFieldComponent,
} from '@drumr/framework-frontend';
import { Badge, Space } from 'antd';
import React from 'react';

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: 'green', label: 'Low' },
  medium: { color: 'blue', label: 'Medium' },
  high: { color: 'orange', label: 'High' },
  urgent: { color: 'red', label: 'Urgent' },
  critical: { color: 'purple', label: 'Critical' },
};

/**
 * Custom field component for the Task priority field.
 *
 * Demonstrates the simplified DrumrFieldComponent contract:
 *  - Authored as a bare render function — no capability/dataType declarations.
 *  - Read-only by placement: used only in 'read' and table contexts in
 *    config/dataModels, and given ctrl.mode='read' on those surfaces.
 *  - Registered with a plain id; the framework adds the internal 'custom.'
 *    prefix, so DataComponent/table cells resolve it via the static path.
 */
export const TaskPriorityBadge = defineFieldComponent(
  (ctrl: FieldController<string>) => {
    const value = typeof ctrl.value === 'string' ? ctrl.value : '';
    const cfg = PRIORITY_CONFIG[value];

    if (!cfg) {
      return <span style={{ color: '#aaa' }}>—</span>;
    }

    return (
      <Space size={6}>
        <Badge color={cfg.color} text={cfg.label} />
      </Space>
    );
  },
);

// Self-registering: importing this module is enough to make the component
// available in registerDataModel defaults and DataComponent (table cells).
registerFieldComponent('task.priorityBadge', TaskPriorityBadge);

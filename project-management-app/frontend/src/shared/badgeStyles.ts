/**
 * Status and priority badge color mapping.
 *
 * Centralizes the color tokens used for rendering status/priority badges
 * across the project-management dashboard, task lists, and detail views.
 */

export interface BadgeStyle {
  /** Background color (CSS value). */
  background: string;
  /** Text color (CSS value). */
  color: string;
  /** Human-readable label shown inside the badge. */
  label: string;
}

// ── Task Status ──────────────────────────────────────────────────────

const TASK_STATUS_STYLES: Record<string, BadgeStyle> = {
  toDo: { background: '#e0e7ff', color: '#3730a3', label: 'To Do' },
  inProgress: { background: '#fef3c7', color: '#92400e', label: 'In Progress' },
  done: { background: '#d1fae5', color: '#065f46', label: 'Done' },
};

export function taskStatusBadge(status: string): BadgeStyle {
  return (
    TASK_STATUS_STYLES[status] ?? {
      background: '#f3f4f6',
      color: '#374151',
      label: status,
    }
  );
}

// ── Project Status ───────────────────────────────────────────────────

const PROJECT_STATUS_STYLES: Record<string, BadgeStyle> = {
  active: { background: '#dbeafe', color: '#1e40af', label: 'Active' },
  onHold: { background: '#fef3c7', color: '#92400e', label: 'On Hold' },
  completed: { background: '#d1fae5', color: '#065f46', label: 'Completed' },
  cancelled: { background: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
};

export function projectStatusBadge(status: string): BadgeStyle {
  return (
    PROJECT_STATUS_STYLES[status] ?? {
      background: '#f3f4f6',
      color: '#374151',
      label: status,
    }
  );
}

// ── Priority ─────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, BadgeStyle> = {
  low: { background: '#e0e7ff', color: '#4338ca', label: 'Low' },
  medium: { background: '#fef3c7', color: '#b45309', label: 'Medium' },
  high: { background: '#fecaca', color: '#b91c1c', label: 'High' },
  critical: { background: '#fca5a5', color: '#7f1d1d', label: 'Critical' },
};

export function priorityBadge(priority: string): BadgeStyle {
  return (
    PRIORITY_STYLES[priority] ?? {
      background: '#f3f4f6',
      color: '#374151',
      label: priority,
    }
  );
}

import { ActionView } from '@drumr/framework-frontend';

/**
 * ImportTasksView — params form for the ImportTasks action.
 *
 * The framework auto-renders the params form from ImportTasksParams:
 *   - tasksJson  (required textarea — JSON array of task objects)
 *   - defaultProjectId (optional text field — fallback project ID)
 *
 * No custom layout needed; the default single-column form is sufficient.
 */
// @ActionView({
//   action: 'ImportTasks',
// })
// export default class ImportTasksView extends ActionViewComponent {
//   override layout = FormLayout;
// }

import React from 'react';

interface Props {
  id: string;
}

export function ImportTasksView({ id }: Props) {
  return (
    <ActionView action="ImportTasks" model="Task" id={id} refreshMode="auto" />
  );
}

export default ImportTasksView;

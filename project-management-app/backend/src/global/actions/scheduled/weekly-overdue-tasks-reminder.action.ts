import {
	Action,
	GlobalAction,
	WorkflowExecution,
	WorkflowsManager,
} from '@drumr/framework-backend';
import { WeeklyOverdueTasksReminderWorkflow } from '@/global/workflows/scheduled/weekly-overdue-tasks-reminder.workflow';

@Action({
	type: 'write',
	api: 'gql',
	returns: WorkflowExecution,
})
export class WeeklyOverdueTasksReminder extends GlobalAction<
	void,
	WorkflowExecution
> {
	constructor(private workflowsManager: WorkflowsManager) {
		super();
	}

	override async execute(): Promise<WorkflowExecution> {
		return this.workflowsManager.execute(WeeklyOverdueTasksReminderWorkflow);
	}
}

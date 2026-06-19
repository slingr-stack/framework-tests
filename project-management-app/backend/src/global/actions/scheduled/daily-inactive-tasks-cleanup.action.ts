import {
	Action,
	ModelAction,
	WorkflowExecution,
	WorkflowsManager,
} from '@drumr/framework-backend';
import { DailyInactiveTasksCleanupWorkflow } from '@/global/workflows/scheduled/daily-inactive-tasks-cleanup.workflow';
import { Task } from '@/tasks/data-models/task.data-model';

@Action({
	type: 'write',
	model: Task,
	api: 'gql',
	returns: WorkflowExecution,
})
export class DailyInactiveTasksCleanup extends ModelAction<
	Task,
	void,
	WorkflowExecution
> {
	constructor(private workflowsManager: WorkflowsManager) {
		super();
	}

	override async execute(): Promise<WorkflowExecution> {
		return this.workflowsManager.execute(DailyInactiveTasksCleanupWorkflow);
	}
}

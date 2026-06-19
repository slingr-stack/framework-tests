import {
	Action,
	GlobalAction,
	WorkflowExecution,
	WorkflowsManager,
} from '@drumr/framework-backend';
import { HourlyTaskProgressUpdateWorkflow } from '@/global/workflows/scheduled/hourly-task-progress-update.workflow';

@Action({
	type: 'write',
	api: 'gql',
	returns: WorkflowExecution,
})
export class HourlyTaskProgressUpdate extends GlobalAction<
	void,
	WorkflowExecution
> {
	constructor(private workflowsManager: WorkflowsManager) {
		super();
	}

	override async execute(): Promise<WorkflowExecution> {
		return this.workflowsManager.execute(HourlyTaskProgressUpdateWorkflow);
	}
}

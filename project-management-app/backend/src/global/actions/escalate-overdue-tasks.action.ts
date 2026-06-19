import {
	Action,
	GlobalAction,
	WorkflowExecution,
	WorkflowsManager,
} from '@drumr/framework-backend';
import { EscalateOverdueTasksWorkflow } from '@/global/workflows/escalate-overdue-tasks.workflow';

@Action({
	type: 'write',
	api: 'gql',
	returns: WorkflowExecution,
})
export class EscalateOverdueTasks extends GlobalAction<
	void,
	WorkflowExecution
> {
	constructor(private workflowsManager: WorkflowsManager) {
		super();
	}

	override async execute(): Promise<WorkflowExecution> {
		return this.workflowsManager.execute(EscalateOverdueTasksWorkflow);
	}
}

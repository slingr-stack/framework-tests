import {
	Action,
	GlobalAction,
	WorkflowExecution,
	WorkflowsManager,
} from '@drumr/framework-backend';
import { SyncDataWorkflow } from '@/global/workflows/sync-data.workflow';

@Action({
	type: 'write',
	api: 'gql',
	returns: WorkflowExecution,
})
export class SyncData extends GlobalAction<void, WorkflowExecution> {
	constructor(private workflowsManager: WorkflowsManager) {
		super();
	}

	override async execute(): Promise<WorkflowExecution> {
		return this.workflowsManager.execute(SyncDataWorkflow);
	}
}

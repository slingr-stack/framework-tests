import {
	Action,
	ModelAction,
	WorkflowExecution,
	WorkflowsManager,
} from '@drumr/framework-backend';
import { Task } from '@/tasks/data-models/task.data-model';
import {
	ImportTasksParams,
	ImportTasksWorkflow,
} from '@/tasks/workflows/import-tasks.workflow';

@Action({
	type: 'write',
	model: Task,
	api: 'gql',
	params: ImportTasksParams,
	returns: WorkflowExecution,
})
export class ImportTasks extends ModelAction<
	Task,
	ImportTasksParams,
	WorkflowExecution
> {
	constructor(private workflowsManager: WorkflowsManager) {
		super();
	}

	override async execute(
		params: ImportTasksParams,
	): Promise<WorkflowExecution> {
		return this.workflowsManager.execute(ImportTasksWorkflow, params);
	}
}

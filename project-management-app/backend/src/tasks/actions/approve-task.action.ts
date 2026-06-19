import {
	Action,
	ObjectAction,
	WorkflowExecution,
	WorkflowsManager,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';
import {
	ApproveTaskParams,
	ApproveTaskWorkflow,
} from '@/tasks/workflows/approve-task.workflow';

@Action({
	type: 'write',
	model: Task,
	api: 'gql',
	params: ApproveTaskParams,
	returns: [WorkflowExecution, Task],
})
export class ApproveTask extends ObjectAction<
	Task,
	ApproveTaskParams,
	WorkflowExecution | Task
> {
	constructor(
		private workflowsManager: WorkflowsManager,
		private ds: MainDs,
	) {
		super();
	}

	override async canExecute(task: Task): Promise<boolean | string> {
		if (task.status !== TaskStatus.InReview) {
			return `Task must be In Review to be approved (current: ${task.status})`;
		}
		return true;
	}

	override async execute(
		task: Task,
		params: ApproveTaskParams,
	): Promise<WorkflowExecution | Task> {
		if (params.executeInWorkFlow) {
			return this.workflowsManager.execute(ApproveTaskWorkflow, {
				task,
				params,
			});
		} else {
			task.status = TaskStatus.Done;
			await this.ds.save(task);
			return task;
		}
	}
}

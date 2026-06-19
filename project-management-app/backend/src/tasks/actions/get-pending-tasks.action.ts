import { Action, ModelAction } from '@drumr/framework-backend';
import { Task } from '@/tasks/data-models/task.data-model';

/**
 * Model action that returns all pending tasks.
 * Pending tasks are those with status: To Do, In Progress, or In Review.
 * This action operates at the model level and returns a filtered list of tasks.
 */
@Action({
	type: 'read',
	model: Task,
	api: 'gql',
	returns: [Task],
})
export class GetPendingTasks extends ModelAction<Task, void, Task[]> {
	protected async execute(): Promise<Task[]> {
		// this will not execute. It is only a placeholder for the view that contains the logic.
		return [];
	}
}

import { Action, ObjectAction } from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';

/**
 * ArchiveTask - ObjectAction WITHOUT params and WITHOUT view.
 *
 * This demonstrates the simplest case: an action that executes immediately
 * with a confirm dialog (default framework behavior) and no custom view.
 */
@Action({
	type: 'write',
	model: Task,
	api: 'gql',
	returns: Task,
})
export class ArchiveTask extends ObjectAction<Task, void, Task> {
	constructor(private ds: MainDs) {
		super();
	}

	override async canExecute(task: Task): Promise<boolean | string> {
		if (task.status === TaskStatus.Done || task.status === TaskStatus.Blocked) {
			return true;
		}
		if (task.status === TaskStatus.InProgress) {
			return 'Cannot archive a task in progress. Complete or block it first.';
		}
		return true;
	}

	override async execute(task: Task): Promise<Task> {
		task.status = TaskStatus.Blocked;
		task.completedAt = new Date().toString();
		await this.ds.save(task);
		return task;
	}
}

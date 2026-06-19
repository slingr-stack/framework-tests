import { Action, logger, ObjectAction } from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { ActivityLogService } from '@/global/services/activity-log.service';
import {
	Task,
	TaskPriority,
	TaskStatus,
} from '@/tasks/data-models/task.data-model';

@Action({
	type: 'write',
	model: Task,
	api: 'gql',
	params: Task,
	returns: Task,
})
export class CloneTask extends ObjectAction<Task, Task, Task> {
	constructor(
		private ds: MainDs,
		private activityLog: ActivityLogService,
	) {
		super();
	}

	/**
	 * Pre-fill the clone form with the original task's values so the user
	 * does not have to re-enter everything from scratch.
	 *
	 * `params.merge(task, { fields })` copies only the listed fields, leaving
	 * status, dates, and compositions at their defaults.  After the merge, we
	 * prepend "Copy of:" to the title so the user immediately knows this is a
	 * new record, and we explicitly reset the status to To Do so the clone
	 * always starts at the beginning of the workflow regardless of where the
	 * original is.
	 */
	override onInit(task: Task, params: Task): void {
		params.merge(task);
		params.title = `Copy of: ${task.title}`;
		params.status = TaskStatus.ToDo;
		params.priority = params.priority ?? TaskPriority.Medium;
	}

	/**
	 * Create a new Task from the (possibly user-edited) params.
	 *
	 * A second `merge()` call copies the user's final form values into the
	 * freshly instantiated task, keeping the logic for "which fields matter"
	 * in one place (`CLONEABLE_FIELDS`).
	 */
	override async execute(task: Task, params: Task): Promise<Task> {
		const newTask = new Task();
		newTask.merge(params);
		newTask.status = TaskStatus.ToDo;
		newTask.createdAt = new Date().toISOString();

		await this.ds.save(newTask);

		this.activityLog.addEntry(
			`Task "${task.title}" (${task.id}) cloned as "${newTask.title}" (${newTask.id})`,
		);
		logger.info(
			`[CloneTask] "${newTask.title}" (${newTask.id}) cloned from "${task.title}" (${task.id})`,
		);

		return newTask;
	}
}

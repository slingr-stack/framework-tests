import {
	Action,
	Context,
	logger,
	ObjectAction,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { ActivityLogService } from '@/global/services/activity-log.service';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';
import { User } from '@/users/data-models/user.data-model';

/**
 * BulkAssignToMe — ObjectAction with bulk: true
 *
 * Assigns each selected task to the current user, unless it is already Done or Blocked.
 *
 * Demonstrates the following bulk action patterns:
 *
 * 1. **canExecute with a string message**: tasks that are Done or Blocked are
 *    *skipped* (not errored) — the framework counts them in `result.skipped`
 *    and does not add them to `result.errors`.
 *
 * 2. **Context injection in a bulk action**: the current user is resolved lazily
 *    once and cached in the action instance, so every record uses the same
 *    authenticated user without repeating DB lookups.
 *
 * 3. **Activity log accumulation**: each successful assignment adds one entry
 *    to the singleton ActivityLogService, demonstrating that bulk operations
 *    accumulate cross-record side effects correctly.
 *
 * Usage from the UI:
 *   1. Select one or more tasks in the Tasks table view.
 *   2. Open the bulk actions menu and choose "Assign to me".
 *   3. Confirm in the dialog — no params view needed.
 *   4. The result panel shows "X processed, Y skipped".
 */
@Action({
	type: 'write',
	model: Task,
	api: 'gql',
	returns: Task,
	bulk: true,
})
export class BulkAssignToMe extends ObjectAction<Task, void, Task> {
	private currentUserPromise?: Promise<User>;
	constructor(
		private ds: MainDs,
		private activityLog: ActivityLogService,
		private context: Context,
	) {
		super();
	}

	/**
	 * Reject Done and Blocked tasks with a human-readable message.
	 * The framework counts these as *skipped*, not as errors.
	 */
	override async canExecute(task: Task): Promise<boolean | string> {
		if (task.status === TaskStatus.Done) {
			return `"${task.title}" is already done — cannot reassign`;
		}
		if (task.status === TaskStatus.Blocked) {
			return `"${task.title}" is blocked — cannot reassign`;
		}
		return true;
	}

	private async resolveCurrentUser(): Promise<User> {
		if (!this.currentUserPromise) {
			this.currentUserPromise = (async () => {
				const userId = this.context.user?.id;
				if (!userId) {
					throw new Error('No authenticated user in context');
				}

				const currentUser = await this.ds.findOneBy(User, { id: userId });
				if (!currentUser) {
					throw new Error(`User ${userId} not found`);
				}

				return currentUser;
			})();
		}

		return this.currentUserPromise;
	}

	override async execute(task: Task): Promise<Task> {
		const currentUser = await this.resolveCurrentUser();

		logger.info(
			`[BulkAssignToMe] Assigning task "${task.title}" (${task.id}) to user ${currentUser.id}`,
		);
		task.assignee = currentUser;
		await this.ds.save(task);
		this.activityLog.addEntry(
			`Task "${task.title}" assigned to ${currentUser.email} via bulk operation`,
		);

		return task;
	}
}

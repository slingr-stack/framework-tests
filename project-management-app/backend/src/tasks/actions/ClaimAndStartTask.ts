import {
	Action,
	CannotExecuteError,
	Context,
	dateToDateString,
	LockService,
	ObjectAction,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';
import { User } from '@/users/data-models/user.data-model';

/**
 * Atomically claims and starts a task under a distributed lock.
 *
 * Uses the manual tryLock() pattern because the lock spans multiple async
 * operations (re-fetch + save) and we want to fail fast without blocking
 * when the task is already being processed concurrently.
 *
 * The finally block guarantees the lock is always released even if an
 * unexpected error occurs mid-execution.
 */
@Action({
	type: 'write',
	model: Task,
	api: 'gql',
	returns: Task,
})
export class ClaimAndStartTask extends ObjectAction<
	Task,
	void,
	Task | CannotExecuteError
> {
	constructor(
		private ds: MainDs,
		private lockService: LockService,
		private context: Context,
	) {
		super();
	}

	override async canExecute(task: Task): Promise<boolean | string> {
		return (
			task.status === TaskStatus.ToDo || 'Task must be in ToDo status to claim'
		);
	}

	async execute(task: Task): Promise<Task | CannotExecuteError> {
		const lock = await this.lockService.tryLock(`task:${task.id}`);
		if (!lock) {
			return new CannotExecuteError(
				'Another operation is already in progress for this task. Please try again shortly.',
			);
		}

		try {
			// Re-fetch inside the lock to guard against stale reads between
			// canExecute() and execute().
			const fresh = await this.ds.findOneByOrFail(Task, { id: task.id });

			if (fresh.status !== TaskStatus.ToDo) {
				return new CannotExecuteError(
					`Task "${fresh.title}" was already claimed.`,
				);
			}

			const userId = this.context.user?.id;
			if (userId) {
				fresh.assignee = await this.ds.findOneBy(User, { id: userId });
			}
			fresh.status = TaskStatus.InProgress;
			fresh.startedAt = dateToDateString(new Date());
			return await this.ds.save(fresh);
		} finally {
			await lock.release();
		}
	}
}

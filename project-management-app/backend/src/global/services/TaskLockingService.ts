import {
	CannotExecuteError,
	dateToDateString,
	LockNotAvailableError,
	LockService,
	Service,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';

/**
 * Wraps critical task mutations with distributed locks so concurrent requests
 * against the same task produce consistent state.
 *
 * Each lock key is scoped to the task ID, allowing operations on different
 * tasks to proceed in parallel while serialising operations on the same one.
 */
@Service()
export class TaskLockingService {
	constructor(
		private ds: MainDs,
		private lockService: LockService,
	) {}

	/**
	 * Transitions a task from ToDo → InProgress under a distributed lock.
	 *
	 * Re-fetches the task inside the lock to guard against stale reads from
	 * concurrent requests. Returns CannotExecuteError instead of throwing so
	 * callers can surface the message directly in the UI.
	 */
	async startTask(task: Task): Promise<Task | CannotExecuteError> {
		try {
			return await this.lockService.withLock(
				`task:${task.id}`,
				async () => {
					const fresh = await this.ds.findOneByOrFail(Task, { id: task.id });

					if (fresh.status !== TaskStatus.ToDo) {
						return new CannotExecuteError(
							`Task "${fresh.title}" is no longer in ToDo status.`,
						);
					}

					fresh.status = TaskStatus.InProgress;
					fresh.startedAt = dateToDateString(new Date());
					return this.ds.save(fresh);
				},
				{ timeout: 3000 },
			);
		} catch (err) {
			if (err instanceof LockNotAvailableError) {
				return new CannotExecuteError(
					'Another operation is already in progress for this task. Please try again.',
				);
			}
			throw err;
		}
	}
}

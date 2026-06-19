import {
	Action,
	CannotExecuteError,
	LockService,
	logger,
	ObjectAction,
} from '@drumr/framework-backend';
import { User } from '@/users/data-models/user.data-model';
import { LockDemoParams } from './LockDemoParams';

/**
 * Demonstrates the manual LockService.tryLock() pattern.
 *
 * Attempts to acquire the lock immediately (zero wait) via tryLock(). If the
 * lock is free, it is held for the configured number of seconds and then
 * released in a finally block. If the lock is already taken, the action
 * returns a CannotExecuteError immediately without blocking.
 *
 * Use this pattern when you need the lock handle for multiple operations and
 * do not want to block if the resource is busy.
 */
@Action({
	type: 'write',
	model: User,
	api: 'gql',
	params: LockDemoParams,
	returns: User,
})
export class TryLockManual extends ObjectAction<
	User,
	LockDemoParams,
	User | CannotExecuteError
> {
	constructor(private lockService: LockService) {
		super();
	}

	async execute(
		user: User,
		params: LockDemoParams,
	): Promise<User | CannotExecuteError> {
		const lock = await this.lockService.tryLock(`user-lock-demo:${user.id}`);

		if (!lock) {
			logger.warn(
				`[TryLockManual] Lock contention on user ${user.id} — lock already held`,
			);
			return new CannotExecuteError(
				`Lock is already held by another operation. Try again in a few seconds.`,
			);
		}

		try {
			await new Promise((r) => setTimeout(r, params.holdForSeconds * 1000));
			return user;
		} finally {
			await lock.release();
		}
	}
}

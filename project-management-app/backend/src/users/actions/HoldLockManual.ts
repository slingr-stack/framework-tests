import {
	Action,
	CannotExecuteError,
	LockNotAvailableError,
	LockService,
	logger,
	ObjectAction,
} from '@drumr/framework-backend';
import { User } from '@/users/data-models/user.data-model';
import { LockDemoParams } from './LockDemoParams';

/**
 * Demonstrates the manual LockService.lock() pattern.
 *
 * Acquires an exclusive lock via lock() and holds it for the configured
 * number of seconds, releasing it in a finally block. This pattern is
 * appropriate when the lock must span multiple async calls that cannot be
 * wrapped in a single withLock callback.
 *
 * lock() blocks until the lock is acquired (up to the configured timeout)
 * and throws LockNotAvailableError if the timeout is exceeded.
 */
@Action({
	type: 'write',
	model: User,
	api: 'gql',
	params: LockDemoParams,
	returns: User,
})
export class HoldLockManual extends ObjectAction<
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
		let lock: Awaited<ReturnType<LockService['lock']>> | null = null;
		try {
			lock = await this.lockService.lock(`user-lock-demo:${user.id}`, {
				timeout: 3000,
			});
		} catch (err) {
			if (err instanceof LockNotAvailableError) {
				logger.warn(
					`[HoldLockManual] Lock contention on user ${user.id} — lock already held`,
				);
				return new CannotExecuteError(
					`Lock is already held by another operation. Try again in a few seconds.`,
				);
			}
			throw err;
		}

		try {
			await new Promise((r) => setTimeout(r, params.holdForSeconds * 1000));
			return user;
		} finally {
			if (lock) {
				await lock.release();
			}
		}
	}
}

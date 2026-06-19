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
 * Demonstrates LockService.withLock().
 *
 * Acquires an exclusive lock on the user record and holds it for the
 * configured number of seconds. Run a second lock action on the same user
 * while this is in progress to observe contention behavior.
 *
 * withLock blocks until the lock is acquired (up to the configured timeout)
 * and throws LockNotAvailableError if the timeout is exceeded.
 */
@Action({
	type: 'write',
	model: User,
	api: 'gql',
	params: LockDemoParams,
	returns: User,
})
export class HoldLockWithLock extends ObjectAction<
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
		try {
			return await this.lockService.withLock(
				`user-lock-demo:${user.id}`,
				async () => {
					await new Promise((r) => setTimeout(r, params.holdForSeconds * 1000));
					return user;
				},
				{ timeout: 3000 },
			);
		} catch (err) {
			if (err instanceof LockNotAvailableError) {
				const msg = `[HoldLockWithLock] Lock contention on user ${user.id} — lock already held`;
				logger.warn(msg);
				return new CannotExecuteError(
					`Lock is already held by another operation. Try again in a few seconds.`,
				);
			}
			throw err;
		}
	}
}

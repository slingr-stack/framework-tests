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
 * Demonstrates LockService.withTryLock().
 *
 * Attempts to acquire the lock immediately (zero wait). If the lock is free,
 * it is held for the configured number of seconds and then released. If the
 * lock is already taken, the action returns a CannotExecuteError immediately
 * without blocking.
 */
@Action({
	type: 'write',
	model: User,
	api: 'gql',
	params: LockDemoParams,
	returns: User,
})
export class HoldLockWithTryLock extends ObjectAction<
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
		const result = await this.lockService.withTryLock(
			`user-lock-demo:${user.id}`,
			async () => {
				await new Promise((r) => setTimeout(r, params.holdForSeconds * 1000));
				return user;
			},
		);

		if (!result) {
			logger.warn(
				`[HoldLockWithTryLock] Lock contention on user ${user.id} — lock already held`,
			);
			return new CannotExecuteError(
				`Lock is already held by another operation. Try again in a few seconds.`,
			);
		}

		return result;
	}
}

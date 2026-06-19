/**
 * Status-transition validation helpers.
 *
 * Defines legal state transitions for tasks and projects so that
 * action code can validate moves without duplicating logic.
 */

/** Allowed transitions for task status values. */
const TASK_TRANSITIONS: Record<string, string[]> = {
	toDo: ['inProgress'],
	inProgress: ['done', 'toDo'],
	done: ['toDo'],
};

/** Allowed transitions for project status values. */
const PROJECT_TRANSITIONS: Record<string, string[]> = {
	active: ['onHold', 'completed', 'cancelled'],
	onHold: ['active', 'cancelled'],
	completed: [],
	cancelled: [],
};

/**
 * Returns `true` if the transition from `current` to `next` is valid
 * for the given entity type.
 */
export function isValidTransition(
	entity: 'task' | 'project',
	current: string,
	next: string,
): boolean {
	const map = entity === 'task' ? TASK_TRANSITIONS : PROJECT_TRANSITIONS;
	const allowed = map[current];
	if (!allowed) {
		return false;
	}
	return allowed.includes(next);
}

/**
 * Returns the list of statuses reachable from the current status.
 */
export function allowedNextStatuses(
	entity: 'task' | 'project',
	current: string,
): string[] {
	const map = entity === 'task' ? TASK_TRANSITIONS : PROJECT_TRANSITIONS;
	return map[current] ?? [];
}

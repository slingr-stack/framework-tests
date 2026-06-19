/**
 * Date utility functions for the tasky app.
 *
 * Centralizes common date operations used across actions and validations,
 * such as overdue detection, business-day math, and human-readable formatting.
 */

/**
 * Returns true if the given date is in the past (before today, ignoring time).
 */
export function isOverdue(date: Date): boolean {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const compareDate = new Date(date);
	compareDate.setHours(0, 0, 0, 0);
	return compareDate < today;
}

/**
 * Returns the number of business days (Mon–Fri) between two dates.
 * Negative if `start` is after `end`.
 */
export function businessDaysBetween(start: Date, end: Date): number {
	const sign = start <= end ? 1 : -1;
	const [from, to] =
		sign === 1
			? [new Date(start), new Date(end)]
			: [new Date(end), new Date(start)];
	from.setHours(0, 0, 0, 0);
	to.setHours(0, 0, 0, 0);

	let count = 0;
	const cursor = new Date(from);
	while (cursor < to) {
		cursor.setDate(cursor.getDate() + 1);
		const day = cursor.getDay();
		if (day !== 0 && day !== 6) {
			count++;
		}
	}
	return count * sign;
}

/**
 * Adds the specified number of business days to a date and returns the result.
 */
export function addBusinessDays(date: Date, days: number): Date {
	const result = new Date(date);
	let remaining = Math.abs(days);
	const direction = days >= 0 ? 1 : -1;

	while (remaining > 0) {
		result.setDate(result.getDate() + direction);
		const day = result.getDay();
		if (day !== 0 && day !== 6) {
			remaining--;
		}
	}
	return result;
}

/**
 * Returns a human-readable relative time string, e.g. "3 days ago" or "in 2 hours".
 */
export function relativeTime(date: Date, now: Date = new Date()): string {
	const diffMs = date.getTime() - now.getTime();
	const absDiffMs = Math.abs(diffMs);
	const isFuture = diffMs > 0;

	const minutes = Math.floor(absDiffMs / 60_000);
	const hours = Math.floor(absDiffMs / 3_600_000);
	const days = Math.floor(absDiffMs / 86_400_000);

	let label: string;
	if (days > 0) {
		label = `${days} day${days !== 1 ? 's' : ''}`;
	} else if (hours > 0) {
		label = `${hours} hour${hours !== 1 ? 's' : ''}`;
	} else if (minutes > 0) {
		label = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
	} else {
		return 'just now';
	}

	return isFuture ? `in ${label}` : `${label} ago`;
}

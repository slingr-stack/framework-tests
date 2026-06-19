import {
	addBusinessDays,
	businessDaysBetween,
	isOverdue,
	relativeTime,
} from '../../../src/shared/date-utils';
import {
	formatCurrency,
	percentageOf,
	sumMoney,
} from '../../../src/shared/money-utils';
import {
	allowedNextStatuses,
	isValidTransition,
} from '../../../src/shared/status-transitions';

/**
 * Reference utility unit spec:
 * each describe block groups one utility module and validates pure deterministic rules.
 */

describe('shared/dateUtils', () => {
	let fixedNow: Date;

	beforeEach(() => {
		fixedNow = new Date(2026, 3, 10, 12, 0, 0, 0);
		jest.useFakeTimers();
		jest.setSystemTime(fixedNow);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('isOverdue ignores time and compares by day', () => {
		// Arrange:
		// Build two dates around the same fixed day boundary.
		const yesterdayLate = new Date(fixedNow);
		yesterdayLate.setDate(yesterdayLate.getDate() - 1);
		yesterdayLate.setHours(23, 59, 59, 999);

		const todayEarly = new Date(fixedNow);
		todayEarly.setHours(0, 0, 0, 0);

		// Act + Assert:
		// Overdue logic compares by day (not by hour/minute precision).
		expect(isOverdue(yesterdayLate)).toBe(true);
		expect(isOverdue(todayEarly)).toBe(false);
	});

	it('businessDaysBetween counts only weekdays and supports reverse ranges', () => {
		const start = new Date('2026-04-06T00:00:00.000Z'); // monday
		const end = new Date('2026-04-13T00:00:00.000Z'); // next monday
		expect(businessDaysBetween(start, end)).toBe(5);
		expect(businessDaysBetween(end, start)).toBe(-5);
	});

	it('addBusinessDays skips weekends in positive and negative directions', () => {
		const friday = new Date(2026, 3, 10, 12, 0, 0, 0);
		const monday = addBusinessDays(friday, 1);
		const prevThursday = addBusinessDays(friday, -1);

		expect(monday.getDay()).toBe(1);
		expect(prevThursday.getDay()).toBe(4);
	});

	it('relativeTime renders days, hours, minutes and just now', () => {
		const now = new Date('2026-04-10T12:00:00.000Z');

		expect(relativeTime(new Date('2026-04-12T12:00:00.000Z'), now)).toBe(
			'in 2 days',
		);
		expect(relativeTime(new Date('2026-04-10T15:00:00.000Z'), now)).toBe(
			'in 3 hours',
		);
		expect(relativeTime(new Date('2026-04-10T12:30:00.000Z'), now)).toBe(
			'in 30 minutes',
		);
		expect(relativeTime(new Date('2026-04-10T11:59:50.000Z'), now)).toBe(
			'just now',
		);
	});
});

describe('shared/moneyUtils', () => {
	it('formatCurrency formats valid values and returns em dash for invalid values', () => {
		expect(formatCurrency('12500.5', 'USD', 'en-US')).toBe('$12,500.50');
		expect(formatCurrency('not-a-number')).toBe('—');
	});

	it('sumMoney adds valid entries and ignores invalid ones', () => {
		expect(sumMoney(['10.20', '5', 'x'])).toBe('15.20');
		expect(sumMoney(['1.234', '2.345'], 3)).toBe('3.579');
	});

	it('percentageOf handles bounds and invalid totals', () => {
		expect(percentageOf('40', '200')).toBe(20);
		expect(percentageOf('300', '200')).toBe(100);
		expect(percentageOf('-10', '200')).toBe(0);
		expect(percentageOf('10', '0')).toBe(0);
	});
});

describe('shared/statusTransitions', () => {
	it('validates known task and project transitions', () => {
		expect(isValidTransition('task', 'toDo', 'inProgress')).toBe(true);
		expect(isValidTransition('task', 'done', 'toDo')).toBe(true);
		expect(isValidTransition('project', 'active', 'completed')).toBe(true);
		expect(isValidTransition('project', 'completed', 'active')).toBe(false);
	});

	it('returns false for unknown current statuses and empty allowed list', () => {
		expect(isValidTransition('task', 'missing', 'inProgress')).toBe(false);
		expect(allowedNextStatuses('project', 'completed')).toEqual([]);
		expect(allowedNextStatuses('task', 'missing')).toEqual([]);
	});
});

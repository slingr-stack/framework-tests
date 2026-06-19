import { money } from '@slingr/framework-backend';

/**
 * Budget and money formatting helpers.
 *
 * Re-usable functions for aggregating, formatting, and comparing
 * monetary values stored as strings (MoneyField convention).
 */

/**
 * Formats a numeric string as a currency value.
 *
 * @example formatCurrency('12500.5', 'USD') // "$12,500.50"
 */
export function formatCurrency(
	value: string | number,
	currencyCode: string = 'USD',
	locale: string = 'en-US',
): string {
	if (value === null || value === undefined || value === '') return '—';
	try {
		const m = money(value);
		if (m.toString() === 'NaN') return '—'; // Just in case
		// Intl.NumberFormat requires a JS number, but since we parsed dynamically we can use the exact display value or fallback.
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: currencyCode,
		}).format(Number(m.toString()));
	} catch {
		return '—';
	}
}

/**
 * Sums an array of money-string values, returning the total as a string
 * with the specified number of decimal places.
 */
export function sumMoney(values: string[], decimals: number = 2): string {
	const total = values.reduce((acc, v) => {
		try {
			return acc.plus(money(v));
		} catch {
			return acc;
		}
	}, money(0));
	return total.changePrecision(decimals).toString();
}

/**
 * Calculates the percentage of `part` relative to `total`.
 * Returns a number between 0 and 100, clamped.
 */
export function percentageOf(
	part: string | number,
	total: string | number,
): number {
	try {
		const p = money(part);
		const t = money(total);
		if (t.equal(0)) return 0;
		const pct = p.div(t).times(100);
		return Math.min(100, Math.max(0, Number(pct.toString())));
	} catch {
		return 0;
	}
}

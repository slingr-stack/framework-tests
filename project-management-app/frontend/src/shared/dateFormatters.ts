/**
 * Date formatting utilities for the frontend.
 *
 * Provides human-friendly date displays used in dashboards, task cards,
 * and timeline views across the project-management UI.
 */

/**
 * Returns a short human-readable relative string, e.g. "3d ago", "in 2h", "just now".
 */
export function timeAgo(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const absDiff = Math.abs(diffMs);
  const isFuture = diffMs < 0;

  const minutes = Math.floor(absDiff / 60_000);
  const hours = Math.floor(absDiff / 3_600_000);
  const days = Math.floor(absDiff / 86_400_000);

  let label: string;
  if (days > 30) {
    label = `${Math.floor(days / 30)}mo`;
  } else if (days > 0) {
    label = `${days}d`;
  } else if (hours > 0) {
    label = `${hours}h`;
  } else if (minutes > 0) {
    label = `${minutes}m`;
  } else {
    return 'just now';
  }

  return isFuture ? `in ${label}` : `${label} ago`;
}

/**
 * Formats a Date to a compact locale string: "Jan 15, 2025".
 */
export function shortDate(
  date: Date | string,
  locale: string = 'en-US',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns a date-range string, e.g. "Jan 15 – Feb 20, 2025".
 * If both dates share the same month and year, the month is shown only once.
 */
export function dateRange(
  start: Date | string,
  end: Date | string,
  locale: string = 'en-US',
): string {
  const s = typeof start === 'string' ? new Date(start) : start;
  const e = typeof end === 'string' ? new Date(end) : end;

  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();

  if (sameMonth) {
    const month = s.toLocaleDateString(locale, { month: 'short' });
    return `${month} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  return sameYear
    ? `${fmt(s)} – ${fmt(e)}, ${s.getFullYear()}`
    : `${shortDate(s, locale)} – ${shortDate(e, locale)}`;
}

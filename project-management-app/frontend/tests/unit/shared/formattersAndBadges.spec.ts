import {
  priorityBadge,
  projectStatusBadge,
  taskStatusBadge,
} from '../../../src/shared/badgeStyles';
import {
  dateRange,
  shortDate,
  timeAgo,
} from '../../../src/shared/dateFormatters';

/**
 * Reference pure-unit spec:
 * validates deterministic formatting and style mapping helpers.
 */

describe('shared/dateFormatters', () => {
  it('timeAgo renders past/future compact values and just now', () => {
    // Arrange:
    // Fix reference date for deterministic relative-time outputs.
    const now = new Date('2026-04-10T12:00:00.000Z');

    // Act + Assert:
    // Validate past, future, and near-zero delta representations.
    expect(timeAgo('2026-04-08T12:00:00.000Z', now)).toBe('2d ago');
    expect(timeAgo('2026-04-10T15:00:00.000Z', now)).toBe('in 3h');
    expect(timeAgo('2026-04-10T12:00:10.000Z', now)).toBe('just now');
  });

  it('shortDate formats to compact locale string', () => {
    expect(shortDate(new Date(2026, 0, 15, 12, 0, 0), 'en-US')).toBe(
      'Jan 15, 2026',
    );
  });

  it('dateRange collapses same month and handles year boundaries', () => {
    expect(
      dateRange(
        new Date(2026, 0, 15, 12, 0, 0),
        new Date(2026, 0, 20, 12, 0, 0),
        'en-US',
      ),
    ).toBe('Jan 15 – 20, 2026');
    expect(
      dateRange(
        new Date(2026, 0, 15, 12, 0, 0),
        new Date(2026, 1, 20, 12, 0, 0),
        'en-US',
      ),
    ).toBe('Jan 15 – Feb 20, 2026');
    expect(
      dateRange(
        new Date(2025, 11, 31, 12, 0, 0),
        new Date(2026, 0, 2, 12, 0, 0),
        'en-US',
      ),
    ).toBe('Dec 31, 2025 – Jan 2, 2026');
  });
});

describe('shared/badgeStyles', () => {
  it('returns mapped styles for known keys', () => {
    expect(taskStatusBadge('inProgress').label).toBe('In Progress');
    expect(projectStatusBadge('cancelled').label).toBe('Cancelled');
    expect(priorityBadge('critical').label).toBe('Critical');
  });

  it('returns fallback style for unknown keys', () => {
    expect(taskStatusBadge('custom')).toEqual({
      background: '#f3f4f6',
      color: '#374151',
      label: 'custom',
    });
  });
});

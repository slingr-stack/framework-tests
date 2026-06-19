/**
 * Unit tests for ActivityLogService and RequestAuditService.
 *
 * Both services are instantiated directly (bypassing the DI container) since
 * their behaviour is entirely self-contained and requires no infrastructure.
 */

jest.mock('@drumr/framework-backend', () => ({
	Service:
		(..._args: unknown[]) =>
		<T>(cls: T): T =>
			cls,
}));

import { ActivityLogService } from '../../../src/global/services/activity-log.service';
import { RequestAuditService } from '../../../src/global/services/request-audit.service';

// ---------------------------------------------------------------------------
// ActivityLogService
// ---------------------------------------------------------------------------

describe('ActivityLogService', () => {
	let service: ActivityLogService;

	beforeEach(() => {
		service = new ActivityLogService();
	});

	it('starts with an empty log', () => {
		expect(service.getEntries()).toHaveLength(0);
		expect(service.getCount()).toBe(0);
	});

	it('adds an entry with a UTC timestamp prefix', () => {
		service.addEntry('task completed');
		const entries = service.getEntries();
		expect(entries).toHaveLength(1);
		// Format: [2024-01-01T12:00:00.000Z] task completed
		expect(entries[0]).toMatch(
			/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] task completed$/,
		);
	});

	it('accumulates multiple entries in insertion order', () => {
		service.addEntry('alpha');
		service.addEntry('beta');
		service.addEntry('gamma');
		expect(service.getCount()).toBe(3);
		const entries = service.getEntries();
		expect(entries[0]).toContain('alpha');
		expect(entries[1]).toContain('beta');
		expect(entries[2]).toContain('gamma');
	});

	it('returns a copy — mutating the returned array does not affect internal state', () => {
		service.addEntry('original');
		const entries = service.getEntries();
		entries.push('injected');
		expect(service.getCount()).toBe(1);
		expect(service.getEntries()).toHaveLength(1);
	});

	it('caps the log at 100 entries (MAX_ENTRIES), keeping the most recent', () => {
		for (let i = 1; i <= 105; i++) {
			service.addEntry(`entry ${i}`);
		}
		expect(service.getCount()).toBe(100);
		const entries = service.getEntries();
		// Oldest retained entry should be entry 6 (entries 1–5 were evicted)
		expect(entries[0]).toContain('entry 6');
		expect(entries[99]).toContain('entry 105');
	});
});

// ---------------------------------------------------------------------------
// RequestAuditService
// ---------------------------------------------------------------------------

describe('RequestAuditService', () => {
	let service: RequestAuditService;

	beforeEach(() => {
		service = new RequestAuditService();
	});

	it('starts with an empty step list', () => {
		expect(service.getSteps()).toHaveLength(0);
		expect(service.getSummary()).toBe('');
	});

	it('adds a step with a UTC timestamp prefix', () => {
		service.addStep('fetched project');
		const steps = service.getSteps();
		expect(steps).toHaveLength(1);
		expect(steps[0]).toMatch(
			/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] fetched project$/,
		);
	});

	it('returns a copy — mutating the returned array does not affect internal state', () => {
		service.addStep('step one');
		const steps = service.getSteps();
		steps.push('injected');
		expect(service.getSteps()).toHaveLength(1);
	});

	it('builds a summary by joining steps with " → "', () => {
		service.addStep('validated input');
		service.addStep('fetched project');
		service.addStep('updated status');
		const summary = service.getSummary();
		const parts = summary.split(' → ');
		expect(parts).toHaveLength(3);
		expect(parts[0]).toContain('validated input');
		expect(parts[1]).toContain('fetched project');
		expect(parts[2]).toContain('updated status');
	});

	it('summary for a single step has no arrow separator', () => {
		service.addStep('only step');
		expect(service.getSummary()).not.toContain('→');
	});
});

/**
 * Integration tests for the backend service layer.
 *
 * These tests exercise multiple services together, verifying that they
 * interact correctly in realistic action-execution scenarios.
 * No running server or database is required.
 */

jest.mock('@drumr/framework-backend', () => ({
	Service:
		(..._args: unknown[]) =>
		<T>(cls: T): T =>
			cls,
}));

import { ActivityLogService } from '@/global/services/activity-log.service';
import { RequestAuditService } from '@/global/services/request-audit.service';

describe('Service layer integration', () => {
	describe('ActivityLogService + RequestAuditService in an action lifecycle', () => {
		it('records audit steps and activity log entries independently', () => {
			const activityLog = new ActivityLogService();
			const requestAudit = new RequestAuditService();

			// Simulate an action execution pipeline
			requestAudit.addStep('permission check passed');
			requestAudit.addStep('input validated');
			activityLog.addEntry(
				'task "Build dashboard" started by user@example.com',
			);
			requestAudit.addStep('task status updated to in_progress');
			activityLog.addEntry('task status changed: to_do → in_progress');
			requestAudit.addStep('response serialised');

			// Each service maintains its own isolated state
			expect(requestAudit.getSteps()).toHaveLength(4);
			expect(activityLog.getCount()).toBe(2);
		});

		it('request audit summary captures the full step chain', () => {
			const requestAudit = new RequestAuditService();
			requestAudit.addStep('validate');
			requestAudit.addStep('execute');
			requestAudit.addStep('respond');

			const summary = requestAudit.getSummary();
			expect(summary).toContain('validate');
			expect(summary).toContain('execute');
			expect(summary).toContain('respond');
			// Steps are chained with the arrow separator
			expect(summary.split(' → ')).toHaveLength(3);
		});

		it('activity log accumulates entries across multiple simulated requests', () => {
			const activityLog = new ActivityLogService();
			const count = 10;

			for (let i = 1; i <= count; i++) {
				const requestAudit = new RequestAuditService();
				requestAudit.addStep(`request ${i}: started`);
				activityLog.addEntry(`request ${i} processed`);
				requestAudit.addStep(`request ${i}: finished`);
				// Each RequestAuditService is request-scoped; state is discarded after use
				expect(requestAudit.getSteps()).toHaveLength(2);
			}

			// ActivityLogService is singleton-scoped; entries persist across requests
			expect(activityLog.getCount()).toBe(count);
		});
	});
});

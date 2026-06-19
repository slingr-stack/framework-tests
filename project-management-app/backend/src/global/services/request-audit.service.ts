import { Service } from '@drumr/framework-backend';

/**
 * Request-scoped service that records the logical steps taken during a single
 * action execution. A brand-new instance is created for every incoming request
 * and discarded once the request finishes, so there is no cross-request state.
 *
 * Inject this into an action to build a lightweight audit trail of what
 * happened inside that request (useful for debugging and observability).
 *
 * DI scope: request
 */
@Service({ scope: 'request' })
export class RequestAuditService {
	private steps: string[] = [];

	addStep(step: string): void {
		const timestamp = new Date().toISOString();
		this.steps.push(`[${timestamp}] ${step}`);
	}

	getSteps(): string[] {
		return [...this.steps];
	}

	getSummary(): string {
		return this.steps.join(' → ');
	}
}

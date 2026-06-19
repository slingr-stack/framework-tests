import { Service } from '@drumr/framework-backend';
import type { EmailMessage } from '@/global/services/email.service';
import { EmailService } from '@/global/services/email.service';

/**
 * In-memory email service used in integration tests.
 *
 * Instead of connecting to an SMTP server it simply stores every outgoing
 * message so tests can assert on what was (or was not) sent.
 *
 * Register it in your `TestApp` to replace the production {@link EmailService}:
 *
 * ```typescript
 * // tests/integration/TestApp.ts
 * override async beforeStart(): Promise<void> {
 *   this.register('emailService', MockEmailService);
 * }
 * ```
 *
 * @example Asserting on sent emails in a test
 * ```typescript
 * import { DependencyContainer } from '@drumr/framework-backend';
 * import { EmailService } from '../../../src/services/EmailService';
 * import { MockEmailService } from './mocks/MockEmailService';
 *
 * const mock = DependencyContainer.resolve(EmailService) as MockEmailService;
 * expect(mock.getSentEmails()).toHaveLength(1);
 * expect(mock.getSentEmails()[0].to).toBe('dev@example.com');
 * ```
 */
@Service()
export class MockEmailService extends EmailService {
	private sentEmails: EmailMessage[] = [];

	/**
	 * Records the message instead of delivering it.
	 * Never throws — tests should not fail because of network issues.
	 */
	override async send(message: EmailMessage): Promise<void> {
		this.sentEmails.push({ ...message });
	}

	/**
	 * Returns a snapshot of all messages recorded since the last {@link reset}.
	 */
	getSentEmails(): ReadonlyArray<EmailMessage> {
		return [...this.sentEmails];
	}

	/**
	 * Returns the most recently recorded message, or `undefined` if none.
	 */
	getLastSentEmail(): EmailMessage | undefined {
		return this.sentEmails[this.sentEmails.length - 1];
	}

	/**
	 * Clears the recorded messages — call in `afterEach` to keep tests isolated.
	 */
	reset(): void {
		this.sentEmails = [];
	}
}

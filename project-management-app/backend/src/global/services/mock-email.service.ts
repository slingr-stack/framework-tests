import { logger, Service } from '@drumr/framework-backend';
import {
	type EmailMessage,
	EmailService,
} from '@/global/services/email.service';

/**
 * Drop-in replacement for {@link EmailService} that logs every message
 * instead of sending it over SMTP.
 *
 * Useful in tests and local development.  Register it before the app starts:
 *
 * ```typescript
 * // tests/integration/TestApp.ts
 * override async beforeStart(): Promise<void> {
 *   this.register('emailService', MockEmailService);
 * }
 * ```
 */

@Service()
export class MockEmailService extends EmailService {
	override async send(message: EmailMessage): Promise<void> {
		logger.info('[MockEmailService] Email captured (not sent)', {
			to: message.to,
			subject: message.subject,
			text: message.text,
			html: message.html,
		});
	}
}

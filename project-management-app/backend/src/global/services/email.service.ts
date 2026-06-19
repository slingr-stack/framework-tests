import { ConfigService, logger, Service } from '@drumr/framework-backend';
import type { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';

/**
 * A single email message to send.
 */
export interface EmailMessage {
	/** Recipient address */
	to: string;
	/** Email subject line */
	subject: string;
	/** Plain-text body */
	text?: string;
	/** HTML body (takes precedence over text when supported by the mail client) */
	html?: string;
}

/**
 * SMTP configuration read from `config/config.json` under the `email` key.
 *
 * ```json
 * {
 *   "email": {
 *     "host":     "smtp.example.com",
 *     "port":     587,
 *     "secure":   false,
 *     "user":     "user@example.com",
 *     "password": "secret",
 *     "from":     "noreply@example.com"
 *   }
 * }
 * ```
 *
 * All fields are optional — if `host` is absent the service falls back to a
 * Nodemailer *Ethereal* preview account (useful for local development without
 * a real SMTP server).
 */
export interface SmtpConfig {
	host?: string;
	port?: number;
	/** Use TLS on the initial connection.  Default: false (STARTTLS is used instead). */
	secure?: boolean;
	user?: string;
	password?: string;
	from?: string;
}

/**
 * Singleton service that sends transactional emails via SMTP.
 *
 * Registered under the string ID `'emailService'` so it can be replaced
 * in tests (or in other environments) without changing application code:
 *
 * ```typescript
 * // tests/integration/TestApp.ts
 * override async beforeStart(): Promise<void> {
 *   this.register('emailService', MockEmailService);
 * }
 * ```
 *
 * SMTP settings are read from the `email` section of `config/config.json`.
 * When `email.host` is not configured the service creates a temporary
 * Nodemailer Ethereal account and logs the preview URL for each sent message.
 *
 * @example Injecting EmailService into an action
 * ```typescript
 * class AssignTask extends ObjectAction<Task, AssignTaskParams, Task> {
 *   constructor(private emailService: EmailService) { super(); }
 * }
 * ```
 */
@Service({ id: 'emailService' })
export class EmailService {
	private transporter: Transporter | null = null;
	private fromAddress = 'noreply@drumr.io';
	private previewMode = false;

	constructor(private configService: ConfigService) {}

	/**
	 * Sends an email using the configured SMTP transporter.
	 *
	 * On first call the transport is initialised lazily — this keeps the DI
	 * container fast to boot and makes `EmailService` safe to inject even when
	 * SMTP credentials are not yet available at startup.
	 *
	 * @returns The nodemailer `SentMessageInfo` object.
	 */
	async send(message: EmailMessage): Promise<void> {
		const transport = await this.getTransporter();

		const info = await transport.sendMail({
			from: this.fromAddress,
			to: message.to,
			subject: message.subject,
			text: message.text,
			html: message.html,
		});

		if (this.previewMode) {
			// Ethereal preview URL — only available in preview mode
			const previewUrl = nodemailer.getTestMessageUrl(info);
			logger.info(`[EmailService] Preview email sent. View at: ${previewUrl}`, {
				to: message.to,
				subject: message.subject,
				messageId: info.messageId,
			});
		} else {
			logger.info('[EmailService] Email sent', {
				to: message.to,
				subject: message.subject,
				messageId: info.messageId,
			});
		}
	}

	// ── internals ────────────────────────────────────────────────────────────────

	/**
	 * Lazily creates (and caches) the Nodemailer transporter.
	 * Falls back to an Ethereal test account when SMTP host is not configured.
	 */
	private async getTransporter(): Promise<Transporter> {
		if (this.transporter) {
			return this.transporter;
		}

		const emailConfig = this.configService.get<SmtpConfig>('email') ?? {};

		if (emailConfig.host) {
			// Real SMTP transport
			this.fromAddress = emailConfig.from ?? `noreply@${emailConfig.host}`;
			this.transporter = nodemailer.createTransport({
				host: emailConfig.host,
				port: emailConfig.port ?? 587,
				secure: emailConfig.secure ?? false,
				auth:
					emailConfig.user && emailConfig.password
						? { user: emailConfig.user, pass: emailConfig.password }
						: undefined,
			});

			logger.info('[EmailService] SMTP transport configured', {
				host: emailConfig.host,
				port: emailConfig.port ?? 587,
			});
		} else {
			// No SMTP config — fall back to Ethereal (preview only, no real delivery)
			this.previewMode = true;
			const testAccount = await nodemailer.createTestAccount();
			this.fromAddress = `Drumr App <${testAccount.user}>`;
			this.transporter = nodemailer.createTransport({
				host: 'smtp.ethereal.email',
				port: 587,
				secure: false,
				auth: { user: testAccount.user, pass: testAccount.pass },
			});

			logger.warn(
				'[EmailService] No SMTP host configured — using Ethereal preview account. ' +
					'Emails will NOT be delivered. Set email.host in config/config.json for real delivery.',
				{ previewUser: testAccount.user },
			);
		}

		return this.transporter;
	}
}

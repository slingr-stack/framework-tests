jest.mock('@drumr/framework-backend', () => ({
	Service:
		(..._args: unknown[]) =>
		<T>(cls: T): T =>
			cls,
	logger: {
		info: jest.fn(),
		warn: jest.fn(),
	},
}));

jest.mock('nodemailer', () => ({
	createTransport: jest.fn(),
	createTestAccount: jest.fn(),
	getTestMessageUrl: jest.fn(),
}));

import type { ConfigService } from '@drumr/framework-backend';
import { logger } from '@drumr/framework-backend';
import * as nodemailer from 'nodemailer';
import { EmailService } from '../../../src/global/services/email.service';

/**
 * Reference unit spec:
 * - Mock external boundary (nodemailer).
 * - Keep service logic real.
 * - Validate behavior for SMTP + preview fallback + caching.
 */

type FakeTransporter = {
	sendMail: jest.Mock<
		Promise<{ messageId: string }>,
		[Record<string, unknown>]
	>;
};

describe('EmailService', () => {
	const createTransportMock =
		nodemailer.createTransport as unknown as jest.Mock;
	const createTestAccountMock =
		nodemailer.createTestAccount as unknown as jest.Mock;
	const getTestMessageUrlMock =
		nodemailer.getTestMessageUrl as unknown as jest.Mock;
	const loggerInfoMock = logger.info as unknown as jest.Mock;
	const loggerWarnMock = logger.warn as unknown as jest.Mock;

	const makeTransport = (messageId = 'msg-1'): FakeTransporter => ({
		sendMail: jest.fn().mockResolvedValue({ messageId }),
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('uses configured SMTP transport and sends with configured from address', async () => {
		// Arrange
		const transporter = makeTransport('smtp-1');
		createTransportMock.mockReturnValue(transporter);

		const configService = {
			get: jest.fn().mockReturnValue({
				host: 'smtp.example.com',
				port: 2525,
				secure: true,
				user: 'u',
				password: 'p',
				from: 'no-reply@example.com',
			}),
		};

		const service = new EmailService(configService as unknown as ConfigService);

		// Act
		await service.send({
			to: 'dev@company.com',
			subject: 'Hello',
			text: 'Body',
		});

		// Assert
		expect(createTransportMock).toHaveBeenCalledWith({
			host: 'smtp.example.com',
			port: 2525,
			secure: true,
			auth: { user: 'u', pass: 'p' },
		});
		expect(transporter.sendMail).toHaveBeenCalledWith({
			from: 'no-reply@example.com',
			to: 'dev@company.com',
			subject: 'Hello',
			text: 'Body',
			html: undefined,
		});
		expect(loggerWarnMock).not.toHaveBeenCalled();
		expect(loggerInfoMock).toHaveBeenCalledWith('[EmailService] Email sent', {
			to: 'dev@company.com',
			subject: 'Hello',
			messageId: 'smtp-1',
		});
	});

	it('falls back to Ethereal preview mode when SMTP host is not configured', async () => {
		// Arrange:
		// Remove SMTP host from config and provide Ethereal stubs,
		// so service must switch to preview transport mode.
		const transporter = makeTransport('preview-1');
		createTransportMock.mockReturnValue(transporter);
		createTestAccountMock.mockResolvedValue({
			user: 'preview@ethereal.email',
			pass: 'secret',
		});
		getTestMessageUrlMock.mockReturnValue('https://ethereal.preview/message/1');

		const configService = {
			get: jest.fn().mockReturnValue({}),
		};

		// Act:
		// Send one message through fallback pipeline.
		const service = new EmailService(configService as unknown as ConfigService);
		await service.send({
			to: 'qa@company.com',
			subject: 'Preview',
			html: '<p>ok</p>',
		});

		// Assert:
		// Preview account is created, transport uses Ethereal defaults,
		// and logging includes preview URL for developer inspection.
		expect(createTestAccountMock).toHaveBeenCalledTimes(1);
		expect(createTransportMock).toHaveBeenCalledWith({
			host: 'smtp.ethereal.email',
			port: 587,
			secure: false,
			auth: { user: 'preview@ethereal.email', pass: 'secret' },
		});
		expect(transporter.sendMail).toHaveBeenCalledWith({
			from: 'Drumr App <preview@ethereal.email>',
			to: 'qa@company.com',
			subject: 'Preview',
			text: undefined,
			html: '<p>ok</p>',
		});
		expect(loggerWarnMock).toHaveBeenCalledTimes(1);
		expect(loggerInfoMock).toHaveBeenCalledWith(
			'[EmailService] Preview email sent. View at: https://ethereal.preview/message/1',
			{
				to: 'qa@company.com',
				subject: 'Preview',
				messageId: 'preview-1',
			},
		);
	});

	it('caches the transporter and does not recreate it on subsequent sends', async () => {
		// Arrange:
		// Use one transport mock and a stable SMTP config.
		const transporter = makeTransport('cached-id');
		createTransportMock.mockReturnValue(transporter);

		const configService = {
			get: jest.fn().mockReturnValue({ host: 'smtp.example.com' }),
		};

		// Act:
		// Send twice; service should reuse the previously created transporter.
		const service = new EmailService(configService as unknown as ConfigService);

		await service.send({ to: 'one@company.com', subject: 'One' });
		await service.send({ to: 'two@company.com', subject: 'Two' });

		// Assert:
		// Transport factory is called once, sendMail executes per call.
		expect(createTransportMock).toHaveBeenCalledTimes(1);
		expect(transporter.sendMail).toHaveBeenCalledTimes(2);
	});

	it('uses fallback noreply@host when smtp.from is not provided', async () => {
		// Arrange:
		// Configure SMTP host without explicit from value.
		const transporter = makeTransport('smtp-2');
		createTransportMock.mockReturnValue(transporter);

		const configService = {
			get: jest.fn().mockReturnValue({ host: 'smtp.internal.local' }),
		};

		// Act
		const service = new EmailService(configService as unknown as ConfigService);
		await service.send({ to: 'ops@company.com', subject: 'Defaults' });

		// Assert:
		// Service falls back to derived noreply address based on host.
		expect(transporter.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({ from: 'noreply@smtp.internal.local' }),
		);
	});
});

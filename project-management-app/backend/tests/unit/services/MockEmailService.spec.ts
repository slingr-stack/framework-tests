jest.mock('@drumr/framework-backend', () => ({
	Service:
		(..._args: unknown[]) =>
		<T>(cls: T): T =>
			cls,
	logger: {
		info: jest.fn(),
	},
}));

import type { ConfigService } from '@drumr/framework-backend';
import { logger } from '@drumr/framework-backend';
import { MockEmailService } from '../../../src/global/services/mock-email.service';

/**
 * Reference unit spec for test doubles:
 * verifies logging side effect instead of transport side effect.
 */

describe('MockEmailService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('logs email payload instead of sending it', async () => {
		// Arrange:
		// Instantiate the test double service with minimal config.
		const service = new MockEmailService({} as unknown as ConfigService);

		// Act:
		// Execute send to capture observable logging side effect.
		await service.send({
			to: 'qa@company.com',
			subject: 'Assignment',
			text: 'task assigned',
			html: '<p>task assigned</p>',
		});

		// Assert:
		// Mock service must log payload details instead of using any transport boundary.
		expect(logger.info as unknown as jest.Mock).toHaveBeenCalledWith(
			'[MockEmailService] Email captured (not sent)',
			{
				to: 'qa@company.com',
				subject: 'Assignment',
				text: 'task assigned',
				html: '<p>task assigned</p>',
			},
		);
	});
});

import { App, BaseApp } from '@drumr/framework-backend';
import { MockEmailService } from './mocks/MockEmailService';
import { TestConfigService } from './TestConfigService';

/**
 * Integration test entry point that overrides selected framework services
 * with test-friendly alternatives before the application starts.
 *
 * Services registered here replace their production counterparts throughout
 * the entire test run — no SMTP connection is opened, no real emails are sent,
 * and no PostgreSQL server is required.
 *
 * Call `initTestContext()` in your `beforeAll` hook instead of `beforeStart()`.
 * The framework will apply all overrides and then automatically initialize every
 * registered data source (e.g. MockMainDs) so tests can interact with the DB
 * right away.
 *
 * @example
 * ```typescript
 * beforeAll(async () => {
 *   await App.resolve(TestApp).initTestContext();
 * });
 * ```
 *
 * @example Loading a test dataset
 * ```typescript
 * beforeAll(async () => {
 *   await App.resolve(TestApp).initTestContext({ dataSet: 'test-api' });
 * });
 * ```
 *
 * @example Resolving the mock in a test to assert on sent emails
 * ```typescript
 * import { DependencyContainer } from '@drumr/framework-backend';
 * import { EmailService } from '../../src/services/EmailService';
 * import { MockEmailService } from './mocks/MockEmailService';
 *
 * const emailMock = DependencyContainer.resolve(EmailService) as MockEmailService;
 * expect(emailMock.getSentEmails()).toHaveLength(1);
 * ```
 */
@App()
export class TestApp extends BaseApp {
	override async beforeStart(): Promise<void> {
		const { MockMainDs } = await import('./mocks/MockMainDs');
		this.register('mainDs', MockMainDs);
		this.register('configService', TestConfigService);
		this.register('emailService', MockEmailService);
	}
}

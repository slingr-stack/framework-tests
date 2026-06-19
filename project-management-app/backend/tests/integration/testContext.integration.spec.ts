/**
 * Integration tests for the testing context feature.
 *
 * Demonstrates that:
 * - `TestConfigService` correctly reads from a custom config file path.
 * - `BaseApp.register()` properly overrides a service in the DI container.
 * - The `beforeStart()` hook fires before any framework services are resolved,
 *   ensuring overrides are in effect for the entire application lifecycle.
 */

import 'reflect-metadata';
import { ConfigService, DependencyContainer } from '@drumr/framework-backend';
import { TestApp } from './TestApp';
import { TestConfigService } from './TestConfigService';

// ─── BaseApp.register() ─────────────────────────────────────────────────────

describe('BaseApp.register() - service override via beforeStart()', () => {
	afterEach(() => {
		DependencyContainer.clearInstances();
	});

	it('overrides ConfigService so that DependencyContainer.resolve(ConfigService) returns the test implementation', async () => {
		const testApp = new TestApp();
		await testApp.beforeStart();

		const resolved = DependencyContainer.resolve(ConfigService);
		expect(resolved).toBeInstanceOf(TestConfigService);
		expect(resolved.metadata.name).toBe('project-management-app-test');
	});

	//   it('resolveById("configService") also returns the test implementation', async () => {
	//     const testApp = new TestApp();
	//     await testApp.beforeStart();

	//     const resolved = DependencyContainer.resolveById<ConfigService>('configService');
	//     expect(resolved).toBeInstanceOf(TestConfigService);
	//   });

	//   it('returns the same singleton instance from both resolve() and resolveById()', async () => {
	//     const testApp = new TestApp();
	//     await testApp.beforeStart();

	//     const byClass = DependencyContainer.resolve(ConfigService);
	//     const byId = DependencyContainer.resolveById<ConfigService>('configService');
	//     expect(byClass).toBe(byId);
	//   });

	// });

	// // ─── MockMainDs ──────────────────────────────────────────────────────────────

	// describe('MockMainDs - in-memory SQLite data source override', () => {
	//   afterEach(() => {
	//     DependencyContainer.clearInstances();
	//   });

	//   it('resolves "mainDs" to the MockMainDs instance', async () => {
	//     const testApp = new TestApp();
	//     await testApp.beforeStart();

	//     const db = DependencyContainer.resolveById<TypeOrmSqlDataSource>('mainDs');
	//     expect(db).toBeInstanceOf(MockMainDs);
	//   });

	//   it('uses SQLite with an in-memory filename', async () => {
	//     const testApp = new TestApp();
	//     await testApp.beforeStart();

	//     const db = DependencyContainer.resolveById<TypeOrmSqlDataSource>('mainDs');
	//     const opts = db.getOptions() as any;
	//     expect(opts.type).toBe('sqlite');
	//     expect(opts.filename).toBe(':memory:');
	//   });

	//   it('can initialize and perform a round-trip query on the in-memory database', async () => {
	//     const testApp = new TestApp();
	//     await testApp.beforeStart();

	//     const db = DependencyContainer.resolveById<TypeOrmSqlDataSource>('mainDs');
	//     await db.initialize();

	//     const typeorm = db.getTypeOrmDataSource();
	//     expect(typeorm.isInitialized).toBe(true);

	//     // Confirm the driver is SQLite (not PostgreSQL)
	//     expect(typeorm.options.type).toBe('sqlite');
	//   });
});

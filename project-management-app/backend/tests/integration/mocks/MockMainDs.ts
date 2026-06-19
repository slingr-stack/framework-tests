import { DataSource, TypeOrmSqlDataSource } from '@drumr/framework-backend';

/**
 * In-memory SQLite data source used in integration tests.
 *
 * Replaces the production PostgreSQL {@link MainDs} so tests never require a
 * running database server. The schema is created fresh for every test run via
 * `synchronize: true`.
 *
 * Register it in your `TestApp` to replace the production data source:
 *
 * ```typescript
 * // tests/integration/TestApp.ts
 * override async beforeStart(): Promise<void> {
 *   this.register('mainDs', MockMainDs);
 * }
 * ```
 *
 * @example Resolving the mock directly in a test
 * ```typescript
 * import { DependencyContainer } from '@drumr/framework-backend';
 * import { MockMainDs } from './mocks/MockMainDs';
 *
 * const db = DependencyContainer.resolve(MockMainDs);
 * await db.initialize();
 * ```
 */
@DataSource({ id: 'mainDs' })
export class MockMainDs extends TypeOrmSqlDataSource {
	override type = 'sqlite' as const;
	override managed = true;
	override filename = ':memory:';
	override synchronize = true;
	override logging = false;
	// postgres config for reference if we want to switch back to it at some point
	// override type = 'postgres' as const;
	// override host = process.env.DB_HOST ?? 'localhost';
	// override port = parseInt(process.env.DB_PORT ?? '5433', 10);
	// override username = process.env.DB_USER ?? 'postgres';
	// override password = process.env.DB_PASSWORD ?? 'postgres';
	// override database = process.env.DB_NAME ?? 'testing_project_management_app_222';
	// override synchronize = true;
	// override logging= false;
	// override managed= true;
}

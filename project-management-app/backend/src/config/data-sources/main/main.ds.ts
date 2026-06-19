import type { SqlDataSourceType } from '@drumr/framework-backend';
import { DataSource, TypeOrmSqlDataSource } from '@drumr/framework-backend';

@DataSource({ id: 'mainDs' })
export class MainDs extends TypeOrmSqlDataSource {
	override type: SqlDataSourceType = 'postgres';
	override host = process.env.DB_HOST ?? 'localhost';
	override port = parseInt(process.env.DB_PORT ?? '5433', 10);
	override username = process.env.DB_USER ?? 'postgres';
	override password = process.env.DB_PASSWORD ?? 'postgres';
	override database = process.env.DB_NAME ?? 'project_management_app';
	override synchronize = process.env.DB_SYNCHRONIZE !== 'false';
	// Set DB_SSL=true to encrypt the connection (e.g. a private-IP Cloud SQL instance
	// with ssl-mode ENCRYPTED_ONLY). rejectUnauthorized:false encrypts in transit
	// without verifying the server certificate, which suits a VPC-internal connection.
	override ssl =
		process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
	override logging = false;
	override managed = true;
}

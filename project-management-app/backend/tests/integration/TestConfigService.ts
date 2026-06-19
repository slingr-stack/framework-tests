import * as path from 'node:path';
import { ConfigService, Service } from '@drumr/framework-backend';

/**
 * Test-specific configuration service that reads from the integration test config
 * instead of the default `config/config.json`.
 *
 * Register it in your TestApp's beforeStart() hook:
 * ```typescript
 * this.register('configService', TestConfigService);
 * ```
 */
@Service()
export class TestConfigService extends ConfigService {
	protected override getConfigFilePath(): string {
		return path.resolve(
			process.cwd(),
			'tests/integration/config/test-config.json',
		);
	}
}

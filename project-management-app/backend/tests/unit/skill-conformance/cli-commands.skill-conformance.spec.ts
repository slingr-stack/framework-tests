/**
 * SR-* Skill Conformance: cli-commands
 *
 * Verifies that the Drumr CLI source implements exactly what
 * core/skills/cli-commands/SKILL.md documents as its public command surface.
 *
 * Approach: source-text-only — reads CLI TypeScript files via fs.readFileSync;
 * zero live imports or process execution.
 *
 * SR-1  Command inventory — all documented commands have source files
 * SR-2  Flag contracts   — key documented flags declared per command
 * SR-3  Arg/option contracts — subcommand action values match docs
 * SR-4  Adversarial       — no undocumented commands; mutual exclusions declared;
 *                           no hallucinated flags on sensitive commands
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const COMMANDS_DIR = path.resolve(
	__dirname,
	'../../../../../../cli/src/commands',
);

function read(relativePath: string): string {
	return fs.readFileSync(path.join(COMMANDS_DIR, relativePath), 'utf8');
}

// ---------------------------------------------------------------------------
// SR-1: Command inventory
// All documented commands exist as source files
// ---------------------------------------------------------------------------

describe('SR-1: command inventory', () => {
	const TOP_LEVEL = [
		'build.ts',
		'cli-build.ts',
		'create-app.ts',
		'debug.ts',
		'ds.ts',
		'gql.ts',
		'run.ts',
		'setup.ts',
		'sync-metadata.ts',
		'users.ts',
		'views.ts',
	];

	test.each(TOP_LEVEL)('top-level command file exists: %s', (file) => {
		const fullPath = path.join(COMMANDS_DIR, file);
		expect(fs.existsSync(fullPath)).toBe(true);
	});

	test('infra:up command file exists', () => {
		expect(fs.existsSync(path.join(COMMANDS_DIR, 'infra/up.ts'))).toBe(true);
	});

	test('infra:down command file exists', () => {
		expect(fs.existsSync(path.join(COMMANDS_DIR, 'infra/down.ts'))).toBe(true);
	});

	test('infra:update command file exists', () => {
		expect(fs.existsSync(path.join(COMMANDS_DIR, 'infra/update.ts'))).toBe(
			true,
		);
	});

	test('tests:open command file exists', () => {
		expect(fs.existsSync(path.join(COMMANDS_DIR, 'tests/open.ts'))).toBe(true);
	});

	test('tests:setup command file exists', () => {
		expect(fs.existsSync(path.join(COMMANDS_DIR, 'tests/setup.ts'))).toBe(true);
	});

	test('create-app declares --database flag', () => {
		expect(read('create-app.ts')).toMatch(/database\s*:\s*Flags\./);
	});

	test('create-app declares --description flag', () => {
		expect(read('create-app.ts')).toMatch(/description\s*:\s*Flags\./);
	});

	test('create-app declares --templates flag', () => {
		expect(read('create-app.ts')).toMatch(/templates\s*:\s*Flags\./);
	});

	test('create-app declares --skip-setup flag', () => {
		expect(read('create-app.ts')).toContain("'skip-setup'");
	});
});

// ---------------------------------------------------------------------------
// SR-2: Flag contracts
// Key documented flags per command are declared in source
// ---------------------------------------------------------------------------

describe('SR-2: flag contracts', () => {
	test('run declares --prod flag', () => {
		expect(read('run.ts')).toContain("'prod'");
	});

	test('run declares --ui-only flag', () => {
		expect(read('run.ts')).toContain("'ui-only'");
	});

	test('run declares --backend flag', () => {
		const src = read('run.ts');
		expect(src).toContain("'backend'");
	});

	test('run declares --skip-infra flag', () => {
		expect(read('run.ts')).toContain("'skip-infra'");
	});

	test('run declares --verbose flag', () => {
		expect(read('run.ts')).toMatch(/verbose\s*:\s*Flags\./);
	});

	test('debug declares --inspect-brk flag', () => {
		expect(read('debug.ts')).toContain("'inspect-brk'");
	});

	test('debug declares --inspect-port flag', () => {
		expect(read('debug.ts')).toContain("'inspect-port'");
	});

	test('build declares --skip-metadata flag', () => {
		expect(read('build.ts')).toContain("'skip-metadata'");
	});

	test('build declares --skip-backend flag', () => {
		expect(read('build.ts')).toContain("'skip-backend'");
	});

	test('build declares --skip-frontend flag', () => {
		expect(read('build.ts')).toContain("'skip-frontend'");
	});

	test('sync-metadata declares --skip-views flag', () => {
		expect(read('sync-metadata.ts')).toContain("'skip-views'");
	});

	test('sync-metadata declares --skip-schema flag', () => {
		expect(read('sync-metadata.ts')).toContain("'skip-schema'");
	});

	test('sync-metadata declares --skip-sdk flag', () => {
		expect(read('sync-metadata.ts')).toContain("'skip-sdk'");
	});

	test('gql declares --no-exit flag', () => {
		expect(read('gql.ts')).toContain("'no-exit'");
	});

	test('setup declares --skip-install flag', () => {
		expect(read('setup.ts')).toContain("'skip-install'");
	});
});

// ---------------------------------------------------------------------------
// SR-3: Arg/option contracts
// Subcommand action values match what the SKILL.md documents
// ---------------------------------------------------------------------------

describe('SR-3: arg/option contracts', () => {
	test('ds action options include load, reset, indexes', () => {
		const src = read('ds.ts');
		expect(src).toContain("'load'");
		expect(src).toContain("'reset'");
		expect(src).toContain("'indexes'");
	});

	test('ds declares --includeModels flag', () => {
		expect(read('ds.ts')).toContain("'includeModels'");
	});

	test('ds declares --excludeModels flag', () => {
		expect(read('ds.ts')).toContain("'excludeModels'");
	});

	test('gql action options include generate-schema and generate-sdk', () => {
		const src = read('gql.ts');
		expect(src).toContain("'generate-schema'");
		expect(src).toContain("'generate-sdk'");
	});

	test('users action options include all documented actions', () => {
		const src = read('users.ts');
		const actions = [
			"'list'",
			"'create'",
			"'set-password'",
			"'reset-password'",
			"'activate'",
			"'deactivate'",
			"'delete'",
		];
		for (const action of actions) {
			expect(src).toContain(action);
		}
	});

	test('users declares --roles flag', () => {
		expect(read('users.ts')).toContain("'roles'");
	});

	test('users declares --new-password flag', () => {
		expect(read('users.ts')).toContain("'new-password'");
	});

	test('users declares --force flag', () => {
		expect(read('users.ts')).toMatch(/force\s*:\s*Flags\./);
	});

	test('users declares --datasource flag', () => {
		expect(read('users.ts')).toMatch(/datasource\s*:\s*Flags\./);
	});

	test('infra:up declares --detach flag', () => {
		expect(read('infra/up.ts')).toMatch(/detach\s*:\s*Flags\./);
	});

	test('infra:down declares --volumes flag', () => {
		expect(read('infra/down.ts')).toMatch(/volumes\s*:\s*Flags\./);
	});

	test('infra:update declares --all flag', () => {
		expect(read('infra/update.ts')).toMatch(/all\s*:\s*Flags\./);
	});

	test('infra:update declares --file flag', () => {
		expect(read('infra/update.ts')).toMatch(/file\s*:\s*Flags\./);
	});
});

// ---------------------------------------------------------------------------
// SR-4: Adversarial / forbidden patterns
// ---------------------------------------------------------------------------

describe('SR-4: adversarial patterns', () => {
	test('run declares exclusive groups for mutually exclusive flags', () => {
		// SKILL.md: --prod, --ui-only, --backend are mutually exclusive
		const src = read('run.ts');
		expect(src).toContain('exclusive:');
	});

	test('run does not declare a --purge flag (hallucinated)', () => {
		// 'purge' is not a documented run flag
		expect(read('run.ts')).not.toMatch(/'purge'/);
	});

	test('build does not declare an --environment flag (hallucinated)', () => {
		// 'environment' is not a documented build flag
		expect(read('build.ts')).not.toMatch(/'environment'/);
	});

	test('no undocumented top-level command files in commands/', () => {
		const DOCUMENTED = new Set([
			'build.ts',
			'cli-build.ts',
			'create-app.ts',
			'debug.ts',
			'ds', // directory (subcommands: generate-datasource)
			'ds.ts',
			'gql.ts',
			'run.ts',
			'setup.ts',
			'sync-metadata.ts',
			'tests', // directory
			'users.ts',
			'views.ts',
			'infra', // directory
			'tests', // directory (subcommands: open, setup)
		]);
		const actual = fs.readdirSync(COMMANDS_DIR);
		const undocumented = actual.filter((f) => !DOCUMENTED.has(f));
		expect(undocumented).toEqual([]);
	});

	test('ds does not declare --force flag (not documented for ds)', () => {
		// --force is documented only for drumr users delete, not drumr ds
		expect(read('ds.ts')).not.toMatch(/'force'/);
	});
});

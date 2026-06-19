import type { Config } from 'jest';

const config: Config = {
	rootDir: '../',
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests', '<rootDir>/../../../qa/agents'],
	testMatch: [
		'**/*.spec.ts',
		'**/*.integration.spec.ts',
		'**/*.e2e.spec.ts',
		'**/*.test.ts',
	],
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				tsconfig: '<rootDir>/tsconfig.test.json',
			},
		],
	},
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		// Resolve the framework backend package directly from its TypeScript
		// source so tests can run without a prior build step.
		'^@drumr/framework-backend$': '<rootDir>/../../../core/backend/index.ts',
		// Strip .js extensions from relative imports in TypeScript source files
		// (used by the framework's ESM-compatible exports).
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	// Include the framework backend's own node_modules so that modules like
	// 'graphql' and '@pothos/core' can be resolved when importing framework
	// source files that were not installed in this app's node_modules tree.
	modulePaths: ['<rootDir>/../../../core/backend/node_modules'],
	moduleFileExtensions: ['ts', 'js', 'json'],
	// Integration tests each bootstrap a full app and share the generated/actions/index.ts
	// file; running in parallel causes a write race condition on that file.
	// Sequential execution is correct here — each app startup is the bottleneck, not CPU.
	maxWorkers: 1,
	collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/*.d.ts'],
	setupFilesAfterEnv: ['<rootDir>/config/jest.setup.ts'],
};

export default config;

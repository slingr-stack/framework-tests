import type { Config } from 'jest';

const config: Config = {
  rootDir: '../',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.integration.spec.ts',
    '**/*.integration.spec.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],
  transform: {
    '^.+\\.[mc]?[tj]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    // Strip .js extensions from relative imports in TypeScript source files.
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@gql$': '<rootDir>/generated/gql/index.ts',
    '^@gql/(.*)$': '<rootDir>/generated/gql/$1',
    // Resolve from source so tests always use the current TypeScript API
    // instead of the stale compiled CJS in node_modules.
    '^@drumr/framework-frontend$':
      '<rootDir>/../../../core/frontend/ui-lib-exports.ts',
  },
  modulePaths: [
    // Allow tests to resolve packages that are only installed in the framework
    // frontend's node_modules (e.g. tsyringe, reflect-metadata).
    '<rootDir>/../../../framework/frontend/node_modules',
  ],
  // The real framework export path pulls in ESM from node_modules
  // (notably antd / Pro Components). Let Babel transpile all JS modules
  // instead of maintaining a growing allowlist.
  transformIgnorePatterns: [],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts', 'src/**/*.tsx', '!src/**/*.d.ts'],
};

export default config;

import path from 'node:path';
import baseConfig from '@drumr/framework-frontend/config/umi.config';
import { defineConfig } from '@umijs/max';

export default defineConfig({
  ...baseConfig,

  title: 'Project Management App',
  styles: [],
  // Configure aliases to resolve peer dependencies from consuming app
  alias: {
    '@apollo/client/link/context':
      path.dirname(require.resolve('@apollo/client/package.json')) +
      '/link/context',
    '@apollo/client/react': `${path.dirname(require.resolve('@apollo/client/package.json'))}/react`,
    // Use $ for exact-match only. Without $, webpack treats this as a prefix
    // alias and redirects @apollo/client/utilities/invariant (and every other
    // sub-path) to the resolved entry file, breaking internal apollo imports.
    '@apollo/client$': require.resolve('@apollo/client'),
    '@gql': path.resolve(__dirname, '../generated/gql'),
  },
  // Keep class/function names intact so the view registry works after minification.
  // Without this, constructor.name returns a mangled single-letter in production,
  // breaking registerView / getViewClass lookups (e.g. "TaskCreateView" → "e").
  jsMinifierOptions: {
    keepNames: true,
  },
  // Remove manual routes - let custom views be auto-discovered
});

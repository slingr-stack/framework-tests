/**
 * Babel configuration for Jest integration tests.
 *
 * Uses the same plugin stack as the framework frontend Jest config so that
 * TypeScript parameter decorators and reflect-metadata emission (needed by
 * tsyringe DI and @Service/@Injectable) work in tests.
 *
 * Plugin execution order:
 *   1. babel-plugin-transform-typescript-metadata — emits design:paramtypes
 *   2. @babel/plugin-proposal-decorators (legacy)  — compiles class/param decorators
 *   3. @babel/preset-typescript                    — strips TypeScript types
 *   4. @babel/preset-env                           — transpiles to Node-compatible JS
 *   5. @babel/preset-react                         — transpiles JSX/TSX
 */
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-typescript', { allowDeclareFields: true }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [
    'babel-plugin-transform-typescript-metadata',
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    '@babel/plugin-syntax-import-attributes',
  ],
};

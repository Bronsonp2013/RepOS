// Flat ESLint config (ESLint 9). Adopted from Pathfinder's config
// (test/fixtures/pathfinder/config/eslint.config.mjs) and adjusted for RepOS
// paths and package names. Intentionally lean: no `any`, no unused vars, no
// accidental `console`, plus the architecture boundaries RepOS actually has.
// `npm run typecheck` remains the heavier gate.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.config.js',
      '**/*.config.cjs',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      'test/fixtures/**',
      '.orchestrator/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // RepOS boundary: the browser bundle may share types with the server, and
    // nothing else. @repos/sources reads connection strings and opens pools; it
    // must never reach the client. Anything else the page needs is an endpoint.
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['@repos/sources', 'pg', 'express'].map((name) => ({
            name,
            message: `apps/web must not import ${name}. Only @repos/shared is bundle-safe — add an API endpoint instead.`,
          })),
          patterns: [
            {
              group: ['../../../**'],
              message: 'Relative imports may not climb more than two levels. Use the @web/* alias.',
            },
            {
              group: ['@repos/sources/*', '**/packages/sources/**', '**/apps/api/**'],
              message:
                'apps/web must not reach into server-only code, including via subpaths. Add an API endpoint.',
            },
          ],
        },
      ],
    },
  },
  {
    // Node code legitimately logs at boot; tests may log freely.
    files: ['**/*.test.ts', '**/*.test.tsx', 'apps/*/src/index.ts', 'test/setup/**/*.ts'],
    rules: { 'no-console': 'off' },
  }
);

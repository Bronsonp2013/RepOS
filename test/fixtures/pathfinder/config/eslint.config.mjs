// Flat ESLint config (ESLint 9). Intentionally lean: it enforces the handful of
// CLAUDE.md §7 rules a type-aware compiler does NOT already catch (no `any`,
// no unused vars, no accidental `console`), and stays out of the way otherwise.
// `npm run typecheck` remains the heavier gate; this catches style drift.
//
// Not type-checked linting (no `projectService`): it is fast, needs no per-file
// tsconfig wiring across ten workspaces, and the type-aware rules would largely
// duplicate what `tsc --noEmit` already runs in CI.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    // Build output, deps, and generated/config files that predate the lint gate.
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.config.ts',
      '**/*.config.js',
      '**/*.config.cjs',
      'scripts/**',
      // Session workspace: gate worktrees and plan files live here, not code.
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // §7.1: "No `any`." An error: the codebase is clean of it, and CI runs
      // eslint without --max-warnings, so a warning would pass the gate silently.
      '@typescript-eslint/no-explicit-any': 'error',
      // Unused vars are a smell; the leading-underscore escape hatch is conventional.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Frontend only: the rules-of-hooks check that catches the classic React bugs.
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Architecture boundaries for the web app, turned from CLAUDE.md prose into a gate.
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // §5.1 / §5.3: apps/web may import @pathfinder/shared and nothing else from
          // the workspace — never packages/db (the answer is an API endpoint), and not
          // the server-only integration packages (they'd drag node/secrets into the bundle).
          paths: [
            '@pathfinder/db',
            '@pathfinder/gmail',
            '@pathfinder/ai',
            '@pathfinder/calendar',
            '@pathfinder/maps',
            '@pathfinder/routing',
            '@pathfinder/observability',
          ].map((name) => ({
            name,
            message: `apps/web must not import ${name} (CLAUDE.md §5.1/§5.3). Only @pathfinder/shared is shared with the web bundle — add an API endpoint instead.`,
          })),
          patterns: [
            {
              // §5.3: relative imports climb at most two levels. Use the @web/* alias.
              group: ['../../../**'],
              message:
                'Relative imports may not climb more than two levels (CLAUDE.md §5.3). Use the @web/* alias.',
            },
            {
              group: ['**/packages/db/**'],
              message: 'apps/web must not reach into packages/db (CLAUDE.md §5.3). Add an API endpoint.',
            },
            {
              // Subpath imports (@pathfinder/db/src/pool) bypass the exact-name
              // `paths` entries above — this repo uses subpath imports as a live
              // convention, so the gate must cover them too.
              group: [
                '@pathfinder/db/*',
                '@pathfinder/gmail/*',
                '@pathfinder/ai/*',
                '@pathfinder/calendar/*',
                '@pathfinder/maps/*',
                '@pathfinder/routing/*',
                '@pathfinder/observability/*',
              ],
              message:
                'apps/web must not import server-only packages, including via subpaths (CLAUDE.md §5.1/§5.3). Only @pathfinder/shared is bundle-safe.',
            },
          ],
        },
      ],
    },
  },
  {
    // Node/back-end code legitimately logs to the console at boot; the PII-redaction
    // rule (§7.3) is about the pino logger, not this. Tests may log freely.
    files: ['**/*.test.ts', 'apps/*/src/index.ts'],
    rules: { 'no-console': 'off' },
  },
);

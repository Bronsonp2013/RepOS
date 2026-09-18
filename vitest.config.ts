import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@repos/shared': fileURLToPath(new URL('./packages/shared/src/index.ts', import.meta.url)),
      '@repos/sources': fileURLToPath(new URL('./packages/sources/src/index.ts', import.meta.url)),
    },
  },
  test: {
    // Unit and integration tests only. e2e/ belongs to Playwright.
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    globalSetup: ['./test/setup/global-setup.ts'],
    setupFiles: ['./test/setup/setup-file.ts'],
    // Integration tests talk to real fixture databases; keep them serial so
    // the schema test can create and drop a throwaway database safely.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    reporters: ['default'],
  },
});

/**
 * Loads `.env.test` into `process.env`. Run twice on purpose: once in the
 * vitest globalSetup process, and once per worker via `setupFiles`, because
 * vitest runs globalSetup in a different process from the tests themselves.
 * Existing values always win, so CI can override any single variable.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const REPO_ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
export const ENV_TEST_PATH = path.join(REPO_ROOT, '.env.test');

export function loadTestEnv(): void {
  if (!existsSync(ENV_TEST_PATH)) {
    throw new Error(
      `.env.test not found at ${ENV_TEST_PATH}. Copy .env.test.example and fill it in ` +
        `from test/fixtures/pathfinder/LOCAL_DB.md.`
    );
  }
  dotenv.config({ path: ENV_TEST_PATH, override: false });
}

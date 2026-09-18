/**
 * API bootstrap. Loads source configuration, opens one read-only pool per
 * source, refuses to start when a source's schema is behind (a warning is
 * logged when a source is ahead instead), then listens.
 */
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import dotenv from 'dotenv';
import { createSourcePools, loadSourceConfigs, MAX_POOL_CONNECTIONS } from '@repos/sources';
import { createServer } from './server';
import { errorMessage } from './services/redact';

// Resolved from this file's location, not process.cwd(), so `.env` and
// `sources.json` (both at the repo root) are found the same way whether the
// API is started from the repo root (`npm run dev`) or via a workspace
// script (`npm run start -w apps/api`, which npm runs with apps/api as the
// cwd). tsx does not load `.env` on its own, unlike Vite for the web app, so
// this bootstrap does it explicitly (docs/REPOS_V1.md "Running").
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: resolve(REPO_ROOT, '.env') });

const PORT = Number(process.env.REPOS_API_PORT ?? 3200);

// Tailnet-only: bind to loopback unless the environment names a different
// host explicitly (docs/REPOS_V1.md §2.6, .env.example).
const HOST = process.env.REPOS_API_HOST ?? '127.0.0.1';

// Bounded so a source whose connection is refused can't hang a boot or a
// request past a short, known wait (docs/REPOS_V1.md §7.6).
const CONNECTION_TIMEOUT_MS = Number(process.env.REPOS_DB_CONNECT_TIMEOUT_MS ?? 3000);
const STATEMENT_TIMEOUT_MS = Number(process.env.REPOS_DB_STATEMENT_TIMEOUT_MS ?? 10_000);

export async function main(): Promise<void> {
  const configs = await loadSourceConfigs({ configPath: resolve(REPO_ROOT, 'sources.json') });
  const factory = await createSourcePools(configs, {
    max: MAX_POOL_CONNECTIONS,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    statementTimeoutMillis: STATEMENT_TIMEOUT_MS,
  });

  for (const sourcePool of factory.all()) {
    if (sourcePool.schema.status === 'ahead') {
      console.warn(
        `[repos-api] ${sourcePool.schema.message ?? `source "${sourcePool.config.slug}" schema is ahead`}`
      );
    }
    if (sourcePool.schema.status === 'unreachable') {
      // Not fatal (docs/REPOS_V1.md decision 5): boot proceeds with this
      // source marked degraded, and it is re-checked per request.
      console.warn(
        `[repos-api] ${sourcePool.schema.message ?? `source "${sourcePool.config.slug}" is unreachable`} — booting degraded`
      );
    }
  }

  const app = createServer(factory);
  app.listen(PORT, HOST, () => {
    console.log(`[repos-api] listening on ${HOST}:${PORT}`);
  });
}

main().catch((err: unknown) => {
  console.error('[repos-api] failed to start:', errorMessage(err));
  process.exitCode = 1;
});

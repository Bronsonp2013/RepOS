/**
 * API bootstrap. Loads source configuration, opens one read-only pool per
 * source, refuses to start when a source's schema is behind (a warning is
 * logged when a source is ahead instead), then listens.
 */
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import type { Server } from 'node:http';
import dotenv from 'dotenv';
import {
  createSourcePools,
  loadSourceConfigs,
  MAX_POOL_CONNECTIONS,
  type SourcePoolFactory,
} from '@repos/sources';
import { createServer } from './server';
import { errorMessage } from './services/redact';
import { resolveBootConfig } from './bootConfig';

// Resolved from this file's location, not process.cwd(), so `.env` and
// `sources.json` (both at the repo root) are found the same way whether the
// API is started from the repo root (`npm run dev`) or via a workspace
// script (`npm run start -w apps/api`, which npm runs with apps/api as the
// cwd). tsx does not load `.env` on its own, unlike Vite for the web app, so
// this bootstrap does it explicitly (docs/REPOS_V1.md "Running").
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: resolve(REPO_ROOT, '.env') });

export async function main(): Promise<void> {
  const { port, host, connectionTimeoutMs, statementTimeoutMs } = resolveBootConfig(process.env);

  // Hoisted so the boot-failure catch below and the shutdown handlers can
  // both close whatever pools ended up open, rather than leaking them
  // (F19/F33).
  let factory: SourcePoolFactory | undefined;

  let server: Server;
  try {
    const configs = await loadSourceConfigs({ configPath: resolve(REPO_ROOT, 'sources.json') });
    factory = await createSourcePools(configs, {
      max: MAX_POOL_CONNECTIONS,
      connectionTimeoutMillis: connectionTimeoutMs,
      statementTimeoutMillis: statementTimeoutMs,
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
    server = app.listen(port, host, () => {
      console.log(`[repos-api] listening on ${host}:${port}`);
    });
  } catch (err) {
    // A pool was opened before the failure (e.g. createServer's CORS-origin
    // check throwing) — close it rather than leaking the connections.
    await factory?.close();
    throw err;
  }

  // Without this, a bind failure (e.g. EADDRINUSE) throws asynchronously
  // with no listener and crashes the process with an unhandled exception
  // instead of a clean, logged exit (F19/F33).
  server.on('error', (err: unknown) => {
    console.error('[repos-api] server error:', errorMessage(err));
    process.exitCode = 1;
    void factory?.close();
  });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`[repos-api] received ${signal}, shutting down`);
    server.close(() => {
      void factory?.close().finally(() => {
        process.exit(0);
      });
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('[repos-api] failed to start:', errorMessage(err));
  process.exitCode = 1;
});

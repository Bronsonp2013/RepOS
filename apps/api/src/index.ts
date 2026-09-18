/**
 * API bootstrap. Loads source configuration, opens one read-only pool per
 * source, refuses to start when a source's schema is behind (a warning is
 * logged when a source is ahead instead), then listens.
 */
import { createSourcePools, loadSourceConfigs, MAX_POOL_CONNECTIONS } from '@repos/sources';
import { createServer } from './server';
import { errorMessage } from './services/redact';

const PORT = Number(process.env.REPOS_API_PORT ?? 3200);

// Bounded so a source whose connection is refused can't hang a boot or a
// request past a short, known wait (docs/REPOS_V1.md §7.6).
const CONNECTION_TIMEOUT_MS = Number(process.env.REPOS_DB_CONNECT_TIMEOUT_MS ?? 3000);
const STATEMENT_TIMEOUT_MS = Number(process.env.REPOS_DB_STATEMENT_TIMEOUT_MS ?? 10_000);

export async function main(): Promise<void> {
  const configs = await loadSourceConfigs();
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
  }

  const app = createServer(factory);
  app.listen(PORT, () => {
    console.log(`[repos-api] listening on :${PORT}`);
  });
}

main().catch((err: unknown) => {
  console.error('[repos-api] failed to start:', errorMessage(err));
  process.exitCode = 1;
});

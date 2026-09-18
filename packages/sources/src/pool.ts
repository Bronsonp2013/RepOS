/**
 * The read-only pool factory. The ONLY place in RepOS that reads a connection
 * string (docs/REPOS_V1.md §4).
 */
import { Pool } from 'pg';
import type { CreateSourcePools, SourcePool } from './types';
import { checkSourceSchema, assertSchemaUsable } from './schema';
import { redactCredentials } from './redact';

/** Appended to every connection so the server refuses writes in-session. */
export const READ_ONLY_OPTION = 'options=-c default_transaction_read_only=on';

/**
 * Default pool ceiling per source. Callers with real concurrency needs
 * (e.g. one request firing several block queries against the same source in
 * parallel) should pass a higher `options.max` explicitly rather than rely
 * on this default, which is sized for a single in-flight request.
 */
export const MAX_POOL_CONNECTIONS = 5;

/** Hard upper bound on per-source `max`, independent of the default above. */
export const MAX_POOL_CONNECTIONS_CEILING = 20;

/** The `-c ...` clause carried in READ_ONLY_OPTION, without the `options=` key. */
const READ_ONLY_CLAUSE = '-c default_transaction_read_only=on';

/**
 * Returns `url` with the read-only session option appended, preserving any
 * query parameters already present. Pure and synchronous so the credentials
 * test can assert on it without opening a socket.
 */
export function withReadOnlyOption(url: string): string {
  const parsed = new URL(url);
  const existing = parsed.searchParams.get('options');
  parsed.searchParams.set('options', existing ? `${existing} ${READ_ONLY_CLAUSE}` : READ_ONLY_CLAUSE);
  return parsed.toString();
}

async function closeAll(pools: SourcePool[]): Promise<void> {
  await Promise.all(pools.map((sourcePool) => sourcePool.pool.end().catch(() => undefined)));
}

export const createSourcePools: CreateSourcePools = async (configs, options) => {
  const max = Math.min(options?.max ?? MAX_POOL_CONNECTIONS, MAX_POOL_CONNECTIONS_CEILING);
  const sourcePools: SourcePool[] = [];
  const bySlug = new Map<string, SourcePool>();

  try {
    for (const config of configs) {
      const pool = new Pool({
        connectionString: withReadOnlyOption(config.databaseUrl),
        max,
        connectionTimeoutMillis: options?.connectionTimeoutMillis,
        statement_timeout: options?.statementTimeoutMillis,
      });

      // pg emits 'error' on the Pool when an idle client dies in the background.
      // An unhandled emitter error would crash the process, so this listener must
      // never throw and must never log the connection string.
      pool.on('error', (err) => {
        console.error(`[sources] pool error for source "${config.slug}": ${redactCredentials((err as Error).message)}`);
      });

      const schema = await checkSourceSchema(config.slug, pool);
      assertSchemaUsable(schema);

      const sourcePool: SourcePool = { config, pool, schema };
      sourcePools.push(sourcePool);
      bySlug.set(config.slug, sourcePool);
    }
  } catch (err) {
    await closeAll(sourcePools);
    throw err;
  }

  return {
    all: () => sourcePools.slice(),
    get: (slug: string) => bySlug.get(slug),
    close: () => closeAll(sourcePools),
  };
};

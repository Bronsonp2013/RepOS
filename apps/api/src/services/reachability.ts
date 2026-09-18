/**
 * Per-request recovery for a source that booted `unreachable` (down at boot,
 * not a schema mismatch — docs/REPOS_V1.md decision 5). A source in any
 * other status is untouched: this only ever re-checks a currently
 * `unreachable` source, and only once per call, using the pool's own
 * `connectionTimeoutMillis` set at boot (apps/api/src/index.ts), so a still-
 * down source can't hang a request past that bound.
 *
 * On success (`ok`/`ahead`) the source is promoted to live in place. On
 * `behind`/`unknown`/still-`unreachable` it stays degraded — the caller must
 * not run block queries against it. Never throws.
 * Covered by degrade.test.ts and sources.test.ts.
 */
import type { SchemaCheckResult, SourcePool } from '@repos/sources';
import { checkSourceSchema } from '@repos/sources';

/**
 * Re-runs the schema check for `sourcePool` if (and only if) it is currently
 * `unreachable`, mutates `sourcePool.schema` to the fresh result, and
 * returns it. A source that is already `ok`/`ahead` (or that settled into
 * `behind`/`unknown` from a previous recheck) is returned as-is with no
 * query made.
 */
export async function ensureSchemaCurrent(sourcePool: SourcePool): Promise<SchemaCheckResult> {
  if (sourcePool.schema.status !== 'unreachable') {
    return sourcePool.schema;
  }
  const fresh = await checkSourceSchema(sourcePool.config.slug, sourcePool.pool);
  sourcePool.schema = fresh;
  return fresh;
}

/** True once a source's (possibly just-refreshed) schema status is safe to query. */
export function isQueryable(schema: SchemaCheckResult): boolean {
  return schema.status === 'ok' || schema.status === 'ahead';
}

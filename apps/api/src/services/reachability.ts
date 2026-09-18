/**
 * Per-request recovery for a source whose schema status may have changed
 * since it was last checked (down at boot, or recovered/regressed since —
 * not the same as a schema mismatch, docs/REPOS_V1.md decision 5).
 *
 * A source's status is re-validated on a short TTL (`REPOS_SCHEMA_RECHECK_INTERVAL_MS`,
 * default 20s) regardless of its current status (F18) — not only when it is
 * `unreachable` — so a `behind`/`unknown` verdict, or an `unreachable` one
 * that stuck, doesn't latch until restart once the underlying source is
 * fixed. Within that window the cached status is returned with no query.
 * Concurrent callers for the same source share one in-flight recheck (F12)
 * instead of each firing their own probe at a down source; the recheck uses
 * the pool's own `connectionTimeoutMillis` set at boot
 * (apps/api/src/index.ts), so a still-down source can't hang a request past
 * that bound.
 *
 * On success (`ok`/`ahead`) the source is promoted to live in place. On
 * `behind`/`unknown`/still-`unreachable` it stays degraded — the caller must
 * not run block queries against it. Never throws.
 * Covered by degrade.test.ts and sources.test.ts.
 */
import type { SchemaCheckResult, SourcePool } from '@repos/sources';
import { checkSourceSchema } from '@repos/sources';

const RECHECK_INTERVAL_MS = Number(process.env.REPOS_SCHEMA_RECHECK_INTERVAL_MS ?? 20_000);

interface RecheckState {
  lastCheckedAt: number;
  inFlight: Promise<SchemaCheckResult> | null;
}

const recheckState = new WeakMap<SourcePool, RecheckState>();

function stateFor(sourcePool: SourcePool): RecheckState {
  let state = recheckState.get(sourcePool);
  if (!state) {
    // First time this pool is seen here: trust the boot-time check
    // (createSourcePools already ran it) and start this source's TTL clock
    // now, rather than treating it as instantly stale.
    state = { lastCheckedAt: Date.now(), inFlight: null };
    recheckState.set(sourcePool, state);
  }
  return state;
}

/**
 * Returns `sourcePool`'s current schema status, refreshed if it's due
 * (`RECHECK_INTERVAL_MS` since the last check, of any status).
 */
export async function ensureSchemaCurrent(sourcePool: SourcePool): Promise<SchemaCheckResult> {
  const state = stateFor(sourcePool);

  if (state.inFlight) {
    return state.inFlight;
  }

  if (Date.now() - state.lastCheckedAt < RECHECK_INTERVAL_MS) {
    return sourcePool.schema;
  }

  const recheck = checkSourceSchema(sourcePool.config.slug, sourcePool.pool)
    .then((fresh) => {
      sourcePool.schema = fresh;
      return fresh;
    })
    .finally(() => {
      state.inFlight = null;
      state.lastCheckedAt = Date.now();
    });
  state.inFlight = recheck;
  return recheck;
}

/** True once a source's (possibly just-refreshed) schema status is safe to query. */
export function isQueryable(schema: SchemaCheckResult): boolean {
  return schema.status === 'ok' || schema.status === 'ahead';
}

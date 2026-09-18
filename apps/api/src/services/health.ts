/**
 * `GET /api/health` and the `/api/sources` summaries: per-source connectivity
 * and the boot schema verdict, with no credential in the output (C9).
 * Covered by sources.test.ts.
 */
import type { HealthReport, MeetingTypeSummary, SourceHealth, SourceSummary } from '@repos/shared';
import { EXPECTED_MIGRATION } from '@repos/sources';
import type { SourcePool, SourcePoolFactory } from '@repos/sources';
import { errorMessage } from './redact';
import { ensureSchemaCurrent } from './reachability';
import { DEFAULT_TIMEZONE, readMeetingTypes, readTimezone } from './sourceContext';

export async function buildSourceSummaries(factory: SourcePoolFactory): Promise<SourceSummary[]> {
  return Promise.all(
    factory.all().map(async (sourcePool): Promise<SourceSummary> => {
      const { config } = sourcePool;
      const schema = await ensureSchemaCurrent(sourcePool);
      // F22: `SourceSummary.timezone`/`meetingTypes` have no way to carry a
      // null/error today (packages/shared/src/api.ts, out of this lane's
      // owned paths — see unresolved); a query failure here is at least
      // logged at error level instead of silently reading as real data.
      const [timezone, meetingTypes] = await Promise.all([
        readTimezone(sourcePool.pool).catch((err: unknown) => {
          console.error(`[repos-api] source "${config.slug}" timezone read failed:`, errorMessage(err));
          return DEFAULT_TIMEZONE;
        }),
        readMeetingTypes(sourcePool.pool).catch((err: unknown) => {
          console.error(`[repos-api] source "${config.slug}" meeting types read failed:`, errorMessage(err));
          return [] as MeetingTypeSummary[];
        }),
      ]);

      return {
        slug: config.slug,
        name: config.name,
        kind: config.kind,
        webUrl: config.webUrl,
        schemaStatus: schema.status,
        extraMigrations: schema.extraMigrations,
        missingMigrations: schema.missingMigrations,
        timezone,
        meetingTypes,
      };
    })
  );
}

async function probe(sourcePool: SourcePool): Promise<SourceHealth> {
  // F20: time the whole probe, including the schema recheck/pool-acquire
  // wait, not just the `SELECT 1` after it — a source stuck reconnecting
  // reported a misleadingly small latencyMs before this.
  const startedAt = Date.now();
  const schema = await ensureSchemaCurrent(sourcePool);
  try {
    await sourcePool.pool.query('SELECT 1');
    return {
      slug: sourcePool.config.slug,
      reachable: true,
      schemaStatus: schema.status,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      slug: sourcePool.config.slug,
      reachable: false,
      schemaStatus: schema.status,
      latencyMs: null,
      error: errorMessage(err),
    };
  }
}

export async function buildHealthReport(factory: SourcePoolFactory): Promise<HealthReport> {
  const sources = await Promise.all(factory.all().map((sourcePool) => probe(sourcePool)));
  // F13: a source can be reachable (SELECT 1 succeeds) while its schema is
  // `behind`/`unknown`/`unreachable` — not safe to query — so the overall
  // verdict must fold schemaStatus in, not just the connectivity probe.
  const status = sources.every((s) => s.reachable && (s.schemaStatus === 'ok' || s.schemaStatus === 'ahead'))
    ? 'ok'
    : 'degraded';

  return {
    status,
    generatedAt: new Date().toISOString(),
    expectedMigration: EXPECTED_MIGRATION,
    sources,
  };
}

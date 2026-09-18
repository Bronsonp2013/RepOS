/**
 * `GET /api/health` and the `/api/sources` summaries: per-source connectivity
 * and the boot schema verdict, with no credential in the output (C9).
 * Covered by sources.test.ts.
 */
import type { HealthReport, SourceHealth, SourceSummary } from '@repos/shared';
import { EXPECTED_MIGRATION } from '@repos/sources';
import type { SourcePool, SourcePoolFactory } from '@repos/sources';
import { errorMessage } from './redact';
import { DEFAULT_TIMEZONE, readMeetingTypeKeys, readTimezone } from './sourceContext';

export async function buildSourceSummaries(factory: SourcePoolFactory): Promise<SourceSummary[]> {
  return Promise.all(
    factory.all().map(async (sourcePool): Promise<SourceSummary> => {
      const { config, schema } = sourcePool;
      const [timezone, meetingTypes] = await Promise.all([
        readTimezone(sourcePool.pool).catch(() => DEFAULT_TIMEZONE),
        readMeetingTypeKeys(sourcePool.pool).catch(() => [] as string[]),
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
  const startedAt = Date.now();
  try {
    await sourcePool.pool.query('SELECT 1');
    return {
      slug: sourcePool.config.slug,
      reachable: true,
      schemaStatus: sourcePool.schema.status,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      slug: sourcePool.config.slug,
      reachable: false,
      schemaStatus: sourcePool.schema.status,
      latencyMs: null,
      error: errorMessage(err),
    };
  }
}

export async function buildHealthReport(factory: SourcePoolFactory): Promise<HealthReport> {
  const sources = await Promise.all(factory.all().map((sourcePool) => probe(sourcePool)));
  const status = sources.every((s) => s.reachable) ? 'ok' : 'degraded';

  return {
    status,
    generatedAt: new Date().toISOString(),
    expectedMigration: EXPECTED_MIGRATION,
    sources,
  };
}

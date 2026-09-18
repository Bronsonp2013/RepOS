/**
 * Assembles `GET /api/today`: runs the five blocks per source, sums the header
 * totals, and degrades one source without failing the request — an unreachable
 * venture returns HTTP 200 with `error` set on its entry only
 * (docs/REPOS_V1.md §7.6). Covered by today.test.ts and degrade.test.ts.
 */
import type { SourceTotals, TodayPayload, TodaySource, TodayTotals } from '@repos/shared';
import type { SourcePool, SourcePoolFactory } from '@repos/sources';
import type { BlockContext } from '../blocks';
import { coverage, needsVisit, pipeline, totals as totalsBlock, upcomingTrips } from '../blocks';
import { errorMessage } from './redact';
import { DEFAULT_TIMEZONE, readTimezone } from './sourceContext';

const EMPTY_TOTALS: SourceTotals = {
  activeAccounts: 0,
  prospectsInPipeline: 0,
  tripsThisWeek: 0,
  staleAccounts: 0,
};

// Test-only seam: today.test.ts pins `now` to a fixed instant so the Graham
// trip (start_date 2026-07-08) reads as upcoming regardless of wall clock.
// routes/today.ts reads `resolveNow()` instead of calling `new Date()` itself.
let nowOverride: Date | null = null;

/** Test-only: pin `now` for subsequent calls. Pass `null` to go back to the wall clock. */
export function setNowOverrideForTests(now: Date | null): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('setNowOverrideForTests must not be called in production');
  }
  nowOverride = now;
}

/** What `routes/today.ts` treats as "now" for this request. */
export function resolveNow(): Date {
  return nowOverride ?? new Date();
}

async function buildOne(sourcePool: SourcePool, now: Date): Promise<TodaySource> {
  const { config } = sourcePool;

  try {
    const timezone = await readTimezone(sourcePool.pool);
    const ctx: BlockContext = {
      slug: config.slug,
      kind: config.kind,
      webUrl: config.webUrl,
      timezone,
      now,
    };

    const [needsVisitRows, upcomingTripRows, pipelineRows, coverageRows, sourceTotals] = await Promise.all([
      needsVisit(sourcePool.pool, ctx),
      upcomingTrips(sourcePool.pool, ctx),
      pipeline(sourcePool.pool, ctx),
      coverage(sourcePool.pool, ctx),
      totalsBlock(sourcePool.pool, ctx),
    ]);

    return {
      slug: config.slug,
      name: config.name,
      kind: config.kind,
      webUrl: config.webUrl,
      timezone,
      needsVisit: needsVisitRows,
      upcomingTrips: upcomingTripRows,
      pipeline: pipelineRows,
      coverage: coverageRows,
      totals: sourceTotals,
    };
  } catch (err) {
    return {
      slug: config.slug,
      name: config.name,
      kind: config.kind,
      webUrl: config.webUrl,
      timezone: DEFAULT_TIMEZONE,
      needsVisit: [],
      upcomingTrips: [],
      pipeline: [],
      coverage: [],
      totals: { ...EMPTY_TOTALS },
      error: errorMessage(err),
    };
  }
}

/** One source's slice of Today, by slug. Throws if the slug isn't configured. */
export async function buildTodaySource(
  factory: SourcePoolFactory,
  slug: string,
  now: Date
): Promise<TodaySource> {
  const sourcePool = factory.get(slug);
  if (!sourcePool) {
    throw new Error(`no such source: ${slug}`);
  }
  return buildOne(sourcePool, now);
}

function addTotals(a: TodayTotals, b: SourceTotals): TodayTotals {
  return {
    activeAccounts: a.activeAccounts + b.activeAccounts,
    prospectsInPipeline: a.prospectsInPipeline + b.prospectsInPipeline,
    tripsThisWeek: a.tripsThisWeek + b.tripsThisWeek,
    staleAccounts: a.staleAccounts + b.staleAccounts,
  };
}

export async function buildToday(factory: SourcePoolFactory, now: Date): Promise<TodayPayload> {
  const sources = await Promise.all(factory.all().map((sourcePool) => buildOne(sourcePool, now)));

  const totals = sources.reduce<TodayTotals>(
    (acc, source) => (source.error ? acc : addTotals(acc, source.totals)),
    { ...EMPTY_TOTALS }
  );

  return {
    generatedAt: new Date().toISOString(),
    totals,
    sources,
  };
}

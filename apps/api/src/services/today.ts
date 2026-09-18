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
import { ensureSchemaCurrent, isQueryable } from './reachability';
import { DEFAULT_TIMEZONE, readTimezone } from './sourceContext';

const EMPTY_TOTALS: SourceTotals = {
  activeAccounts: 0,
  prospectsInPipeline: 0,
  tripsThisWeek: 0,
  staleAccounts: 0,
};

// F21/F15: `now` is injected per request (createServer's `now` option,
// threaded through routes/today.ts) instead of a module-global override, and
// bounded per-source/per-request instead of unbounded. No module state here.
const SOURCE_BUDGET_MS = Number(process.env.REPOS_TODAY_SOURCE_BUDGET_MS ?? 8000);
const REQUEST_DEADLINE_MS = Number(process.env.REPOS_TODAY_REQUEST_DEADLINE_MS ?? 12000);

const TIMED_OUT = Symbol('timed-out');

/** Races `promise` against `ms`; resolves to `TIMED_OUT` instead of throwing/hanging. */
async function withBudget<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout>;
  const budget = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  try {
    return await Promise.race([promise, budget]);
  } finally {
    clearTimeout(timer!);
  }
}

/** pg error codes that mean "connected fine, but this query is broken" (a schema/SQL bug), not an outage. */
const QUERY_ERROR_CODES = new Set(['42703', '42P01']);

type BlockFailureKind = 'query_error' | 'unreachable';

function classifyBlockFailure(err: unknown): BlockFailureKind {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' && QUERY_ERROR_CODES.has(code) ? 'query_error' : 'unreachable';
}

function formatBlockError(slug: string, kind: BlockFailureKind, detail: string): string {
  return `source "${slug}" ${kind}: ${detail}`;
}

function degradedSource(config: SourcePool['config'], error: string): TodaySource {
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
    error,
  };
}

async function buildOne(sourcePool: SourcePool, now: Date): Promise<TodaySource> {
  const { config } = sourcePool;

  // A source that booted (or was last seen) unreachable gets one bounded
  // recheck per request; if it's still not queryable, degrade this entry
  // without attempting block queries (docs/REPOS_V1.md decision 5, C7).
  const schema = await ensureSchemaCurrent(sourcePool);
  if (!isQueryable(schema)) {
    return degradedSource(
      config,
      schema.message ?? `source "${config.slug}" schema status is ${schema.status}`
    );
  }

  let timezone: string;
  try {
    timezone = await readTimezone(sourcePool.pool);
  } catch (err) {
    const kind = classifyBlockFailure(err);
    const detail = errorMessage(err);
    if (kind === 'query_error') {
      console.error(`[repos-api] ${formatBlockError(config.slug, kind, detail)}`);
    }
    return degradedSource(config, formatBlockError(config.slug, kind, detail));
  }

  const ctx: BlockContext = {
    slug: config.slug,
    kind: config.kind,
    webUrl: config.webUrl,
    timezone,
    now,
  };

  // F9/F10/F14: each block settles independently under one per-source time
  // budget (F15), rather than one Promise.all/try-catch where any single
  // block error (a SQL typo, say) blanks the other four. The first
  // rejection degrades the whole source (blocks are not independently
  // renderable on the Today page), but its wording — and whether it's
  // logged at error level — depends on whether it looks like a query bug
  // (pg code 42703/42P01) versus the source being genuinely unreachable.
  const settled = await withBudget(
    Promise.allSettled([
      needsVisit(sourcePool.pool, ctx),
      upcomingTrips(sourcePool.pool, ctx),
      pipeline(sourcePool.pool, ctx),
      coverage(sourcePool.pool, ctx),
      totalsBlock(sourcePool.pool, ctx),
    ]),
    SOURCE_BUDGET_MS
  );

  if (settled === TIMED_OUT) {
    return degradedSource(
      config,
      formatBlockError(config.slug, 'unreachable', `timed out after ${SOURCE_BUDGET_MS}ms`)
    );
  }

  const failure = settled.find(
    (r): r is PromiseRejectedResult => r.status === 'rejected'
  );
  if (failure) {
    const kind = classifyBlockFailure(failure.reason);
    const detail = errorMessage(failure.reason);
    if (kind === 'query_error') {
      console.error(`[repos-api] ${formatBlockError(config.slug, kind, detail)}`);
    }
    return degradedSource(config, formatBlockError(config.slug, kind, detail));
  }

  const [needsVisitRows, upcomingTripRows, pipelineRows, coverageRows, sourceTotals] = settled.map(
    (r) => (r as PromiseFulfilledResult<unknown>).value
  ) as [
    Awaited<ReturnType<typeof needsVisit>>,
    Awaited<ReturnType<typeof upcomingTrips>>,
    Awaited<ReturnType<typeof pipeline>>,
    Awaited<ReturnType<typeof coverage>>,
    Awaited<ReturnType<typeof totalsBlock>>
  ];

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
  // F15: a request-level deadline backstops buildOne's own per-source
  // budget — if a single source somehow still overruns it (e.g. budgets
  // misconfigured), that source degrades instead of the whole request
  // hanging past this bound.
  const sources = await Promise.all(
    factory.all().map(async (sourcePool) => {
      const result = await withBudget(buildOne(sourcePool, now), REQUEST_DEADLINE_MS);
      return result === TIMED_OUT
        ? degradedSource(
            sourcePool.config,
            formatBlockError(sourcePool.config.slug, 'unreachable', `timed out after ${REQUEST_DEADLINE_MS}ms`)
          )
        : result;
    })
  );

  const totals = sources.reduce<TodayTotals>(
    (acc, source) => (source.error ? acc : addTotals(acc, source.totals)),
    { ...EMPTY_TOTALS }
  );

  return {
    // F21: derived from the same `now` instant injected into buildOne,
    // rather than a fresh `new Date()` call.
    generatedAt: now.toISOString(),
    totals,
    sources,
  };
}
